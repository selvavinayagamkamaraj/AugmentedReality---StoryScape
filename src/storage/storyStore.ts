/** Cache only same-origin authored assets; failed storage never blocks a story. */
export async function assetDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise(resolve => {
    const request = indexedDB.open('storyar', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('assets'); request.result.createObjectStore('stories'); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(null); request.onblocked = () => resolve(null);
  });
}
export async function cacheValue(store: string, key: string, value?: unknown): Promise<unknown> {
  const db = await assetDatabase(); if (!db) return undefined;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store, value === undefined ? 'readonly' : 'readwrite');
      const request = value === undefined ? tx.objectStore(store).get(key) : tx.objectStore(store).put(value, key);
      request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(undefined);
      tx.oncomplete = () => db.close(); tx.onabort = () => { db.close(); resolve(undefined); };
    } catch { db.close(); resolve(undefined); }
  });
}

