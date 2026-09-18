import { useEffect, useRef } from "react";
import { FONT_SIZE, TITLE_SIZE, lineText, type SlideLine } from "../lib/buildSlides";
import { useAppAccent } from "../lib/appAccent";
import { paintTheme, type ThemeId } from "../lib/themes";
import { SlideTextEditor } from "./SlideTextEditor";

type Props = {
  lines: SlideLine[];
  theme: ThemeId;
  customBg?: string | null;
  className?: string;
  compact?: boolean;
  fill?: boolean;
  editable?: boolean;
  writingSize?: number;
  onChangeLines?: (lines: SlideLine[]) => void;
};

const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 720;

export function previewFontSize(size: number) {
  return `${(size / TITLE_SIZE) * 5.55}cqw`;
}

function LineView({ line, index }: { line: SlideLine; index: number }) {
  const text = lineText(line);
  if (!text) return null;
  return (
    <p
      className="w-full min-w-0 overflow-hidden leading-[1.12] whitespace-pre"
      style={{ marginTop: index ? "0.14em" : 0 }}
    >
      {line.runs.map((run, i) => (
        <span key={i} style={{ fontSize: previewFontSize(run.size) }}>
          {run.text.replaceAll(" ", "\u00A0")}
        </span>
      ))}
    </p>
  );
}

export function SlidePreview({
  lines,
  theme,
  customBg,
  className = "",
  compact,
  fill,
  editable,
  writingSize = FONT_SIZE,
  onChangeLines,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentId = useAppAccent();

  useEffect(() => {
    if (compact) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    if (customBg) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = customBg;
      return;
    }
    paintTheme(ctx, w, h, theme);
  }, [theme, customBg, accentId, compact]);

  if (compact) {
    return (
      <div
        className={`@container relative w-full overflow-hidden isolate ${className}`}
        style={{ aspectRatio: "16 / 9" }}
      >
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            transform: `scale(calc(100cqw / ${THUMB_WIDTH}px))`,
          }}
        >
          <SlidePreview
            lines={lines}
            theme={theme}
            customBg={customBg}
            fill
            className="h-full w-full rounded-none"
          />
        </div>
      </div>
    );
  }

  const canEdit = Boolean(editable && !fill);

  return (
    <div
      className={`@container relative overflow-hidden bg-black ${fill ? "h-full w-full" : "gold-ring w-full"} ${className}`}
      style={fill ? undefined : { aspectRatio: "16 / 9" }}
    >
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute top-[3.3%] right-0 left-0 flex h-[36%] items-center justify-center overflow-hidden bg-black/40 px-[4%]">
        <div className="flex w-full min-w-0 flex-col items-center justify-center text-center font-slide font-normal text-white uppercase drop-shadow-[0_3px_10px_rgba(0,0,0,0.75)]">
          {canEdit ? (
            <SlideTextEditor
              lines={lines}
              writingSize={writingSize}
              fontSize={previewFontSize}
              onChange={onChangeLines ?? (() => undefined)}
            />
          ) : lines.length === 0 ? (
            <p className="truncate tracking-wide whitespace-nowrap text-white/50" style={{ fontSize: "5.2cqw" }}>
              Sua letra aparece aqui
            </p>
          ) : (
            lines.map((line, i) => <LineView key={i} line={line} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
}
