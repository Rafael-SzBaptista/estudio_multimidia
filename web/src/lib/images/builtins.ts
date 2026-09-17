import type { LibraryImage } from "./types";

export const BUILTIN_IMAGES: LibraryImage[] = Array.from({ length: 15 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `builtin-natureza-${n}`,
    name: `Natureza ${n}`,
    createdAt: i,
    url: `/backgrounds/natureza_${n}.jpg`,
    path: `builtin/natureza_${n}.jpg`,
  };
});
