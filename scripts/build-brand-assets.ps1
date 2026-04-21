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

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#09090b"))

    $outerBounds = [System.Drawing.RectangleF]::new($Size * 0.08, $Size * 0.08, $Size * 0.84, $Size * 0.84)
    $innerBounds = [System.Drawing.RectangleF]::new($Size * 0.14, $Size * 0.14, $Size * 0.72, $Size * 0.72)

    $outerPath = New-RoundedRectanglePath -Bounds $outerBounds -Radius ($Size * 0.2)
    $innerPath = New-RoundedRectanglePath -Bounds $innerBounds -Radius ($Size * 0.16)

    try {
      $outerBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new($Size, $Size),
        [System.Drawing.ColorTranslator]::FromHtml("#8b5cf6"),
        [System.Drawing.ColorTranslator]::FromHtml("#2a1247")
      )

      try {
        $outerBlend = [System.Drawing.Drawing2D.ColorBlend]::new()
        $outerBlend.Colors = @(
          [System.Drawing.ColorTranslator]::FromHtml("#8b5cf6"),
          [System.Drawing.ColorTranslator]::FromHtml("#5b21b6"),
          [System.Drawing.ColorTranslator]::FromHtml("#2a1247")
        )
        $outerBlend.Positions = @(0.0, 0.48, 1.0)
        $outerBrush.InterpolationColors = $outerBlend
        $graphics.FillPath($outerBrush, $outerPath)
      } finally {
        $outerBrush.Dispose()
      }

      $innerBrush = [System.Drawing.SolidBrush]::new(
        [System.Drawing.ColorTranslator]::FromHtml("#0f0f14")
      )

      try {
        $graphics.FillPath($innerBrush, $innerPath)
      } finally {
        $innerBrush.Dispose()
      }

      $glowPen = [System.Drawing.Pen]::new(
        [System.Drawing.ColorTranslator]::FromHtml("#c4b5fd"),
        [float]($Size * 0.016)
      )
      $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

      try {
        $graphics.DrawPath($glowPen, $innerPath)
      } finally {
        $glowPen.Dispose()
      }
    } finally {
      $outerPath.Dispose()
      $innerPath.Dispose()
    }

    $hPen = [System.Drawing.Pen]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#f5f3ff"),
      [float]($Size * 0.075)
    )
    $hPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $accentPen = [System.Drawing.Pen]::new(
      [System.Drawing.ColorTranslator]::FromHtml("#a78bfa"),
      [float]($Size * 0.05)
    )
    $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    try {
      $leftX = [float]($Size * 0.31)
      $rightX = [float]($Size * 0.69)
      $topY = [float]($Size * 0.29)
      $bottomY = [float]($Size * 0.71)
      $midY = [float]($Size * 0.50)
      $accentStartX = [float]($Size * 0.56)
      $accentStartY = [float]($Size * 0.26)
      $accentEndX = [float]($Size * 0.77)
      $accentEndY = [float]($Size * 0.47)

      $graphics.DrawLine($hPen, $leftX, $topY, $leftX, $bottomY)
      $graphics.DrawLine($hPen, $rightX, $topY, $rightX, $bottomY)
      $graphics.DrawLine($hPen, $leftX, $midY, $rightX, $midY)
      $graphics.DrawLine($accentPen, $accentStartX, $accentStartY, $accentEndX, $accentEndY)
    } finally {
      $hPen.Dispose()
      $accentPen.Dispose()
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
