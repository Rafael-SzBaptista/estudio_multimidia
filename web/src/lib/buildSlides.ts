export type SlideLine = { text: string; size: number };

export const FONT_SIZE = 64.5;
export const TITLE_SIZE = 72;
export const AUTHOR_SIZE = 42;
const USABLE_WIDTH_PT = (13.333 - 0.8) * 72;
let measureCanvas: HTMLCanvasElement | null = null;

function textWidth(text: string, size: number): number {
  if (typeof document === "undefined") {
    return text.length * size * 0.52;
  }
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * size * 0.52;
  ctx.font = `400 ${size}pt "Anton", sans-serif`;
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
    ? [
        { text: line1, size: FONT_SIZE },
        { text: line2, size: FONT_SIZE },
      ]
    : [{ text: line1, size: FONT_SIZE }];
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
    ...titleParts.map((part) => ({ text: part, size: TITLE_SIZE })),
    ...authorParts.map((part) => ({ text: part, size: AUTHOR_SIZE })),
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
  return (name.slice(0, 80) || "slides");
}
