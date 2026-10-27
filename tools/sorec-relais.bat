@echo off
chcp 65001 >nul
title Relais SOREC — direct decale
cd /d "%~dp0.."

rem ===========================================================================
rem  Double-clic : le direct de la SOREC, decale de 60 s, sur ce poste.
rem  Le site (http://localhost:3003/lives) le lit dans la page.
rem  Pour un autre appareil : cloudflared tunnel --url http://localhost:5058
rem  puis coller l'adresse dans le champ « Relais decale ».
rem ===========================================================================

echo.
echo   Relais SOREC — http://localhost:5058/live.m3u8   (decalage 60 s)
echo   Etat : http://localhost:5058/etat
echo   Ctrl+C pour arreter.
echo.

node "tools\sorec-relais.mjs" --decalage 60 --port 5058

pause
