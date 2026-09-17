import { BUILTIN_IMAGES } from "./builtins";
import { fileToCoverDataUrl, imageFilename, srcToBlob } from "./cover";
import type { ImageRepository, LibraryImage } from "./types";

const DB_NAME = "gerador-slides";
const STORE = "images";
const SEED_KEY = "gerador-slides:library-seeded-v1";

type StoredImage = LibraryImage & { dataUrl?: string; order?: number; builtin?: boolean };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function normalize(row: StoredImage): LibraryImage {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    url: row.url || row.dataUrl || "",
    path: row.path || `local/${row.id}.jpg`,
  };
}

async function readAll(): Promise<LibraryImage[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as StoredImage[])
        .map(normalize)
        .filter((img) => img.url)
        .sort((a, b) => a.createdAt - b.createdAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function putAll(images: LibraryImage[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const img of images) store.put(img);
  await txDone(tx);
}

async function ensureSeed(): Promise<void> {
  if (localStorage.getItem(SEED_KEY)) return;
  const existing = await readAll();
  const known = new Set(existing.map((img) => img.id));
  const missing = BUILTIN_IMAGES.filter((img) => !known.has(img.id));
  if (missing.length) await putAll(missing);
  localStorage.setItem(SEED_KEY, "1");
}

export const localImageRepository: ImageRepository = {
  async list() {
    await ensureSeed();
    return readAll();
  },

  async upload(files) {
    await ensureSeed();
    const created: LibraryImage[] = [];
    let stamp = Date.now();

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const url = await fileToCoverDataUrl(file);
      if (!url) continue;
      const id = crypto.randomUUID();
      created.push({
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        createdAt: stamp,
        url,
        path: `local/${id}.jpg`,
      });
      stamp += 1;
    }

    if (created.length) await putAll(created);
    return readAll();
  },

  async download(id) {
    const images = await readAll();
    const image = images.find((img) => img.id === id);
    if (!image) throw new Error("Imagem não encontrada.");
    return {
      blob: await srcToBlob(image.url),
      filename: imageFilename(image.name),
    };
  },

  async remove(id) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    localStorage.setItem(SEED_KEY, "1");
    return readAll();
  },
};
