# Automatinis Vercel Email Testavimas
# Bandys gauti URL ir testuoti email siuntimą

Write-Host "=== AUTOMATINIS VERCEL EMAIL TESTAVIMAS ===" -ForegroundColor Cyan
Write-Host ""

# Bandykite gauti project info
$projectName = ""
$projectId = ""

if (Test-Path ".vercel/project.json") {
    try {
        $projectInfo = Get-Content ".vercel/project.json" | ConvertFrom-Json
        $projectId = $projectInfo.projectId
        $projectName = $projectInfo.projectName
        Write-Host "[OK] Rastas Vercel projektas: $projectName" -ForegroundColor Green
        Write-Host "     Project ID: $projectId" -ForegroundColor Gray
    } catch {
        Write-Host "[WARNING] Nepavyko perskaityti .vercel/project.json" -ForegroundColor Yellow
    }
}

# Bandykite gauti deployment URL per Vercel CLI
$deploymentUrl = $null

Write-Host ""
Write-Host "Bandome gauti deployment URL..." -ForegroundColor Yellow

try {
    # Bandykite gauti production deployment
    $vercelOutput = npx vercel inspect --scope=team_H4TaOJlI7IR1sKPMLie8OuNE 2>&1 | Out-String
    # Arba bandykite tiesiogiai gauti URL
    $vercelLs = npx vercel ls --scope=team_H4TaOJlI7IR1sKPMLie8OuNE 2>&1 | Out-String
    
    if ($vercelLs -match "https://[^\s]+\.vercel\.app") {
        $deploymentUrl = $matches[0]
        Write-Host "[OK] Rastas deployment URL: $deploymentUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Nepavyko gauti URL automatiškai per CLI" -ForegroundColor Yellow
}

# Jei nepavyko, bandykite suprojektuoti URL pagal project name
if (-not $deploymentUrl -and $projectName) {
    $possibleUrls = @(
        "https://$projectName.vercel.app",
        "https://$projectName-git-main.vercel.app",
        "https://$projectName-git-production.vercel.app"
    )
    
    Write-Host ""
    Write-Host "Bandome galimus URL..." -ForegroundColor Yellow
    
    foreach ($url in $possibleUrls) {
        Write-Host "  Tikrinama: $url" -ForegroundColor Gray
        try {
            $response = Invoke-WebRequest -Uri $url -Method HEAD -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $deploymentUrl = $url
                Write-Host "[OK] Rastas veikiantis URL: $deploymentUrl" -ForegroundColor Green
                break
            }
        } catch {
            # Tęsti su kitu URL
        }
    }
}

# Jei vis dar nerasta, paklauskite vartotojo
if (-not $deploymentUrl) {
    Write-Host ""
    Write-Host "[INFO] Nepavyko automatiškai rasti deployment URL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Įveskite Vercel deployment URL (pvz.: https://asociacija.vercel.app):" -ForegroundColor Cyan
    $deploymentUrl = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($deploymentUrl)) {
        Write-Host "[ERROR] URL negali būti tuščias" -ForegroundColor Red
        exit 1
    }
}

# Pašalinkite galinį slash
$deploymentUrl = $deploymentUrl.TrimEnd('/')

# Paklauskite email adreso
Write-Host ""
Write-Host "Įveskite el. pašto adresą, į kurį siųsti test email:" -ForegroundColor Cyan
$testEmail = Read-Host

if ([string]::IsNullOrWhiteSpace($testEmail)) {
    Write-Host "[ERROR] El. pašto adresas negali būti tuščias" -ForegroundColor Red
    exit 1
}

# Testuokite
Write-Host ""
Write-Host "=== PRADEDAMAS TESTAVIMAS ===" -ForegroundColor Cyan
Write-Host ""

& .\test-vercel-production.ps1 -Url $deploymentUrl -Email $testEmail

