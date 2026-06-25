"""
Deep-dive analysis of 'New Laxreee data' sheet in SSP Final OLD (12).xlsx.

Findings from pass 1:
  - Single sheet, 900 rows x 8 cols.
  - Header row is row 3: Model No | Description | DISCOUNT | DISCOUNT % | MRP | SSP | Color | Images
  - Model codes look like 'LRWA - 399', 'LRDA - 822' (4-letter prefix + digits).

This pass:
  1. Re-scan with a correct model-code regex capturing 2-5 letter prefixes + digits.
  2. Map each model-code prefix to inferred category (from description keywords).
  3. Sample products across the whole sheet (every Nth row), not just the top.
  4. Look for interspersed section-header rows (a row where only Description is filled).
  5. Confirm absence of explicit Essential/Premium/Luxury tier column.
  6. Extract distinct Color values, distinct description leading tokens, price stats.
  7. Output a clean JSON of sample products per prefix for the mobile app design.
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

XLSX_PATH = Path("/home/z/my-project/upload/SSP Final OLD (12).xlsx")
OUT_DIR = Path("/home/z/my-project/scripts/output")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Correct model-code regex: 2-5 uppercase letters, optional spaces/dash, 2-6 digits.
# Matches: LRWA-399, LRWA - 399, LRWA399, LR-WA-399 (via prefix groups), etc.
MODEL_CODE_RE = re.compile(r"\b([A-Z]{2,5})\s*[-]?\s*(\d{2,6})\b")

TIER_KEYWORDS = ["essential", "premium", "luxury", "economy", "standard", "deluxe", "elite"]


CATEGORY_KEYWORDS = {
    "Towel": ["towel", "hand towel", "bath towel", "face towel", "pool towel"],
    "Bathrobe": ["bathrobe", "bath robe", "robe"],
    "Bed Linen": ["bed sheet", "bedsheet", "pillow", "duvet", "mattress", "bed runner", "bed linen", "quilt", "blanket", "bed spread", "bedspread"],
    "Bath Mat": ["bath mat", "bathmat"],
    "Toiletries": ["shampoo", "soap", "lotion", "conditioner", "body wash", "shower cap", "comb", "toiletry", "amenity", "amenities", "kit", "dental", "shaving", "sanitizer"],
    "Slippers": ["slipper", "disposable slipper", "hotel slipper"],
    "Hair Dryer": ["hair dryer", "hairdryer"],
    "Hand Dryer": ["hand dryer", "handdryer"],
    "Safe": ["safe box", "safe deposit", "safety box", "safe locker"],
    "Bins / Waste": ["dustbin", "bin", "waste bin", "trash", "garbage"],
    "Mirror": ["mirror"],
    "Hangers": ["hanger", "cloth hanger"],
    "Tissue / Dispenser": ["tissue", "dispenser", "napkin", "toilet roll", "paper"],
    "Iron / Ironing": ["iron", "ironing board"],
    "Kettle / F&B": ["kettle", "electric kettle", "tray", "glass", "cup", "mug", "cutlery", "coaster", "teapot", "water bottle"],
    "Furniture / Fixture": ["table", "chair", "stool", "rack", "shelf", "stand", "trolley", "ladder", "luggage rack", "shoe rack", "magazine holder", "magazine rack"],
    "Signage": ["sign", "door knob", "do not disturb", "number plate"],
    "Lighting": ["light", "lamp", "led", "torch", "flashlight"],
    "Clock / Electronics": ["clock", "radio", "speaker", "phone", "telephone", "adapter", "charger", "remote", "hair straightener"],
    "Laundry / Housekeeping": ["laundry bag", "shoe shine", "sewing kit", "shoe horn", "cloth line", "valet", "housekeeping"],
    "Bathroom Accessory": ["soap dish", "tumbler", "toothbrush", "toilet brush", "grab bar", "towel rail", "towel ring", "towel stand", "robe hook", "hook", "shelf bracket", "curtain rod", "shower curtain"],
}


def safe_cell(value):
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        return value
    s = str(value).strip()
    return s if s else None


def infer_category(description: str) -> str:
    if not description:
        return "Uncategorized"
    d = description.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in d:
                return cat
    return "Uncategorized"


def main():
    print(f"Opening workbook: {XLSX_PATH}")
    wb = openpyxl.load_workbook(
        filename=str(XLSX_PATH),
        read_only=True,
        data_only=True,
        keep_links=False,
    )
    ws = wb["New Laxreee data"]

    # We expect header on row 3 based on pass 1.
    headers = []
    products = []          # list of dicts with parsed fields
    section_rows = []      # rows that look like category section headers
    tier_hit_rows = []     # any row whose description contains a tier keyword
    prefix_to_products = defaultdict(list)
    prefix_to_category = defaultdict(Counter)
    color_counter = Counter()
    all_descriptions = []

    for row_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if row is None:
            continue
        row = list(row)[:8]
        cells = [safe_cell(v) for v in row]

        if row_idx == 3:
            headers = cells
            continue
        if row_idx <= 2:
            continue  # title/empty

        model_no, description, discount, discount_pct, mrp, ssp, color, images = cells

        # Section header detection: a row where only description (col B) is filled and
        # the rest are empty, and the description is short (<= 40 chars) and uppercase-ish.
        non_empty = [v for v in cells if v not in (None, "")]
        if (
            len(non_empty) == 1
            and description
            and len(description) <= 50
            and (description.isupper() or description.istitle())
            and model_no is None
        ):
            section_rows.append({"row": row_idx, "text": description})
            continue

        # Tier keyword check inside description
        if description:
            d_low = description.lower()
            for kw in TIER_KEYWORDS:
                # require word-boundary-ish match, not substring inside another word
                if re.search(r"\b" + re.escape(kw) + r"\b", d_low):
                    tier_hit_rows.append({"row": row_idx, "kw": kw, "description": description})
                    break

        # Model code parse
        code = None
        prefix = None
        if model_no:
            m = MODEL_CODE_RE.search(model_no)
            if m:
                prefix = m.group(1).upper()
                code = f"{prefix}-{m.group(2)}"
            else:
                # fall back to using the whole model_no stripped
                code = model_no
                prefix = None

        category = infer_category(description)

        product = {
            "row": row_idx,
            "model_no_raw": model_no,
            "model_code": code,
            "prefix": prefix,
            "description": description,
            "discount": discount,
            "discount_pct": discount_pct,
            "mrp": mrp,
            "ssp": ssp,
            "color": color,
            "images": images,
            "inferred_category": category,
        }
        products.append(product)
        all_descriptions.append(description or "")

        if prefix:
            prefix_to_products[prefix].append(product)
            prefix_to_category[prefix][category] += 1
        if color:
            color_counter[str(color).strip().upper()] += 1

    wb.close()

    # ---- Reports ----
    print("\n" + "=" * 70)
    print("HEADERS (row 3):")
    for i, h in enumerate(headers, 1):
        print(f"   col {i}: {h!r}")

    print(f"\nTotal product rows parsed: {len(products)}")
    print(f"Section-header rows detected: {len(section_rows)}")
    if section_rows:
        print("Section header rows (first 30):")
        for s in section_rows[:30]:
            print(f"   r{s['row']}: {s['text']!r}")

    print(f"\nTier-keyword rows (Essential/Premium/Luxury etc.): {len(tier_hit_rows)}")
    for t in tier_hit_rows[:20]:
        print(f"   r{t['row']} [{t['kw']}]: {t['description'][:80]!r}")

    print("\n--- Distinct model-code prefixes (category code mapping) ---")
    print(f"{'Prefix':<10}{'Count':>7}   Top inferred category")
    for prefix, prods in sorted(prefix_to_products.items(), key=lambda x: -len(x[1])):
        top_cat = prefix_to_category[prefix].most_common(1)[0][0] if prefix_to_category[prefix] else "?"
        print(f"{prefix:<10}{len(prods):>7}   {top_cat}")

    print("\n--- Color value distribution (top 25) ---")
    for c, n in color_counter.most_common(25):
        print(f"   {n:4d}  {c!r}")

    print("\n--- Inferred category distribution ---")
    cat_counter = Counter(p["inferred_category"] for p in products)
    for cat, n in cat_counter.most_common():
        print(f"   {n:4d}  {cat}")

    print("\n--- Sample products (every 60th row) ---")
    for p in products[::60]:
        print(
            f"   r{p['row']:>3} | {p['model_code'] or p['model_no_raw']!s:<12} | "
            f"MRP={p['mrp']} SSP={p['ssp']} | Color={p['color']!s:<10} | "
            f"{p['inferred_category']:<18} | {(p['description'] or '')[:55]}"
        )

    print("\n--- Sample products per prefix (first 2 each, for top 12 prefixes) ---")
    for prefix, prods in sorted(prefix_to_products.items(), key=lambda x: -len(x[1]))[:12]:
        print(f"\n  Prefix {prefix} ({len(prods)} products):")
        for p in prods[:2]:
            print(
                f"     r{p['row']:>3} | {p['model_code']!s:<12} | MRP={p['mrp']} SSP={p['ssp']} | "
                f"Color={p['color']!s:<8} | {(p['description'] or '')[:60]}"
            )

    # ---- Save JSON ----
    out = {
        "headers_row3": headers,
        "total_product_rows": len(products),
        "section_header_rows": section_rows,
        "tier_keyword_rows": tier_hit_rows,
        "prefix_summary": [
            {
                "prefix": prefix,
                "count": len(prods),
                "top_category": prefix_to_category[prefix].most_common(1)[0][0]
                if prefix_to_category[prefix]
                else None,
            }
            for prefix, prods in sorted(prefix_to_products.items(), key=lambda x: -len(x[1]))
        ],
        "inferred_category_distribution": dict(cat_counter.most_common()),
        "color_distribution": dict(color_counter.most_common(50)),
        "sample_products_every_60th": products[::60],
        "sample_products_per_prefix": {
            prefix: prods[:3]
            for prefix, prods in sorted(prefix_to_products.items(), key=lambda x: -len(x[1]))[:15]
        },
    }
    out_path = OUT_DIR / "ssp_deep_analysis.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n\nDeep JSON analysis written to: {out_path}")


if __name__ == "__main__":
    main()
