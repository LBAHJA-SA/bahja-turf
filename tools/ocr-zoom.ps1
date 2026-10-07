# Agrandit une capture pour que l'OCR de Windows lise les chiffres petits.
# Les captures du site font ~900-1150 px de large : le moteur OCR se trompe
# sur les numeros. Ici on passe en x3 avec interpolation bicubique, ce qui
# suffit a retrouver les chiffres exacts.
#
#   powershell -File tools\ocr-zoom.ps1 "C:\...\1.png" [facteur]
param(
  [Parameter(Mandatory = $true)][string]$Chemin,
  [int]$Facteur = 3
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Chemin)
$w = [int]($img.Width * $Facteur)
$h = [int]($img.Height * $Facteur)
$big = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($big)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($img, 0, 0, $w, $h)
$g.Dispose()
$img.Dispose()

$tmp = Join-Path $env:TEMP ("ocrzoom-" + [System.IO.Path]::GetFileNameWithoutExtension($Chemin) + ".png")
$big.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("  agrandi x{0} -> {1} x {2}" -f $Facteur, $w, $h)
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'ocr-capture.ps1') $tmp