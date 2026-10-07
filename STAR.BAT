@echo off
rem  STAR.BAT  -  demarre le serveur Quinte (port 3003)
chcp 65001 >nul
cd /d C:\bahja-TURF

rem  deja tourne ? alors on ouvre juste la page
netstat -ano | findstr /r ":3003 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo Serveur deja actif sur le port 3003.
  start "" "http://localhost:3003/quinte"
  goto fin
)

echo Demarrage de Vite sur le port 3003...
start "Bahja-TURF serveur" /min cmd /c "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3003/quinte"

:fin
