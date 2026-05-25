param(
  [string]$ProfileName = 'YannickNkongolo',
  [string]$Region = 'us-east-1'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$env:AWS_PROFILE = $ProfileName

$RepoName = 'mwangaza-api'
$ClusterName = 'mwangaza-api-cluster'
$ServiceName = 'mwangaza-api-service'
$TaskFamily = 'mwangaza-api-task'
$AlbName = 'mwangaza-api-alb'
$TgName = 'mwangaza-api-tg'
$LogGroup = '/ecs/mwangaza-api'
$SecretName = 'mwangaza/api/prod'

Set-Location (Join-Path $PSScriptRoot '..')

$accountId = aws sts get-caller-identity --region $Region --query Account --output text
$vpcId = aws ec2 describe-vpcs --region $Region --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text
if (-not $vpcId -or $vpcId -eq 'None') { throw 'No default VPC found.' }

$subnetRows = aws ec2 describe-subnets --region $Region --query "Subnets[?VpcId=='$vpcId'] | sort_by(@,&AvailabilityZone)[].{SubnetId:SubnetId,Az:AvailabilityZone}" --output json | ConvertFrom-Json
if (-not $subnetRows -or $subnetRows.Count -lt 2) { throw 'Need at least 2 subnets.' }
$seen = @{}
$subnets = @()
foreach ($r in $subnetRows) {
  if (-not $seen.ContainsKey($r.Az)) { $seen[$r.Az] = $true; $subnets += $r.SubnetId }
  if ($subnets.Count -ge 2) { break }
}
if ($subnets.Count -lt 2) { $subnets = @($subnetRows[0].SubnetId, $subnetRows[1].SubnetId) }
$defaultSg = aws ec2 describe-security-groups --region $Region --filters Name=vpc-id,Values=$vpcId Name=group-name,Values=default --query 'SecurityGroups[0].GroupId' --output text

# ECR ensure
$repoExists = aws ecr describe-repositories --region $Region --query "repositories[?repositoryName=='$RepoName'].repositoryName | [0]" --output text
if (-not $repoExists -or $repoExists -eq 'None') {
  aws ecr create-repository --repository-name $RepoName --image-scanning-configuration scanOnPush=true --region $Region | Out-Null
}

$imageTag = (Get-Date).ToString('yyyyMMddHHmmss')
$imageUri = "${accountId}.dkr.ecr.${Region}.amazonaws.com/${RepoName}:${imageTag}"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "${accountId}.dkr.ecr.${Region}.amazonaws.com" | Out-Null
docker build -t $imageUri .\api | Out-Null
docker push $imageUri | Out-Null

# Secret ensure
$envMap = @{}
Get-Content .\api\.env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_.Split('=', 2)
  if ($parts.Count -eq 2) { $envMap[$parts[0].Trim()] = $parts[1].Trim() }
}
if (-not $envMap.ContainsKey('PUBLIC_BASE_URL')) { $envMap['PUBLIC_BASE_URL'] = 'https://api.mysmartwork.tech' }
if (-not $envMap.ContainsKey('WHATSAPP_VERIFY_TOKEN')) { $envMap['WHATSAPP_VERIFY_TOKEN'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_ACCESS_TOKEN')) { $envMap['WHATSAPP_ACCESS_TOKEN'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_PHONE_NUMBER_ID')) { $envMap['WHATSAPP_PHONE_NUMBER_ID'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_GRAPH_VERSION')) { $envMap['WHATSAPP_GRAPH_VERSION'] = 'v20.0' }
if (-not $envMap.ContainsKey('OPENAI_API_KEY')) { $envMap['OPENAI_API_KEY'] = '' }
if (-not $envMap.ContainsKey('OPENAI_MODEL')) { $envMap['OPENAI_MODEL'] = 'gpt-4o-mini' }

$secretJson = $envMap | ConvertTo-Json -Compress
$secretArn = aws secretsmanager list-secrets --region $Region --query "SecretList[?Name=='$SecretName'].ARN | [0]" --output text
if ($secretArn -and $secretArn -ne 'None') {
  aws secretsmanager put-secret-value --secret-id $SecretName --secret-string $secretJson --region $Region | Out-Null
} else {
  $secretArn = aws secretsmanager create-secret --name $SecretName --secret-string $secretJson --region $Region --query ARN --output text
}

# IAM roles ensure
$trust = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
$execExists = aws iam list-roles --query "Roles[?RoleName=='ecsTaskExecutionRole'].RoleName | [0]" --output text
if (-not $execExists -or $execExists -eq 'None') {
  aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document $trust | Out-Null
}
$taskExists = aws iam list-roles --query "Roles[?RoleName=='mwangazaApiTaskRole'].RoleName | [0]" --output text
if (-not $taskExists -or $taskExists -eq 'None') {
  aws iam create-role --role-name mwangazaApiTaskRole --assume-role-policy-document $trust | Out-Null
}
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy | Out-Null
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
aws iam attach-role-policy --role-name mwangazaApiTaskRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
$execRoleArn = aws iam get-role --role-name ecsTaskExecutionRole --query Role.Arn --output text
$taskRoleArn = aws iam get-role --role-name mwangazaApiTaskRole --query Role.Arn --output text

# Log group ensure
try { aws logs create-log-group --log-group-name $LogGroup --region $Region | Out-Null } catch {}

# Security groups ensure
$albSg = aws ec2 describe-security-groups --region $Region --filters Name=group-name,Values=mwangaza-api-alb-sg Name=vpc-id,Values=$vpcId --query 'SecurityGroups[0].GroupId' --output text
if (-not $albSg -or $albSg -eq 'None') {
  $albSg = aws ec2 create-security-group --group-name mwangaza-api-alb-sg --description 'ALB SG for mwangaza api' --vpc-id $vpcId --region $Region --query GroupId --output text
}
$ecsSg = aws ec2 describe-security-groups --region $Region --filters Name=group-name,Values=mwangaza-api-ecs-sg Name=vpc-id,Values=$vpcId --query 'SecurityGroups[0].GroupId' --output text
if (-not $ecsSg -or $ecsSg -eq 'None') {
  $ecsSg = aws ec2 create-security-group --group-name mwangaza-api-ecs-sg --description 'ECS SG for mwangaza api' --vpc-id $vpcId --region $Region --query GroupId --output text
}
try { aws ec2 authorize-security-group-ingress --group-id $albSg --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region | Out-Null } catch {}
try { aws ec2 authorize-security-group-ingress --group-id $albSg --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region | Out-Null } catch {}
try { aws ec2 authorize-security-group-ingress --group-id $ecsSg --protocol tcp --port 4000 --source-group $albSg --region $Region | Out-Null } catch {}
try { aws ec2 authorize-security-group-ingress --group-id $defaultSg --protocol tcp --port 5439 --source-group $ecsSg --region $Region | Out-Null } catch {}

# ECS cluster ensure
try { aws ecs create-cluster --cluster-name $ClusterName --region $Region | Out-Null } catch {}

# ALB + TG ensure
$albArn = aws elbv2 describe-load-balancers --region $Region --query "LoadBalancers[?LoadBalancerName=='$AlbName'].LoadBalancerArn | [0]" --output text
if (-not $albArn -or $albArn -eq 'None') {
  $albArn = aws elbv2 create-load-balancer --name $AlbName --subnets $subnets --security-groups $albSg --scheme internet-facing --type application --ip-address-type ipv4 --region $Region --query 'LoadBalancers[0].LoadBalancerArn' --output text
}
$albDns = aws elbv2 describe-load-balancers --load-balancer-arns $albArn --region $Region --query 'LoadBalancers[0].DNSName' --output text

$tgArn = aws elbv2 describe-target-groups --region $Region --query "TargetGroups[?TargetGroupName=='$TgName'].TargetGroupArn | [0]" --output text
if (-not $tgArn -or $tgArn -eq 'None') {
  $tgArn = aws elbv2 create-target-group --name $TgName --protocol HTTP --port 4000 --vpc-id $vpcId --target-type ip --health-check-path /health --health-check-protocol HTTP --health-check-interval-seconds 30 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --matcher HttpCode=200 --region $Region --query 'TargetGroups[0].TargetGroupArn' --output text
}

$listeners = aws elbv2 describe-listeners --load-balancer-arn $albArn --region $Region --output json | ConvertFrom-Json
if (-not ($listeners.Listeners | Where-Object { $_.Port -eq 80 })) {
  aws elbv2 create-listener --load-balancer-arn $albArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$tgArn --region $Region | Out-Null
}

# ACM cert ensure
$certArn = aws acm list-certificates --region $Region --query "CertificateSummaryList[?DomainName=='api.mysmartwork.tech'].CertificateArn | [0]" --output text
if (-not $certArn -or $certArn -eq 'None') {
  $certArn = aws acm request-certificate --domain-name api.mysmartwork.tech --validation-method DNS --region $Region --query CertificateArn --output text
}
$certInfo = aws acm describe-certificate --certificate-arn $certArn --region $Region --output json | ConvertFrom-Json
$certStatus = $certInfo.Certificate.Status
if ($certStatus -eq 'ISSUED') {
  if (-not ($listeners.Listeners | Where-Object { $_.Port -eq 443 })) {
    aws elbv2 create-listener --load-balancer-arn $albArn --protocol HTTPS --port 443 --certificates CertificateArn=$certArn --default-actions Type=forward,TargetGroupArn=$tgArn --region $Region | Out-Null
  }
}

# Task definition register
$taskObj = @{
  family = $TaskFamily
  networkMode = 'awsvpc'
  requiresCompatibilities = @('FARGATE')
  cpu = '512'
  memory = '1024'
  executionRoleArn = $execRoleArn
  taskRoleArn = $taskRoleArn
  containerDefinitions = @(
    @{
      name = 'api'
      image = $imageUri
      essential = $true
      portMappings = @(
        @{ containerPort = 4000; hostPort = 4000; protocol = 'tcp' }
      )
      secrets = @(
        @{name='REDSHIFT_HOST';valueFrom="$secretArn`:REDSHIFT_HOST::"},
        @{name='REDSHIFT_PORT';valueFrom="$secretArn`:REDSHIFT_PORT::"},
        @{name='REDSHIFT_DB';valueFrom="$secretArn`:REDSHIFT_DB::"},
        @{name='REDSHIFT_USER';valueFrom="$secretArn`:REDSHIFT_USER::"},
        @{name='REDSHIFT_PASSWORD';valueFrom="$secretArn`:REDSHIFT_PASSWORD::"},
        @{name='REDSHIFT_SCHEMA';valueFrom="$secretArn`:REDSHIFT_SCHEMA::"},
        @{name='REDSHIFT_SSL';valueFrom="$secretArn`:REDSHIFT_SSL::"},
        @{name='PUBLIC_BASE_URL';valueFrom="$secretArn`:PUBLIC_BASE_URL::"},
        @{name='WHATSAPP_VERIFY_TOKEN';valueFrom="$secretArn`:WHATSAPP_VERIFY_TOKEN::"},
        @{name='WHATSAPP_ACCESS_TOKEN';valueFrom="$secretArn`:WHATSAPP_ACCESS_TOKEN::"},
        @{name='WHATSAPP_PHONE_NUMBER_ID';valueFrom="$secretArn`:WHATSAPP_PHONE_NUMBER_ID::"},
        @{name='WHATSAPP_GRAPH_VERSION';valueFrom="$secretArn`:WHATSAPP_GRAPH_VERSION::"},
        @{name='OPENAI_API_KEY';valueFrom="$secretArn`:OPENAI_API_KEY::"},
        @{name='OPENAI_MODEL';valueFrom="$secretArn`:OPENAI_MODEL::"}
      )
      logConfiguration = @{ logDriver='awslogs'; options=@{'awslogs-group'=$LogGroup; 'awslogs-region'=$Region; 'awslogs-stream-prefix'='ecs'} }
    }
  )
}
$tmpTaskDef = Join-Path $env:TEMP 'mwangaza-taskdef-recover.json'
$taskObj | ConvertTo-Json -Depth 12 | Set-Content -Path $tmpTaskDef -Encoding ascii
$taskDefArn = aws ecs register-task-definition --cli-input-json file://$tmpTaskDef --region $Region --query 'taskDefinition.taskDefinitionArn' --output text

# Service ensure
$svcObj = aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region --output json | ConvertFrom-Json
if (-not $svcObj.services -or $svcObj.services.Count -eq 0 -or $svcObj.services[0].status -eq 'INACTIVE') {
  $subnetList = $subnets -join ','
  aws ecs create-service --cluster $ClusterName --service-name $ServiceName --task-definition $taskDefArn --desired-count 2 --launch-type FARGATE --platform-version LATEST --network-configuration "awsvpcConfiguration={subnets=[$subnetList],securityGroups=[$ecsSg],assignPublicIp=ENABLED}" --load-balancers "targetGroupArn=$tgArn,containerName=api,containerPort=4000" --health-check-grace-period-seconds 60 --region $Region | Out-Null
} else {
  aws ecs update-service --cluster $ClusterName --service $ServiceName --task-definition $taskDefArn --desired-count 2 --region $Region | Out-Null
}

# Autoscaling + alarms
$resourceId = "service/$ClusterName/$ServiceName"
aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id $resourceId --scalable-dimension ecs:service:DesiredCount --min-capacity 2 --max-capacity 6 --region $Region | Out-Null
$tmpPolicy = Join-Path $env:TEMP 'mwangaza-scaling-policy.json'
@'
{
  "TargetValue": 55.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 120,
  "ScaleOutCooldown": 60
}
'@ | Set-Content -Path $tmpPolicy -Encoding ascii
aws application-autoscaling put-scaling-policy --service-namespace ecs --resource-id $resourceId --scalable-dimension ecs:service:DesiredCount --policy-name mwangaza-cpu-target --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration file://$tmpPolicy --region $Region | Out-Null

aws cloudwatch put-metric-alarm --alarm-name mwangaza-api-ecs-cpu-high --metric-name CPUUtilization --namespace AWS/ECS --statistic Average --period 60 --threshold 80 --comparison-operator GreaterThanThreshold --evaluation-periods 5 --alarm-description 'High CPU on ECS service' --dimensions Name=ClusterName,Value=$ClusterName Name=ServiceName,Value=$ServiceName --region $Region | Out-Null
$tgSuffix = ($tgArn -split 'targetgroup/')[1]
$lbSuffix = ($albArn -split 'loadbalancer/')[1]
aws cloudwatch put-metric-alarm --alarm-name mwangaza-api-unhealthy-hosts --metric-name UnHealthyHostCount --namespace AWS/ApplicationELB --statistic Average --period 60 --threshold 0 --comparison-operator GreaterThanThreshold --evaluation-periods 2 --alarm-description 'Unhealthy targets in API target group' --dimensions Name=TargetGroup,Value=targetgroup/$tgSuffix Name=LoadBalancer,Value=$lbSuffix --region $Region | Out-Null

aws ecs wait services-stable --cluster $ClusterName --services $ServiceName --region $Region

$certInfo = aws acm describe-certificate --certificate-arn $certArn --region $Region --output json | ConvertFrom-Json
$record = $certInfo.Certificate.DomainValidationOptions[0].ResourceRecord

Write-Output "API_ALB_DNS=$albDns"
Write-Output "ECS_CLUSTER=$ClusterName"
Write-Output "ECS_SERVICE=$ServiceName"
Write-Output "ECR_IMAGE=$imageUri"
Write-Output "CERT_ARN=$certArn"
Write-Output "CERT_STATUS=$($certInfo.Certificate.Status)"
Write-Output "CERT_RR_NAME=$($record.Name)"
Write-Output "CERT_RR_TYPE=$($record.Type)"
Write-Output "CERT_RR_VALUE=$($record.Value)"