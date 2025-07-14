// src/utils/dateUtils.ts
// Utility functions for date formatting and validation
export function formatReleaseDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Extracts the year from a date string in various formats
export function getYearFromDate(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    // Fallback for invalid date formats. Assuming dateString is in format "YYYY-MM-DD" or similar
    const yearMatch = dateString.match(/^(\d{4})/);
    return yearMatch ? yearMatch[1] : null;
  }
}

// Checks if a date string is valid
// Returns true if the date is valid, false otherwise
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Compares two date strings and returns -1, 0, or 1
// -1 if dateA is earlier than dateB
export function compareDates(dateA: string, dateB: string): number {
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
}