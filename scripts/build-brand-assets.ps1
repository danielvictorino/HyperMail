Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-HyperMailBitmap {
  param(
    [int]$Size
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#050614"))

    $hPen = [System.Drawing.Pen]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#f7f8f8"),
      [float]($Size * 0.09375)
    )
    $hPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $foldPen = [System.Drawing.Pen]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#f7f8f8"),
      [float]($Size * 0.0703125)
    )
    $foldPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $foldPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $foldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    try {
      $leftX = [float]($Size * 0.296875)
      $rightX = [float]($Size * 0.703125)
      $topY = [float]($Size * 0.2265625)
      $bottomY = [float]($Size * 0.7734375)
      $midY = [float]($Size * 0.50)
      $foldLeftX = [float]($Size * 0.4375)
      $foldTopY = [float]($Size * 0.3515625)
      $foldBottomY = [float]($Size * 0.6484375)

      $graphics.DrawLine($hPen, $leftX, $topY, $leftX, $bottomY)
      $graphics.DrawLine($hPen, $rightX, $topY, $rightX, $bottomY)
      $graphics.DrawLine($foldPen, $foldLeftX, $foldTopY, $rightX, $midY)
      $graphics.DrawLine($foldPen, $rightX, $midY, $foldLeftX, $foldBottomY)
      $graphics.DrawLine($hPen, $leftX, $midY, $rightX, $midY)
    } finally {
      $hPen.Dispose()
      $foldPen.Dispose()
    }

    return $bitmap
  } catch {
    $graphics.Dispose()
    $bitmap.Dispose()
    throw
  }
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-IcoFromBitmap {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $stream = [System.IO.MemoryStream]::new()

  try {
    $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $stream.ToArray()
    $writer = [System.IO.BinaryWriter]::new(
      [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    )

    try {
      $widthValue = if ($Bitmap.Width -ge 256) { 0 } else { [byte]$Bitmap.Width }
      $heightValue = if ($Bitmap.Height -ge 256) { 0 } else { [byte]$Bitmap.Height }

      $writer.Write([UInt16]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]1)
      $writer.Write([byte]$widthValue)
      $writer.Write([byte]$heightValue)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$pngBytes.Length)
      $writer.Write([UInt32]22)
      $writer.Write($pngBytes)
    } finally {
      $writer.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$buildDirectory = Join-Path $projectRoot "build"
$publicDirectory = Join-Path $projectRoot "public"

$icon256 = New-HyperMailBitmap -Size 256
$icon64 = New-HyperMailBitmap -Size 64

try {
  Save-Png -Bitmap $icon256 -Path (Join-Path $buildDirectory "icon.png")
  Save-IcoFromBitmap -Bitmap $icon256 -Path (Join-Path $buildDirectory "icon.ico")
  Save-Png -Bitmap $icon256 -Path (Join-Path $publicDirectory "icon.png")
  Save-IcoFromBitmap -Bitmap $icon64 -Path (Join-Path $publicDirectory "favicon.ico")
} finally {
  $icon256.Dispose()
  $icon64.Dispose()
}

Write-Host "HyperMail brand assets generated in build/ and public/."
