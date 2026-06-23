/**
 * Cascading dropdown data helpers for the Quick Order flow:
 *   Category → Item → Model  (NO subcategory/tier step)
 *
 * Data is sourced from inventory-master.json — which is the canonical
 * HTML inventory (Category → Item → Model → colour → stock) merged with
 * images and pricing. This is the structure the user specified.
 */
'use client';

import masterData from '@/data/inventory-master.json';
import type { Product } from '@/lib/types';
import { useMemo } from 'react';

export interface InventoryItem extends Product {
  // Extra fields specific to inventory-master
  item: string;
  colour: string;
  model_norm: string;
  source_key: string;
}

const ITEMS = masterData as InventoryItem[];

export interface CascadeData {
  categories: string[];
  itemsByCategory: Map<string, string[]>;
  modelsByCategoryItem: Map<string, InventoryItem[]>;
}

export function useCascadeData(): CascadeData {
  return useMemo(() => {
    const categories = new Set<string>();
    const itemsByCategory = new Map<string, Set<string>>();
    const modelsByKey = new Map<string, InventoryItem[]>();

    for (const p of ITEMS) {
      if (!p.category || !p.item) continue;
      categories.add(p.category);

      if (!itemsByCategory.has(p.category)) {
        itemsByCategory.set(p.category, new Set());
      }
      itemsByCategory.get(p.category)!.add(p.item);

      const key = `${p.category}__${p.item}`;
      if (!modelsByKey.has(key)) {
        modelsByKey.set(key, []);
      }
      modelsByKey.get(key)!.push(p);
    }

    // Sort models within each (category, item) by stock desc, then model_no asc
    for (const [key, models] of modelsByKey) {
      models.sort((a, b) => {
        // In-stock first, then by stock qty desc, then by model_no
        if (a.stock_qty === 0 && b.stock_qty > 0) return 1;
        if (b.stock_qty === 0 && a.stock_qty > 0) return -1;
        if (b.stock_qty !== a.stock_qty) return b.stock_qty - a.stock_qty;
        return (a.model_no || '').localeCompare(b.model_no || '');
      });
      modelsByKey.set(key, models);
    }

    return {
      categories: Array.from(categories).sort(),
      itemsByCategory: new Map(
        Array.from(itemsByCategory.entries()).map(([k, v]) => [k, Array.from(v).sort()])
      ),
      modelsByCategoryItem: modelsByKey,
    };
  }, []);
}

/**
 * Get list of items for a given category.
 */
export function getItemsForCategory(data: CascadeData, category: string): string[] {
  return data.itemsByCategory.get(category) || [];
}

/**
 * Get list of models for a given category + item.
 */
export function getModelsForCategoryItem(
  data: CascadeData,
  category: string,
  item: string
): InventoryItem[] {
  const key = `${category}__${item}`;
  return data.modelsByCategoryItem.get(key) || [];
}

/**
 * Get the full inventory list (for alternative suggestions etc.)
 */
export function getInventory(): InventoryItem[] {
  return ITEMS;
}
