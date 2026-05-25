#!/usr/bin/env bash
# Generate thermal-printer-ready sticker designs (pure 1-bit black & white).
#
# Outputs:
#   sticker-40mm.png — 320x320 (40mm @ 203 DPI thermal printers, e.g. NIIMBOT, Phomemo)
#   sticker-50mm.png — 400x400 (50mm @ 203 DPI; downscales cleanly to other sizes too)
#
# Usage:
#   ./generate-sticker.sh                                    # uses default URL
#   ./generate-sticker.sh https://your-new-url.example.com   # override URL
#
# Both outputs are 1-bit monochrome (pure black on white) — no grayscale,
# no dithering, no anti-aliasing artifacts that confuse thermal printers.
set -euo pipefail

DEFAULT_URL="https://ibbgrmi.github.io/plan-salvacion/"
URL="${1:-$DEFAULT_URL}"

for tool in qrencode magick; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "✗ $tool not found. Install via: brew install ${tool/magick/imagemagick}"
    exit 1
  fi
done

QR40="$(mktemp -t qr40-XXXXXX).png"
QR50="$(mktemp -t qr50-XXXXXX).png"
trap "rm -f '$QR40' '$QR50'" EXIT

# High error correction (-l H) survives smudges, partial obstruction, thermal artifacts.
# Smaller QR scales chosen to leave breathing room for text + safe margin from circular crop edge.
qrencode -o "$QR40" -s 3 -m 1 -l H "$URL"   # ~129px → fits 40mm with comfortable text margins
qrencode -o "$QR50" -s 4 -m 1 -l H "$URL"   # ~172px → fits 50mm with comfortable text margins

ARIAL_BOLD="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
ARIAL_REG="/System/Library/Fonts/Supplemental/Arial.ttf"

# ==== 40mm round/square version (320x320) ====
# Round crop safe zone is roughly a 280px circle centered. All text must
# fit inside that or it will be clipped at the edges of a round label.
magick -size 320x320 xc:white \
  -font "$ARIAL_BOLD" -fill black \
  -gravity north -pointsize 17 \
    -annotate +0+24 "¿ESTÁS SEGURO" \
    -annotate +0+48 "DE TU ETERNIDAD?" \
  "$QR40" -gravity center -geometry +0+2 -composite \
  -font "$ARIAL_REG" -gravity south \
    -pointsize 12 \
    -annotate +0+38 "Escanea para el" \
    -annotate +0+22 "Plan de Salvación" \
  -font "$ARIAL_BOLD" -pointsize 8 \
    -annotate +0+8 "IBB · GRAND RAPIDS" \
  -threshold 50% -type Bilevel -depth 1 \
  PNG8:sticker-40mm.png

# ==== 50mm round/square version (400x400) ====
magick -size 400x400 xc:white \
  -font "$ARIAL_BOLD" -fill black \
  -gravity north -pointsize 22 \
    -annotate +0+28 "¿ESTÁS SEGURO" \
    -annotate +0+60 "DE TU ETERNIDAD?" \
  "$QR50" -gravity center -geometry +0+0 -composite \
  -font "$ARIAL_REG" -gravity south \
    -pointsize 15 \
    -annotate +0+48 "Escanea para el" \
    -annotate +0+26 "Plan de Salvación" \
  -font "$ARIAL_BOLD" -pointsize 10 \
    -annotate +0+10 "IBB · GRAND RAPIDS" \
  -threshold 50% -type Bilevel -depth 1 \
  PNG8:sticker-50mm.png

echo "✓ sticker-40mm.png — 320×320 px, 40mm @ 203 DPI"
echo "✓ sticker-50mm.png — 400×400 px, 50mm @ 203 DPI"
echo "  URL encoded:    $URL"
