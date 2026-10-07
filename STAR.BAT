@echo off
rem ============================================================
rem  STAR.BAT - demarre le serveur Bahja-TURF (port 3003)
rem
rem  Le serveur est lance DETACHE : il survit a la fermeture
rem  de cette fenetre. Re-cliquer ne le lance pas deux fois
rem  (il teste d'abord si le port repond).
rem
rem  ⚠ Le test du port passe par PowerShell : findstr est
rem    peu fiable ici (il renvoie 0 meme sans resultat).
rem ============================================================
chcp 65001 >nul
cd /d C:\bahja-TURF

set PORT=3003

rem  ── le serveur repond-il deja ? ───────────────────────
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://localhost:%PORT%/quinte' -UseBasicParsing -TimeoutSec 4; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo Serveur deja actif sur le port %PORT%.
  start "" "http://localhost:%PORT%/quinte"
  exit /b 0
)

echo Demarrage du serveur sur le port %PORT%...
start "" /b cmd /c "npx --no-install vite --port %PORT% --host > nul 2>&1"

rem  ── attente du demarrage (test reel : une page repond) ──
set /a tries=0
:wait
  timeout /t 2 /nobreak >nul
  set /a tries+=1
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://localhost:%PORT%/quinte' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
  if %errorlevel%==0 goto pret
  if %tries% lss 20 goto wait

echo.
echo ATTENTION - le serveur n'a pas repondu en 40 s.
echo Verifiez Node et le dossier node_modules.
pause
exit /b 1

:pret
echo Serveur pret : http://localhost:%PORT%/quinte
start "" "http://localhost:%PORT%/quinte"
exit /b 0