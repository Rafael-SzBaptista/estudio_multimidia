import PptxGenJS from "pptxgenjs";
import type { SlideLine } from "./buildSlides";
import { safeFilename } from "./buildSlides";
import { themeToDataUrl, type ThemeId } from "./themes";

async function asPptxImageData(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type LyricsPptxOptions = {
  title: string;
  slides: SlideLine[][];
  theme: ThemeId;
  customBg?: string;
};

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

async function createLyricsPptx(options: LyricsPptxOptions) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PROJ", width: 13.333, height: 7.5 });
  pptx.layout = "PROJ";
  pptx.title = options.title || "Slides";

  const bg = options.customBg
    ? await asPptxImageData(options.customBg)
    : themeToDataUrl(options.theme);

  for (const lines of options.slides) {
    const slide = pptx.addSlide();
    slide.addImage({ data: bg, x: 0, y: 0, w: 13.333, h: 7.5 });
    slide.addShape("rect", {
      x: 0,
      y: 0.25,
      w: 13.333,
      h: 2.7,
      fill: { color: "000000", transparency: 60 },
      line: { color: "000000", transparency: 100 },
    });
    slide.addText(
      (lines.length ? lines : [{ runs: [{ text: " ", size: 64.5 }] }]).flatMap((line, i, all) => {
        const runs = line.runs.length ? line.runs : [{ text: " ", size: 64.5 }];
        return runs.map((run, j) => ({
          text: run.text || " ",
          options: {
            fontFace: "Anton",
            fontSize: run.size,
            bold: true,
            color: "FFFFFF",
            align: "center" as const,
            breakLine: j === runs.length - 1 && i < all.length - 1,
          },
        }));
      }),
      {
        x: 0.4,
        y: 0.4,
        w: 12.533,
        h: 2.4,
        valign: "middle",
        shadow: {
          type: "outer",
          color: "000000",
          blur: 8,
          offset: 3,
          opacity: 0.7,
        },
      },
    );
  }

  return pptx;
}

function lyricsFilename(title: string) {
  return `${safeFilename(title)}.pptx`;
}

export async function buildLyricsPptxFile(options: LyricsPptxOptions): Promise<File> {
  const pptx = await createLyricsPptx(options);
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return new File([blob], lyricsFilename(options.title), { type: PPTX_MIME });
}

export async function exportLyricsPptx(options: LyricsPptxOptions): Promise<void> {
  const pptx = await createLyricsPptx(options);
  await pptx.writeFile({ fileName: lyricsFilename(options.title) });
}

type TimerPptxOptions = {
  minutes: number;
  label: string;
  color?: string;
  theme: ThemeId;
  customBg?: string;
};

function timerFilename(minutes: number) {
  return `cronometro_${minutes}min.pptx`;
}

async function createTimerPptx(options: TimerPptxOptions) {
  const { blobToDataUrl, encodeTimerGif } = await import("./timerVideo");
  const { prepareTimerFonts } = await import("./timerRender");
  await prepareTimerFonts();

  const gif = await encodeTimerGif({
    minutes: options.minutes,
    label: options.label,
    color: options.color || "#ffffff",
    theme: options.theme,
    customBg: options.customBg,
  });
  const gifData = await blobToDataUrl(gif);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PROJ", width: 13.333, height: 7.5 });
  pptx.layout = "PROJ";
  pptx.title = `Cronômetro ${options.minutes}min`;

  const slide = pptx.addSlide();
  slide.addImage({
    data: gifData,
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    altText: `cronometro_${options.minutes}min.gif`,
  });

  return pptx;
}

export async function buildTimerPptxFile(options: TimerPptxOptions): Promise<File> {
  const pptx = await createTimerPptx(options);
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return new File([blob], timerFilename(options.minutes), { type: PPTX_MIME });
}

export async function exportTimerPptx(options: TimerPptxOptions): Promise<void> {
  const pptx = await createTimerPptx(options);
  await pptx.writeFile({ fileName: timerFilename(options.minutes) });
}
