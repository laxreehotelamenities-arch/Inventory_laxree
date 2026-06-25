#!/usr/bin/env python3
"""
Verify and FIX tier assignments in inventory-master.json by cross-referencing
the canonical PDF tier classification.

The user reported LRMB-132 shows "Luxury" but should be "Essential" per PDF.
Let me find all tier mismatches and fix them.
"""
import json
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
PDF_ANALYSIS = ROOT / "scripts/output/ssp_pdf_analysis.json"
MASTER = ROOT / "src/data/inventory-master.json"

def norm_model(s: str) -> str:
    if not s:
        return ""
    s = str(s).upper().strip()
    m = re.search(r'(LR[A-Z]{2})\s*-?\s*(\d+)', s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return ""

# Load PDF tier data
with open(PDF_ANALYSIS) as f:
    pdf = json.load(f)

# Build model -> tier lookup from PDF (priority: Essential > Premium > Luxury > Standard)
# A model can appear multiple times in PDF (different colors), but should have same tier
pdf_tiers = {}
for p in pdf["all_products"]:
    mn = p.get("model_no_norm") or norm_model(p.get("model_no", ""))
    tier = p.get("tier_filled") or p.get("tier") or "Standard"
    if not mn:
        continue
    # If multiple tiers for same model, take the most common one
    if mn not in pdf_tiers:
        pdf_tiers[mn] = {}
    pdf_tiers[mn][tier] = pdf_tiers[mn].get(tier, 0) + 1

# Resolve to single tier per model
model_tier = {}
for mn, counts in pdf_tiers.items():
    # Pick the tier with most occurrences
    best = max(counts.items(), key=lambda x: x[1])
    model_tier[mn] = best[0]

print(f"Loaded {len(model_tier)} model→tier mappings from PDF")
print()

# Load inventory master
with open(MASTER) as f:
    inventory = json.load(f)

print(f"Loaded {len(inventory)} inventory items")
print()

# Check mismatches
mismatches = []
no_match = []
correct = 0
for item in inventory:
    mn = item.get("model_norm") or norm_model(item.get("model_no", ""))
    current_tier = item.get("tier", "Standard")
    pdf_tier = model_tiers.get(mn) if (model_tiers := model_tier).get(mn) else None
    
    if pdf_tier is None:
        # No PDF data — keep as Standard (or what's already set)
        if current_tier != "Standard":
            # Has a non-Standard tier but no PDF backing — leave it
            pass
        no_match.append({
            "model": item["model_no"],
            "colour": item.get("colour", ""),
            "current_tier": current_tier,
        })
    elif pdf_tier == current_tier:
        correct += 1
    else:
        mismatches.append({
            "model": item["model_no"],
            "colour": item.get("colour", ""),
            "current_tier": current_tier,
            "pdf_tier": pdf_tier,
        })

print(f"✓ Correct tiers: {correct}")
print(f"✗ Mismatches: {len(mismatches)}")
print(f"? No PDF match (Standard fallback): {len(no_match)}")
print()

if mismatches:
    print("=== FIRST 20 MISMATCHES ===")
    for m in mismatches[:20]:
        print(f"  {m['model']:25} | colour={m['colour'][:25]:25} | current={m['current_tier']:10} → should be {m['pdf_tier']}")
    print()

# Fix the mismatches
print(f"Fixing {len(mismatches)} mismatches...")
fixed = 0
for item in inventory:
    mn = item.get("model_norm") or norm_model(item.get("model_no", ""))
    pdf_tier = model_tier.get(mn)
    if pdf_tier and item.get("tier") != pdf_tier:
        item["tier"] = pdf_tier
        fixed += 1

print(f"Fixed {fixed} items")
print()

# Save back
with open(MASTER, 'w', encoding='utf-8') as f:
    json.dump(inventory, f, ensure_ascii=False, indent=2)
print(f"Saved: {MASTER}")

# Show tier distribution after fix
from collections import Counter
tiers = Counter(item.get("tier", "Standard") for item in inventory)
print(f"\nTier distribution after fix:")
for tier, count in sorted(tiers.items()):
    print(f"  {tier}: {count}")

# Specifically verify LRMB-132
print("\n=== LRMB-132 verification ===")
for item in inventory:
    if "LRMB-132" in item.get("model_no", ""):
        print(f"  {item['model_no']} | colour={item.get('colour')} | tier={item['tier']} | balance={item['balance']}")
