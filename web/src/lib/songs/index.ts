import { DRIVE_SONGS_FOLDER } from "../drive/config";
import {
  deleteDriveFile,
  downloadDriveFile,
  driveThumbnail,
  isSongFile,
  listFolder,
  uploadToFolder,
  type DriveFile,
} from "../drive/files";

export type LibrarySong = {
  id: string;
  name: string;
  mimeType: string;
  createdAt: number;
  thumbnail: string;
  webViewLink?: string;
  kind: "slides" | "pptx";
};

function displayName(file: DriveFile) {
  return file.name.replace(/\.(pptx?|odp)$/i, "");
}

function toSong(file: DriveFile): LibrarySong {
  return {
    id: file.id,
    name: displayName(file),
    mimeType: file.mimeType,
    createdAt: file.modifiedTime ? Date.parse(file.modifiedTime) : 0,
    thumbnail: driveThumbnail(file, 600),
    webViewLink: file.webViewLink,
    kind: file.mimeType.includes("google-apps.presentation") ? "slides" : "pptx",
  };
}

let cache: DriveFile[] = [];

export async function listSongs() {
  cache = (await listFolder(DRIVE_SONGS_FOLDER)).filter(isSongFile);
  return cache.map(toSong).sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export async function addSongs(files: File[]) {
  for (const file of files) {
    await uploadToFolder(DRIVE_SONGS_FOLDER, file);
  }
  return listSongs();
}

export async function removeSong(id: string) {
  await deleteDriveFile(id);
  return listSongs();
}

export async function downloadSong(id: string) {
  const file = cache.find((item) => item.id === id);
  if (!file) throw new Error("Arquivo não encontrado.");
  return downloadDriveFile(file);
}
