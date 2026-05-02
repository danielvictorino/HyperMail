Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Bounds,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()

  $path.AddArc($Bounds.X, $Bounds.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Bounds.Right - $diameter, $Bounds.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Bounds.Right - $diameter, $Bounds.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Bounds.X, $Bounds.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-HyperMailBitmap {
  param(
    [int]$Size
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    $Size,
    $Size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $tileBounds = [System.Drawing.RectangleF]::new(
      [float]($Size * 0.09375),
      [float]($Size * 0.09375),
      [float]($Size * 0.8125),
      [float]($Size * 0.8125)
    )
    $tilePath = New-RoundedRectanglePath -Bounds $tileBounds -Radius ([float]($Size * 0.1015625))
    $tileBrush = [System.Drawing.SolidBrush]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#050614")
    )

    $markBrush = [System.Drawing.SolidBrush]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#f7f8f8")
    )

    try {
      $graphics.FillPath($tileBrush, $tilePath)
      $graphics.FillRectangle(
        $markBrush,
        [System.Drawing.RectangleF]::new($Size * 0.2890625, $Size * 0.3046875, $Size * 0.078125, $Size * 0.453125)
      )
      $graphics.FillRectangle(
        $markBrush,
        [System.Drawing.RectangleF]::new($Size * 0.6328125, $Size * 0.3046875, $Size * 0.078125, $Size * 0.453125)
      )
      $graphics.FillPolygon(
        $markBrush,
        [System.Drawing.PointF[]]@(
          [System.Drawing.PointF]::new($Size * 0.3671875, $Size * 0.54296875),
          [System.Drawing.PointF]::new($Size * 0.5, $Size * 0.46875),
          [System.Drawing.PointF]::new($Size * 0.6328125, $Size * 0.54296875),
          [System.Drawing.PointF]::new($Size * 0.6328125, $Size * 0.6328125),
          [System.Drawing.PointF]::new($Size * 0.5, $Size * 0.55859375),
          [System.Drawing.PointF]::new($Size * 0.3671875, $Size * 0.6328125)
        )
      )
    } finally {
      $tilePath.Dispose()
      $tileBrush.Dispose()
      $markBrush.Dispose()
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
