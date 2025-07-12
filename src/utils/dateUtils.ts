/**
 * Formata uma data no formato ISO (YYYY-MM-DD) para exibição em português
 */
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

/**
 * Extrai apenas o ano de uma data
 */
export function getYearFromDate(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    // Tenta extrair o ano se a string estiver no formato YYYY-MM-DD
    const yearMatch = dateString.match(/^(\d{4})/);
    return yearMatch ? yearMatch[1] : null;
  }
}

/**
 * Verifica se uma data é válida
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Compara duas datas de lançamento
 * Retorna: -1 se a < b, 1 se a > b, 0 se iguais
 */
export function compareDates(dateA: string, dateB: string): number {
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
}