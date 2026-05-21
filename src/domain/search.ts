export interface SearchableFields {
  name: string;
  phone: string;
  token: string;
}

export function matchesQuery(fields: SearchableFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return [fields.name, fields.phone, fields.token]
    .some((f) => (f ?? '').toLowerCase().includes(q));
}
