import {
  DRIVE_READ_SCOPE,
  DRIVE_WRITE_SCOPE,
  GIS_SCRIPT,
  GOOGLE_CLIENT_ID,
  hasDriveClient,
  isDriveLibraryOwner,
} from "./config";

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

type TokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: string;
};

type SignInPrompt = "consent" | "select_account" | "";

let token: string | null = null;
let expiresAt = 0;
let accountEmail: string | null = null;
let tokenScope: "read" | "write" | null = null;
let client: TokenClient | null = null;
let clientScope: string | null = null;
let gisReady: Promise<void> | null = null;
let pending: { resolve: (value: string) => void; reject: (reason?: unknown) => void } | null = null;
const listeners = new Set<() => void>();

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export class DriveAuthError extends Error {
  constructor(message = "Entre com o Google para acessar o Drive.") {
    super(message);
    this.name = "DriveAuthError";
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeDriveAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDriveToken() {
  if (token && Date.now() < expiresAt) return token;
  return null;
}

export function getDriveAccountEmail() {
  return accountEmail;
}

export function isDriveSignedIn() {
  return Boolean(getDriveToken());
}

export function canManageDriveLibrary() {
  return isDriveSignedIn() && isDriveLibraryOwner(accountEmail);
}

function loadGis(): Promise<void> {
  if (!gisReady) {
    gisReady = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
      if (existing && window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = GIS_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar o login do Google."));
      document.head.appendChild(script);
    });
  }
  return gisReady;
}

async function emailFromUserinfo(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email?.trim() || null;
}

async function emailFromTokenInfo(accessToken: string): Promise<string | null> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email?.trim() || null;
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    return (await emailFromTokenInfo(accessToken)) || (await emailFromUserinfo(accessToken));
  } catch {
    return null;
  }
}

async function rememberAccount(accessToken: string) {
  accountEmail = await fetchGoogleAccountEmail(accessToken);
}

function getClient(scope: string): TokenClient {
  if (client && clientScope === scope) return client;
  if (!window.google?.accounts?.oauth2) {
    throw new DriveAuthError("Login do Google ainda não está pronto.");
  }
  clientScope = scope;
  client = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope,
    callback: (response) => {
      if (response.error || !response.access_token) {
        pending?.reject(new DriveAuthError("Login com o Google cancelado."));
        pending = null;
        return;
      }
      token = response.access_token;
      tokenScope = scope === DRIVE_WRITE_SCOPE ? "write" : "read";
      const seconds = Number(response.expires_in || 3500);
      expiresAt = Date.now() + Math.max(60, seconds - 60) * 1000;
      const granted = token;
      void rememberAccount(granted).finally(() => {
        notify();
        pending?.resolve(granted);
        pending = null;
      });
    },
    error_callback: (error) => {
      pending?.reject(new DriveAuthError(error.message || "Login com o Google cancelado."));
      pending = null;
    },
  });
  return client;
}

export function signInToDrive(
  interactive = true,
  prompt: SignInPrompt = "consent",
  scope: string = DRIVE_READ_SCOPE,
): Promise<string> {
  if (!hasDriveClient()) {
    return Promise.reject(new DriveAuthError("Falta VITE_GOOGLE_CLIENT_ID no .env"));
  }
  const current = getDriveToken();
  const sameScope = scope === DRIVE_WRITE_SCOPE ? tokenScope === "write" : Boolean(current);
  if (current && !interactive && sameScope) return Promise.resolve(current);

  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        pending = { resolve, reject };
        try {
          getClient(scope).requestAccessToken({ prompt: interactive ? prompt : "" });
        } catch (error) {
          pending = null;
          reject(error);
        }
      }),
  );
}

export function signOutOfDrive() {
  token = null;
  expiresAt = 0;
  accountEmail = null;
  tokenScope = null;
  notify();
}

export async function ensureDriveToken(): Promise<string> {
  const current = getDriveToken();
  if (current) return current;
  try {
    return await signInToDrive(false);
  } catch {
    return signInToDrive(true, "select_account");
  }
}

export async function verifyLibraryOwnerEmail(): Promise<string> {
  const accessToken = await ensureDriveToken();
  const email = await fetchGoogleAccountEmail(accessToken);
  accountEmail = email;
  notify();
  if (!email || !isDriveLibraryOwner(email)) {
    throw new Error("Só a conta multimidiaconecte pode enviar ou excluir arquivos da biblioteca.");
  }
  return email;
}

export async function ensureOwnerWriteToken(): Promise<string> {
  await verifyLibraryOwnerEmail();
  const current = getDriveToken();
  if (current && tokenScope === "write") return current;
  return signInToDrive(true, "consent", DRIVE_WRITE_SCOPE).then(async (accessToken) => {
    const email = await fetchGoogleAccountEmail(accessToken);
    accountEmail = email;
    notify();
    if (!email || !isDriveLibraryOwner(email)) {
      signOutOfDrive();
      throw new Error("Só a conta multimidiaconecte pode enviar ou excluir arquivos da biblioteca.");
    }
    return accessToken;
  });
}
