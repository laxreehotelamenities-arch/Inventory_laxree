#!/usr/bin/env python3
"""
Post-process the catalog to fix obvious category mismatches caused by
PDF forward-fill of the "Product" column. We re-infer the category from
the description/model_no when the assigned category clearly doesn't match.
"""
import json
import re
from pathlib import Path

CATALOG = Path("/home/z/my-project/src/data/catalog.json")

# Category inference rules — based on description keywords & model prefixes
CATEGORY_RULES = [
    # (test_function, category)
    (lambda d, m: 'dustbin' in d or 'garbage' in d or 'peddle bin' in d or 'pedal bin' in d, 'Dustbins'),
    (lambda d, m: 'kettle' in d or m.startswith('LRWT'), 'Tea Kettle'),
    (lambda d, m: 'minibar' in d or 'mini bar' in d or 'mini-bar' in d or m.startswith('LRMB'), 'MiniBar'),
    (lambda d, m: 'telephone' in d or m.startswith('LRDR'), 'Room Telephones'),
    (lambda d, m: 'hair dryer' in d or m.startswith('LRHD'), 'Hair Dryer'),
    (lambda d, m: 'hanger' in d or m.startswith('LRWH'), 'Wooden Hangers'),
    (lambda d, m: 'magnif' in d or m.startswith('LRMM'), 'Magnifying Mirror'),
    (lambda d, m: 'weighing scale' in d or 'weighing' in d or m.startswith('LRWS'), 'Weighing Scale'),
    (lambda d, m: 'mattress' in d or 'rollaway' in d or m.startswith('LRMR'), 'Mattresses and Rollaway Bed'),
    (lambda d, m: 'safe' in d and 'box' in d or m.startswith('LRSB'), 'Safe Box'),
    (lambda d, m: 'rfid' in d or 'lock' in d or m.startswith('LRFD'), 'RFID Locks'),
    (lambda d, m: 'signage' in d or 'floor sign' in d or 'que manager' in d or m.startswith('LRLI'), 'Que Manager & Floor Signages'),
    (lambda d, m: 'trolley' in d or m.startswith('LRLT') or m.startswith('LRHT'), 'Trolleys'),
    (lambda d, m: 'mirror' in d, 'Mirrors'),
    (lambda d, m: 'dispenser' in d and 'soap' in d, 'Soap Dispenser'),
    (lambda d, m: 'tissue' in d, 'Tissue & Dispenser'),
    (lambda d, m: 'tray' in d and ('amenity' in d or 'resin' in d), 'Amenity Trays'),
    (lambda d, m: 'iron' in d and ('board' in d or 'press' in d), 'Ironing'),
    (lambda d, m: 'hand dryer' in d, 'Hand Dryer'),
    (lambda d, m: 'bed' in d and ('sheet' in d or 'linen' in d), 'Bed Linen'),
    (lambda d, m: 'towel' in d, 'Towels'),
    (lambda d, m: 'bathrobe' in d or 'bath robe' in d, 'Bathrobes'),
    (lambda d, m: 'curtain' in d, 'Curtains'),
    (lambda d, m: 'pillow' in d, 'Pillows'),
    (lambda d, m: 'bedsheet' in d or 'bed sheet' in d, 'Bed Sheets'),
    (lambda d, m: 'do not disturb' in d or 'dnd' in d, 'Door Signs'),
    (lambda d, m: 'key card' in d or 'keycard' in d, 'Key Cards'),
    (lambda d, m: 'folder' in d or 'menu holder' in d, 'Desktop Accessories'),
]

# Load
with open(CATALOG) as f:
    catalog = json.load(f)

fixed = 0
for p in catalog:
    name = (p.get('name') or '').lower()
    desc = (p.get('description') or '').lower()
    model = (p.get('model_no') or '').upper()
    current_cat = p.get('category') or ''
    current_lower = current_cat.lower()

    # Skip items whose current category is reasonably specific
    # (e.g. "Tea Kettle", "Room Telephones" — only override on mismatch)
    text = f"{name} {desc}"

    # Apply rules
    for test, new_cat in CATEGORY_RULES:
        if test(text, model):
            # Only override if the current category is clearly wrong
            # (i.e. the rule's category doesn't appear in current_cat)
            if new_cat.lower() not in current_lower and current_lower not in new_cat.lower():
                p['category'] = new_cat
                fixed += 1
            break

print(f"Fixed {fixed} category mismatches out of {len(catalog)} products")

# Save
with open(CATALOG, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)
print(f"Catalog updated: {CATALOG}")
