import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { hasDriveAccess, hasDriveClient, DRIVE_OWNER_EMAIL } from "../lib/drive/config";
import {
  canManageDriveLibrary,
  isDriveSignedIn,
  signInToDrive,
  signOutOfDrive,
  subscribeDriveAuth,
  getDriveAccountEmail,
} from "../lib/drive/auth";

export function useDriveAuth() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeDriveAuth(() => setTick((value) => value + 1)), []);
  return {
    configured: hasDriveAccess(),
    canSignIn: hasDriveClient(),
    signedIn: isDriveSignedIn(),
    canManage: canManageDriveLibrary(),
    email: getDriveAccountEmail(),
    signIn: () => signInToDrive(true, "select_account"),
    signOut: signOutOfDrive,
  };
}

export function DriveConnect({
  title,
  description,
  onConnected,
}: {
  title: string;
  description: string;
  onConnected?: () => void;
}) {
  const auth = useDriveAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      await auth.signIn();
      onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
        <HardDrive size={26} />
      </span>
      <h2 className="font-display text-2xl text-cream">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {auth.canSignIn ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {busy ? "Abrindo Google…" : "Entrar com Google"}
        </button>
      ) : (
        <p className="max-w-md text-sm text-gold">
          Coloque o <span className="text-cream">VITE_GOOGLE_CLIENT_ID</span> no arquivo .env da pasta web para conectar as
          pastas do Drive.
        </p>
      )}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export function DriveAccountButton() {
  const auth = useDriveAuth();
  if (!auth.signedIn) return null;
  return (
    <button
      type="button"
      onClick={auth.signOut}
      title="Sair do Drive"
      className="max-w-[14rem] truncate rounded-full border border-white/10 px-3 py-1.5 text-xs tracking-widest text-mist uppercase hover:text-cream"
    >
      {auth.email ? `Sair · ${auth.email}` : "Sair do Drive"}
    </button>
  );
}

export function DriveGuestHint() {
  const auth = useDriveAuth();
  if (!auth.signedIn || auth.canManage) return null;
  return (
    <p className="rounded-2xl border border-white/10 bg-ink-soft px-4 py-3 text-sm leading-relaxed text-mist">
      Conectado como <span className="text-cream">{auth.email || "outra conta"}</span>. Só{" "}
      <span className="text-gold">{DRIVE_OWNER_EMAIL}</span> pode enviar ou excluir arquivos nestas pastas.
    </p>
  );
}
