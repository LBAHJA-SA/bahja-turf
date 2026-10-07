# ═══════════════════════════════════════════════════════════════
#  STAR.ps1 — démarre le serveur Bahja-TURF (port 3003), détaché.
#
#  Le serveur Vite meurt quand on ferme la fenêtre qui l'a lancé.
#  Ce script le lance dans un processus DÉTACHÉ (WMI), donc il
#  survit à la fermeture de la session. Re-lancer ne fait rien de
#  plus s'il répond déjà.
#
#  UTILISATION : double-clic sur ce fichier, ou
#     powershell -ExecutionPolicy Bypass -File STAR.ps1
# ═══════════════════════════════════════════════════════════════

$Port = 3003
$Url  = "http://localhost:$Port/quinte"
$Racine = 'C:\bahja-TURF'

function Test-Serveur {
  try {
    $r = Invoke-WebRequest "http://localhost:$Port/quinte" -UseBasicParsing -TimeoutSec 4
    return $r.StatusCode -eq 200
  } catch { return $false }
}

if (Test-Serveur) {
  Write-Host "Serveur deja actif sur le port $Port." -ForegroundColor Green
  Start-Process $Url
  exit 0
}

Write-Host "Demarrage du serveur sur le port $Port..." -ForegroundColor Cyan

# ── lancement DÉTACHÉ via WMI : aucun parent, aucune fenêtre ──
$cmdLine = "cmd.exe /c cd /d `"$Racine`" && npx --no-install vite --port $Port --host"
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdLine } | Out-Null

# ── attente du demarrage ──────────────────────────────────────
$attentes = 0
while ($attentes -lt 20) {
  Start-Sleep -Seconds 2
  $attentes++
  if (Test-Serveur) {
    Write-Host "Serveur pret : $Url" -ForegroundColor Green
    Start-Process $Url
    exit 0
  }
}

Write-Host ""
Write-Host "ATTENTION - le serveur n'a pas repondu en 40 s." -ForegroundColor Red
Write-Host "Verifiez Node et le dossier node_modules."
Read-Host "Appuyez sur Entree pour fermer"
exit 1