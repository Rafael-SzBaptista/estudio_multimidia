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

function deltaIndex(
  prev: Uint8ClampedArray,
  next: Uint8ClampedArray,
  indexed: Uint8Array,
  transparentIndex: number,
): Uint8Array {
  const out = new Uint8Array(indexed.length);
  for (let i = 0; i < indexed.length; i++) {
    const o = i * 4;
    out[i] =
      prev[o] === next[o] &&
      prev[o + 1] === next[o + 1] &&
      prev[o + 2] === next[o + 2] &&
      prev[o + 3] === next[o + 3]
        ? transparentIndex
        : (indexed[i] ?? 0);
  }
  return out;
}

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

  const gif = GIFEncoder({ initialCapacity: 8 * 1024 * 1024 });
  let palette: number[][] | null = null;
  let colorPalette: number[][] | null = null;
  let transparentIndex = 0;
  let prevRgba: Uint8ClampedArray | null = null;

  for (let i = 0; i < sequence.length; i++) {
    const remaining = sequence[i] ?? 0;
    drawTimerFrame(ctx, background, { ...frameOptions, remaining });
    const image = ctx.getImageData(0, 0, TIMER_VIDEO_WIDTH, TIMER_VIDEO_HEIGHT);
    if (!colorPalette) {
      colorPalette = quantize(image.data, 127);
      transparentIndex = colorPalette.length;
      palette = [...colorPalette, [0, 0, 0]];
    }
    if (!palette || !colorPalette) throw new Error("Paleta do GIF indisponível.");
    const indexed = applyPalette(image.data, colorPalette);
    const frame =
      i === 0 || !prevRgba ? indexed : deltaIndex(prevRgba, image.data, indexed, transparentIndex);
    gif.writeFrame(frame, TIMER_VIDEO_WIDTH, TIMER_VIDEO_HEIGHT, {
      palette: i === 0 ? palette : undefined,
      delay: 1000,
      repeat: i === 0 ? 0 : undefined,
      transparent: i > 0,
      transparentIndex,
      dispose: i === 0 ? 0 : 1,
    });
    prevRgba = image.data;
    if (i % 12 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: "image/gif" });
}
