export function formatDateZA(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateDaysAgo(daysAgo: number): { formatted: string; raw: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const raw = formatISODate(d);
  const formatted = formatDateZA(d);
  const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
  return { formatted, raw, label };
}

