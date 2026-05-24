#!/usr/bin/env bash
# Generate the Open Graph preview image (1200x630) used for rich link previews
# on WhatsApp, iMessage, Facebook, Twitter/X, Slack, Discord, etc.
#
# Output: og-image.png
#
# The image mirrors the site's hero: dark navy background, glowing gold cross,
# the question in serif gold, church name in muted gray below.
set -euo pipefail

OUT="og-image.png"
SERIF_IT="/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
SERIF_REG="/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS="/System/Library/Fonts/Supplemental/Arial.ttf"

if ! command -v magick >/dev/null 2>&1; then
  echo "✗ imagemagick not found. Install: brew install imagemagick"; exit 1
fi

# Soft radial glow layer (will be composited over the navy base for the
# "glowing cross" backdrop). Built separately so we can blur it.
GLOW="$(mktemp -t glow-XXXXXX).png"
trap "rm -f '$GLOW'" EXIT

magick -size 1200x630 xc:none \
  -fill 'rgba(238,196,106,0.45)' \
  -draw "circle 600,260 600,90" \
  -blur 0x60 \
  "$GLOW"

# Compose the final image:
# 1. Vertical navy gradient base
# 2. Soft gold radial glow behind the cross area
# 3. Gold cross (two rounded rectangles)
# 4. Title in italic serif gold
# 5. Subtitle in muted gray
magick \
  \( -size 1200x630 gradient:'#0d162c-#070d1c' \) \
  "$GLOW" -compose over -composite \
  -fill '#eec46a' \
  -draw "roundrectangle 568,80 632,440 6,6" \
  -draw "roundrectangle 470,224 730,288 6,6" \
  -font "$SERIF_IT" -fill '#f6d98a' -gravity center \
    -pointsize 72 -annotate +0+150 "¿Estás seguro de tu eternidad?" \
  -font "$SERIF_REG" -fill '#cbd5e1' \
    -pointsize 28 -annotate +0+225 "Plan de Salvación  ·  Iglesia Bautista Bíblica" \
  -font "$SANS" -fill '#9ca3af' \
    -pointsize 22 -annotate +0+265 "Grand Rapids, Michigan" \
  -strip \
  "$OUT"

echo "✓ Generated → $OUT  (1200×630, ~$(du -h "$OUT" | cut -f1))"
