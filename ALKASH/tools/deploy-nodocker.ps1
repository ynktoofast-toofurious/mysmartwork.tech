param(
  [Parameter(Mandatory = $true)]
  [string]$ServerHost,
  [string]$ServerUser = 'ubuntu',
  [int]$SshPort = 22,
  [string]$KeyPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$releaseId = (Get-Date).ToString('yyyyMMddHHmmss')
$archivePath = Join-Path $env:TEMP "alkash-trans-$releaseId.tgz"

Write-Host "Creating release archive $archivePath"
& tar -czf $archivePath --exclude=.git --exclude=node_modules --exclude=dist --exclude=.DS_Store -C $repoRoot .
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to create release archive.'
}

Write-Host "Uploading release archive to $ServerUser@$ServerHost"
if ($KeyPath) {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath $archivePath "${ServerUser}@${ServerHost}:/tmp/alkash-trans-$releaseId.tgz"
} else {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new $archivePath "${ServerUser}@${ServerHost}:/tmp/alkash-trans-$releaseId.tgz"
}

$remoteScript = @"
set -euo pipefail
sudo mkdir -p /opt/alkash-trans/releases
sudo mkdir -p /var/www
sudo mkdir -p /etc/nginx/snippets

sudo mkdir -p /opt/alkash-trans/releases/$releaseId
sudo tar -xzf /tmp/alkash-trans-$releaseId.tgz -C /opt/alkash-trans/releases/$releaseId

cd /opt/alkash-trans/releases/$releaseId
npm ci
npm run build

sudo ln -sfn /opt/alkash-trans/releases/$releaseId /opt/alkash-trans/current

if [ -f /opt/alkash-trans/current/deploy/nodocker/nginx-alkash.conf ]; then
  sudo cp /opt/alkash-trans/current/deploy/nodocker/nginx-alkash.conf /etc/nginx/snippets/alkash-trans-subpath.conf
fi

sudo ln -sfn /opt/alkash-trans/current/dist /var/www/alkash-trans-site

sudo nginx -t
sudo systemctl reload nginx

echo "ALKASH-TRANS no-Docker deploy complete"
echo "Include /etc/nginx/snippets/alkash-trans-subpath.conf inside the mysmartwork.tech server block if it is not already included."
"@

$remoteScriptPath = Join-Path $env:TEMP "alkash-trans-$releaseId-remote.sh"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($remoteScriptPath, $remoteScript, $utf8NoBom)

Write-Host "Uploading remote script to $ServerUser@$ServerHost"
if ($KeyPath) {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath $remoteScriptPath "${ServerUser}@${ServerHost}:/tmp/alkash-trans-$releaseId-remote.sh"
} else {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new $remoteScriptPath "${ServerUser}@${ServerHost}:/tmp/alkash-trans-$releaseId-remote.sh"
}

$remoteCommand = "bash /tmp/alkash-trans-$releaseId-remote.sh"

Write-Host 'Running remote deploy steps'
if ($KeyPath) {
  & ssh -p $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath "${ServerUser}@${ServerHost}" $remoteCommand
} else {
  & ssh -p $SshPort -o StrictHostKeyChecking=accept-new "${ServerUser}@${ServerHost}" $remoteCommand
}

Remove-Item -Path $archivePath -ErrorAction SilentlyContinue
Remove-Item -Path $remoteScriptPath -ErrorAction SilentlyContinue

Write-Host 'Deployment finished.'
Write-Host 'Next: include /etc/nginx/snippets/alkash-trans-subpath.conf in the existing mysmartwork.tech Nginx server block, then reload Nginx.'
