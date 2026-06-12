# Sinh icon app + asset logo tu img/LOGO TXM.png
# - Cat vien trang -> assets/images/logo-tiximax.png (dung cho man login)
# - Icon source 1024x1024 -> assets/app-icons/tiximax-logo-icon.png (dung cho app.json)
# - Thay ic_launcher / ic_launcher_round / ic_launcher_foreground trong android res (backup truoc)
$ErrorActionPreference = 'Stop'

$root = 'd:\Tiximax_FE\tiximax-customer-app'
$srcLogo = Join-Path $root 'img\LOGO TXM.png'
$res = Join-Path $root 'android\app\src\main\res'
$backup = Join-Path $root 'backup-launcher-icons'

$csharp = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconGen
{
    // Bounding box cua pixel khong-trang, khong-trong-suot
    public static Rectangle FindBBox(Bitmap bmp)
    {
        Rectangle rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
        BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] buf = new byte[stride * bmp.Height];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);
        bmp.UnlockBits(data);
        int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < bmp.Height; y++)
        {
            int row = y * stride;
            for (int x = 0; x < bmp.Width; x++)
            {
                int i = row + x * 4;
                byte b = buf[i], g = buf[i + 1], r = buf[i + 2], a = buf[i + 3];
                if (a > 16 && (r < 245 || g < 245 || b < 245))
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return rect;
        return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
    }

    public static Bitmap Crop(Bitmap src, Rectangle bbox, int padPercent)
    {
        int pad = bbox.Width * padPercent / 100;
        Rectangle r = Rectangle.FromLTRB(
            Math.Max(0, bbox.Left - pad), Math.Max(0, bbox.Top - pad),
            Math.Min(src.Width, bbox.Right + pad), Math.Min(src.Height, bbox.Bottom + pad));
        return src.Clone(r, PixelFormat.Format32bppArgb);
    }

    static Graphics HQ(Bitmap b)
    {
        Graphics g = Graphics.FromImage(b);
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        return g;
    }

    static void DrawCentered(Graphics g, Bitmap logo, int canvas, int scalePercent)
    {
        double max = canvas * scalePercent / 100.0;
        double k = Math.Min(max / logo.Width, max / logo.Height);
        int w = (int)Math.Round(logo.Width * k);
        int h = (int)Math.Round(logo.Height * k);
        g.DrawImage(logo, (canvas - w) / 2, (canvas - h) / 2, w, h);
    }

    public static void SquareIcon(Bitmap logo, int size, int scalePercent, bool whiteBg, string path)
    {
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (Graphics g = HQ(bmp))
        {
            g.Clear(whiteBg ? Color.White : Color.Transparent);
            DrawCentered(g, logo, size, scalePercent);
            bmp.Save(path, ImageFormat.Png);
        }
    }

    public static void RoundIcon(Bitmap logo, int size, int scalePercent, string path)
    {
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (Graphics g = HQ(bmp))
        using (GraphicsPath clip = new GraphicsPath())
        {
            g.Clear(Color.Transparent);
            clip.AddEllipse(0, 0, size - 1, size - 1);
            using (SolidBrush br = new SolidBrush(Color.White)) g.FillPath(br, clip);
            g.SetClip(clip);
            DrawCentered(g, logo, size, scalePercent);
            g.ResetClip();
            bmp.Save(path, ImageFormat.Png);
        }
    }

    public static void SavePng(Bitmap bmp, string path) { bmp.Save(path, ImageFormat.Png); }
}
'@
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $csharp

$logo = [System.Drawing.Bitmap]::FromFile($srcLogo)
$bbox = [IconGen]::FindBBox($logo)
Write-Output "BBox: x=$($bbox.X) y=$($bbox.Y) w=$($bbox.Width) h=$($bbox.Height)"

# 1) Logo cat vien (pad 5% chieu rong) cho man login
$trimmed = [IconGen]::Crop($logo, $bbox, 5)
[IconGen]::SavePng($trimmed, (Join-Path $root 'assets\images\logo-tiximax.png'))
Write-Output "Trimmed: $($trimmed.Width)x$($trimmed.Height) -> assets\images\logo-tiximax.png"

# 2) Icon source 1024x1024 nen trang cho app.json
[IconGen]::SquareIcon($trimmed, 1024, 74, $true, (Join-Path $root 'assets\app-icons\tiximax-logo-icon.png'))
Write-Output 'Icon source -> assets\app-icons\tiximax-logo-icon.png'

# 3) Backup icon native cu roi sinh PNG moi (bo qua neu chua co android/ — prebuild se tu sinh tu app.json)
if (-not (Test-Path $res)) {
    $trimmed.Dispose(); $logo.Dispose()
    Write-Output "Chua co thu muc android/ — bo qua phan native res. Chay 'npx expo prebuild --platform android' la du."
    Write-Output 'DONE'
    exit 0
}

$densLegacy = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
$densFg     = @{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }

foreach ($d in $densLegacy.Keys) {
    $dir = Join-Path $res "mipmap-$d"
    $bdir = Join-Path $backup "mipmap-$d"
    New-Item -ItemType Directory -Force $bdir | Out-Null
    Get-ChildItem $dir -Filter 'ic_launcher*.webp' | Move-Item -Destination $bdir -Force

    [IconGen]::SquareIcon($trimmed, $densLegacy[$d], 78, $true, (Join-Path $dir 'ic_launcher.png'))
    [IconGen]::RoundIcon($trimmed, $densLegacy[$d], 64, (Join-Path $dir 'ic_launcher_round.png'))
    [IconGen]::SquareIcon($trimmed, $densFg[$d], 58, $false, (Join-Path $dir 'ic_launcher_foreground.png'))
    Write-Output "mipmap-$d : legacy $($densLegacy[$d])px, foreground $($densFg[$d])px"
}

# 4) Splash screen (Android 12+: icon bi mask tron ~192/288dp -> logo 60% canvas la an toan)
[IconGen]::SquareIcon($trimmed, 1024, 60, $false, (Join-Path $root 'assets\images\splash-logo.png'))
Write-Output 'Splash source -> assets\images\splash-logo.png'

$densSplash = @{ 'mdpi' = 288; 'hdpi' = 432; 'xhdpi' = 576; 'xxhdpi' = 864; 'xxxhdpi' = 1152 }
foreach ($d in $densSplash.Keys) {
    $dir = Join-Path $res "drawable-$d"
    $bdir = Join-Path $backup "drawable-$d"
    New-Item -ItemType Directory -Force $bdir | Out-Null
    $old = Join-Path $dir 'splashscreen_logo.png'
    if ((Test-Path $old) -and -not (Test-Path (Join-Path $bdir 'splashscreen_logo.png'))) {
        Copy-Item $old $bdir
    }
    [IconGen]::SquareIcon($trimmed, $densSplash[$d], 60, $false, $old)
    Write-Output "drawable-$d : splash $($densSplash[$d])px"
}

$trimmed.Dispose(); $logo.Dispose()
Write-Output 'DONE'
