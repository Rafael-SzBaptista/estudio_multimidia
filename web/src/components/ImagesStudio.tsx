import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download, Images as ImagesIcon, Trash2, Upload } from "lucide-react";
import { DriveAccountButton, DriveConnect, useDriveAuth } from "./DriveConnect";
import { ViewportDialog } from "./ViewportDialog";
import { DriveAuthError } from "../lib/drive/auth";
import { addImages, downloadBlob, downloadImage, listImages, removeImage, type LibraryImage } from "../lib/images";

type Props = {
  onBack: () => void;
};

export function ImagesStudio({ onBack }: Props) {
  const auth = useDriveAuth();
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LibraryImage | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setNeedsAuth(false);
    const rows = await listImages();
    setImages(rows);
  }

  useEffect(() => {
    let live = true;
    void listImages()
      .then((rows) => {
        if (live) {
          setImages(rows);
          setNeedsAuth(false);
        }
      })
      .catch((error) => {
        if (!live) return;
        if (error instanceof DriveAuthError) setNeedsAuth(true);
        else notify("Não foi possível carregar a biblioteca.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [auth.signedIn]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function ingest(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setBusy(true);
    try {
      const next = await addImages(files);
      setImages(next);
      notify(files.length === 1 ? "Imagem enviada para a biblioteca." : `${files.length} imagens enviadas.`);
    } catch {
      notify("Não foi possível enviar as imagens.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(image: LibraryImage) {
    setBusy(true);
    try {
      const file = await downloadImage(image.id);
      downloadBlob(file.blob, file.filename);
      notify("Download iniciado.");
    } catch {
      notify("Não foi possível baixar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const next = await removeImage(pendingDelete.id);
      setImages(next);
      notify("Imagem excluída da biblioteca.");
    } catch {
      notify("Não foi possível excluir a imagem.");
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
          <h1 className="font-display text-xl text-cream">Imagens</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DriveAccountButton />
          <button
            type="button"
            disabled={busy || needsAuth}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-40"
          >
          <Upload size={16} />
          {busy ? "Aguarde…" : "Enviar"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-5 p-4 sm:p-6">
        <p className="max-w-2xl text-sm leading-relaxed text-mist">
          Biblioteca de fundos no Google Drive. Envie, baixe ou exclua as imagens — elas aparecem nas letras e no
          cronômetro. Pasta:{" "}
          <a
            href="https://drive.google.com/drive/folders/1ebsPPjcQjBdvrF47OSm2BCwhsig_cKdH"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:text-gold-bright"
          >
            Imagens
          </a>
          .
        </p>

        {!ready ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-ink-soft" style={{ aspectRatio: "16 / 9" }} />
            ))}
          </div>
        ) : needsAuth ? (
          <DriveConnect
            title="Conectar as imagens"
            description="Entre com a conta do Google que tem acesso à pasta de imagens no Drive para usar, enviar e excluir os fundos."
            onConnected={() => void refresh()}
          />
        ) : images.length === 0 ? (
          <DropZone
            dragging={dragging}
            setDragging={setDragging}
            onFiles={(files) => void ingest(files)}
            onPick={() => inputRef.current?.click()}
          />
        ) : (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void ingest(e.dataTransfer.files);
            }}
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${
              dragging ? "rounded-2xl ring-2 ring-gold" : ""
            }`}
          >
            {images.map((img) => (
              <article key={img.id} className="overflow-hidden rounded-xl border border-white/10 bg-ink-soft">
                <div className="relative" style={{ aspectRatio: "16 / 9" }}>
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-cream">{img.name}</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDownload(img)}
                    className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-cream disabled:opacity-40"
                    title="Baixar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPendingDelete(img)}
                    className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-red-300 disabled:opacity-40"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 text-sm text-gold hover:bg-gold/10"
            >
              <Upload size={18} />
              Enviar imagens
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
            <p className="font-display text-xl text-cream">Excluir imagem?</p>
            <p className="mt-2 text-sm text-mist">
              {pendingDelete.name} sai da biblioteca e deixa de aparecer nas músicas e no cronômetro.
            </p>
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

function DropZone({
  dragging,
  setDragging,
  onFiles,
  onPick,
}: {
  dragging: boolean;
  setDragging: (value: boolean) => void;
  onFiles: (files: FileList | File[]) => void;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center transition ${
        dragging ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-mist hover:border-gold/40 hover:text-cream"
      }`}
      style={{ aspectRatio: "16 / 9" }}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
        <ImagesIcon size={26} />
      </span>
      <span className="font-display text-2xl text-cream">Solte as fotos aqui</span>
      <span className="max-w-sm text-sm">JPG, PNG ou WebP. Elas ficam na biblioteca e podem ser usadas nas letras e no cronômetro.</span>
    </button>
  );
}
