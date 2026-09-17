import { ArrowRight, Images, Music, Presentation, Timer } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ThemePicker } from "./ThemePicker";

type Props = {
  onOpenLyrics: () => void;
  onOpenTimer: () => void;
  onOpenImages: () => void;
  onOpenSongs: () => void;
};

export function Home({ onOpenLyrics, onOpenTimer, onOpenImages, onOpenSongs }: Props) {
  return (
    <div className="page-grid relative min-h-dvh overflow-x-hidden">
      <ThemePicker />
      <main className="relative mx-auto max-w-6xl px-6 py-8 sm:py-10">
        <section className="grid items-start gap-x-10 gap-y-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-gold uppercase">
              para o projetor
            </p>
            <h1 className="font-display max-w-3xl text-4xl leading-[1.05] text-cream sm:text-6xl lg:text-7xl">
              Estúdio de
              <span className="block text-gold-bright"> geração</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
              Um estúdio visual para criação de slides. Cole a letra e veja o resultado ao vivo e, se gostar, baixe o
              arquivo. E pronto, você têm uma música preparada em segundos!
            </p>
          </div>

          <div className="mx-auto aspect-square w-full max-w-[220px] md:max-w-[280px]" aria-hidden="true">
            <DotLottieReact
              src="https://lottie.host/9c552f19-48c9-4240-b00e-244d0fb294a1/jnFNpGC8WJ.lottie"
              loop
              autoplay
              className="h-full w-full"
            />
          </div>
        </section>

        <section className="mt-10 grid items-center gap-x-10 gap-y-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="grid grid-cols-2 items-start gap-x-8 gap-y-6">
            <button type="button" onClick={onOpenLyrics} className="group text-left transition hover:opacity-90">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Presentation size={22} />
              </span>
              <h2 className="font-display mt-3 text-2xl text-cream">Letras</h2>
              <span className="mt-1.5 inline-flex text-gold">
                <ArrowRight size={20} className="transition group-hover:translate-x-1" />
              </span>
            </button>

            <button type="button" onClick={onOpenTimer} className="group text-left transition hover:opacity-90">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Timer size={22} />
              </span>
              <h2 className="font-display mt-3 text-2xl text-cream">Cronômetro</h2>
              <span className="mt-1.5 inline-flex text-gold">
                <ArrowRight size={20} className="transition group-hover:translate-x-1" />
              </span>
            </button>

            <button type="button" onClick={onOpenImages} className="group text-left transition hover:opacity-90">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Images size={22} />
              </span>
              <h2 className="font-display mt-3 text-2xl text-cream">Imagens</h2>
              <span className="mt-1.5 inline-flex text-gold">
                <ArrowRight size={20} className="transition group-hover:translate-x-1" />
              </span>
            </button>

            <button type="button" onClick={onOpenSongs} className="group text-left transition hover:opacity-90">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Music size={22} />
              </span>
              <h2 className="font-display mt-3 text-2xl text-cream">Músicas</h2>
              <span className="mt-1.5 inline-flex text-gold">
                <ArrowRight size={20} className="transition group-hover:translate-x-1" />
              </span>
            </button>
          </div>

          <div className="mx-auto aspect-square w-full max-w-[220px] md:max-w-[280px]" aria-hidden="true">
            <DotLottieReact
              src="https://lottie.host/9cc706b7-7215-4ba2-8974-97d273f3a523/Y8e9d4K78i.lottie"
              loop
              autoplay
              className="h-full w-full"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
