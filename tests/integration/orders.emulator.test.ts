import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { createCustomer, deleteCustomer, createOrder, updateOrder, upsertTemplate } from '../../src/firebase/repo';
import { ensureSeeded } from '../../src/firebase/seed';
import { orderStatusRollup } from '../../src/domain/status';
import fs from 'fs';

let testEnv: RulesTestEnvironment;

describe('Firebase Security Rules & Emulator Integration', () => {
  beforeAll(async () => {
    // 1. Initialize Rules Test Environment for Firestore rules verification
    testEnv = await initializeTestEnvironment({
      projectId: 'mock-project-id',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });

    // 2. Create an authenticated shop user in the local Auth emulator for repository tests
    try {
      await createUserWithEmailAndPassword(auth, 'shop@example.com', 'password123');
    } catch (e: any) {
      // User might already exist in persistent emulator state, which is fine
      if (e.code !== 'auth/email-already-in-use') {
        throw e;
      }
    }
  });

  afterAll(async () => {
    await testEnv.cleanup();
    await signOut(auth);
  });

  describe('Security Rules', () => {
    it('denies unauthenticated read/write to collections', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      
      await expect(
        getDoc(doc(unauthedDb, 'customers/some-id'))
      ).rejects.toThrow();

      await expect(
        getDoc(doc(unauthedDb, 'orders/some-id'))
      ).rejects.toThrow();
    });

    it('allows authenticated read/write to collections', async () => {
      const authedDb = testEnv.authenticatedContext('shop-user-123').firestore();
      
      const testDocRef = doc(authedDb, 'customers/test-cust');
      await expect(
        setDoc(testDocRef, { name: 'Test Customer', nameLower: 'test customer', createdAt: Date.now(), updatedAt: Date.now() })
      ).resolves.not.toThrow();

      await expect(
        getDoc(testDocRef)
      ).resolves.not.toThrow();
    });
  });

  describe('Repository Integration', () => {
    beforeEach(async () => {
      // Ensure we are signed in as the shop user for repo writes
      await signInWithEmailAndPassword(auth, 'shop@example.com', 'password123');
    });

    it('can create, update and delete a customer with no orders', async () => {
      // Create Customer
      const newCustRef = await createCustomer({
        name: 'Harshil Tailor',
        phone: '9898989898',
        gender: 'male',
        notes: 'Needs perfect fit',
      });
      expect(newCustRef.id).toBeDefined();

      // Read back and assert nameLower is correctly derived in repo
      const snap = await getDoc(doc(db, 'customers', newCustRef.id));
      expect(snap.exists()).toBe(true);
      const data = snap.data();
      expect(data?.nameLower).toBe('harshil tailor');

      // Delete Customer
      await expect(deleteCustomer(newCustRef.id)).resolves.not.toThrow();
      const snapDeleted = await getDoc(doc(db, 'customers', newCustRef.id));
      expect(snapDeleted.exists()).toBe(false);
    });

    it('blocks deleting a customer who has orders', async () => {
      const newCustRef = await createCustomer({ name: 'Radhika Patel' });
      
      // Create order for this customer
      const newOrderRef = await createOrder({
        tokenNo: '7788',
        customerId: newCustRef.id,
        deadline: '2026-06-15',
        items: [],
        photos: [],
      });

      // Try deleting customer, expect error
      await expect(deleteCustomer(newCustRef.id)).rejects.toThrow(
        'This customer has orders. Delete or reassign those first.'
      );

      // Clean up order and customer
      const orderDoc = doc(db, 'orders', newOrderRef.id);
      // Directly delete the order for test cleanup since repo does not have a deleteOrder yet
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(orderDoc);
      await deleteCustomer(newCustRef.id);
    });

    it('seeds default templates correctly and avoids double-seeding', async () => {
      // Run ensureSeeded
      await ensureSeeded();

      // Verify that templates exist in firestore
      const templatesSnap = await getDocs(collection(db, 'templates'));
      expect(templatesSnap.empty).toBe(false);
      
      const seedCount = templatesSnap.size;
      expect(seedCount).toBe(6); // Blouse, Kameez, Salwar, Dress, Shirt, Pant

      // Verify app settings is flagged as seeded
      const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
      expect(settingsSnap.exists()).toBe(true);
      expect(settingsSnap.data()?.seeded).toBe(true);

      // Run ensureSeeded again, verify count remains 6 (idempotency check)
      await ensureSeeded();
      const templatesSnap2 = await getDocs(collection(db, 'templates'));
      expect(templatesSnap2.size).toBe(6);
    });

    it('preserves past measurements inside order items when template is modified', async () => {
      // 1. Create a custom template
      const templateId = 'custom-temp-1';
      const template: Template = {
        id: templateId,
        name: 'Custom Suit',
        isDefault: false,
        fields: [
          { id: 'f1', label: 'Chest', unit: 'in' },
          { id: 'f2', label: 'Length', unit: 'in' },
        ],
        createdAt: Date.now(),
      };
      await upsertTemplate(template);

      // 2. Create order using this template with measurements
      const orderRef = await createOrder({
        tokenNo: '1122',
        customerId: 'cust-x',
        deadline: '2026-07-01',
        items: [
          {
            itemId: 'item-1',
            garmentType: 'Custom Suit',
            templateId: templateId,
            quantity: 1,
            measurements: [
              { fieldId: 'f1', label: 'Chest', value: '40', unit: 'in' },
              { fieldId: 'f2', label: 'Length', value: '30', unit: 'in' },
            ],
            status: 'pending',
          },
        ],
        photos: [],
      });

      // 3. Modify template (e.g. rename Chest to Chest/Bust, delete Length, add Shoulder)
      const updatedTemplate: Template = {
        id: templateId,
        name: 'Custom Suit Updated',
        isDefault: false,
        fields: [
          { id: 'f1', label: 'Chest/Bust', unit: 'in' },
          { id: 'f3', label: 'Shoulder', unit: 'in' },
        ],
        createdAt: Date.now(),
      };
      await upsertTemplate(updatedTemplate);

      // 4. Retrieve order and verify the order's measurements are completely unaffected
      const orderSnap = await getDoc(doc(db, 'orders', orderRef.id));
      const orderData = orderSnap.data() as Order;
      expect(orderData.items[0].measurements).toEqual([
        { fieldId: 'f1', label: 'Chest', value: '40', unit: 'in' },
        { fieldId: 'f2', label: 'Length', value: '30', unit: 'in' },
      ]);

      // Cleanup
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'orders', orderRef.id));
      await deleteDoc(doc(db, 'templates', templateId));
    });

    it('correctly handles order item status updates and status rollups', async () => {
      // Create order with 2 items
      const orderRef = await createOrder({
        tokenNo: '5566',
        customerId: 'cust-y',
        deadline: '2026-07-02',
        items: [
          { itemId: 'item-a', garmentType: 'Shirt', templateId: null, quantity: 1, measurements: [], status: 'pending' },
          { itemId: 'item-b', garmentType: 'Pant', templateId: null, quantity: 1, measurements: [], status: 'pending' },
        ],
        photos: [],
      });

      // Initially rollup is pending
      let snap = await getDoc(doc(db, 'orders', orderRef.id));
      let order = snap.data() as Order;
      expect(orderStatusRollup(order.items)).toBe('pending');

      // Update item A to ready -> rollup should remain pending because item B is pending
      const updatedItems1 = order.items.map(item => item.itemId === 'item-a' ? { ...item, status: 'ready' as const } : item);
      await updateOrder(orderRef.id, { items: updatedItems1 });
      
      snap = await getDoc(doc(db, 'orders', orderRef.id));
      order = snap.data() as Order;
      expect(orderStatusRollup(order.items)).toBe('pending');

      // Update item B to ready -> rollup should be ready since both are ready
      const updatedItems2 = order.items.map(item => item.itemId === 'item-b' ? { ...item, status: 'ready' as const } : item);
      await updateOrder(orderRef.id, { items: updatedItems2 });

      snap = await getDoc(doc(db, 'orders', orderRef.id));
      order = snap.data() as Order;
      expect(orderStatusRollup(order.items)).toBe('ready');

      // Update item A to delivered -> rollup should remain ready because not all are delivered
      const updatedItems3 = order.items.map(item => item.itemId === 'item-a' ? { ...item, status: 'delivered' as const } : item);
      await updateOrder(orderRef.id, { items: updatedItems3 });

      snap = await getDoc(doc(db, 'orders', orderRef.id));
      order = snap.data() as Order;
      expect(orderStatusRollup(order.items)).toBe('ready');

      // Update item B to delivered -> rollup should be delivered
      const updatedItems4 = order.items.map(item => item.itemId === 'item-b' ? { ...item, status: 'delivered' as const } : item);
      await updateOrder(orderRef.id, { items: updatedItems4 });

      snap = await getDoc(doc(db, 'orders', orderRef.id));
      order = snap.data() as Order;
      expect(orderStatusRollup(order.items)).toBe('delivered');

      // Cleanup
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'orders', orderRef.id));
    });
  });
});
