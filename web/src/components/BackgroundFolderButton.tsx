import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { DriveAuthError } from "../lib/drive/auth";
import { listImages, resolveLibraryBackground, type LibraryImage } from "../lib/imageLibrary";
import { DriveConnect } from "./DriveConnect";
import { ViewportDialog } from "./ViewportDialog";

type Props = {
  selectedUrl?: string | null;
  onSelect: (dataUrl: string, images: LibraryImage[]) => void;
  onError?: (message: string) => void;
};

export function BackgroundFolderButton({ selectedUrl, onSelect, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [ready, setReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUrl) setPickedId(null);
  }, [selectedUrl]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setReady(false);
    void listImages()
      .then((rows) => {
        if (!live) return;
        setImages(rows);
        setNeedsAuth(false);
      })
      .catch((error) => {
        if (!live) return;
        if (error instanceof DriveAuthError) setNeedsAuth(true);
        else onError?.("Não foi possível abrir a pasta de imagens.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [open, onError]);

  async function choose(image: LibraryImage) {
    setBusyId(image.id);
    try {
      const url = await resolveLibraryBackground(image);
      setPickedId(image.id);
      onSelect(url, images);
      setOpen(false);
    } catch {
      onError?.("Não foi possível usar esta imagem.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Escolher imagem da pasta do projeto"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
          selectedUrl
            ? "bg-gold text-ink"
            : "border border-gold/40 text-gold hover:bg-gold/10"
        }`}
      >
        <HardDrive size={14} />
        Drive
      </button>

      {open ? (
        <ViewportDialog onClose={() => (busyId ? undefined : setOpen(false))}>
          <div className="flex max-h-[min(80dvh,42rem)] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-ink-soft p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl text-cream">Imagens do Drive</p>
                <p className="mt-1 text-sm text-mist">Selecione um fundo da pasta do projeto.</p>
              </div>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-mist hover:text-cream disabled:opacity-40"
              >
                Fechar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {!ready ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-ink"
                      style={{ aspectRatio: "16 / 9" }}
                    />
                  ))}
                </div>
              ) : needsAuth ? (
                <DriveConnect
                  title="Conectar as imagens"
                  description="Entre com qualquer conta Google para ver as imagens da pasta do projeto."
                  onConnected={() => {
                    setNeedsAuth(false);
                    setReady(false);
                    void listImages()
                      .then((rows) => {
                        setImages(rows);
                        setNeedsAuth(false);
                      })
                      .catch((error) => {
                        if (error instanceof DriveAuthError) setNeedsAuth(true);
                      })
                      .finally(() => setReady(true));
                  }}
                />
              ) : images.length === 0 ? (
                <p className="py-10 text-center text-sm text-mist">A pasta do projeto ainda não tem imagens.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((image) => {
                    const selected = pickedId === image.id;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => void choose(image)}
                        className={`overflow-hidden rounded-xl border text-left transition hover:opacity-95 disabled:opacity-50 ${
                          selected ? "border-gold" : "border-white/10"
                        }`}
                      >
                        <span className="block bg-black" style={{ aspectRatio: "16 / 9" }}>
                          <img src={image.url} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="block truncate px-2.5 py-2 text-xs text-cream">
                          {busyId === image.id ? "Carregando…" : image.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ViewportDialog>
      ) : null}
    </>
  );
}
