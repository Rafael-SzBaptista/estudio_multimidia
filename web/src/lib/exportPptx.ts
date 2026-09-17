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

export async function exportLyricsPptx(options: {
  title: string;
  slides: SlideLine[][];
  theme: ThemeId;
  customBg?: string;
}): Promise<void> {
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
      lines.map((line, i) => ({
        text: line.text,
        options: {
          fontFace: "Anton",
          fontSize: line.size,
          bold: true,
          color: "FFFFFF",
          align: "center",
          breakLine: i < lines.length - 1,
        },
      })),
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

  await pptx.writeFile({ fileName: `${safeFilename(options.title)}.pptx` });
}

export async function exportTimerPptx(options: {
  minutes: number;
  label: string;
  color?: string;
}): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PROJ", width: 13.333, height: 7.5 });
  pptx.layout = "PROJ";
  pptx.title = `Cronômetro ${options.minutes}min`;

  const accent = (options.color || "#ffffff").replace("#", "").toUpperCase();
  const total = options.minutes * 60;
  for (let remaining = total; remaining >= 0; remaining--) {
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    const slide = pptx.addSlide();
    slide.background = { color: "000000" };
    if (options.label) {
      slide.addText(options.label.toUpperCase(), {
        x: 0.8,
        y: 1.7,
        w: 11.733,
        h: 0.55,
        fontFace: "Anton",
        fontSize: 20,
        bold: true,
        color: accent,
        align: "center",
      });
    }
    slide.addText(`${mm}:${ss}`, {
      x: 0.5,
      y: 2.3,
      w: 12.333,
      h: 2.2,
      fontFace: "Anton",
      fontSize: 96,
      bold: true,
      color: accent,
      align: "center",
    });
  }

  await pptx.writeFile({ fileName: `cronometro_${options.minutes}min.pptx` });
}
