param(
  [string]$ProfileName = 'rnbevents716',
  [string]$Region = 'us-east-1',
  [int]$DesiredCount = 1,
  [int]$MinCapacity = 1,
  [int]$MaxCapacity = 1,
  [switch]$EnableAutoScaling,
  [int]$LogRetentionDays = 7
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $true

$env:AWS_PROFILE = $ProfileName
$App = 'mwangaza-api'
$RepoName = 'mwangaza-api'
$ClusterName = 'mwangaza-api-cluster'
$ServiceName = 'mwangaza-api-service'
$TaskFamily = 'mwangaza-api-task'
$AlbName = 'mwangaza-api-alb'
$TgName = 'mwangaza-api-tg'
$LogGroup = '/ecs/mwangaza-api'

Set-Location (Join-Path $PSScriptRoot '..')
$AccountId = aws sts get-caller-identity --query Account --output text

# Discover default network dynamically in the active account/region.
$VpcId = aws ec2 describe-vpcs --region $Region --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text
if (-not $VpcId -or $VpcId -eq 'None') {
  throw "No default VPC found in $Region."
}

$subnetQuery = "Subnets[?VpcId=='$VpcId'] | sort_by(@,&AvailabilityZone)[].{SubnetId:SubnetId,Az:AvailabilityZone}"
$subnetRows = aws ec2 describe-subnets --region $Region --query $subnetQuery --output json | ConvertFrom-Json
if (-not $subnetRows -or $subnetRows.Count -lt 2) {
  throw "At least two subnets are required for ALB/ECS."
}

$seenAz = @{}
$Subnets = @()
foreach ($row in $subnetRows) {
  if (-not $seenAz.ContainsKey($row.Az)) {
    $seenAz[$row.Az] = $true
    $Subnets += $row.SubnetId
  }
  if ($Subnets.Count -ge 2) { break }
}
if ($Subnets.Count -lt 2) {
  $Subnets = @($subnetRows[0].SubnetId, $subnetRows[1].SubnetId)
}

$DefaultSg = aws ec2 describe-security-groups --region $Region --filters Name=vpc-id,Values=$VpcId Name=group-name,Values=default --query "SecurityGroups[0].GroupId" --output text
if (-not $DefaultSg -or $DefaultSg -eq 'None') {
  throw "Default security group not found for VPC $VpcId."
}

# ECR repository
$repoExisting = aws ecr describe-repositories --region $Region --query "repositories[?repositoryName=='$RepoName'].repositoryName | [0]" --output text
if (-not $repoExisting -or $repoExisting -eq 'None') {
  aws ecr create-repository --repository-name $RepoName --image-scanning-configuration scanOnPush=true --region $Region | Out-Null
}
$ImageTag = (Get-Date).ToString('yyyyMMddHHmmss')
$ImageUri = "${AccountId}.dkr.ecr.${Region}.amazonaws.com/${RepoName}:${ImageTag}"

# Build and push API image
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
docker build -t $ImageUri .\api
docker push $ImageUri

# Secret payload from api/.env + placeholders
$envMap = @{}
Get-Content .\api\.env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_.Split('=', 2)
  if ($parts.Count -eq 2) { $envMap[$parts[0].Trim()] = $parts[1].Trim() }
}
if (-not $envMap.ContainsKey('PUBLIC_BASE_URL')) { $envMap['PUBLIC_BASE_URL'] = 'https://api.mysmartwork.tech' }
if (-not $envMap.ContainsKey('DATABASE_URL') -and -not $envMap.ContainsKey('NEON_DATABASE_URL')) {
  if ($envMap.ContainsKey('NEON_HOST') -and $envMap.ContainsKey('NEON_DB') -and $envMap.ContainsKey('NEON_USER') -and $envMap.ContainsKey('NEON_PASSWORD')) {
    $dbPort = if ($envMap.ContainsKey('NEON_PORT')) { $envMap['NEON_PORT'] } else { '5432' }
    $sslMode = if ($envMap.ContainsKey('NEON_SSL')) { $envMap['NEON_SSL'] } else { 'true' }
    $envMap['DATABASE_URL'] = "postgresql://$($envMap['NEON_USER']):$($envMap['NEON_PASSWORD'])@$($envMap['NEON_HOST']):$dbPort/$($envMap['NEON_DB'])?sslmode=$sslMode"
  }
}
if (-not $envMap.ContainsKey('WHATSAPP_VERIFY_TOKEN')) { $envMap['WHATSAPP_VERIFY_TOKEN'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_ACCESS_TOKEN')) { $envMap['WHATSAPP_ACCESS_TOKEN'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_PHONE_NUMBER_ID')) { $envMap['WHATSAPP_PHONE_NUMBER_ID'] = '' }
if (-not $envMap.ContainsKey('WHATSAPP_GRAPH_VERSION')) { $envMap['WHATSAPP_GRAPH_VERSION'] = 'v20.0' }
if (-not $envMap.ContainsKey('OPENAI_API_KEY')) { $envMap['OPENAI_API_KEY'] = '' }
if (-not $envMap.ContainsKey('OPENAI_MODEL')) { $envMap['OPENAI_MODEL'] = 'gpt-4o-mini' }

