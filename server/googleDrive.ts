import { createSign } from "node:crypto";

export const IMAGES_FOLDER =
  process.env.DRIVE_IMAGES_FOLDER ||
  process.env.VITE_DRIVE_IMAGES_FOLDER ||
  "1ebsPPjcQjBdvrF47OSm2BCwhsig_cKdH";

export const SONGS_FOLDER =
  process.env.DRIVE_SONGS_FOLDER ||
  process.env.VITE_DRIVE_SONGS_FOLDER ||
  "1wDvc3zWeVTdgiUT_yfNbxN0fo_nQLPxh";

const ALLOWED_FOLDERS = new Set([IMAGES_FOLDER, SONGS_FOLDER]);

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type TokenInfo = {
  aud?: string;
  azp?: string;
  email?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function b64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function isAllowedFolder(id: string) {
  return ALLOWED_FOLDERS.has(id);
}

export async function verifyGoogleUser(authHeader: string | undefined) {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTH");
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
  );
  if (!response.ok) throw new Error("UNAUTH");
  const info = (await response.json()) as TokenInfo;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  if (clientId && info.aud !== clientId && info.azp !== clientId) throw new Error("UNAUTH");
  return { email: info.email || "" };
}

async function tokenFromServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const sa = JSON.parse(raw) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) return null;
  return { value: data.access_token, expiresAt: Date.now() + Math.max(60, (data.expires_in || 3500) - 60) * 1000 };
}

async function tokenFromRefresh() {
  const refresh = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refresh || !clientId || !secret) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) return null;
  return { value: data.access_token, expiresAt: Date.now() + Math.max(60, (data.expires_in || 3500) - 60) * 1000 };
}

export function hasDriveServerAuth() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
}

export async function getDriveAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const next = (await tokenFromServiceAccount()) || (await tokenFromRefresh());
  if (!next) throw new Error("NOT_CONFIGURED");
  cachedToken = next;
  return next.value;
}

export async function driveRequest(pathAndQuery: string, init: RequestInit = {}) {
  const token = await getDriveAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(`https://www.googleapis.com/drive/v3/${pathAndQuery}`, { ...init, headers });
}

export async function assertFileInLibrary(fileId: string) {
  const response = await driveRequest(`files/${fileId}?fields=id,parents&supportsAllDrives=true`);
  if (!response.ok) throw new Error("NOT_FOUND");
  const data = (await response.json()) as { parents?: string[] };
  if (!(data.parents || []).some((parent) => isAllowedFolder(parent))) throw new Error("FORBIDDEN");
}
