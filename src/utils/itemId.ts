/**
 * Utility functions for generating and formatting antique item IDs.
 * Uses concise 4-digit format: 'item-XXXX' (e.g. 'item-0001', 'item-0028')
 */

export function extractNumericSuffix(id: string): number | null {
  if (!id) return null;
  // Match item-0012 or item_12 or 0012
  const match = id.match(/(?:item[-_])?(\d+)$/i);
  if (match && match[1]) {
    // Ignore 13-digit millisecond timestamps (> 1000000)
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num < 1000000) {
      return num;
    }
  }
  return null;
}

export function generateNextItemId(existingItems?: Array<{ id: string }>): string {
  let highest = 0;
  if (existingItems && Array.isArray(existingItems)) {
    for (const item of existingItems) {
      const num = extractNumericSuffix(item.id);
      if (num !== null && num > highest) {
        highest = num;
      }
    }
  }

  let nextNum = highest + 1;
  let nextId = `item-${String(nextNum).padStart(4, '0')}`;

  // Collision safety check
  if (existingItems && Array.isArray(existingItems)) {
    const existingSet = new Set(existingItems.map((i) => i.id));
    while (existingSet.has(nextId)) {
      nextNum++;
      nextId = `item-${String(nextNum).padStart(4, '0')}`;
    }
  }

  return nextId;
}

export function formatDisplayId(id: string): string {
  if (!id) return '';
  return id;
}