$SecretName = 'mwangaza/api/prod'
$SecretJson = ($envMap | ConvertTo-Json -Compress)
$SecretArn = ''
$SecretExisting = aws secretsmanager list-secrets --region $Region --query "SecretList[?Name=='$SecretName'].ARN | [0]" --output text
if ($SecretExisting -and $SecretExisting -ne 'None') {
  $SecretArn = $SecretExisting
  aws secretsmanager put-secret-value --secret-id $SecretName --secret-string $SecretJson --region $Region | Out-Null
} else {
  $SecretArn = aws secretsmanager create-secret --name $SecretName --secret-string $SecretJson --region $Region --query ARN --output text
}

# IAM roles
$ExecRoleArn = ''
try {
  $ExecRoleArn = aws iam get-role --role-name ecsTaskExecutionRole --query Role.Arn --output text
} catch {
  $trust = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document $trust | Out-Null
  aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy | Out-Null
  aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
  $ExecRoleArn = aws iam get-role --role-name ecsTaskExecutionRole --query Role.Arn --output text
}

$TaskRoleName = 'mwangazaApiTaskRole'
$TaskRoleArn = ''
try {
  $TaskRoleArn = aws iam get-role --role-name $TaskRoleName --query Role.Arn --output text
} catch {
  $trust = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  aws iam create-role --role-name $TaskRoleName --assume-role-policy-document $trust | Out-Null
  aws iam attach-role-policy --role-name $TaskRoleName --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
  $TaskRoleArn = aws iam get-role --role-name $TaskRoleName --query Role.Arn --output text
}

try { aws logs create-log-group --log-group-name $LogGroup --region $Region | Out-Null } catch {}
try { aws logs put-retention-policy --log-group-name $LogGroup --retention-in-days $LogRetentionDays --region $Region | Out-Null } catch {}

# Security groups
$AlbSgId = ''
$EcsSgId = ''
$albExisting = aws ec2 describe-security-groups --filters Name=group-name,Values=mwangaza-api-alb-sg Name=vpc-id,Values=$VpcId --region $Region --query "SecurityGroups[0].GroupId" --output text
if ($albExisting -and $albExisting -ne 'None') {
  $AlbSgId = $albExisting
} else {
  $AlbSgId = aws ec2 create-security-group --group-name mwangaza-api-alb-sg --description "ALB SG for mwangaza api" --vpc-id $VpcId --region $Region --query GroupId --output text
}

$ecsExisting = aws ec2 describe-security-groups --filters Name=group-name,Values=mwangaza-api-ecs-sg Name=vpc-id,Values=$VpcId --region $Region --query "SecurityGroups[0].GroupId" --output text
if ($ecsExisting -and $ecsExisting -ne 'None') {
  $EcsSgId = $ecsExisting
} else {
  $EcsSgId = aws ec2 create-security-group --group-name mwangaza-api-ecs-sg --description "ECS SG for mwangaza api" --vpc-id $VpcId --region $Region --query GroupId --output text
}

try { aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region | Out-Null } catch {}
try { aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region | Out-Null } catch {}
try { aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 4000 --source-group $AlbSgId --region $Region | Out-Null } catch {}
# ECS cluster
try { aws ecs create-cluster --cluster-name $ClusterName --region $Region | Out-Null } catch {}

