#!/usr/bin/env python3
"""
Re-extract ALL images from XLSX with correct row mapping.
The previous script had a bug where some anchors (especially multi-row spans)
were being skipped, causing 81 products (27.6%) to have no image.

This script:
1. Parses drawing1.xml properly — handles oneCellAnchor + twoCellAnchor
2. For each anchor, finds the FROM row (0-indexed) → XLSX row (1-indexed)
3. Reads column A of that XLSX row to get the model name
4. Extracts the embedded image
5. Maps image to model using normalized model code
6. Updates inventory-master.json with corrected image_url for ALL products
"""
import zipfile
import re
import os
import io
import json
import shutil
from PIL import Image
from pathlib import Path

XLSX = '/home/z/my-project/upload/SSP Final OLD (12).xlsx'
OUT_DIR = Path('/home/z/my-project/public/product-images')
OUT_DIR.mkdir(parents=True, exist_ok=True)
MASTER_PATH = Path('/home/z/my-project/src/data/inventory-master.json')

def norm_model(s: str) -> str:
    if not s:
        return ''
    s = str(s).upper().strip()
    m = re.search(r'(LR[A-Z]{2})\s*-?\s*(\d+)', s)
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    return ''

# Open XLSX as zip
zf = zipfile.ZipFile(XLSX)

# 1. Parse shared strings
shared_xml = zf.read('xl/sharedStrings.xml').decode('utf-8')
strings = re.findall(r'<t[^>]*>([^<]*)</t>', shared_xml)
print(f'Shared strings: {len(strings)}')

# 2. Parse worksheet to map XLSX row → string index for column A
ws_xml = zf.read('xl/worksheets/sheet1.xml').decode('utf-8')
# Match cells in column A: <c r="A123" ...><v>string_idx</v></c>
row_to_str_idx = {}
for m in re.finditer(r'<c r="A(\d+)"[^>]*><v>(\d+)</v></c>', ws_xml):
    row = int(m.group(1))
    str_idx = int(m.group(2))
    row_to_str_idx[row] = str_idx
print(f'Rows with column A values: {len(row_to_str_idx)}')

# 3. Parse rels — rId → media path
rels_xml = zf.read('xl/drawings/_rels/drawing1.xml.rels').decode('utf-8')
rels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels_xml))
print(f'Relationships: {len(rels)}')

# 4. Parse drawing1.xml — find all anchors with their FROM row + rId
drawing_xml = zf.read('xl/drawings/drawing1.xml').decode('utf-8')

# Better split: find all twoCellAnchor and oneCellAnchor blocks
anchors = []
for m in re.finditer(r'<xdr:(twoCellAnchor|oneCellAnchor)([^>]*)>(.*?)</xdr:\1>', drawing_xml, re.DOTALL):
    anchor_type = m.group(1)
    content = m.group(3)
    anchors.append((anchor_type, content))
print(f'Total anchors: {len(anchors)}')

# 5. Build XLSX row → image target mapping
# Note: drawing XML rows are 0-indexed, XLSX rows are 1-indexed
# So drawing row N = XLSX row N+1
row_to_image = {}  # xlsx_row → set of media paths
for anchor_type, content in anchors:
    # Find the FROM row (0-indexed)
    row_match = re.search(r'<xdr:from>.*?<xdr:row>(\d+)</xdr:row>', content, re.DOTALL)
    if not row_match:
        continue
    drawing_row = int(row_match.group(1))
    xlsx_row = drawing_row + 1
    # Find the embedded image rId
    embed_match = re.search(r'r:embed="(rId\d+)"', content)
    if not embed_match:
        continue
    rid = embed_match.group(1)
    target = rels.get(rid)
    if not target:
        continue
    if not target.startswith('/'):
        target = 'xl/' + target.replace('../', '')
    if xlsx_row not in row_to_image:
        row_to_image[xlsx_row] = []
    row_to_image[xlsx_row].append(target)

