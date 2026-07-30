$ErrorActionPreference = "Stop"

# 1. Determine current active environment
$upstreamFile = ".\nginx\upstream.conf"
$currentColor = "blue"

if (Test-Path $upstreamFile) {
    $content = Get-Content $upstreamFile -Raw
    if ($content -match "assethub-green") {
        $currentColor = "green"
    }
}

$newColor = if ($currentColor -eq "blue") { "green" } else { "blue" }
Write-Host "Current active environment is: $currentColor" -ForegroundColor Cyan
Write-Host "Deploying new environment to: $newColor" -ForegroundColor Green

# 2. Start the new environment
Write-Host "Starting $newColor stack..." -ForegroundColor Yellow
docker compose -p assethub-$newColor -f docker-compose.app.yml up -d --build

# 3. Wait for new environment to be healthy
Write-Host "Waiting for new containers to be healthy..." -ForegroundColor Yellow
$containers = @("assethub-$newColor-frontend-1", "assethub-$newColor-backend-1")

foreach ($container in $containers) {
    $healthy = $false
    for ($i = 1; $i -le 30; $i++) {
        $status = docker inspect --format="{{.State.Health.Status}}" $container 2>$null
        if ($status -eq "healthy") {
            $healthy = $true
            Write-Host "$container is healthy!" -ForegroundColor Green
            break
        }
        Write-Host "Waiting for $container... ($i/30)"
        Start-Sleep -Seconds 5
    }
    
    if (-not $healthy) {
        Write-Host "ERROR: $container failed to become healthy. Aborting deployment." -ForegroundColor Red
        # Rollback (tear down the new one that failed)
        docker compose -p assethub-$newColor -f docker-compose.app.yml down
        exit 1
    }
}

# 4. Swap Nginx configuration
Write-Host "Swapping Nginx upstream to $newColor..." -ForegroundColor Yellow
$newUpstreamConfig = @"
upstream frontend_upstream {
    server assethub-$newColor-frontend-1:80;
}

upstream backend_upstream {
    server assethub-$newColor-backend-1:4000;
}
"@
Set-Content -Path $upstreamFile -Value $newUpstreamConfig

# Reload Nginx
Write-Host "Reloading Nginx..." -ForegroundColor Yellow
docker exec assethub-nginx nginx -s reload
Write-Host "Traffic successfully switched to $newColor!" -ForegroundColor Green

# 5. Tear down old environment
Write-Host "Tearing down old $currentColor environment..." -ForegroundColor Yellow
# Give active connections a few seconds to drain
Start-Sleep -Seconds 5
docker compose -p assethub-$currentColor -f docker-compose.app.yml down

Write-Host "Blue-Green deployment completed successfully!" -ForegroundColor Green
