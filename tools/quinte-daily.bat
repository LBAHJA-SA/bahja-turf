@echo off
REM ==========================================================================
REM  Job quotidien Quinté — enregistre la Synthèse, le ticket et le résultat.
REM  À appeler par le Planificateur de tâches Windows (matin + soir).
REM ==========================================================================
title Quinte - collecte quotidienne
cd /d "C:\bahja-TURF"
REM chemin complet : le Planificateur n'a pas toujours le PATH complet
"C:\Program Files\nodejs\node.exe" "C:\bahja-TURF\tools\daily.mjs" %*