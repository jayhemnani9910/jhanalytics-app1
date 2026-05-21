export type Gender = 'female' | 'male' | 'other';
export type OrderStatus = 'pending' | 'ready' | 'delivered';
export type Language = 'en' | 'gu';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  gender?: Gender;
  notes?: string;
  nameLower: string;
  createdAt: number; // epoch ms (estimated locally while offline)
  updatedAt: number;
}

export interface TemplateField {
  id: string;
  label: string;
  unit: string; // default 'in'
}

export interface Template {
  id: string;
  name: string;
  fields: TemplateField[];
  gender?: Gender;
  isDefault: boolean;
  createdAt: number;
}

export interface MeasurementRow {
  fieldId: string | null; // null for custom rows
  label: string;
  value: string; // free text: '37', '37½', 'loose'
  unit: string;
}

export interface OrderItem {
  itemId: string;
  garmentType: string;
  templateId: string | null;
  quantity: number;
  measurements: MeasurementRow[];
  price?: number;
  status: OrderStatus;
}

export interface Order {
  id: string;
  tokenNo: string;
  customerId: string;
  deadline: string; // YYYY-MM-DD
  items: OrderItem[];
  advancePaid?: number;
  notes?: string;
  photos: string[]; // 'local:<id>' or storage path
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  language: Language;
  shopName?: string;
  seeded: boolean;
  theme?: 'dark' | 'light';
  textScale?: 'normal' | 'large';
}

export type DeadlineBucket = 'overdue' | 'due-soon' | 'upcoming';
