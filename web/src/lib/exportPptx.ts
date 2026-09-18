import PptxGenJS from "pptxgenjs";
import type { SlideLine } from "./buildSlides";
import { FONT_FACE, exportFilename } from "./buildSlides";
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
  fileName?: string;
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
  pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE };

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
            fontFace: FONT_FACE,
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

function lyricsFilename(options: LyricsPptxOptions) {
  return exportFilename(options.fileName || options.title || "slides", options.title || "slides");
}

export async function buildLyricsPptxFile(options: LyricsPptxOptions): Promise<File> {
  const pptx = await createLyricsPptx(options);
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return new File([blob], lyricsFilename(options), { type: PPTX_MIME });
}

export async function exportLyricsPptx(options: LyricsPptxOptions): Promise<void> {
  const pptx = await createLyricsPptx(options);
  await pptx.writeFile({ fileName: lyricsFilename(options) });
}

type TimerPptxOptions = {
  minutes: number;
  label: string;
  fileName?: string;
  color?: string;
  theme: ThemeId;
  customBg?: string;
};

function timerFilename(options: TimerPptxOptions) {
  return exportFilename(options.fileName || `cronometro_${options.minutes}min`, `cronometro_${options.minutes}min`);
}

async function packTimerGifPptx(gif: Blob, gifName: string): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const templateUrl = new URL("./timerGifTemplate.pptx", import.meta.url).href;
  const template = await fetch(templateUrl).then((res) => {
    if (!res.ok) throw new Error("Não foi possível carregar o modelo do cronômetro.");
    return res.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(template);
  zip.file("ppt/media/image1.gif", await gif.arrayBuffer(), { compression: "STORE" });
  const slideFile = zip.file("ppt/slides/slide1.xml");
  if (slideFile) {
    let xml = await slideFile.async("string");
    xml = xml.replace(/descr="[^"]*"/, `descr="${gifName}"`);
    xml = xml.replace(/name="Picture 1"/, `name="${gifName}"`);
    zip.file("ppt/slides/slide1.xml", xml);
  }
  return zip.generateAsync({
    type: "blob",
    mimeType: PPTX_MIME,
    compression: "DEFLATE",
  });
}

async function createTimerPptxBlob(options: TimerPptxOptions) {
  const { encodeTimerGif } = await import("./timerVideo");
  const { prepareTimerFonts } = await import("./timerRender");
  await prepareTimerFonts();

  const gifName = timerFilename(options).replace(/\.pptx$/i, ".gif");
  const gif = await encodeTimerGif({
    minutes: options.minutes,
    label: options.label,
    color: options.color || "#ffffff",
    theme: options.theme,
    customBg: options.customBg,
  });
  return packTimerGifPptx(gif, gifName);
}

export async function buildTimerPptxFile(options: TimerPptxOptions): Promise<File> {
  const blob = await createTimerPptxBlob(options);
  return new File([blob], timerFilename(options), { type: PPTX_MIME });
}

export async function exportTimerPptx(options: TimerPptxOptions): Promise<void> {
  const blob = await createTimerPptxBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = timerFilename(options);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
