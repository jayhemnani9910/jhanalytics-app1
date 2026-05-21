export function normalizePhoneIN(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits === '') return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildTelHref(phone: string): string {
  const n = normalizePhoneIN(phone);
  return n ? `tel:+${n}` : '';
}

export function buildWhatsAppHref(phone: string, message: string): string {
  const n = normalizePhoneIN(phone);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
