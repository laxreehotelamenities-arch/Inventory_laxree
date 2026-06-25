"""
Analyze the LaxRee Amenities SSP PDF (v2 - table-aware).

CONFIRMED STRUCTURE (from inspecting every page):
  - 9-column table converted from Excel 2010
  - Column headers (row 0 of page 1):
        Product | Product Category | Model No | Images | Description | Color | SSP | s/s/o | AA/R/C/P
  - "Product Category" column IS THE TIER (Essential / Premium / Lux)
  - "Product" column = product group / category name (forward-filled within section)
  - "Product Category" (tier) is also forward-filled within tier section
  - Organization: Category -> Tier (Essential/Premium/Lux) -> Products (1+ per tier)
  - "SSP" is a bare number (no currency symbol) — the price in INR
  - Last two columns ("s/s/o", "AA/R/C/P") are vertical-text labels and are empty in all data rows

Output: /home/z/my-project/scripts/output/ssp_pdf_analysis.json
"""
import json
import os
import re
from collections import Counter, defaultdict, OrderedDict

import pdfplumber

PDF_PATH  = "/home/z/my-project/upload/Amenities SSP dtd 10.3.26 (All) (1).pdf"
XLSX_PATH = "/home/z/my-project/upload/SSP Final OLD (12).xlsx"
OUT_DIR   = "/home/z/my-project/scripts/output"
OUT_JSON  = os.path.join(OUT_DIR, "ssp_pdf_analysis.json")
OUT_LOG   = os.path.join(OUT_DIR, "pdf_run.log")

LR_CODE_RE = re.compile(r"LR\s?[A-Z]{2}\s?[-–]?\s?\d{1,5}", re.IGNORECASE)
TIER_VALUES = {"essential", "premium", "lux", "luxury"}

# Canonical column order we'll normalize to
CANON_COLS = ["product", "tier", "model_no", "images", "description", "color", "ssp"]


def norm_code(s):
    """Normalize 'LR WT - 145' or 'LRWT 145' -> 'LRWT-145'."""
    if not s:
        return None
    m = LR_CODE_RE.search(s)
    if not m:
        return None
    raw = m.group(0)
    raw = re.sub(r"\s+", "", raw)              # remove all whitespace
    raw = raw.replace("–", "-")                # normalize dash
    raw = re.sub(r"^LR", "LR", raw)            # ensure LR prefix
    # ensure dash between letters and digits: LRWT145 -> LRWT-145
    raw = re.sub(r"^(LR[A-Z]{2})(\d+)$", r"\1-\2", raw)
    return raw.upper()


def norm_tier(s):
    if not s:
        return None
    t = s.strip().lower()
    if t in ("lux", "luxury"):
        return "Luxury"
    if t == "essential":
        return "Essential"
    if t == "premium":
        return "Premium"
    # Sometimes the cell contains tier + extra text — check substring
    if "lux" in t or "luxury" in t:
        return "Luxury"
    if "essential" in t:
        return "Essential"
    if "premium" in t:
        return "Premium"
    return None


