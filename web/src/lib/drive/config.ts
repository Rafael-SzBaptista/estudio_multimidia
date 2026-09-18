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

export const DRIVE_OWNER_EMAIL = (
  import.meta.env.VITE_DRIVE_OWNER_EMAIL || "multimidiaconecte@gmail.com"
)
  .trim()
  .toLowerCase();

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isDriveLibraryOwner(email?: string | null) {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (value === DRIVE_OWNER_EMAIL) return true;
  const [local, domain] = value.split("@");
  const [ownerLocal, ownerDomain] = DRIVE_OWNER_EMAIL.split("@");
  if (!local || !domain || local !== ownerLocal) return false;
  return GMAIL_DOMAINS.has(domain) && GMAIL_DOMAINS.has(ownerDomain);
}

export const DRIVE_READ_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email openid email";
export const DRIVE_WRITE_SCOPE =
  "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email openid email";
export const DRIVE_SCOPE = DRIVE_READ_SCOPE;
export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
