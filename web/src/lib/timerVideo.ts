import { GIFEncoder, applyPalette, quantize } from "gifenc";
import {
  createTimerBackground,
  drawTimerFrame,
  remainingSequence,
  TIMER_VIDEO_HEIGHT,
  TIMER_VIDEO_WIDTH,
} from "./timerRender";
import type { ThemeId } from "./themes";

type EncodeOptions = {
  minutes: number;
  label: string;
  color: string;
  theme: ThemeId;
  customBg?: string;
};

export async function encodeTimerGif(options: EncodeOptions): Promise<Blob> {
  const total = Math.max(1, Math.round(options.minutes * 60));
  const sequence = remainingSequence(total);
  const canvas = document.createElement("canvas");
  canvas.width = TIMER_VIDEO_WIDTH;
  canvas.height = TIMER_VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponível.");

  const background = await createTimerBackground({
    theme: options.theme,
    customBg: options.customBg,
    w: TIMER_VIDEO_WIDTH,
    h: TIMER_VIDEO_HEIGHT,
  });

  const frameOptions = {
    total,
    label: options.label,
    color: options.color,
  };

  const gif = GIFEncoder();
  let palette: number[][] | null = null;

  for (let i = 0; i < sequence.length; i++) {
    const remaining = sequence[i] ?? 0;
    drawTimerFrame(ctx, background, { ...frameOptions, remaining });
    const image = ctx.getImageData(0, 0, TIMER_VIDEO_WIDTH, TIMER_VIDEO_HEIGHT);
    if (!palette) palette = quantize(image.data, 128);
    const index = applyPalette(image.data, palette);
    gif.writeFrame(index, TIMER_VIDEO_WIDTH, TIMER_VIDEO_HEIGHT, {
      palette: i === 0 ? palette : undefined,
      delay: 1000,
      repeat: i === 0 ? -1 : undefined,
    });
    if (i % 12 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: "image/gif" });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
