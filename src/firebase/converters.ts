import { Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';

const ESTIMATE: SnapshotOptions = { serverTimestamps: 'estimate' };

export function tsToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

export function readData(snap: QueryDocumentSnapshot<DocumentData>): DocumentData & { id: string } {
  return { id: snap.id, ...snap.data(ESTIMATE) };
}
