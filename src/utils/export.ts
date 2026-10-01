import type { Item } from '../types/schema';

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCSV(items: Item[], categoryFilter?: string): void {
  const filtered = categoryFilter && categoryFilter !== 'All' 
    ? items.filter((i) => i.category === categoryFilter) 
    : items;

  const headers = [
    'ID',
    'Title',
    'Category',
    'Subcategory',
    'Maker',
    'Model or Pattern',
    'Period / Year',
    'Condition',
    'Condition Notes',
    'Description',
    'Height',
    'Width',
    'Depth',
    'Dimension Unit',
    'Estimated Value',
    'Acquisition Cost',
    'Currency',
    'Acquisition Date',
    'Acquisition Location',
    'Curator Notes',
    'Primary Image URL',
    'Cataloged At',
  ];

  const rows = filtered.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.title),
    escapeCSV(item.category),
    escapeCSV(item.subcategory || ''),
    escapeCSV(item.maker || ''),
    escapeCSV(item.modelOrPattern || ''),
    escapeCSV(item.periodOrYear || ''),
    escapeCSV(item.condition),
    escapeCSV(item.conditionNotes || ''),
    escapeCSV(item.description || ''),
    escapeCSV(item.dimensions?.height ?? ''),
    escapeCSV(item.dimensions?.width ?? ''),
    escapeCSV(item.dimensions?.depth ?? ''),
    escapeCSV(item.dimensions?.unit ?? 'cm'),
    escapeCSV(item.estimatedValue ?? ''),
    escapeCSV(item.acquisitionCost ?? ''),
    escapeCSV(item.currency),
    escapeCSV(item.acquisitionDate || ''),
    escapeCSV(item.acquisitionLocation || ''),
    escapeCSV(item.notes || ''),
    escapeCSV(item.primaryImageUrl || ''),
    escapeCSV(new Date(item.createdAt).toISOString()),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `curator-catalog-${(categoryFilter || 'all').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;

  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportToJSON(items: Item[], categoryFilter?: string): void {
  const filtered = categoryFilter && categoryFilter !== 'All' 
    ? items.filter((i) => i.category === categoryFilter) 
    : items;

  const jsonContent = JSON.stringify(filtered, null, 2);
  const filename = `curator-catalog-${(categoryFilter || 'all').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;

  downloadBlob(jsonContent, filename, 'application/json');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
