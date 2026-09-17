import { GOOGLE_API_KEY, hasDriveApiKey, hasDriveClient } from "./config";
import { DriveAuthError, ensureDriveToken, getDriveToken, signInToDrive } from "./auth";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
};

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const SLIDES_MIME = "application/vnd.google-apps.presentation";

async function driveFetch(pathAndQuery: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const url = new URL(`https://www.googleapis.com/drive/v3/${pathAndQuery}`);
  const headers = new Headers(init.headers);
  const token = getDriveToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (hasDriveApiKey()) {
    url.searchParams.set("key", GOOGLE_API_KEY);
  } else if (hasDriveClient()) {
    await ensureDriveToken();
    return driveFetch(pathAndQuery, init, false);
  } else {
    throw new DriveAuthError("Configure VITE_GOOGLE_CLIENT_ID ou VITE_GOOGLE_API_KEY para usar o Drive.");
  }

  const response = await fetch(url.toString(), { ...init, headers });
  if ((response.status === 401 || response.status === 403) && retry && hasDriveClient()) {
    await signInToDrive(true);
    return driveFetch(pathAndQuery, init, false);
  }
  return response;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,iconLink)",
      pageSize: "100",
      orderBy: "name",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(`files?${params.toString()}`);
    if (!response.ok) throw new Error(await readError(response));
    const data = (await response.json()) as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

export function isImageFile(file: DriveFile) {
  return file.mimeType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export function isSongFile(file: DriveFile) {
  return (
    file.mimeType === PPTX_MIME ||
    file.mimeType === SLIDES_MIME ||
    file.mimeType === "application/vnd.ms-powerpoint" ||
    /\.(pptx?|odp)$/i.test(file.name)
  );
}

export function driveThumbnail(file: DriveFile, size = 800) {
  if (file.thumbnailLink) return file.thumbnailLink.replace(/=s\d+$/, `=s${size}`);
  return `https://drive.google.com/thumbnail?id=${file.id}&sz=w${size}`;
}

export async function downloadDriveFile(file: DriveFile): Promise<{ blob: Blob; filename: string }> {
  const exportSlides = file.mimeType === SLIDES_MIME;
  const path = exportSlides
    ? `files/${file.id}/export?mimeType=${encodeURIComponent(PPTX_MIME)}`
    : `files/${file.id}?alt=media`;
  const response = await driveFetch(path);
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const base = file.name.replace(/\.(pptx?|odp)$/i, "");
  const filename = exportSlides || !/\.(pptx?|odp|jpe?g|png|webp|gif)$/i.test(file.name)
    ? `${base}.${exportSlides ? "pptx" : file.mimeType.includes("image/") ? "jpg" : "bin"}`
    : file.name;
  return { blob, filename };
}

export async function uploadToFolder(folderId: string, file: File): Promise<DriveFile> {
  const token = await ensureDriveToken();
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const boundary = `drive_boundary_${Date.now()}`;
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,iconLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<DriveFile>;
}

export async function deleteDriveFile(id: string) {
  const response = await driveFetch(`files/${id}?supportsAllDrives=true`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) throw new Error(await readError(response));
}
