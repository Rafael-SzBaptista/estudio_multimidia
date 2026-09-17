export const DRIVE_IMAGES_FOLDER =
  import.meta.env.VITE_DRIVE_IMAGES_FOLDER || "1ebsPPjcQjBdvrF47OSm2BCwhsig_cKdH";

export const DRIVE_SONGS_FOLDER =
  import.meta.env.VITE_DRIVE_SONGS_FOLDER || "1wDvc3zWeVTdgiUT_yfNbxN0fo_nQLPxh";

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

export function hasDriveClient(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function hasDriveApiKey(): boolean {
  return Boolean(GOOGLE_API_KEY);
}

export function hasDriveAccess(): boolean {
  return hasDriveClient() || hasDriveApiKey();
}

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
