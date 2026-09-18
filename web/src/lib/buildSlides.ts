export type SlideRun = { text: string; size: number };
export type SlideLine = { runs: SlideRun[] };

export const FONT_SIZE = 64.5;
export const TITLE_SIZE = 72;
export const AUTHOR_SIZE = 42;
export const MAX_SLIDE_LINES = 5;
/** Twentieth Century no Windows/PowerPoint — mesma spec de tech/gerar_slides.py */
export const FONT_FACE = "Tw Cen MT";

function slideCanvasFont(size: number): string {
  return `700 ${size}pt "${FONT_FACE}", "Twentieth Century", sans-serif`;
}

export async function prepareSlideFont(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    await Promise.all([
      document.fonts.load(`700 ${FONT_SIZE}pt "${FONT_FACE}"`),
      document.fonts.load(`700 ${TITLE_SIZE}pt "${FONT_FACE}"`),
      document.fonts.load(`700 ${AUTHOR_SIZE}pt "${FONT_FACE}"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* fonte do sistema pode já estar disponível */
  }
}

export function plainLine(text: string, size: number): SlideLine {
  return { runs: text ? [{ text, size }] : [] };
}

export function emptyLine(): SlideLine {
  return { runs: [] };
}

export function lineText(line: SlideLine): string {
  return line.runs.map((run) => run.text).join("");
}

export function lineLength(line: SlideLine): number {
  return glyphsOf(line).length;
}

function glyphsOf(line: SlideLine): { ch: string; size: number }[] {
  return line.runs.flatMap((run) => [...run.text].map((ch) => ({ ch, size: run.size })));
}

export function lineFromGlyphs(glyphs: { ch: string; size: number }[]): SlideLine {
  const runs: SlideRun[] = [];
  for (const glyph of glyphs) {
    const last = runs[runs.length - 1];
    if (last && last.size === glyph.size) last.text += glyph.ch;
    else runs.push({ text: glyph.ch, size: glyph.size });
  }
  return { runs };
}

export function insertInLine(line: SlideLine, offset: number, text: string, size: number): SlideLine {
  const glyphs = glyphsOf(line);
  const inserted = [...text.toUpperCase()].filter((ch) => ch !== "\n" && ch !== "\r").map((ch) => ({ ch, size }));
  const at = Math.max(0, Math.min(offset, glyphs.length));
  glyphs.splice(at, 0, ...inserted);
  return lineFromGlyphs(glyphs);
}

export function deleteInLine(line: SlideLine, start: number, end: number): SlideLine {
  const glyphs = glyphsOf(line);
  const from = Math.max(0, Math.min(start, end));
  const to = Math.min(glyphs.length, Math.max(start, end));
  glyphs.splice(from, to - from);
  return lineFromGlyphs(glyphs);
}

export function splitLine(line: SlideLine, offset: number): [SlideLine, SlideLine] {
  const glyphs = glyphsOf(line);
  const at = Math.max(0, Math.min(offset, glyphs.length));
  return [lineFromGlyphs(glyphs.slice(0, at)), lineFromGlyphs(glyphs.slice(at))];
}

export function joinLines(left: SlideLine, right: SlideLine): SlideLine {
  return lineFromGlyphs([...glyphsOf(left), ...glyphsOf(right)]);
}

const USABLE_WIDTH_PT = (13.333 - 0.8) * 72;
let measureCanvas: HTMLCanvasElement | null = null;

function textWidth(text: string, size: number): number {
  if (typeof document === "undefined") {
    return text.length * size * 0.52;
  }
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * size * 0.52;
  ctx.font = slideCanvasFont(size);
  return ctx.measureText(text).width;
}

function wrapToWidth(text: string, size: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (textWidth(trimmed, size) <= USABLE_WIDTH_PT) return [trimmed];

  const words = trimmed.split(/\s+/);
  const parts: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const trial = [...current, word].join(" ");
    if (current.length && textWidth(trial, size) > USABLE_WIDTH_PT) {
      parts.push(current.join(" "));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) parts.push(current.join(" "));
  return parts;
}

function lyricSlide(line1: string, line2?: string): SlideLine[] {
  return line2
    ? [plainLine(line1, FONT_SIZE), plainLine(line2, FONT_SIZE)]
    : [plainLine(line1, FONT_SIZE)];
}

export function parseLetra(raw: string): { title: string; author: string; lyrics: string[] } {
  const cleaned = raw
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter((ln) => !ln.startsWith("#"));

  while (cleaned.length && !cleaned[0]) cleaned.shift();

  let title = cleaned[0] ?? "";
  let author = cleaned[1] ?? "";

  for (const prefix of ["título:", "titulo:", "title:"]) {
    if (title.toLowerCase().startsWith(prefix)) {
      title = title.slice(prefix.length).trim();
      break;
    }
  }
  for (const prefix of ["autor:", "artista:", "author:"]) {
    if (author.toLowerCase().startsWith(prefix)) {
      author = author.slice(prefix.length).trim();
      break;
    }
  }

  let bodyStart = 2;
  if (bodyStart < cleaned.length && !cleaned[bodyStart]) bodyStart += 1;
  const lyrics = cleaned.slice(bodyStart).filter(Boolean);
  return { title, author, lyrics };
}

export function buildSlides(title: string, author: string, lyrics: string[]): SlideLine[][] {
  const slides: SlideLine[][] = [];
  const titleParts = wrapToWidth(title.toUpperCase(), TITLE_SIZE);
  const authorParts = wrapToWidth(author.toUpperCase(), AUTHOR_SIZE);
  const header: SlideLine[] = [
    ...titleParts.map((part) => plainLine(part, TITLE_SIZE)),
    ...authorParts.map((part) => plainLine(part, AUTHOR_SIZE)),
  ];
  if (header.length) slides.push(header);

  let pending: string | null = null;
  const flush = () => {
    if (pending !== null) {
      slides.push(lyricSlide(pending));
      pending = null;
    }
  };

  for (const lyricLine of lyrics) {
    const parts = wrapToWidth(lyricLine.toUpperCase(), FONT_SIZE);
    if (!parts.length) continue;
    if (parts.length >= 2) {
      flush();
      for (let i = 0; i < parts.length; i += 2) {
        slides.push(lyricSlide(parts[i], parts[i + 1]));
      }
      continue;
    }
    if (pending === null) pending = parts[0];
    else {
      slides.push(lyricSlide(pending, parts[0]));
      pending = null;
    }
  }
  flush();
  return slides;
}

export function safeFilename(title: string): string {
  const name = title
    .replace(/[^\w\s\-À-ÿ]+/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return name.slice(0, 80) || "slides";
}

export function exportFilename(name: string, fallback = "slides"): string {
  const cleaned = name
    .replace(/\.(pptx?|odp)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${cleaned || fallback}.pptx`;
}
