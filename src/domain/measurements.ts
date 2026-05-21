import type { Template, Order, MeasurementRow } from '../types';

export function rowsFromTemplate(template: Template): MeasurementRow[] {
  return template.fields.map((f) => ({ fieldId: f.id, label: f.label, value: '', unit: f.unit }));
}

// Pre-fill from the customer's most recent order item using the same template.
// `orders` must already be filtered to a single customer.
export function prefillRows(orders: Order[], templateId: string, template: Template): MeasurementRow[] | null {
  const matches = orders
    .flatMap((o) => o.items.filter((i) => i.templateId === templateId).map((i) => ({ createdAt: o.createdAt, item: i })))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (matches.length === 0) return null;
  const prev = matches[0].item.measurements;
  // Re-key onto the current template fields so renamed/added fields still line up.
  return template.fields.map((f) => {
    const found = prev.find((r) => r.fieldId === f.id);
    return { fieldId: f.id, label: f.label, value: found?.value ?? '', unit: f.unit };
  });
}