# ALB and target group
$AlbArn = aws elbv2 describe-load-balancers --region $Region --query "LoadBalancers[?LoadBalancerName=='$AlbName'].LoadBalancerArn | [0]" --output text
if (-not $AlbArn -or $AlbArn -eq 'None') {
  $AlbArn = aws elbv2 create-load-balancer --name $AlbName --subnets $Subnets --security-groups $AlbSgId --scheme internet-facing --type application --ip-address-type ipv4 --region $Region --query "LoadBalancers[0].LoadBalancerArn" --output text
}
$AlbDns = aws elbv2 describe-load-balancers --load-balancer-arns $AlbArn --region $Region --query "LoadBalancers[0].DNSName" --output text

$TgArn = aws elbv2 describe-target-groups --region $Region --query "TargetGroups[?TargetGroupName=='$TgName'].TargetGroupArn | [0]" --output text
if (-not $TgArn -or $TgArn -eq 'None') {
  $TgArn = aws elbv2 create-target-group --name $TgName --protocol HTTP --port 4000 --vpc-id $VpcId --target-type ip --health-check-path /health --health-check-protocol HTTP --health-check-interval-seconds 30 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --matcher HttpCode=200 --region $Region --query "TargetGroups[0].TargetGroupArn" --output text
}

$ListenerArn = aws elbv2 describe-listeners --load-balancer-arn $AlbArn --region $Region --query 'Listeners[?Port==`80`].ListenerArn | [0]' --output text
if (-not $ListenerArn -or $ListenerArn -eq 'None') {
  aws elbv2 create-listener --load-balancer-arn $AlbArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgArn --region $Region | Out-Null
}

# ACM certificate for API domain
$CertArn = aws acm list-certificates --region $Region --query "CertificateSummaryList[?DomainName=='api.mysmartwork.tech'].CertificateArn | [0]" --output text
if (-not $CertArn -or $CertArn -eq 'None') {
  $CertArn = aws acm request-certificate --domain-name api.mysmartwork.tech --validation-method DNS --region $Region --query CertificateArn --output text
}
$CertValidation = aws acm describe-certificate --certificate-arn $CertArn --region $Region --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output json

# Add HTTPS listener automatically once cert is issued.
$CertStatus = aws acm describe-certificate --certificate-arn $CertArn --region $Region --query "Certificate.Status" --output text
if ($CertStatus -eq 'ISSUED') {
  $HttpsListenerArn = aws elbv2 describe-listeners --load-balancer-arn $AlbArn --region $Region --query 'Listeners[?Port==`443`].ListenerArn | [0]' --output text
  if (-not $HttpsListenerArn -or $HttpsListenerArn -eq 'None') {
    aws elbv2 create-listener --load-balancer-arn $AlbArn --protocol HTTPS --port 443 --certificates CertificateArn=$CertArn --default-actions Type=forward,TargetGroupArn=$TgArn --region $Region | Out-Null
  }
}

