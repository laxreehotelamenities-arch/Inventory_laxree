#!/usr/bin/env python3
"""
Extract inward log (ilog) and outward log (olog) from the HTML inventory file.
These are the actual transaction records — admin panel will use these for:
- Inward history
- Outward history
- Fast-moving items analysis (dispatch frequency)
"""
import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

HTML = Path("/home/z/my-project/upload/LaxRee_Inventory_2026-06-18 (1) (3).html")
OUT_DIR = Path("/home/z/my-project/src/data")

text = HTML.read_text(encoding='utf-8', errors='ignore')

# Find EMBEDDED_DATA JSON
m = re.search(r'EMBEDDED_DATA\s*=\s*(\{.*?\});\s*\n', text, re.DOTALL)
if not m:
    raise RuntimeError("EMBEDDED_DATA not found")

data = json.loads(m.group(1))

ilog = data.get("ilog", [])
olog = data.get("olog", [])
hlog = data.get("hlog", [])
smap = data.get("smap", {})

print(f"=== HTML FILE EXTRACTION ===")
print(f"Inward log (ilog): {len(ilog)} transactions")
print(f"Outward log (olog): {len(olog)} transactions")
print(f"Hold log (hlog): {len(hlog)} transactions")
print(f"Stock map (smap): {len(smap)} SKUs")

# Sample inward log entry
if ilog:
    print(f"\n=== SAMPLE INWARD LOG ENTRY ===")
    print(json.dumps(ilog[0], indent=2, ensure_ascii=False))
    print(json.dumps(ilog[-1], indent=2, ensure_ascii=False))

# Sample outward log entry
if olog:
    print(f"\n=== SAMPLE OUTWARD LOG ENTRY ===")
    print(json.dumps(olog[0], indent=2, ensure_ascii=False))
    print(json.dumps(olog[-1], indent=2, ensure_ascii=False))

# Save logs
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Save inward log
with open(OUT_DIR / "inward-log.json", 'w', encoding='utf-8') as f:
    json.dump(ilog, f, ensure_ascii=False, indent=2)
print(f"\n✓ Saved inward-log.json ({len(ilog)} entries)")

# Save outward log
with open(OUT_DIR / "olog.json", 'w', encoding='utf-8') as f:
    json.dump(olog, f, ensure_ascii=False, indent=2)
print(f"✓ Saved olog.json ({len(olog)} entries)")

# === FAST MOVING ITEMS ANALYSIS ===
# Based on outward log — items dispatched most frequently / in highest quantities
dispatch_by_model = defaultdict(lambda: {"qty": 0, "count": 0, "category": "", "item": "", "model": "", "colour": ""})
for entry in olog:
    model = entry.get("model", "").strip()
    if not model:
        continue
    qty = int(entry.get("qty", 0))
    colour = entry.get("colour", "").strip()
    key = f"{model}__{colour}"
    dispatch_by_model[key]["qty"] += qty
    dispatch_by_model[key]["count"] += 1
    dispatch_by_model[key]["model"] = model
    dispatch_by_model[key]["colour"] = colour
    dispatch_by_model[key]["category"] = entry.get("cat", "")
    dispatch_by_model[key]["item"] = entry.get("item", "")

# Enrich with current balance from smap
for key, info in dispatch_by_model.items():
    smap_key = f"{info['model']}__{info['colour'].upper()}"
    if smap_key in smap:
        info["current_balance"] = smap[smap_key].get("balance", 0)
    else:
        # Try without colour uppercase
        for sk, sv in smap.items():
            if sv.get("model", "") == info["model"]:
                info["current_balance"] = sv.get("balance", 0)
                break
        else:
            info["current_balance"] = 0

# Sort by total dispatched qty desc (fast-moving)
fast_moving = sorted(dispatch_by_model.items(), key=lambda x: -x[1]["qty"])
fast_moving_list = [
    {
        "key": k,
        "model": v["model"],
        "colour": v["colour"],
        "category": v["category"],
        "item": v["item"],
        "total_dispatched": v["qty"],
        "dispatch_count": v["count"],
        "current_balance": v.get("current_balance", 0),
    }
    for k, v in fast_moving
]

# Save fast-moving analysis
with open(OUT_DIR / "fast-moving-items.json", 'w', encoding='utf-8') as f:
    json.dump(fast_moving_list, f, ensure_ascii=False, indent=2)
print(f"\n✓ Saved fast-moving-items.json ({len(fast_moving_list)} unique dispatched items)")

# Print top 10 fast-moving
print("\n=== TOP 10 FAST-MOVING ITEMS ===")
for item in fast_moving_list[:10]:
    print(f"  {item['model']:25} | {item['item'][:25]:25} | dispatched={item['total_dispatched']:4} | count={item['dispatch_count']:3} | balance={item['current_balance']}")

# === CLIENT ANALYSIS ===
clients = Counter()
for entry in olog:
    client = entry.get("client", "").strip()
    if client:
        clients[client] += int(entry.get("qty", 0))

print(f"\n=== TOP 10 CLIENTS BY DISPATCH QTY ===")
for client, qty in clients.most_common(10):
    print(f"  {client[:40]:40} | {qty} units")

# Save client summary
client_summary = [{"client": c, "total_qty": q} for c, q in clients.most_common()]
with open(OUT_DIR / "clients-summary.json", 'w', encoding='utf-8') as f:
    json.dump(client_summary, f, ensure_ascii=False, indent=2)
print(f"\n✓ Saved clients-summary.json ({len(client_summary)} clients)")

# === VENDOR ANALYSIS ===
vendors = Counter()
for entry in ilog:
    vendor = entry.get("vendor", "").strip()
    if vendor:
        vendors[vendor] += int(entry.get("qty", 0))

print(f"\n=== TOP 10 VENDORS BY INWARD QTY ===")
for vendor, qty in vendors.most_common(10):
    print(f"  {vendor[:40]:40} | {qty} units")

# Save vendor summary
vendor_summary = [{"vendor": v, "total_qty": q} for v, q in vendors.most_common()]
with open(OUT_DIR / "vendors-summary.json", 'w', encoding='utf-8') as f:
    json.dump(vendor_summary, f, ensure_ascii=False, indent=2)
print(f"\n✓ Saved vendors-summary.json ({len(vendor_summary)} vendors)")

# === DATE RANGE ===
if ilog:
    dates = [e.get("date", "") for e in ilog if e.get("date")]
    print(f"\n=== DATE RANGE ===")
    print(f"Inward log: {min(dates)} to {max(dates)}")
if olog:
    dates = [e.get("date", "") for e in olog if e.get("date")]
    print(f"Outward log: {min(dates)} to {max(dates)}")

print("\nDONE.")
