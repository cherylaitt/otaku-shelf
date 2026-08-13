export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `$${amount.toFixed(2)}`;
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
