Param(
  [switch]$UntrackVendor,
  [switch]$UntrackDB
)

Write-Host "
=== RealOrCake bootstrap script ===
This script will build/start Docker containers, install Composer deps inside the web container,
fix SQLite data permissions and initialize the DB. Optional: untrack vendor/ and data/database.sqlite in git.
" -ForegroundColor Cyan

# Ensure we run from repository root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir\.. | Out-Null

# 1) Build and start containers
Write-Host "Bringing up Docker containers..." -ForegroundColor Yellow
& docker-compose down
& docker-compose up --build -d

# short wait for container to initialize
Start-Sleep -Seconds 2

# 2) Install composer dependencies inside web container
Write-Host "Installing Composer dependencies inside 'web' container..." -ForegroundColor Yellow
try{
  & docker-compose exec web composer install --no-interaction --no-progress
}catch{
  Write-Host "Composer inside container failed or composer not available. Trying docker run composer..." -ForegroundColor Yellow
  & docker run --rm -v "${PWD}:/app" -w /app composer install --no-interaction --no-progress
}

# 3) Fix permissions for SQLite data directory
Write-Host "Fixing permissions for data/ in container..." -ForegroundColor Yellow
& docker-compose exec web bash -lc "chown -R www-data:www-data /var/www/html/data || true; chmod -R 775 /var/www/html/data || true"

# 4) Initialize database
Write-Host "Initializing/Updating database via init_db.php..." -ForegroundColor Yellow
& docker-compose exec web php init_db.php || Write-Host "init_db.php returned non-zero exit code (may be benign)" -ForegroundColor Yellow

# 5) Optionally untrack vendor/ and DB in git
if($UntrackVendor){
  Write-Host "Untracking vendor/ from git index..." -ForegroundColor Yellow
  & git rm -r --cached vendor || Write-Host "Failed to git rm vendor (maybe not tracked)" -ForegroundColor Yellow
  & git commit -m "Stop tracking vendor/ (use composer install)" || Write-Host "No commit created (nothing to commit)" -ForegroundColor Yellow
}
if($UntrackDB){
  Write-Host "Untracking data/database.sqlite from git index..." -ForegroundColor Yellow
  & git rm --cached data/database.sqlite || Write-Host "Failed to git rm data/database.sqlite (maybe not tracked)" -ForegroundColor Yellow
  & git commit -m "Stop tracking local sqlite DB" || Write-Host "No commit created (nothing to commit)" -ForegroundColor Yellow
}

Write-Host "\nBootstrap complete. Open http://localhost:8000 in your browser." -ForegroundColor Green