print(f'XLSX rows with images: {len(row_to_image)}')

# 6. Now build model_no → image_path mapping
# For each XLSX row, get the model name from column A, normalize, and assign image
model_to_image = {}  # norm_model → image_path (relative to public/)
seen_hashes = set()  # dedupe by image content

extracted = 0
skipped_dup = 0
for xlsx_row, image_targets in sorted(row_to_image.items()):
    if xlsx_row not in row_to_str_idx:
        continue
    str_idx = row_to_str_idx[xlsx_row]
    if str_idx >= len(strings):
        continue
    model_raw = strings[str_idx]
    model_norm = norm_model(model_raw)
    if not model_norm:
        continue
    # Skip if already have an image for this model
    if model_norm in model_to_image:
        continue
    # Take the first image target for this row
    target = image_targets[0]
    try:
        img_data = zf.read(target)
        # Skip duplicate images by content hash
        h = hash(img_data)
        if h in seen_hashes:
            skipped_dup += 1
            continue
        seen_hashes.add(h)
        # Process image
        img = Image.open(io.BytesIO(img_data))
        # Flatten transparent PNGs onto white for JPEG-friendly display
        if img.mode == 'RGBA':
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        # Resize if too big
        if max(img.size) > 800:
            img.thumbnail((800, 800), Image.LANCZOS)
        # Save as JPG (smaller, web-friendly)
        safe_name = re.sub(r'[^A-Za-z0-9\-]', '_', model_norm)
        out_name = f'{safe_name}_row{xlsx_row}.jpg'
        out_path = OUT_DIR / out_name
        img.save(out_path, 'JPEG', quality=88, optimize=True)
        model_to_image[model_norm] = f'/product-images/{out_name}'
        extracted += 1
    except Exception as e:
        print(f'  Failed to extract row {xlsx_row} ({model_norm}): {e}')

print(f'\nExtracted: {extracted} images')
print(f'Skipped duplicates: {skipped_dup}')
print(f'Total model→image mappings: {len(model_to_image)}')

# Now update inventory-master.json with new image paths
# Simple logic: if current image is missing OR doesn't exist on disk, assign new one
with open(MASTER_PATH) as f:
    inventory = json.load(f)

public_dir = Path('/home/z/my-project/public')
updated = 0
for item in inventory:
    model_norm = norm_model(item.get('model_no', ''))
    if not model_norm:
        continue
    new_url = model_to_image.get(model_norm)
    if not new_url:
        continue
    # Check if current image exists on disk
    current = item.get('image_url')
    current_exists = bool(current) and (public_dir / current.lstrip('/')).exists()
    if not current_exists:
        item['image_url'] = new_url
        updated += 1

# Save updated inventory
with open(MASTER_PATH, 'w', encoding='utf-8') as f:
    json.dump(inventory, f, ensure_ascii=False, indent=2)

# Stats
with_img = sum(1 for p in inventory if p.get('image_url'))
without_img = sum(1 for p in inventory if not p.get('image_url'))
print(f'\n=== INVENTORY UPDATED ===')
print(f'Newly assigned images: {updated}')
print(f'Items with image: {with_img} ({100*with_img/len(inventory):.1f}%)')
print(f'Items without image: {without_img} ({100*without_img/len(inventory):.1f}%)')

# Breakdown by category
from collections import Counter
no_img_by_cat = Counter()
total_by_cat = Counter()
for p in inventory:
    total_by_cat[p['category']] += 1
    if not p.get('image_url'):
        no_img_by_cat[p['category']] += 1
print('\nItems WITHOUT image by category:')
for cat in sorted(total_by_cat.keys()):
    pct = 100 * no_img_by_cat[cat] / total_by_cat[cat]
    print(f'  {cat:25} | {no_img_by_cat[cat]:3}/{total_by_cat[cat]:3} ({pct:.0f}%) missing')
