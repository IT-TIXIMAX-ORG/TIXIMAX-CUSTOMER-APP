export const formatCurrency = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '0 ₫';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!dateStr) return '---';

  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '---';

    return new Intl.DateTimeFormat(
      'vi-VN',
      options ?? {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(date);
  } catch {
    return '---';
  }
};

export const formatShortDate = (dateStr: string | null | undefined): string =>
  formatDate(dateStr, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatWeight = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '---';
  return `${value.toFixed(2)} KG`;
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const parseNumberInput = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
