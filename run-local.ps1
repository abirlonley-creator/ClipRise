$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Get-Command python -ErrorAction SilentlyContinue
$launcherArgs = @()
if (-not $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
  if ($python) { $launcherArgs += '-3' }
}
if (-not $python) { throw 'Python was not found. Install Python 3, then double-click this launcher again.' }

$port = $null
foreach ($candidate in 8000..8099) {
  $probe = $null
  try {
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
    $probe.Start()
    $probe.Stop()
    $port = $candidate
    break
  } catch {
    if ($probe) { $probe.Stop() }
  }
}
if (-not $port) { throw 'No free local port was found between 8000 and 8099.' }

$serverArgs = $launcherArgs + @('-m', 'http.server', "$port", '--bind', '127.0.0.1')
$server = Start-Process -FilePath $python.Source -ArgumentList $serverArgs -WorkingDirectory $siteRoot -PassThru
$url = "http://127.0.0.1:$port/"
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    Start-Sleep -Milliseconds 250
  }
}
if (-not $ready) {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  throw "The local server did not become ready at $url."
}
Start-Process $url
Write-Host "ClipRise is open at $url"
Write-Host 'Keep the Python server window open while previewing. Close it to stop the local site.'
