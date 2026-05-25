#!/usr/bin/env bash
# Generate a printable QR code pointing at the live site.
# Usage:
#   ./generate-qr.sh                          # uses default URL below
#   ./generate-qr.sh https://example.com      # override URL
set -euo pipefail

DEFAULT_URL="https://ibbgrmi.github.io/plan-salvacion/"
URL="${1:-$DEFAULT_URL}"
OUT="qr.png"

if ! command -v qrencode >/dev/null 2>&1; then
  echo "qrencode not found. Installing via Homebrew..."
  brew install qrencode
fi

# -s 16  module pixel size (high-res for sharp printing)
# -m 4   quiet zone margin (modules)
# -l H   error correction High (~30%) — survives smudges, partial obstruction
qrencode -o "$OUT" -s 16 -m 4 -l H "$URL"

echo "✓ QR generated → $OUT"
echo "  URL encoded:  $URL"
echo "  Size:         $(file "$OUT" | sed 's/.*, //')"
