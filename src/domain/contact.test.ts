import { describe, it, expect } from 'vitest';
import { normalizePhoneIN, buildTelHref, buildWhatsAppHref } from './contact';

describe('normalizePhoneIN', () => {
  it('adds 91 to a 10-digit number', () => { expect(normalizePhoneIN('9876543210')).toBe('919876543210'); });
  it('strips spaces, dashes, plus', () => { expect(normalizePhoneIN('+91 98765-43210')).toBe('919876543210'); });
  it('keeps an already-prefixed number', () => { expect(normalizePhoneIN('919876543210')).toBe('919876543210'); });
  it('returns empty for empty', () => { expect(normalizePhoneIN('')).toBe(''); });
});

describe('hrefs', () => {
  it('builds a tel href', () => { expect(buildTelHref('9876543210')).toBe('tel:+919876543210'); });
  it('builds a wa.me href with encoded message', () => {
    expect(buildWhatsAppHref('9876543210', 'Order ready')).toBe('https://wa.me/919876543210?text=Order%20ready');
  });
  it('returns empty when no phone', () => { expect(buildWhatsAppHref('', 'x')).toBe(''); });
});
