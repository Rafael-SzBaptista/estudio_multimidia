import { DRIVE_IMAGES_FOLDER } from "../drive/config";
import { deleteDriveFile, downloadDriveFile, driveThumbnail, isImageFile, listFolder, uploadToFolder, type DriveFile } from "../drive/files";
import type { ImageDownload, ImageRepository, LibraryImage } from "./types";

function toLibraryImage(file: DriveFile): LibraryImage {
  return {
    id: file.id,
    name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
    createdAt: file.modifiedTime ? Date.parse(file.modifiedTime) : 0,
    url: driveThumbnail(file),
    path: `drive/${file.id}`,
  };
}

let cache: DriveFile[] = [];

export const driveImageRepository: ImageRepository = {
  async list() {
    cache = (await listFolder(DRIVE_IMAGES_FOLDER)).filter(isImageFile);
    return cache.map(toLibraryImage);
  },

  async upload(files: File[]) {
    for (const file of files) {
      await uploadToFolder(DRIVE_IMAGES_FOLDER, file);
    }
    return this.list();
  },

  async download(id: string): Promise<ImageDownload> {
    const file = cache.find((item) => item.id === id) ?? {
      id,
      name: "imagem.jpg",
      mimeType: "image/jpeg",
    };
    return downloadDriveFile(file);
  },

  async remove(id: string) {
    await deleteDriveFile(id);
    return this.list();
  },
};
