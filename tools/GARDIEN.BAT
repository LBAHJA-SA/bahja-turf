@echo off
rem  ═══════════════════════════════════════════════════════════════════
rem  GARDIEN.BAT — le serveur ne tombe plus JAMAIS.
rem
rem  Une boucle qui surveille le port 3003 toutes les 5 secondes. Si le
rem  serveur Vite meurt, il est relance aussitot. A mettre dans le
rem  demarrage de Windows (dossier Startup) ou a lancer a la main.
rem  ═══════════════════════════════════════════════════════════════════
chcp 65001 >nul
title Gardien Bahja-TURF (port 3003)
cd /d C:\bahja-TURF

echo Gardien demarre — je surveille le port 3003.
echo   Pour arreter : fermer cette fenetre.
echo.

:boucle
  rem  le port est-il libre ? (aucun LISTENING = serveur mort)
  netstat -ano | findstr /r ":3003 .*LISTENING" >nul 2>&1
  if errorlevel 1 (
    echo [%TIME%] port 3003 libre — redemarrage du serveur...
    start "Bahja-TURF serveur" /min cmd /c "npx --no-install vite --port 3003 --host"
    rem  on laisse le temps au serveur de monter
    timeout /t 8 /nobreak >nul
  )
  timeout /t 5 /nobreak >nul
  goto boucle