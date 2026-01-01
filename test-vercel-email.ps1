# Test Email Siuntimo Script (Vercel Production)
# Vykdykite: .\test-vercel-email.ps1 -Url "https://your-app.vercel.app" -Email "your-email@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Url,
    
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("custom", "admin", "confirmation")]
    [string]$TestType = "custom"
)

$apiUrl = "$Url/api/test-email"
$body = @{
    to = $Email
    testType = $TestType
} | ConvertTo-Json

Write-Host "=== TEST EMAIL SIUNTIMAS (VERCEL PRODUCTION) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: $apiUrl" -ForegroundColor Yellow
Write-Host "Siunčiama į: $Email" -ForegroundColor Yellow
Write-Host "Tipas: $TestType" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Siunčiama užklausa..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    
    Write-Host "`nRezultatas:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host "`n[OK] Email išsiųstas sėkmingai!" -ForegroundColor Green
        Write-Host "Patikrinkite:" -ForegroundColor Yellow
        Write-Host "1. El. pašto dėžutę ($Email)" -ForegroundColor White
        Write-Host "2. Vercel Dashboard logs" -ForegroundColor White
        Write-Host "3. Supabase Dashboard logs (Functions -> send-email)" -ForegroundColor White
    } else {
        Write-Host "`n[X] Email neišsiųstas" -ForegroundColor Red
        if ($response.error) {
            Write-Host "Klaida: $($response.error)" -ForegroundColor Red
        }
        if ($response.details) {
            Write-Host "Detalės: $($response.details)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "`n[X] Klaida siunčiant email:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Nepavyko perskaityti response body" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Patikrinkite:" -ForegroundColor Yellow
    Write-Host "1. Ar URL teisingas: $apiUrl" -ForegroundColor White
    Write-Host "2. Ar Vercel deployment veikia" -ForegroundColor White
    Write-Host "3. Ar RESEND_API_KEY nustatytas Vercel Environment Variables" -ForegroundColor White
    Write-Host "4. Ar USE_SUPABASE_EDGE_FUNCTION=true Vercel Environment Variables" -ForegroundColor White
}

