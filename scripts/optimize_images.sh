#!/usr/bin/env bash
# Generates web-sized copies of vendor photos/logos into images/vendors-web/,
# mirroring the images/vendors/ structure. Originals are left untouched.
# Re-run any time new vendor photos are added.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/images/vendors"
DEST="$ROOT/images/vendors-web"

PHOTO_MAX_DIM=1600
PHOTO_QUALITY=75
LOGO_MAX_DIM=800

mkdir -p "$DEST"

find "$SRC" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) ! -name "._*" -print0 |
while IFS= read -r -d '' src_file; do
  rel_path="${src_file#"$SRC"/}"
  dest_file="$DEST/$rel_path"
  dest_dir="$(dirname "$dest_file")"
  mkdir -p "$dest_dir"

  base_name="$(basename "$src_file")"
  lower_name="$(echo "$base_name" | tr '[:upper:]' '[:lower:]')"

  if [[ "$lower_name" == *logo* ]]; then
    max_dim=$LOGO_MAX_DIM
  else
    max_dim=$PHOTO_MAX_DIM
  fi

  ext="${base_name##*.}"
  ext_lower="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  read -r src_w src_h < <(sips -g pixelWidth -g pixelHeight "$src_file" 2>/dev/null | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')
  needs_resize=0
  if [[ "$src_w" -gt "$max_dim" || "$src_h" -gt "$max_dim" ]]; then
    needs_resize=1
  fi

  if [[ "$ext_lower" == "png" ]]; then
    cp "$src_file" "$dest_file"
    if [[ "$needs_resize" -eq 1 ]]; then
      sips -Z "$max_dim" "$dest_file" >/dev/null
    fi
  else
    cp "$src_file" "$dest_file"
    if [[ "$needs_resize" -eq 1 ]]; then
      sips -Z "$max_dim" -s format jpeg -s formatOptions "$PHOTO_QUALITY" "$dest_file" >/dev/null
    else
      sips -s format jpeg -s formatOptions "$PHOTO_QUALITY" "$dest_file" >/dev/null
    fi
  fi

  src_size=$(stat -f%z "$src_file")
  dest_size=$(stat -f%z "$dest_file")
  printf "%-70s %8d KB -> %6d KB\n" "$rel_path" "$((src_size/1024))" "$((dest_size/1024))"
done

echo "Done. Web-optimized copies written to $DEST"
