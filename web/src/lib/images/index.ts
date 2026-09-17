import { localImageRepository } from "./localRepository";
import { driveImageRepository } from "./driveRepository";
import { hasDriveAccess } from "../drive/config";
import { blobToDataUrl } from "./cover";
import type { ImageRepository, LibraryImage } from "./types";

export type { ImageRepository, LibraryImage } from "./types";
export { fileToCoverDataUrl, downloadBlob, blobToDataUrl } from "./cover";

let cached: ImageRepository | null = null;

export function getImageRepository(): ImageRepository {
  if (cached) return cached;
  cached = hasDriveAccess() ? driveImageRepository : localImageRepository;
  return cached;
}

export function listImages() {
  return getImageRepository().list();
}

export function addImages(files: File[]) {
  return getImageRepository().upload(files);
}

export function removeImage(id: string) {
  return getImageRepository().remove(id);
}

export function downloadImage(id: string) {
  return getImageRepository().download(id);
}

export async function resolveLibraryBackground(image: LibraryImage): Promise<string> {
  if (!image.path.startsWith("drive/")) return image.url;
  const file = await downloadImage(image.id);
  return blobToDataUrl(file.blob);
}
