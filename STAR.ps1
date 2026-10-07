# ===============================================================
#  STAR.ps1 - le point de depart UNIQUE de Bahja-TURF.
#
#  Un seul clic, trois choses :
#     1. le serveur Vite tourne (port 3003) et SURVIT a la fermeture ;
#     2. le job quotidien (Quinte AM / Quinte PM) est bien planifie ;
#     3. l'archive est a jour sur le site - mais SEULEMENT si elle a
#        change. Sinon : rien ne part, le site ne bouge pas.
#
#  UTILISATION : double-clic sur ce fichier.
#
#  ---------------------------------------------------------------
#  REGLE : LE SITE NE CHANGE QUE SI L'ARCHIVE A CHANGE.
#  publier-archive.mjs compare avant de pousser. Un commit de code
#  ne remplace donc jamais le site, et le job du matin non plus.
#  ===============================================================

$Port   = 3003
$Url    = "http://localhost:$Port/quinte"
$Racine = 'C:\bahja-TURF'

function Info ($m)   { Write-Host $m -ForegroundColor Cyan }
function Ok   ($m)   { Write-Host $m -ForegroundColor Green }
function Warn ($m)   { Write-Host $m -ForegroundColor Yellow }
function Sep  ($m)   { Write-Host ""; Write-Host "-- $m" -ForegroundColor White }

function Test-Serveur {
  try { (Invoke-WebRequest "http://localhost:$Port/quinte" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200 }
  catch { $false }
}

Write-Host ""
Write-Host "  BAHJA-TURF" -ForegroundColor White
Write-Host "  ==========" -ForegroundColor White

# --- 1. LE SERVEUR ---------------------------------------------
Sep "Serveur"
if (Test-Serveur) {
  Ok "deja actif sur le port $Port"
} else {
  Info "demarrage sur le port $Port..."
  $cmdLine = "cmd.exe /c cd /d `"$Racine`" && npx --no-install vite --port $Port --host"
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdLine } | Out-Null
  $n = 0
  while ($n -lt 20) {
    Start-Sleep -Seconds 2
    $n++
    if (Test-Serveur) { break }
  }
  if (Test-Serveur) { Ok "pret : $Url" } else { Warn "le serveur n'a pas repondu en 40 s" }
}

# --- 2. LE JOB QUOTIDIEN ---------------------------------------
Sep "Job quotidien (collecte de la Synthese)"
foreach ($j in @('Quinte AM', 'Quinte PM')) {
  $q = schtasks /Query /TN $j /FO LIST 2>$null
  if ($LASTEXITCODE -eq 0) { Ok "$j : planifie" }
  else { Warn "$j : ABSENT - l'archive ne se remplira pas toute seule" }
}

# --- 3. L'ARCHIVE ----------------------------------------------
Sep "Archive"
Push-Location $Racine
try {
  $pub = & node tools\publier-archive.mjs 2>&1
  $txt = ($pub | Out-String)
  if ($txt -match 'Rien a faire') {
    Ok "deja a jour - le site ne bouge pas"
  } elseif ($txt -match 'Archive publiee') {
    Ok "archive poussee sur le site"
  } else {
    Write-Host ($txt.Trim())
  }
} catch {
  Warn "archive : $($_.Exception.Message)"
} finally {
  Pop-Location
}

Write-Host ""
Ok "Tout est pret : $Url"
Start-Process $Url