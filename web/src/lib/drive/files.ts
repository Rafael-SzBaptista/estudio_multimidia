import { DRIVE_OWNER_EMAIL, GOOGLE_API_KEY, hasDriveApiKey, hasDriveClient } from "./config";
import {
  DriveAuthError,
  ensureDriveToken,
  ensureOwnerWriteToken,
  getDriveToken,
  signInToDrive,
  signOutOfDrive,
  verifyLibraryOwnerEmail,
} from "./auth";

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

let proxyAvailable: boolean | null = null;

async function proxyRequest(search: string, init: RequestInit = {}): Promise<Response | null> {
  if (proxyAvailable === false) return null;
  const token = await ensureDriveToken();
  let response: Response;
  try {
    response = await fetch(`/api/drive${search}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    proxyAvailable = false;
    return null;
  }
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json") || response.status === 404 || response.status === 501) {
    proxyAvailable = false;
    return null;
  }
  proxyAvailable = true;
  if (response.status === 401) throw new DriveAuthError();
  return response;
}

async function driveFetch(pathAndQuery: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const url = new URL(`https://www.googleapis.com/drive/v3/${pathAndQuery}`);
  const headers = new Headers(init.headers);
  let token = getDriveToken();
  if (!token && hasDriveClient()) token = await ensureDriveToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (hasDriveApiKey()) {
    url.searchParams.set("key", GOOGLE_API_KEY);
  } else {
    throw new DriveAuthError("Configure VITE_GOOGLE_CLIENT_ID ou VITE_GOOGLE_API_KEY para usar o Drive.");
  }

  const response = await fetch(url.toString(), { ...init, headers });
  if (response.status === 401 && retry && hasDriveClient()) {
    signOutOfDrive();
    await signInToDrive(true, "select_account");
    return driveFetch(pathAndQuery, init, false);
  }
  return response;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } | string };
    if (typeof body.error === "string") return body.error;
    return body.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function assertLibraryOwner() {
  await verifyLibraryOwnerEmail();
}

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const proxied = await proxyRequest(`?action=list&folderId=${encodeURIComponent(folderId)}`);
  if (proxied) {
    if (!proxied.ok) throw new Error(await readError(proxied));
    const data = (await proxied.json()) as { files?: DriveFile[] };
    return data.files ?? [];
  }

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
  const proxied = await proxyRequest(
    `?action=download&id=${encodeURIComponent(file.id)}${exportSlides ? "&export=slides" : ""}`,
  );
  let blob: Blob;
  if (proxied) {
    if (!proxied.ok) throw new Error(await readError(proxied));
    blob = await proxied.blob();
  } else {
    const path = exportSlides
      ? `files/${file.id}/export?mimeType=${encodeURIComponent(PPTX_MIME)}`
      : `files/${file.id}?alt=media`;
    const response = await driveFetch(path);
    if (!response.ok) throw new Error(await readError(response));
    blob = await response.blob();
  }
  const base = file.name.replace(/\.(pptx?|odp)$/i, "");
  const filename =
    exportSlides || !/\.(pptx?|odp|jpe?g|png|webp|gif)$/i.test(file.name)
      ? `${base}.${exportSlides ? "pptx" : file.mimeType.includes("image/") ? "jpg" : "bin"}`
      : file.name;
  return { blob, filename };
}

export async function uploadToFolder(folderId: string, file: File): Promise<DriveFile> {
  await assertLibraryOwner();
  const proxied = await proxyRequest("?action=session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folderId,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
    }),
  });
  if (proxied) {
    if (!proxied.ok) throw new Error(await readError(proxied));
    const { location } = (await proxied.json()) as { location?: string };
    if (!location) throw new Error("Não foi possível iniciar o envio.");
    const put = await fetch(location, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error("Não foi possível enviar o arquivo.");
    return put.json() as Promise<DriveFile>;
  }

  const token = await ensureOwnerWriteToken();
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
  await assertLibraryOwner();
  const proxied = await proxyRequest(`?action=delete&id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (proxied) {
    if (!proxied.ok) throw new Error(await readError(proxied));
    return;
  }
  await ensureOwnerWriteToken();
  const response = await driveFetch(`files/${id}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? `Só a conta ${DRIVE_OWNER_EMAIL} pode excluir arquivos da biblioteca.`
        : await readError(response),
    );
  }
}
