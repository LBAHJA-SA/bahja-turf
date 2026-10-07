# Rogne une zone d'une capture et l'agrandit, pour l'OCR de Windows.
#   powershell -File tools\ocr-zone.ps1 "C:\...\3.png" x y largeur hauteur [facteur]
# Le moteur OCR plafonne a 2600 px : au-dela il echoue. On rogne d'abord, on
# agrandit ensuite. Rappel : les captures du site font ~900-1150 px de large,
# les chiffres sont illisibles sans agrandissement.
param(
  [Parameter(Mandatory = $true)][string]$Chemin,
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [Parameter(Mandatory = $true)][int]$L,
  [Parameter(Mandatory = $true)][int]$H,
  [int]$Facteur = 4
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($Chemin)
$crop = New-Object System.Drawing.Bitmap $L, $H
$gc = [System.Drawing.Graphics]::FromImage($crop)
$gc.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $L, $H),
  (New-Object System.Drawing.Rectangle $X, $Y, $L, $H), [System.Drawing.GraphicsUnit]::Pixel)
$gc.Dispose()
$src.Dispose()

$w = [int]($L * $Facteur); $h = [int]($H * $Facteur)
if ($w -gt 2500 -or $h -gt 2500) {
  $c = [Math]::Floor(2500 / [Math]::Max($w, $h))
  $Facteur = [Math]::Max(1, [Math]::Min($Facteur, $c))
}
$w = [int]($L * $Facteur); $h = [int]($H * $Facteur)

$big = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($big)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($crop, 0, 0, $w, $h)
$g.Dispose(); $crop.Dispose()

$tmp = Join-Path $env:TEMP ("ocrzone-" + [System.IO.Path]::GetFileNameWithoutExtension($Chemin) + ".png")
$big.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("  zone ({0},{1}) {2}x{3}  ->  x{4} = {5}x{6}" -f $X, $Y, $L, $H, $Facteur, $w, $h)
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'ocr-capture.ps1') $tmp