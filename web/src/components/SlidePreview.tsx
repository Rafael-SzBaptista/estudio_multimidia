import { useEffect, useRef } from "react";
import type { SlideLine } from "../lib/buildSlides";
import { useAppAccent } from "../lib/appAccent";
import { paintTheme, type ThemeId } from "../lib/themes";

type Props = {
  lines: SlideLine[];
  theme: ThemeId;
  customBg?: string | null;
  className?: string;
  compact?: boolean;
  fill?: boolean;
};

export function SlidePreview({ lines, theme, customBg, className = "", compact, fill }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentId = useAppAccent();

  useEffect(() => {
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
  }, [theme, customBg, accentId]);

  return (
    <div
      className={`relative overflow-hidden bg-black ${fill ? "h-full w-full" : "gold-ring w-full"} ${className}`}
      style={fill ? undefined : { aspectRatio: "16 / 9" }}
    >
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute top-[3.3%] right-0 left-0 flex h-[36%] items-center justify-center bg-black/40 px-[4%]">
        <div className="w-full text-center font-slide font-normal text-white uppercase drop-shadow-[0_3px_10px_rgba(0,0,0,0.75)]">
          {lines.length === 0 ? (
            <p className={`tracking-wide text-white/50 ${compact ? "text-lg" : "text-[clamp(1.2rem,3.6vw,2.6rem)]"}`}>
              Sua letra aparece aqui
            </p>
          ) : (
            lines.map((line, i) => (
              <p
                key={`${line.text}-${i}`}
                className="leading-[1.15]"
                style={{
                  fontSize: compact
                    ? line.size > 50
                      ? 13
                      : 11
                    : `clamp(1.05rem, ${line.size * 0.055}vw, ${line.size * 1.85}px)`,
                  marginTop: i ? 6 : 0,
                }}
              >
                {line.text}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
