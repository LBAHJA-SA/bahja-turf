# Lit le texte des captures d'ecran avec le moteur OCR de Windows (fr-FR).
#   powershell -File tools\ocr-capture.ps1 "C:\chemin\1.png" ["2.png" ...]
# Utilise quand le modele ne peut pas voir l'image : on recupere le TEXTE,
# ce qui suffit (les numeros, les messages).
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
                 $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($op, $type) {
  $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { Write-Error 'moteur OCR indisponible'; exit 1 }

foreach ($chemin in $args) {
  Write-Output ''
  Write-Output ('===== ' + (Split-Path $chemin -Leaf) + ' =====')
  if (-not (Test-Path $chemin)) { Write-Output '  (fichier absent)'; continue }

  $fichier = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($chemin)) ([Windows.Storage.StorageFile])
  $flux = Await ($fichier.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decodeur = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($flux)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decodeur.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

  foreach ($ligne in $res.Lines) {
    $txt = $ligne.Words | ForEach-Object { $_.Text }
    if ($txt) { Write-Output ('  ' + ($txt -join ' ')) }
  }
  $flux.Dispose()
}
