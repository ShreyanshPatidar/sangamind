# Darpan's image reader: scales a picture to fit MaxW x MaxH pixels (keeping its shape) and prints
#   line 1: "<width> <height> <originalWidth> <originalHeight>"
#   line 2: the scaled pixels as base64, 4 bytes each in B, G, R, A order, row by row.
# Windows' own System.Drawing does the decoding, so PNG, JPEG, GIF and BMP all work with nothing installed.
param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][int]$MaxW, [Parameter(Mandatory)][int]$MaxH)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($Path)
try {
  $scale = [Math]::Min($MaxW / $src.Width, $MaxH / $src.Height)
  $w = [Math]::Max(1, [int][Math]::Floor($src.Width * $scale))
  $h = [Math]::Max(2, [int][Math]::Floor($src.Height * $scale))
  if ($h % 2 -eq 1) { $h -= 1 }  # two pixel rows per terminal row

  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose()

  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $bmp.Dispose()

  Write-Output "$w $h $($src.Width) $($src.Height)"
  Write-Output ([Convert]::ToBase64String($bytes))
} finally {
  $src.Dispose()
}