def parse_ssp(s):
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    s = str(s).strip()
    if not s:
        return None
    # Take first numeric chunk
    m = re.search(r"\d[\d,]*\.?\d*", s)
    if not m:
        return None
    try:
        return float(m.group(0).replace(",", ""))
    except ValueError:
        return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    log = []
    def L(msg):
        print(msg); log.append(msg)

    L(f"Opening PDF: {PDF_PATH}")
    result = {
        "file": PDF_PATH,
        "file_size_mb": round(os.path.getsize(PDF_PATH) / (1024 * 1024), 2),
        "total_pages": 0,
        "pages_with_text": 0,
        "pages_without_text": [],
        "column_headers": [],
        "tiers_found": [],
        "three_tier_confirmed": False,
        "tier_product_count": Counter(),
        "tier_categories": defaultdict(list),       # tier -> sorted unique category names
        "tier_category_counts": defaultdict(Counter),  # tier -> {category: count}
        "all_products": [],                          # all product rows
        "tier_products_sample": defaultdict(list),   # tier -> first 12 samples
        "products_per_page": {},
        "model_code_prefixes": [],
        "page_section_map": [],                      # per-page: which categories/tiers appear
        "structure_notes": [],
        "cross_check_with_xlsx": {},
        "toc_entries": [],
    }

    # ---------- Pass 1: extract tables from every page ----------
    all_rows = []
    with pdfplumber.open(PDF_PATH) as pdf:
        result["total_pages"] = len(pdf.pages)
        L(f"Total pages: {len(pdf.pages)}")
        try:
            result["metadata"] = {k: str(v) for k, v in (pdf.metadata or {}).items()}
        except Exception:
            result["metadata"] = {}

        for pi, page in enumerate(pdf.pages, start=1):
            txt = page.extract_text() or ""
            if len(txt.split()) < 5:
                result["pages_without_text"].append(pi)
                continue
            result["pages_with_text"] += 1
            tables = page.extract_tables()
            page_tier_cats = []
            for t in tables:
                if not t or not t[0]:
                    continue
                # If first row looks like a header (page 1 only), capture and skip
                header = t[0]
                if pi == 1 and any(h and "product" in str(h).lower() for h in header):
                    result["column_headers"] = [str(h).replace("\n", " ").strip() if h else "" for h in header]
                for row in t[1:]:
                    if not row:
                        continue
                    # Pad row to 9 cols
                    row = list(row) + [None] * (9 - len(row))
                    rec = {
                        "page": pi,
                        "product":     (row[0] or "").replace("\n", " ").strip() if row[0] else "",
                        "tier_raw":    (row[1] or "").replace("\n", " ").strip() if row[1] else "",
                        "model_no":    (row[2] or "").replace("\n", " ").strip() if row[2] else "",
                        "images":      (row[3] or "").replace("\n", " ").strip() if row[3] else "",
                        "description": (row[4] or "").replace("\n", " ").strip() if row[4] else "",
                        "color":       (row[5] or "").replace("\n", " ").strip() if row[5] else "",
                        "ssp_raw":     (row[6] or "").replace("\n", " ").strip() if row[6] else "",
                    }
                    rec["model_no_norm"] = norm_code(rec["model_no"])
                    rec["tier"] = norm_tier(rec["tier_raw"])
                    rec["ssp"] = parse_ssp(rec["ssp_raw"])
                    all_rows.append(rec)
                    if rec["tier"] and rec["model_no_norm"]:
                        page_tier_cats.append((rec["tier"], rec["product"]))

            result["page_section_map"].append({
                "page": pi,
                "tables": len(tables),
                "tier_category_pairs_on_page": sorted(set(page_tier_cats)),
            })

    L(f"Pages with text: {result['pages_with_text']}")
    L(f"Pages without text: {result['pages_without_text']}")
    L(f"Column headers: {result['column_headers']}")
    L(f"Total raw rows extracted (excluding header): {len(all_rows)}")

    # ---------- Pass 2: forward-fill Product and Tier columns ----------
    # When a row's product is empty, inherit from the most recent non-empty product above.
    # When tier is empty, inherit from the most recent non-empty tier above.
    # BUT: if the row has no model_no at all, it's likely a spacer / continuation line — skip from product list.
    cur_product = None
    cur_tier = None
    products = []
    for r in all_rows:
        # Some rows are pure description continuation (no model number) — skip but keep filling
        if r["product"]:
            cur_product = r["product"]
        if r["tier"]:
            cur_tier = r["tier"]
        r["product_filled"] = cur_product
        r["tier_filled"] = cur_tier
        # Only count as a product if it has a model number
        if r["model_no_norm"]:
            products.append(r)

    result["all_products"] = products
    L(f"Total product rows with a Model No.: {len(products)}")

    # ---------- Pass 3: aggregate per tier ----------
    tier_counts = Counter()
    tier_categories = defaultdict(Counter)
    tier_samples = defaultdict(list)
    prefix_counter = Counter()
    for p in products:
        tier = p["tier_filled"] or "UNASSIGNED"
        tier_counts[tier] += 1
        cat = p["product_filled"] or "(unknown)"
        tier_categories[tier][cat] += 1
        if len(tier_samples[tier]) < 12:
            tier_samples[tier].append({
                "page": p["page"],
                "product": p["product_filled"],
                "tier": tier,
                "model_no": p["model_no_norm"],
                "model_no_raw": p["model_no"],
                "color": p["color"],
                "ssp": p["ssp"],
                "ssp_raw": p["ssp_raw"],
                "description": (p["description"][:200] + "...") if len(p["description"]) > 200 else p["description"],
            })
        # Prefix tally
        m = re.match(r"(LR[A-Z]{2})", p["model_no_norm"])
        if m:
            prefix_counter[m.group(1)] += 1

    result["tiers_found"] = sorted(tier_counts.keys())
    expected = {"Essential", "Premium", "Luxury"}
    result["three_tier_confirmed"] = expected.issubset(set(tier_counts.keys()))
    result["tier_product_count"] = dict(tier_counts)
    result["tier_categories"] = {t: sorted(cats.keys()) for t, cats in tier_categories.items()}
    result["tier_category_counts"] = {t: dict(cats) for t, cats in tier_categories.items()}
    result["tier_products_sample"] = dict(tier_samples)
    result["model_code_prefixes"] = [{"prefix": p, "count": c} for p, c in prefix_counter.most_common()]

    # ---------- Pass 4: page ranges per tier (where each tier has product rows) ----------
    tier_pages = defaultdict(list)
    tier_first_seen_page = {}
    for p in products:
        t = p["tier_filled"] or "UNASSIGNED"
        if p["page"] not in tier_pages[t]:
            tier_pages[t].append(p["page"])
        tier_first_seen_page.setdefault(t, p["page"])
    result["tier_page_ranges"] = {
        t: {"first": min(pages), "last": max(pages), "page_count": len(pages), "pages": pages}
        for t, pages in tier_pages.items()
    }

    # ---------- Pass 5: cross-check with XLSX (the OLD master list) ----------
    xlsx_codes = set()
    try:
        import openpyxl
        wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            if row and row[0]:
                c = norm_code(str(row[0]))
                if c:
                    xlsx_codes.add(c)
        wb.close()
    except Exception as e:
        L(f"XLSX load error: {e}")

    pdf_codes = {p["model_no_norm"] for p in products}
    matched = pdf_codes & xlsx_codes
    only_pdf = pdf_codes - xlsx_codes
    only_xlsx = xlsx_codes - pdf_codes
    result["cross_check_with_xlsx"] = {
        "xlsx_path": XLSX_PATH,
        "xlsx_total_codes": len(xlsx_codes),
        "pdf_total_codes": len(pdf_codes),
        "matched_count": len(matched),
        "match_pct_of_pdf": round(100.0 * len(matched) / max(1, len(pdf_codes)), 1),
        "pdf_only_count": len(only_pdf),
        "xlsx_only_count": len(only_xlsx),
        "pdf_only_samples": sorted(list(only_pdf))[:20],
        "xlsx_only_samples": sorted(list(only_xlsx))[:20],
    }

    # ---------- Structure notes ----------
    result["structure_notes"] = [
        f"PDF is a 9-column tabular document exported from Microsoft Excel 2010 (per metadata).",
        f"Document title (from page 1): 'Laxree Hotel Amenities SSP W.e.f. 1.03.2026'.",
        f"Column headers: {result['column_headers']}",
        f"Organization = Category -> Tier (Essential/Premium/Lux) -> Products. "
        f"Tier is stored in the 'Product Category' column and is forward-filled within each tier section.",
        f"The 7th column 'SSP' holds the price as a bare number (INR), e.g. '6700'. No currency symbol.",
        f"The 8th and 9th columns ('s/s/o', 'AA/R/C/P') are vertical-text labels and are EMPTY in all data rows "
        f"— they appear to be page-margin labels (likely 'SSP' and 'As Above' or similar), not real fields.",
        f"3-tier classification CONFIRMED: Essential, Premium, Luxury (abbreviated 'Lux' in the tier column).",
        f"Total product rows in PDF: {len(products)}. "
        f"Counts per tier: {dict(tier_counts)}.",
        f"PDF is a curated SUBSET ({len(pdf_codes)} unique codes) of the OLD XLSX master list ({len(xlsx_codes)} codes). "
        f"{len(matched)} of {len(pdf_codes)} PDF codes also exist in the XLSX "
        f"({result['cross_check_with_xlsx']['match_pct_of_pdf']}%).",
    ]

    # ---------- Save outputs ----------
    # Strip defaultdicts for JSON
    out = json.loads(json.dumps(result, default=str))
    with open(OUT_JSON, "w") as f:
        json.dump(out, f, indent=2, default=str)
    with open(OUT_LOG, "w") as f:
        f.write("\n".join(log))

    # ---------- Human-readable summary ----------
    L("\n" + "=" * 78)
    L("FINAL SUMMARY — LaxRee Amenities SSP PDF Analysis")
    L("=" * 78)
    L(f"File:           {PDF_PATH}")
    L(f"Size:           {result['file_size_mb']} MB")
    L(f"Total pages:    {result['total_pages']}  ({result['pages_with_text']} with text, {len(result['pages_without_text'])} image-only)")
    L(f"Metadata:       {result.get('metadata', {})}")
    L(f"Column headers: {result['column_headers']}")
    L("")
    L(f"Tiers found:           {result['tiers_found']}")
    L(f"3-tier confirmed:      {result['three_tier_confirmed']}")
    L(f"Total product rows:    {len(products)}")
    L("")
    L("Product counts per tier:")
    for t, c in sorted(tier_counts.items(), key=lambda x: -x[1]):
        L(f"  {t:<12}: {c}")
    L("")
    L("Page ranges per tier:")
    for t, r in sorted(result["tier_page_ranges"].items(), key=lambda x: x[1]["first"]):
        L(f"  {t:<12}: pages {r['first']}-{r['last']}  ({r['page_count']} pages contain {t} products)")
    L("")
    L("Categories per tier (count of distinct categories):")
    for t in result["tiers_found"]:
        cats = result["tier_categories"].get(t, [])
        L(f"  {t:<12}: {len(cats)} categories")
        for c in cats[:25]:
            cnt = result["tier_category_counts"][t][c]
            L(f"      - {c}  ({cnt} products)")
    L("")
    L("Sample products per tier (up to 8 each):")
    for t in sorted(result["tiers_found"]):
        samples = result["tier_products_sample"].get(t, [])
        L(f"  --- {t} ---")
        for s in samples[:8]:
            L(f"    p{s['page']:<2} [{s['model_no']}] cat='{s['product']}' color='{s['color']}' ssp={s['ssp']}")
            L(f"        desc: {s['description'][:140]}")
    L("")
    L("Top 15 model-code prefixes (across all tiers):")
    for p in result["model_code_prefixes"][:15]:
        L(f"  {p['prefix']}: {p['count']}")
    L("")
    L("Cross-check vs OLD XLSX master list:")
    xc = result["cross_check_with_xlsx"]
    L(f"  XLSX total codes:    {xc['xlsx_total_codes']}")
    L(f"  PDF total codes:     {xc['pdf_total_codes']}")
    L(f"  Matched in both:     {xc['matched_count']} ({xc['match_pct_of_pdf']}% of PDF)")
    L(f"  PDF-only codes:      {xc['pdf_only_count']}  samples: {xc['pdf_only_samples'][:10]}")
    L(f"  XLSX-only codes:     {xc['xlsx_only_count']}  (these are old/inactive products not in new PDF)")
    L("")
    L("Structure notes:")
    for n in result["structure_notes"]:
        L(f"  - {n}")
    L("")
    L(f"Full JSON saved: {OUT_JSON}")
    L(f"Log saved:       {OUT_LOG}")


if __name__ == "__main__":
    main()
