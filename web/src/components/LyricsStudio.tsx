import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  HardDrive,
  Maximize2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  buildSlides,
  emptyLine,
  FONT_SIZE,
  parseLetra,
  prepareSlideFont,
  type SlideLine,
} from "../lib/buildSlides";
import { DriveAuthError } from "../lib/drive/auth";
import { buildLyricsPptxFile, exportLyricsPptx } from "../lib/exportPptx";
import { addSongs } from "../lib/songs";
import { listImages, resolveLibraryBackground, type LibraryImage } from "../lib/imageLibrary";
import { SAMPLE_LYRICS } from "../lib/sampleLyrics";
import { type ThemeId } from "../lib/themes";
import { BackgroundFolderButton } from "./BackgroundFolderButton";
import { useDriveAuth } from "./DriveConnect";
import { FontPicker } from "./FontPicker";
import { FileNameField, useExportFileName } from "./FileNameField";
import { SlidePreview } from "./SlidePreview";
import { ViewportDialog } from "./ViewportDialog";

type Props = {
  onBack: () => void;
  presenting: boolean;
  onPresent: (open: boolean) => void;
  libraryBg: string | null;
  onLibraryBg: (dataUrl: string | null) => void;
};

export function LyricsStudio({
  onBack,
  presenting,
  onPresent,
  libraryBg,
  onLibraryBg,
}: Props) {
  const { canManage } = useDriveAuth();
  const [raw, setRaw] = useState(SAMPLE_LYRICS);
  const theme: ThemeId = "midnight";
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<"download" | "save" | false>(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [writingSize, setWritingSize] = useState(FONT_SIZE);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const skipClick = useRef(false);

  const customBg = libraryBg;

  const parsed = useMemo(() => parseLetra(raw), [raw]);
  const file = useExportFileName(parsed.title || "slides", parsed.title || "slides");
  const [fontReady, setFontReady] = useState(false);
  const generated = useMemo(
    () => buildSlides(parsed.title, parsed.author, parsed.lyrics),
    [parsed, fontReady],
  );

  useEffect(() => {
    let live = true;
    void prepareSlideFont().finally(() => {
      if (live) setFontReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const [slides, setSlides] = useState<SlideLine[][]>(generated);

  useEffect(() => {
    setSlides(generated.length ? generated : [[emptyLine()]]);
  }, [generated]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    void listImages()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, [libraryBg]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (presenting) {
        if (event.key === "Escape") onPresent(false);
        if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
          event.preventDefault();
          setIndex((i) => Math.min(slides.length - 1, i + 1));
        }
        if (event.key === "ArrowLeft" || event.key === "Backspace" || event.key === "PageUp") {
          event.preventDefault();
          setIndex((i) => Math.max(0, i - 1));
        }
        if (event.key === "Home") setIndex(0);
        if (event.key === "End") setIndex(Math.max(0, slides.length - 1));
        return;
      }

      if (confirmSave || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length, onPresent, confirmSave]);

  useEffect(() => {
    if (presenting) return;
    document
      .querySelector<HTMLElement>(`[data-slide-thumb="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [index, presenting]);

  const current = slides[index] ?? [];

  function updateCurrent(nextLines: SlideLine[]) {
    setSlides((prev) => prev.map((slide, i) => (i === index ? nextLines : slide)));
  }

  function addSlide() {
    const next: SlideLine[][] = [
      ...slides.slice(0, index + 1),
      [emptyLine()],
      ...slides.slice(index + 1),
    ];
    setSlides(next);
    setIndex(index + 1);
  }

  function removeSlide() {
    if (!slides.length) return;
    if (slides.length === 1) {
      setSlides([[emptyLine()]]);
      setIndex(0);
      return;
    }
    const next = slides.filter((_, i) => i !== index);
    setSlides(next);
    setIndex((i) => Math.min(i, next.length - 1));
  }

  function moveSlide(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setSlides((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [slide] = next.splice(from, 1);
      next.splice(to, 0, slide);
      return next;
    });
    setIndex((current) => {
      if (current === from) return to;
      if (from < current && to >= current) return current - 1;
      if (from > current && to <= current) return current + 1;
      return current;
    });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function download() {
    if (!slides.length) return;
    setBusy("download");
    try {
      await exportLyricsPptx({
        title: parsed.title || "slides",
        fileName: file.filename,
        slides,
        theme,
        customBg: customBg ?? undefined,
      });
      notify("PPTX baixado. Abra no PowerPoint ou no Google Slides.");
    } catch {
      notify("Não foi possível gerar o arquivo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToDrive() {
    if (!canManage || !slides.length) return;
    setBusy("save");
    try {
      const pptx = await buildLyricsPptxFile({
        title: parsed.title || "slides",
        fileName: file.filename,
        slides,
        theme,
        customBg: customBg ?? undefined,
      });
      await addSongs([pptx]);
      setConfirmSave(false);
      notify("Música guardada na pasta Músicas do Drive.");
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

  if (presenting) {
    return (
      <div className="fixed inset-0 z-50 bg-black" onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}>
        <SlidePreview lines={current} theme={theme} customBg={customBg} fill className="h-full w-full rounded-none" />
        <div className="pointer-events-none absolute right-5 bottom-4 left-5 flex justify-between text-xs tracking-widest text-white/50 uppercase">
          <span>esc sai · ← → navega</span>
          <span>
            {index + 1} / {slides.length || 1}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/5 bg-ink/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 text-mist transition hover:bg-white/5 hover:text-cream"
        >
          <ChevronLeft />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase">Estúdio</p>
          <h1 className="font-display truncate text-xl text-cream">{parsed.title || "Nova letra"}</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onPresent(true)}
          className="hidden items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10 sm:inline-flex"
        >
          <Maximize2 size={16} />
          Apresentar
        </button>
        <FontPicker size={writingSize} onChange={setWritingSize} />
        {canManage ? (
          <button
            type="button"
            disabled={Boolean(busy) || !slides.length}
            onClick={() => setConfirmSave(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10 disabled:opacity-40"
          >
            <HardDrive size={16} />
            {busy === "save" ? "Guardando…" : "Guardar no Drive"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(busy) || !slides.length}
          onClick={() => void download()}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-40"
        >
          <Download size={16} />
          {busy === "download" ? "Gerando…" : "Baixar PPTX"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-[1500px] gap-5 p-4 xl:grid-cols-[minmax(280px,400px)_1fr] xl:gap-6 xl:p-6">
        <section className="order-2 min-w-0 space-y-4 xl:order-1">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold tracking-widest text-mist uppercase">
              Letra
            </span>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              className="h-44 w-full resize-none rounded-2xl border border-white/10 bg-ink-soft px-4 py-3 text-sm leading-relaxed text-white outline-none ring-gold/40 focus:ring-2 xl:h-[min(58vh,640px)]"
            />
          </label>
          <FileNameField value={file.name} onChange={file.setName} />
          <p className="text-xs leading-relaxed text-mist">
            Linha 1 = título · linha 2 = autor · depois a letra. Clique no slide para editar. Em Fonte, escolha Título,
            Subtítulo ou Letra para cada letra nova — o restante do texto permanece como está.
          </p>
          <button
            type="button"
            onClick={() => setRaw(SAMPLE_LYRICS)}
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-bright"
          >
            <Sparkles size={16} />
            Carregar exemplo (Meia Noite)
          </button>
        </section>

        <section className="order-1 min-w-0 space-y-4 xl:order-2">
          <SlidePreview
            lines={current}
            theme={theme}
            customBg={customBg}
            className="rounded-2xl"
            editable
            writingSize={writingSize}
            onChangeLines={updateCurrent}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="rounded-full border border-white/10 p-2 hover:bg-white/5"
            >
              <ChevronLeft />
            </button>
            <p className="text-sm text-mist">
              Slide <span className="text-cream">{slides.length ? index + 1 : 0}</span> de{" "}
              <span className="text-cream">{slides.length}</span>
            </p>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              className="rounded-full border border-white/10 p-2 hover:bg-white/5"
            >
              <ChevronRight />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addSlide}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-mist hover:text-cream"
            >
              <Plus size={16} />
              Novo slide
            </button>
            <button
              type="button"
              onClick={removeSlide}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-mist hover:text-red-300"
            >
              <Trash2 size={16} />
              Apagar slide
            </button>
          </div>

          <div className="w-full min-w-0 overflow-x-auto pb-2">
            <div className="flex w-max gap-2">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                draggable
                data-slide-thumb={i}
                title="Arraste para reordenar"
                aria-grabbed={dragFrom === i}
                onClick={() => {
                  if (skipClick.current) {
                    skipClick.current = false;
                    return;
                  }
                  setIndex(i);
                }}
                onDragStart={(event) => {
                  skipClick.current = true;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(i));
                  setDragFrom(i);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOver !== i) setDragOver(i);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  moveSlide(Number.isFinite(from) ? from : (dragFrom ?? i), i);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={`w-36 shrink-0 cursor-grab overflow-hidden rounded-lg border select-none active:cursor-grabbing ${
                  i === index ? "border-gold" : "border-white/10 opacity-70 hover:opacity-100"
                } ${dragFrom === i ? "opacity-40" : ""} ${
                  dragOver === i && dragFrom !== i ? "ring-2 ring-gold" : ""
                }`}
              >
                <SlidePreview lines={s} theme={theme} customBg={customBg} compact />
              </button>
            ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-mist uppercase">Fundo</p>
            <div className="flex flex-wrap gap-2">
              <BackgroundFolderButton
                selectedUrl={customBg}
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
                      customBg === img.url ? "border-gold" : "border-white/10"
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPresent(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/30 py-3 font-semibold text-gold sm:hidden"
          >
            <Maximize2 size={16} />
            Apresentar
          </button>
        </section>
      </div>

      {canManage && confirmSave && (
        <ViewportDialog onClose={() => (busy === "save" ? undefined : setConfirmSave(false))}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-soft p-5">
            <p className="font-display text-xl text-cream">Guardar no Drive?</p>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              {file.filename} vai para a pasta Músicas. Confirme para enviar.
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
