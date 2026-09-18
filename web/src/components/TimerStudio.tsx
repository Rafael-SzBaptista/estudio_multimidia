import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Download, HardDrive, Maximize2, Pause, Play, RotateCcw } from "lucide-react";
import { DriveAuthError } from "../lib/drive/auth";
import { buildTimerPptxFile, exportTimerPptx } from "../lib/exportPptx";
import { listImages, resolveLibraryBackground, type LibraryImage } from "../lib/imageLibrary";
import { addSongs } from "../lib/songs";
import { paintTheme, type ThemeId } from "../lib/themes";
import { useAppAccent } from "../lib/appAccent";
import { BackgroundFolderButton } from "./BackgroundFolderButton";
import { useDriveAuth } from "./DriveConnect";
import { ViewportDialog } from "./ViewportDialog";

const PRESETS = [1, 3, 5, 10];
const COLOR_PRESETS = ["#ffffff", "#e1e400", "#7f7f7f"];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").padEnd(6, "0");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

function glowStyle(hex: string): { color: string; textShadow: string } {
  const { r, g, b } = hexToRgb(hex);
  return {
    color: hex,
    textShadow: `0 0 18px rgba(${r}, ${g}, ${b}, 0.85), 0 0 42px rgba(${r}, ${g}, ${b}, 0.45), 0 8px 24px rgba(0, 0, 0, 0.45)`,
  };
}

type Props = {
  onBack: () => void;
  libraryBg: string | null;
  onLibraryBg: (dataUrl: string | null) => void;
};

function format(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerStudio({ onBack, libraryBg, onLibraryBg }: Props) {
  const { canManage } = useDriveAuth();
  const [minutes, setMinutes] = useState(5);
  const [label, setLabel] = useState("ALVO");
  const [accent, setAccent] = useState("#ffffff");
  const theme: ThemeId = "midnight";
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [present, setPresent] = useState(false);
  const [busy, setBusy] = useState<"download" | "save" | false>(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentTheme = useAppAccent();

  const total = minutes * 60;

  useEffect(() => {
    setRemaining(total);
    setRunning(false);
  }, [total]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (libraryBg) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = libraryBg;
      return;
    }
    paintTheme(ctx, w, h, theme);
  }, [theme, present, libraryBg, accentTheme]);

  useEffect(() => {
    void listImages()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, [libraryBg]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresent(false);
      if (e.key === " ") {
        e.preventDefault();
        setRunning((v) => !v);
      }
      if (e.key.toLowerCase() === "r") {
        setRemaining(total);
        setRunning(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, total]);

  const progress = useMemo(() => (total ? remaining / total : 0), [remaining, total]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 6000);
  }

  async function download() {
    setBusy("download");
    try {
      await exportTimerPptx({ minutes, label, color: accent, theme, customBg: libraryBg ?? undefined });
      notify("PPTX baixado. Um único slide com o cronômetro em GIF.");
    } catch {
      notify("Não foi possível gerar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToDrive() {
    if (!canManage) return;
    setBusy("save");
    try {
      const file = await buildTimerPptxFile({ minutes, label, color: accent, theme, customBg: libraryBg ?? undefined });
      await addSongs([file]);
      setConfirmSave(false);
      notify("Cronômetro guardado na pasta Músicas do Drive.");
    } catch (error) {
      if (error instanceof DriveAuthError) {
        notify(error.message);
      } else {
        notify(error instanceof Error ? error.message : "Não foi possível guardar no Drive.");
      }
    } finally {
      setBusy(false);
    }
  }

  const stage = (
    <div
      className={`relative overflow-hidden bg-black ${present ? "h-full w-full" : ""}`}
      style={present ? undefined : { aspectRatio: "16 / 9" }}
    >
      <canvas ref={canvasRef} width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        {label && (
          <p
            className="mb-4 rounded-full bg-black/40 px-5 py-1.5 font-slide text-sm font-semibold tracking-[0.55em] uppercase sm:text-lg"
            style={{ color: accent }}
          >
            {label}
          </p>
        )}
        <p className="font-slide text-[18vw] leading-none font-normal sm:text-[9rem]" style={glowStyle(accent)}>
          {format(remaining)}
        </p>
        <div className="mt-8 h-1.5 w-[min(72%,28rem)] overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress * 100}%`, backgroundColor: accent }}
          />
        </div>
      </div>
    </div>
  );

  if (present) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="h-full w-full">{stage}</div>
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-widest text-white/40 uppercase">
          espaço pausa · r reinicia · esc sai
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-ink">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-mist hover:bg-white/5 hover:text-cream">
          <ChevronLeft />
        </button>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase">Estúdio</p>
          <h1 className="font-display text-xl text-cream">Cronômetro</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPresent(true)}
          className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
        >
          <Maximize2 size={16} />
          Tela cheia
        </button>
        {canManage ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => setConfirmSave(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-40"
          >
            <HardDrive size={16} />
            {busy === "save" ? "Guardando…" : "Guardar no Drive"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void download()}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold-bright disabled:opacity-40"
        >
          <Download size={16} />
          {busy === "download" ? "Gerando GIF…" : "PPTX"}
        </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-6 p-4 xl:grid-cols-[1fr_300px] xl:gap-8 xl:p-8">
        <div className="mx-auto w-full max-w-4xl self-start overflow-hidden rounded-2xl gold-ring">{stage}</div>

        <aside className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-mist uppercase">Duração</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    minutes === m ? "bg-gold text-ink" : "border border-white/10 text-mist hover:text-cream"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-widest text-mist uppercase">Rótulo</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-soft px-3 py-2 text-cream outline-none ring-gold/40 focus:ring-2"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-mist uppercase">Cor</p>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setAccent(hex)}
                  className={`h-9 w-9 rounded-full border ${
                    accent.toLowerCase() === hex ? "border-cream" : "border-white/20"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
              <label className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20" title="Escolher cor">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  aria-label="Escolher cor"
                  className="absolute inset-[-20%] h-[140%] w-[140%] cursor-pointer border-0 p-0"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-mist uppercase">Fundo</p>
            <div className="flex flex-wrap gap-2">
              <BackgroundFolderButton
                selectedUrl={libraryBg}
                onSelect={(url, images) => {
                  setLibrary(images);
                  onLibraryBg(url);
                }}
                onError={notify}
              />
            </div>
            {library.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {library.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      void resolveLibraryBackground(img).then(onLibraryBg).catch(() => {
                        setToast("Não foi possível usar esta imagem.");
                        window.setTimeout(() => setToast(null), 3200);
                      });
                    }}
                    className={`h-14 w-24 shrink-0 overflow-hidden rounded-lg border ${
                      libraryBg === img.url ? "border-gold" : "border-white/10"
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRunning((v) => !v)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold py-3 font-semibold text-ink"
            >
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "Pausar" : remaining === 0 ? "Encerrado" : "Iniciar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRemaining(total);
                setRunning(false);
              }}
              className="rounded-full border border-white/10 px-4 text-mist hover:text-cream"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </aside>
      </div>

      {canManage && confirmSave && (
        <ViewportDialog onClose={() => (busy === "save" ? undefined : setConfirmSave(false))}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-soft p-5">
            <p className="font-display text-xl text-cream">Guardar no Drive?</p>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              O cronômetro de {minutes} min vai para a pasta Músicas como PPTX, em um único slide. Confirme para enviar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy === "save"}
                onClick={() => setConfirmSave(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist hover:text-cream disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy === "save"}
                onClick={() => void saveToDrive()}
                className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                {busy === "save" ? "Guardando…" : "Confirmar"}
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