# Task definition
$TaskDefPath = Join-Path $env:TEMP 'mwangaza-taskdef.json'
$taskDef = @"
{
  "family": "$TaskFamily",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$ExecRoleArn",
  "taskRoleArn": "$TaskRoleArn",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "$ImageUri",
      "essential": true,
      "portMappings": [
        { "containerPort": 4000, "hostPort": 4000, "protocol": "tcp" }
      ],
      "secrets": [
        {"name":"DATABASE_URL","valueFrom":"$SecretArn:DATABASE_URL::"},
        {"name":"NEON_HOST","valueFrom":"$SecretArn:NEON_HOST::"},
        {"name":"NEON_PORT","valueFrom":"$SecretArn:NEON_PORT::"},
        {"name":"NEON_DB","valueFrom":"$SecretArn:NEON_DB::"},
        {"name":"NEON_USER","valueFrom":"$SecretArn:NEON_USER::"},
        {"name":"NEON_PASSWORD","valueFrom":"$SecretArn:NEON_PASSWORD::"},
        {"name":"NEON_SSL","valueFrom":"$SecretArn:NEON_SSL::"},
        {"name":"PUBLIC_BASE_URL","valueFrom":"$SecretArn:PUBLIC_BASE_URL::"},
        {"name":"WHATSAPP_VERIFY_TOKEN","valueFrom":"$SecretArn:WHATSAPP_VERIFY_TOKEN::"},
        {"name":"WHATSAPP_ACCESS_TOKEN","valueFrom":"$SecretArn:WHATSAPP_ACCESS_TOKEN::"},
        {"name":"WHATSAPP_PHONE_NUMBER_ID","valueFrom":"$SecretArn:WHATSAPP_PHONE_NUMBER_ID::"},
        {"name":"WHATSAPP_GRAPH_VERSION","valueFrom":"$SecretArn:WHATSAPP_GRAPH_VERSION::"},
        {"name":"OPENAI_API_KEY","valueFrom":"$SecretArn:OPENAI_API_KEY::"},
        {"name":"OPENAI_MODEL","valueFrom":"$SecretArn:OPENAI_MODEL::"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$LogGroup",
          "awslogs-region": "$Region",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
"@
Set-Content -Path $TaskDefPath -Value $taskDef -Encoding utf8NoBOM
$TaskDefArn = aws ecs register-task-definition --cli-input-json file://$TaskDefPath --region $Region --query "taskDefinition.taskDefinitionArn" --output text

# Service create/update
$SvcArn = aws ecs describe-services --cluster $ClusterName --services $ServiceName --region $Region --query "services[0].serviceArn" --output text 2>$null
$SubnetsList = ($Subnets -join ',')
if (-not $SvcArn -or $SvcArn -eq 'None') {
  aws ecs create-service --cluster $ClusterName --service-name $ServiceName --task-definition $TaskDefArn --desired-count $DesiredCount --launch-type FARGATE --platform-version LATEST --network-configuration "awsvpcConfiguration={subnets=[$SubnetsList],securityGroups=[$EcsSgId],assignPublicIp=ENABLED}" --load-balancers "targetGroupArn=$TgArn,containerName=api,containerPort=4000" --health-check-grace-period-seconds 60 --region $Region | Out-Null
} else {
  aws ecs update-service --cluster $ClusterName --service $ServiceName --task-definition $TaskDefArn --desired-count $DesiredCount --region $Region | Out-Null
}

# Auto scaling (disabled by default for lower cost)
$ResourceId = "service/$ClusterName/$ServiceName"
if ($EnableAutoScaling) {
  aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id $ResourceId --scalable-dimension ecs:service:DesiredCount --min-capacity $MinCapacity --max-capacity $MaxCapacity --region $Region | Out-Null
  aws application-autoscaling put-scaling-policy --service-namespace ecs --resource-id $ResourceId --scalable-dimension ecs:service:DesiredCount --policy-name mwangaza-cpu-target --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration '{"TargetValue":55.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"},"ScaleInCooldown":120,"ScaleOutCooldown":60}' --region $Region | Out-Null
}

# CloudWatch alarms
aws cloudwatch put-metric-alarm --alarm-name mwangaza-api-ecs-cpu-high --metric-name CPUUtilization --namespace AWS/ECS --statistic Average --period 60 --threshold 80 --comparison-operator GreaterThanThreshold --evaluation-periods 5 --alarm-description "High CPU on ECS service" --dimensions Name=ClusterName,Value=$ClusterName Name=ServiceName,Value=$ServiceName --region $Region | Out-Null
$TgFullArn = aws elbv2 describe-target-groups --target-group-arns $TgArn --region $Region --query "TargetGroups[0].TargetGroupArn" --output text
$LbFullArn = aws elbv2 describe-load-balancers --load-balancer-arns $AlbArn --region $Region --query "LoadBalancers[0].LoadBalancerArn" --output text
$TgSuffix = $TgFullArn.Split('targetgroup/')[1]
$LbSuffix = $LbFullArn.Split('loadbalancer/')[1]
aws cloudwatch put-metric-alarm --alarm-name mwangaza-api-unhealthy-hosts --metric-name UnHealthyHostCount --namespace AWS/ApplicationELB --statistic Average --period 60 --threshold 0 --comparison-operator GreaterThanThreshold --evaluation-periods 2 --alarm-description "Unhealthy targets in API target group" --dimensions Name=TargetGroup,Value=targetgroup/$TgSuffix Name=LoadBalancer,Value=$LbSuffix --region $Region | Out-Null

# Wait stable
aws ecs wait services-stable --cluster $ClusterName --services $ServiceName --region $Region

Write-Output "ALB_DNS=$AlbDns"
Write-Output "CERT_ARN=$CertArn"
Write-Output "CERT_STATUS=$CertStatus"
Write-Output "CERT_DNS_VALIDATION=$CertValidation"
Write-Output "SECRET_ARN=$SecretArn"
Write-Output "ECS_SERVICE=$ServiceName"
