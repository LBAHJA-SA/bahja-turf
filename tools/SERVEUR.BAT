@echo off
rem  ═══════════════════════════════════════════════════════════════════
rem  SERVEUR.BAT — le serveur Vite du projet Bahja-TURF.
rem
rem  Il ne se termine JAMAIS tout seul : c'est le lanceur de la tâche
rem  Windows « BahjaServeur ». Utiliser STAR.BAT (double-clic) pour un
rem  usage ponctuel.
rem  ═══════════════════════════════════════════════════════════════════
chcp 65001 >nul
cd /d C:\bahja-TURF

rem  le port est-il déjà pris ? alors on ne lance rien (éviter le doublon)
netstat -ano | findstr /r ":3003 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo Le port 3003 est deja occupe — rien a faire.
  exit /b 0
)

echo Serveur Bahja-TURF sur le port 3003...
echo (fermer cette fenetre = arreter le serveur)
call npx --no-install vite --port 3003 --host