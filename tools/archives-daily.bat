@echo off
REM ============================================================================
REM  tools\archives-daily.bat — L'ARCHIVE DES PARTANTS, tous les jours.
REM
REM  Pourquoi (20/10/2026) : `api/couple.js` ne lit JAMAIS Equidia en direct
REM  pour une date passee (les donnees seraient post-course). Il ne lit que
REM  `public/data/reu/{date}_R{n}_C{m}_{pays}.json`. Sans collecteur, l'archive
REM  s'est arretee au 13/10/2026 et toute course passee repondait :
REM    « Aucune source de partants disponible (Equidia + fallbacks) ».
REM
REM  Tache planifiee : "Bahja Archives", tous les jours a 09:30.
REM  Manuel : tools\archives-daily.bat    ou    node tools\archive-reu.mjs 2026-10-14
REM ============================================================================
cd /d C:\bahja-TURF
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set JOUR=%%i
echo [%DATE% %TIME%] archives %JOUR% >> data\archives.log
node tools\archive-reu.mjs %JOUR% >> data\archives.log 2>&1
