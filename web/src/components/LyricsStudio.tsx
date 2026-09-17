import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { buildSlides, parseLetra } from "../lib/buildSlides";
import { exportLyricsPptx } from "../lib/exportPptx";
import { addImages, listImages, resolveLibraryBackground, type LibraryImage } from "../lib/imageLibrary";
import { SAMPLE_LYRICS } from "../lib/sampleLyrics";
import { THEMES, type ThemeId } from "../lib/themes";
import { SlidePreview } from "./SlidePreview";

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
  const [raw, setRaw] = useState(SAMPLE_LYRICS);
  const [theme, setTheme] = useState<ThemeId>("midnight");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryImage[]>([]);

  const customBg = libraryBg;

  const parsed = useMemo(() => parseLetra(raw), [raw]);
  const slides = useMemo(
    () => buildSlides(parsed.title, parsed.author, parsed.lyrics),
    [parsed],
  );

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    void listImages()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, [libraryBg]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPresent(false);
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "Backspace" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(Math.max(0, slides.length - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length, onPresent]);

  const current = slides[index] ?? [];

  async function download() {
    if (!slides.length) return;
    setBusy(true);
    try {
      await exportLyricsPptx({
        title: parsed.title || "slides",
        slides,
        theme,
        customBg: customBg ?? undefined,
      });
      setToast("PPTX baixado. Abra no PowerPoint ou no Google Slides.");
    } catch {
      setToast("Não foi possível gerar o arquivo. Tente de novo.");
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(null), 3200);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const next = await addImages([file]);
    const added = next[next.length - 1];
    if (added) onLibraryBg(added.url);
    setLibrary(next);
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
    <div className="min-h-dvh overflow-x-hidden bg-ink">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-ink/80 px-4 py-3 backdrop-blur-md sm:px-6">
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
        <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPresent(true)}
          className="hidden items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10 sm:inline-flex"
        >
          <Maximize2 size={16} />
          Apresentar
        </button>
        <button
          type="button"
          disabled={busy || !slides.length}
          onClick={() => void download()}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-bright disabled:opacity-40"
        >
          <Download size={16} />
          {busy ? "Gerando…" : "Baixar PPTX"}
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
          <p className="text-xs leading-relaxed text-mist">
            Linha 1 = título · linha 2 = autor · depois a letra
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
          <SlidePreview lines={current} theme={theme} customBg={customBg} className="rounded-2xl" />

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

          <div className="w-full min-w-0 overflow-x-auto pb-2">
            <div className="flex w-max gap-2">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`w-36 shrink-0 overflow-hidden rounded-lg border ${
                  i === index ? "border-gold" : "border-white/10 opacity-70 hover:opacity-100"
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
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onLibraryBg(null);
                    setTheme(t.id);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    !customBg && theme === t.id
                      ? "bg-gold text-ink"
                      : "border border-white/10 text-mist hover:text-cream"
                  }`}
                >
                  {t.name}
                </button>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-gold/40 px-3 py-1.5 text-sm text-gold">
                <FolderOpen size={14} />
                Sua imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </label>
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
