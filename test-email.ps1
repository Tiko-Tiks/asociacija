# Test Email Siuntimo Script
# Vykdykite: .\test-email.ps1 -Email "your-email@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("custom", "admin", "confirmation")]
    [string]$TestType = "custom"
)

$url = "http://localhost:3000/api/test-email"
$body = @{
    to = $Email
    testType = $TestType
} | ConvertTo-Json

Write-Host "=== TEST EMAIL SIUNTIMAS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siunčiama į: $Email" -ForegroundColor Yellow
Write-Host "Tipas: $TestType" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body
    
    Write-Host "Rezultatas:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host "`n[OK] Email išsiųstas sėkmingai!" -ForegroundColor Green
        Write-Host "Patikrinkite serverio console log'us ir el. pašto dėžutę." -ForegroundColor Gray
    } else {
        Write-Host "`n[X] Email neišsiųstas" -ForegroundColor Red
        if ($response.error) {
            Write-Host "Klaida: $($response.error)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "`n[X] Klaida siunčiant email:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Patikrinkite:" -ForegroundColor Yellow
    Write-Host "1. Ar serveris veikia (npm run dev)?" -ForegroundColor White
    Write-Host "2. Ar URL teisingas: $url" -ForegroundColor White
    Write-Host "3. Ar RESEND_API_KEY nustatytas Supabase secrets?" -ForegroundColor White
}

