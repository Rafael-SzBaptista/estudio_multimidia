import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Download, ExternalLink, Music, Search, Trash2, Upload } from "lucide-react";
import { DriveAccountButton, DriveConnect, DriveGuestHint, useDriveAuth } from "./DriveConnect";
import { ViewportDialog } from "./ViewportDialog";
import { DriveAuthError } from "../lib/drive/auth";
import { downloadBlob } from "../lib/images";
import { addSongs, downloadSong, listSongs, removeSong, type LibrarySong } from "../lib/songs";

type Props = {
  onBack: () => void;
};

export function SongsStudio({ onBack }: Props) {
  const auth = useDriveAuth();
  const canManage = auth.canManage;
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LibrarySong | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((song) => song.name.toLowerCase().includes(q));
  }, [query, songs]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function refresh() {
    setNeedsAuth(false);
    const rows = await listSongs();
    setSongs(rows);
  }

  useEffect(() => {
    let live = true;
    void listSongs()
      .then((rows) => {
        if (!live) return;
        setSongs(rows);
        setNeedsAuth(false);
      })
      .catch((error) => {
        if (!live) return;
        if (error instanceof DriveAuthError) setNeedsAuth(true);
        else notify("Não foi possível carregar as músicas do Drive.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [auth.signedIn]);

  async function ingest(fileList: FileList | File[] | null) {
    if (!canManage || !fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setBusy(true);
    try {
      const next = await addSongs(files);
      setSongs(next);
      notify(files.length === 1 ? "Música enviada para o Drive." : `${files.length} arquivos enviados.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(song: LibrarySong) {
    setBusy(true);
    try {
      const file = await downloadSong(song.id);
      downloadBlob(file.blob, file.filename);
      notify("Download iniciado.");
    } catch {
      notify("Não foi possível baixar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!canManage || !pendingDelete) return;
    setBusy(true);
    try {
      const next = await removeSong(pendingDelete.id);
      setSongs(next);
      notify("Música excluída do Drive.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-ink">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-white/5 bg-ink/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 text-mist transition hover:bg-white/5 hover:text-cream"
        >
          <ChevronLeft />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase">Estúdio</p>
          <h1 className="font-display text-xl text-cream">Músicas</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DriveAccountButton />
          {canManage ? (
            <button
              type="button"
              disabled={busy || needsAuth}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-40"
            >
              <Upload size={16} />
              {busy ? "Aguarde…" : "Enviar"}
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-5 p-4 sm:p-6">
        <p className="max-w-2xl text-sm leading-relaxed text-mist">
          Acervo de apresentações no Google Drive. Qualquer conta pode abrir e baixar; enviar e excluir fica só com
          multimidiaconecte@gmail.com. A pasta{" "}
          <a
            href="https://drive.google.com/drive/folders/1wDvc3zWeVTdgiUT_yfNbxN0fo_nQLPxh"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:text-gold-bright"
          >
            Músicas
          </a>{" "}
          é o banco de dados.
        </p>

        {!needsAuth && ready ? (
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-soft px-4 py-2">
            <Search size={16} className="text-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar música"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-mist"
            />
          </label>
        ) : null}

        {!ready ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-white/10 bg-ink-soft" />
            ))}
          </div>
        ) : needsAuth ? (
          <DriveConnect
            title="Conectar o acervo"
            description="Entre com o Google para ver as apresentações. Enviar e excluir só com multimidiaconecte@gmail.com."
            onConnected={() => void refresh()}
          />
        ) : (
          <>
            <DriveGuestHint />
            {filtered.length === 0 ? (
              <p className="text-sm text-mist">{query ? "Nenhuma música com esse nome." : "A pasta ainda está vazia."}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((song) => (
                  <article key={song.id} className="flex overflow-hidden rounded-xl border border-white/10 bg-ink-soft">
                    <div className="relative w-28 shrink-0 bg-black sm:w-36">
                      <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                      <div>
                        <p className="text-[10px] tracking-widest text-gold uppercase">
                          {song.kind === "slides" ? "Google Slides" : "PowerPoint"}
                        </p>
                        <h2 className="font-display mt-1 truncate text-lg text-cream">{song.name}</h2>
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        {song.webViewLink ? (
                          <a
                            href={song.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-cream"
                            title="Abrir no Drive"
                          >
                            <ExternalLink size={16} />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDownload(song)}
                          className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-cream disabled:opacity-40"
                          title="Baixar"
                        >
                          <Download size={16} />
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingDelete(song)}
                            className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-red-300 disabled:opacity-40"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 text-sm text-gold hover:bg-gold/10"
                  >
                    <Music size={18} />
                    Enviar apresentação
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pptx,.ppt,.odp,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
        multiple
        className="hidden"
        onChange={(e) => {
          void ingest(e.target.files);
          e.target.value = "";
        }}
      />

      {pendingDelete && (
        <ViewportDialog onClose={() => setPendingDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-soft p-5">
            <p className="font-display text-xl text-cream">Excluir música?</p>
            <p className="mt-2 text-sm text-mist">{pendingDelete.name} sai da pasta do Drive.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist hover:text-cream"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                Excluir
              </button>
            </div>
          </div>
        </ViewportDialog>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
