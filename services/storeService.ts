
import { Invoice, InventoryBatch } from '../types';

const STORAGE_KEY = 'bullion_keep_data_v1';

// Fetch all data: Try Cloud -> Fallback to Local
export const fetchData = async (): Promise<{ invoices: Invoice[], inventory: InventoryBatch[] }> => {
  let cloudData = null;
  let usedSource = 'CLOUD';

  // 1. Try Cloud Fetch
  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
        cloudData = await res.json();
        // Update local backup with fresh cloud data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
    } else {
        console.warn(`Cloud sync endpoint unavailable (${res.status}). Switching to Local Mode.`);
        usedSource = 'LOCAL';
    }
  } catch (e) {
    console.warn("Cloud sync network error. Switching to Local Mode.");
    usedSource = 'LOCAL';
  }

  // 2. Return Cloud Data if successful
  if (cloudData) return cloudData;

  // 3. Fallback: Load from Local Storage
  try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
          const parsed = JSON.parse(local);
          // Ensure structure validity
          return {
              invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
              inventory: Array.isArray(parsed.inventory) ? parsed.inventory : []
          };
      }
  } catch (e) {
      console.error("Local storage corruption:", e);
  }

  // 4. Default empty state
  return { invoices: [], inventory: [] };
};

// Save all data: Write Local -> Try Cloud
export const saveData = async (invoices: Invoice[], inventory: InventoryBatch[]) => {
  // 1. Always save to Local Storage immediately (Optimistic UI & Offline capability)
  try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ invoices, inventory }));
  } catch (e) {
      console.error("Local save failed (Quota exceeded?)", e);
  }

  // 2. Try Cloud Save (Background Sync)
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices, inventory }),
    });
    
    if (!res.ok) {
        // We don't throw here to avoid disrupting the UI, just log warning
        if (res.status !== 404) console.warn("Background cloud save failed:", res.statusText);
    }
  } catch (e) {
    // Ignore network errors for background save, local persistence handles it
  }
};

// Reset data: Clear both
export const resetData = async () => {
  localStorage.removeItem(STORAGE_KEY);
  try {
      await fetch('/api/sync', { method: 'DELETE' });
  } catch {}
};

// Legacy compatibility
export const loadInvoices = async () => (await fetchData()).invoices;
export const loadInventory = async () => (await fetchData()).inventory;
