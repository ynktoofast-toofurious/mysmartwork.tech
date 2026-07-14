param(
  [Parameter(Mandatory = $true)]
  [string]$ServerHost,
  [string]$ServerUser = 'ubuntu',
  [int]$SshPort = 22,
  [string]$KeyPath = '',
  [string]$SiteDomain = 'mysmartwork.tech',
  [string]$SiteDomainAlias = 'www.mysmartwork.tech',
  [string]$ApiDomain = 'api.mysmartwork.tech'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$releaseId = (Get-Date).ToString('yyyyMMddHHmmss')
$archivePath = Join-Path $env:TEMP "mwangaza-$releaseId.tgz"

Write-Host "Creating release archive $archivePath"
& tar -czf $archivePath --exclude=.git --exclude=node_modules --exclude=api/node_modules --exclude=ALKASH/node_modules --exclude=.DS_Store -C $repoRoot .
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to create release archive.'
}

Write-Host "Uploading release archive to $ServerUser@$ServerHost"
if ($KeyPath) {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath $archivePath "${ServerUser}@${ServerHost}:/tmp/mwangaza-$releaseId.tgz"
} else {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new $archivePath "${ServerUser}@${ServerHost}:/tmp/mwangaza-$releaseId.tgz"
}
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to upload release archive via scp. Check ServerHost and KeyPath.'
}

$remoteScript = @"
set -euo pipefail
sudo mkdir -p /opt/mwangaza/releases
sudo mkdir -p /var/www

sudo mkdir -p /opt/mwangaza/releases/$releaseId
sudo tar -xzf /tmp/mwangaza-$releaseId.tgz -C /opt/mwangaza/releases/$releaseId

cd /opt/mwangaza/releases/$releaseId/api
npm ci --omit=dev

cd /opt/mwangaza/releases/$releaseId/ALKASH
npm ci
npm run build

sudo ln -sfn /opt/mwangaza/releases/$releaseId /opt/mwangaza/current
sudo ln -sfn /opt/mwangaza/current/ALKASH/dist /var/www/alkash-trans-site

if [ -f /opt/mwangaza/current/deploy/nodocker/nginx-mwangaza.conf ]; then
  sudo sed \
    -e "s/__SITE_DOMAIN__/$SiteDomain/g" \
    -e "s/__SITE_DOMAIN_WWW__/$SiteDomainAlias/g" \
    -e "s/__API_DOMAIN__/$ApiDomain/g" \
    /opt/mwangaza/current/deploy/nodocker/nginx-mwangaza.conf | sudo tee /etc/nginx/sites-available/mwangaza.conf >/dev/null

  sudo ln -sfn /etc/nginx/sites-available/mwangaza.conf /etc/nginx/sites-enabled/mwangaza.conf
  if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
  fi
fi

sudo ln -sfn /opt/mwangaza/current /var/www/mwangaza-site

pm2 startOrReload /opt/mwangaza/current/deploy/nodocker/ecosystem.config.cjs --update-env
pm2 save

sudo nginx -t
sudo systemctl reload nginx

echo "No-Docker deploy complete"
"@

$remoteScriptPath = Join-Path $env:TEMP "mwangaza-$releaseId-remote.sh"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($remoteScriptPath, $remoteScript, $utf8NoBom)

Write-Host "Uploading remote script to $ServerUser@$ServerHost"
if ($KeyPath) {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath $remoteScriptPath "${ServerUser}@${ServerHost}:/tmp/mwangaza-$releaseId-remote.sh"
} else {
  & scp -P $SshPort -o StrictHostKeyChecking=accept-new $remoteScriptPath "${ServerUser}@${ServerHost}:/tmp/mwangaza-$releaseId-remote.sh"
}
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to upload remote script via scp. Check ServerHost and KeyPath.'
}

$remoteCommand = "bash /tmp/mwangaza-$releaseId-remote.sh"

Write-Host 'Running remote deploy steps'
if ($KeyPath) {
  & ssh -p $SshPort -o StrictHostKeyChecking=accept-new -i $KeyPath "${ServerUser}@${ServerHost}" $remoteCommand
} else {
  & ssh -p $SshPort -o StrictHostKeyChecking=accept-new "${ServerUser}@${ServerHost}" $remoteCommand
}
if ($LASTEXITCODE -ne 0) {
  throw 'Remote deploy command failed over ssh. Check server connectivity and logs.'
}

Remove-Item -Path $archivePath -ErrorAction SilentlyContinue
Remove-Item -Path $remoteScriptPath -ErrorAction SilentlyContinue

Write-Host 'Deployment finished.'
Write-Host "Next: run certbot on server for $ApiDomain and $SiteDomain if HTTPS is not configured yet."
