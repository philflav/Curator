/**
 * Date formatting utilities for Curator Antiques Catalog.
 * Standardized to UK format: DD/MM/YYYY.
 */

/**
 * Format any date representation (timestamp, ISO string, UK string, Date object)
 * into standard UK format DD/MM/YYYY (e.g. 14/05/2023).
 * Returns empty string if the input is null, undefined, or invalid.
 */
export function formatDateToUK(val?: string | number | Date | null): string {
  if (val === null || val === undefined || val === '') return '';

  // 1. If it's already in DD/MM/YYYY format
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // 2. If it's in YYYY-MM-DD format (e.g. '2023-05-14')
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // 3. If it's in DD-MM-YYYY or DD.MM.YYYY format
    const altMatch = trimmed.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
    if (altMatch) {
      const day = altMatch[1].padStart(2, '0');
      const month = altMatch[2].padStart(2, '0');
      const year = altMatch[3];
      return `${day}/${month}/${year}`;
    }
  }

  // 4. Try parsing as Date / timestamp
  const dateObj = typeof val === 'number' ? new Date(val) : new Date(val);
  if (isNaN(dateObj.getTime())) {
    // If string representation couldn't be parsed, return original string if present
    return typeof val === 'string' ? val : '';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Converts a UK date string (DD/MM/YYYY) to an ISO YYYY-MM-DD string
 * suitable for native HTML <input type="date"> elements.
 */
export function parseUKDateToISO(ukStr?: string | null): string {
  if (!ukStr) return '';
  const trimmed = ukStr.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Returns today's date formatted in standard UK DD/MM/YYYY format.
 */
export function getTodayUKDate(): string {
  return formatDateToUK(new Date());
}

/**
 * Formats a timestamp into UK format with time: DD/MM/YYYY HH:mm
 */
export function formatDateTimeUK(val?: string | number | Date | null): string {
  if (!val) return '';
  const dateObj = typeof val === 'number' ? new Date(val) : new Date(val);
  if (isNaN(dateObj.getTime())) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
