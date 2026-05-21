import { create } from 'zustand';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { readData, tsToMillis } from '../firebase/converters';
import type { Customer, Order, Template, AppSettings } from '../types';

interface StoreState {
  customers: Customer[];
  orders: Order[];
  templates: Template[];
  settings: AppSettings | null;
  online: boolean;
  ready: boolean;
  init: () => () => void; // returns unsubscribe
}

function mapCustomer(d: any): Customer { return { ...d, createdAt: tsToMillis(d.createdAt), updatedAt: tsToMillis(d.updatedAt) }; }
function mapOrder(d: any): Order { return { ...d, createdAt: tsToMillis(d.createdAt), updatedAt: tsToMillis(d.updatedAt), photos: d.photos ?? [], items: d.items ?? [] }; }
function mapTemplate(d: any): Template { return { ...d, createdAt: tsToMillis(d.createdAt), fields: d.fields ?? [] }; }

export const useStore = create<StoreState>((set) => ({
  customers: [], orders: [], templates: [], settings: null, online: navigator.onLine, ready: false,
  init: () => {
    const unsubs = [
      onSnapshot(collection(db, 'customers'), (snap) => set({ customers: snap.docs.map((s) => mapCustomer(readData(s))) })),
      onSnapshot(collection(db, 'orders'), (snap) => set({ orders: snap.docs.map((s) => mapOrder(readData(s))), ready: true })),
      onSnapshot(collection(db, 'templates'), (snap) => set({ templates: snap.docs.map((s) => mapTemplate(readData(s))) })),
      onSnapshot(doc(db, 'settings', 'app'), (snap) => set({ settings: snap.exists() ? (snap.data() as AppSettings) : null })),
    ];
    const on = () => set({ online: true });
    const off = () => set({ online: false });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { unsubs.forEach((u) => u()); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  },
}));
