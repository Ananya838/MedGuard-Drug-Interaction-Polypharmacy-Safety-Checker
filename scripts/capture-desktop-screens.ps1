$ErrorActionPreference = "Stop"

$docsDir = "D:\MedGaurd\docs\screenshots"
$artifactDir = "C:\Users\adity\.gemini\antigravity\brain\5a0c1d91-5058-44aa-ab74-6d04ac9188d0\screenshots"
$tempUserData = "D:\MedGaurd\.temp_chrome"

New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempUserData | Out-Null

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"

Write-Host "Starting Vite preview on port 4173..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d D:\MedGaurd\client && npx vite preview --port 4173" -PassThru

try {
    Start-Sleep -Seconds 3
    Write-Host "Server started. Capturing 1440x900 desktop screenshots..."

    $routes = @(
        @{ name = "01_login"; path = "/login" },
        @{ name = "02_home_dashboard"; path = "/" },
        @{ name = "03_patients_list"; path = "/patients" },
        @{ name = "04_patient_detail"; path = "/patients/pat-1" },
        @{ name = "05_confirm_medicines"; path = "/confirm" },
        @{ name = "06_safety_report"; path = "/report/pat-1" },
        @{ name = "07_scan_strips"; path = "/scan" },
        @{ name = "08_schedule"; path = "/schedule" }
    )

    foreach ($r in $routes) {
        $url = "http://localhost:4173$($r.path)"
        $outFile = Join-Path $docsDir "$($r.name).png"
        $artFile = Join-Path $artifactDir "$($r.name).png"
        
        Write-Host "Capturing $($r.name) from $url..."
        $args = "--headless --disable-gpu --hide-scrollbars --window-size=1440,900 --user-data-dir=$tempUserData --screenshot=$outFile $url"
        Start-Process -FilePath $chrome -ArgumentList $args -Wait
        
        if (Test-Path $outFile) {
            Copy-Item -Path $outFile -Destination $artFile -Force
            $size = (Get-Item $outFile).Length
            Write-Host "Saved: $outFile ($size bytes)"
        } else {
            Write-Warning "Failed to capture $outFile"
        }
    }
    Write-Host "All screenshots captured successfully!"
} finally {
    Write-Host "Stopping preview process..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*4173*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tempUserData -Recurse -Force -ErrorAction SilentlyContinue
}
