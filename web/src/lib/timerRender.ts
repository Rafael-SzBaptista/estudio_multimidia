import { paintTheme, type ThemeId } from "./themes";

export const TIMER_VIDEO_WIDTH = 1280;
export const TIMER_VIDEO_HEIGHT = 720;
export const HOLD_ZERO_SEC = 5;

export type TimerHudBox = { x: number; y: number; w: number; h: number };

export function remainingSequence(totalSec: number): number[] {
  const total = Math.max(1, Math.round(totalSec));
  const ticks: number[] = [];
  for (let remaining = total; remaining >= 1; remaining--) ticks.push(remaining);
  for (let i = 0; i < HOLD_ZERO_SEC; i++) ticks.push(0);
  return ticks;
}

export function formatTimer(total: number): string {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function prepareTimerFonts() {
  if (typeof document === "undefined") return;
  try {
    await document.fonts.load(`400 180px "Anton"`);
    await document.fonts.ready;
  } catch {
    /* Anton pode já estar no cache */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar o fundo."));
    img.src = src;
  });
}

export async function createTimerBackground(options: {
  theme: ThemeId;
  customBg?: string;
  w?: number;
  h?: number;
}): Promise<HTMLCanvasElement> {
  const w = options.w ?? TIMER_VIDEO_WIDTH;
  const h = options.h ?? TIMER_VIDEO_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  if (options.customBg) {
    const img = await loadImage(options.customBg);
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    paintTheme(ctx, w, h, options.theme);
  }
  return canvas;
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width;
  return width + tracking * Math.max(0, [...text].length - 1);
}

export function timerHudBox(ctx: CanvasRenderingContext2D, label: string): TimerHudBox {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const labelText = label.trim().toUpperCase();
  const labelSize = Math.round(w * 0.024);
  const tracking = labelSize * 0.55;
  const timeSize = Math.round(w * 0.118);
  const barW = Math.min(w * 0.72, h * 0.62);
  const barH = Math.max(6, Math.round(h * 0.009));
  const gapLabel = Math.round(h * 0.03);
  const gapBar = Math.round(h * 0.055);
  ctx.font = `400 ${labelSize}px "Anton", sans-serif`;
  const pillPadX = w * 0.018;
  const pillPadY = h * 0.012;
  const pillH = labelText ? labelSize + pillPadY * 2 : 0;
  const pillW = labelText ? measureTracked(ctx, labelText, tracking) + pillPadX * 2 : 0;
  const timeH = timeSize * 0.9;
  const glowPad = Math.round(w * 0.05);
  const stackH = (labelText ? pillH + gapLabel : 0) + timeH + gapBar + barH;
  const stackY = (h - stackH) / 2;
  const stackW = Math.max(barW, pillW, timeSize * 3.2);
  const x = Math.max(0, Math.floor((w - stackW) / 2 - glowPad));
  const y = Math.max(0, Math.floor(stackY - glowPad));
  return {
    x,
    y,
    w: Math.max(1, Math.min(w - x, Math.ceil(stackW + glowPad * 2))),
    h: Math.max(1, Math.min(h - y, Math.ceil(stackH + glowPad * 2))),
  };
}

export function cropCanvasToJpeg(
  source: HTMLCanvasElement,
  box: TimerHudBox,
  quality = 0.9,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function drawTimerFrame(
  ctx: CanvasRenderingContext2D,
  background: CanvasImageSource,
  options: {
    remaining: number;
    total: number;
    label: string;
    color: string;
  },
) {
  const { remaining, total, label, color } = options;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(background, 0, 0, w, h);
  ctx.textAlign = "center";

  const labelText = label.trim().toUpperCase();
  const labelSize = Math.round(w * 0.024);
  const tracking = labelSize * 0.55;
  const timeSize = Math.round(w * 0.118);
  const barW = Math.min(w * 0.72, h * 0.62);
  const barH = Math.max(6, Math.round(h * 0.009));
  const gapLabel = Math.round(h * 0.03);
  const gapBar = Math.round(h * 0.055);

  ctx.font = `400 ${labelSize}px "Anton", sans-serif`;
  const pillPadX = w * 0.018;
  const pillPadY = h * 0.012;
  const pillH = labelText ? labelSize + pillPadY * 2 : 0;
  const pillW = labelText ? measureTracked(ctx, labelText, tracking) + pillPadX * 2 : 0;
  const timeH = timeSize * 0.9;
  const stackH = (labelText ? pillH + gapLabel : 0) + timeH + gapBar + barH;
  let y = (h - stackH) / 2;

  if (labelText) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect((w - pillW) / 2, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${tracking}px`;
    ctx.font = `400 ${labelSize}px "Anton", sans-serif`;
    ctx.fillText(labelText, w / 2, y + pillH / 2);
    ctx.letterSpacing = "0px";
    y += pillH + gapLabel;
  }

  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.font = `400 ${timeSize}px "Anton", sans-serif`;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.round(w * 0.028);
  ctx.fillText(formatTimer(remaining), w / 2, y);
  ctx.shadowBlur = 0;
  y += timeH + gapBar;

  const barX = (w - barW) / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.roundRect(barX, y, barW, barH, barH / 2);
  ctx.fill();
  const progress = total ? remaining / total : 0;
  if (progress > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(barX, y, Math.max(barH, barW * progress), barH, barH / 2);
    ctx.fill();
  }
}
