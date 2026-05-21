import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './config';
import type { Customer, Order, Template, Language, AppSettings } from '../types';

// Helper to strip undefined fields to prevent Firestore SDK validation errors
function cleanUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as any;
}

export async function createCustomer(data: Omit<Customer, 'id' | 'nameLower' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'customers'), {
    ...cleanUndefined(data),
    nameLower: data.name.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCustomer(id: string, patch: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) {
  const data: any = { ...cleanUndefined(patch), updatedAt: serverTimestamp() };
  if (patch.name) {
    data.nameLower = patch.name.toLowerCase();
  }
  return updateDoc(doc(db, 'customers', id), data);
}

export async function deleteCustomer(customerId: string) {
  const orders = await getDocs(query(collection(db, 'orders'), where('customerId', '==', customerId)));
  if (!orders.empty) throw new Error('This customer has orders. Delete or reassign those first.');
  await deleteDoc(doc(db, 'customers', customerId));
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'orders'), {
    ...cleanUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  return updateDoc(doc(db, 'orders', id), {
    ...cleanUndefined(patch),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrder(id: string) {
  return deleteDoc(doc(db, 'orders', id));
}

export async function upsertTemplate(t: Template) {
  return setDoc(doc(db, 'templates', t.id), {
    ...t,
    createdAt: t.createdAt ? t.createdAt : serverTimestamp(),
  }, { merge: true });
}

export async function deleteTemplate(id: string) {
  return deleteDoc(doc(db, 'templates', id));
}

export async function setLanguage(language: Language) {
  return setDoc(doc(db, 'settings', 'app'), { language }, { merge: true });
}

export async function updateSettings(patch: Partial<AppSettings>) {
  return setDoc(doc(db, 'settings', 'app'), cleanUndefined(patch), { merge: true });
}
