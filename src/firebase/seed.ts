import { doc, runTransaction, collection } from 'firebase/firestore';
import { db } from './config';
import { DEFAULT_TEMPLATES } from '../domain/defaultTemplates';

export async function ensureSeeded() {
  const settingsRef = doc(db, 'settings', 'app');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    if (snap.exists() && snap.data()?.seeded === true) return;
    
    for (const t of DEFAULT_TEMPLATES) {
      const id = crypto.randomUUID();
      tx.set(doc(collection(db, 'templates'), id), {
        id,
        name: t.name,
        gender: t.gender ?? null,
        isDefault: true,
        fields: t.fields.map((f) => ({
          id: crypto.randomUUID(),
          label: f.label,
          unit: f.unit,
        })),
        createdAt: new Date(),
      });
    }
    tx.set(settingsRef, { language: 'en', seeded: true });
  });
}
