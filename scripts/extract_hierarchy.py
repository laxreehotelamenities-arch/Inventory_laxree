#!/usr/bin/env python3
"""
Extract the actual Category → Item → Model hierarchy from the HTML inventory file.
This is the source of truth for the cascading dropdown structure.
"""
import json
import re
from pathlib import Path
from collections import defaultdict

HTML = Path("/home/z/my-project/upload/LaxRee_Inventory_2026-06-18 (1) (3).html")

text = HTML.read_text(encoding='utf-8', errors='ignore')

# Find EMBEDDED_DATA JSON
m = re.search(r'EMBEDDED_DATA\s*=\s*(\{.*?\});\s*\n', text, re.DOTALL)
if not m:
    raise RuntimeError("EMBEDDED_DATA not found")

data = json.loads(m.group(1))
smap = data.get("smap", {})

# Build hierarchy
hierarchy = defaultdict(lambda: defaultdict(set))  # category -> item -> set of models
items = []
for key, rec in smap.items():
    cat = rec.get("category", "").strip()
    item_name = rec.get("item", "").strip()
    model = rec.get("model", "").strip()
    colour = rec.get("colour", "").strip()
    balance = rec.get("balance", 0)
    if not cat or not item_name:
        continue
    hierarchy[cat][item_name].add(model)
    items.append({
        "category": cat,
        "item": item_name,
        "model": model,
        "colour": colour,
        "balance": balance,
        "inward": rec.get("inward", 0),
        "dispatched": rec.get("dispatched", 0),
        "key": key,
    })

# Print hierarchy
print("=" * 70)
print("HTML INVENTORY HIERARCHY: Category → Item → Models")
print("=" * 70)
print(f"\nTotal categories: {len(hierarchy)}")
print(f"Total unique (category, item) pairs: {sum(len(items) for items in hierarchy.values())}")
print(f"Total inventory records: {len(items)}\n")

for cat in sorted(hierarchy.keys()):
    items_in_cat = hierarchy[cat]
    print(f"\n📂 {cat}  ({len(items_in_cat)} items)")
    for item in sorted(items_in_cat.keys()):
        models = sorted(items_in_cat[item])
        print(f"   └── {item}  ({len(models)} models)")
        for mdl in models[:5]:
            print(f"        • {mdl}")
        if len(models) > 5:
            print(f"        ... and {len(models) - 5} more")

# Save the canonical hierarchy as JSON for the app to use
output = {
    "source": "LaxRee_Inventory_2026-06-18.html",
    "total_records": len(items),
    "categories": {},
}
for cat in sorted(hierarchy.keys()):
    output["categories"][cat] = {}
    for item in sorted(hierarchy[cat].keys()):
        # Get all records for this item, sorted by model
        item_records = [
            {
                "model": rec["model"],
                "colour": rec["colour"],
                "balance": rec["balance"],
                "inward": rec["inward"],
                "dispatched": rec["dispatched"],
            }
            for rec in items
            if rec["category"] == cat and rec["item"] == item
        ]
        # Group by model+colour (unique SKU)
        unique_skus = {}
        for r in item_records:
            sku_key = f"{r['model']}__{r['colour']}"
            if sku_key not in unique_skus:
                unique_skus[sku_key] = r
        output["categories"][cat][item] = list(unique_skus.values())

out_path = Path("/home/z/my-project/src/data/inventory-hierarchy.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\n\n✓ Hierarchy saved to: {out_path}")
print(f"  Size: {out_path.stat().st_size / 1024:.1f} KB")
