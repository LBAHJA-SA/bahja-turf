@echo off
REM ==========================================================================
REM  Serveur local Quinté — la page http://localhost:3003 + la synchro auto
REM  de l'archive (le navigateur renvoie ses courses au disque, zéro clic).
REM  Lancé au démarrage du PC par la tâche "Quinte Server", tourne en
REM  permanence. Fenêtre à réduire, pas à fermer (la fermer = arrêter le
REM  serveur jusqu'au prochain démarrage).
REM ==========================================================================
title Quinte - serveur local
cd /d "C:\bahja-TURF"
REM chemins complets : le Planificateur n'a pas toujours le PATH complet
"C:\Program Files\nodejs\node.exe" "C:\bahja-TURF\node_modules\vite\bin\vite.js" --port 3003 --host 127.0.0.1 --strictPort
