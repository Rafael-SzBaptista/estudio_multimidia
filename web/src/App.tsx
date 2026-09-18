import { useEffect, useRef, useState, type TransitionEvent } from "react";
import { Home } from "./components/Home";
import { ImagesStudio } from "./components/ImagesStudio";
import { LyricsStudio } from "./components/LyricsStudio";
import { SongsStudio } from "./components/SongsStudio";
import { TimerStudio } from "./components/TimerStudio";
import { listImages, resolveLibraryBackground } from "./lib/imageLibrary";

type StudioView = "lyrics" | "timer" | "images" | "songs";

function scrollToTop(el?: HTMLElement | null) {
  el?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function App() {
  const [studio, setStudio] = useState<StudioView | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [libraryBg, setLibraryBg] = useState<string | null>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (libraryBg) return;
    let live = true;
    void listImages()
      .then(async (images) => {
        if (!live || !images[0]) return;
        const url = await resolveLibraryBackground(images[0]);
        if (live) setLibraryBg(url);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [libraryBg]);

  useEffect(() => {
    if (!studio) {
      setPanelOpen(false);
      scrollToTop(homeRef.current);
      return;
    }
    scrollToTop(panelRef.current);
    const frame = window.requestAnimationFrame(() => {
      setPanelOpen(true);
      scrollToTop(panelRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [studio]);

  function openView(next: StudioView) {
    setPresenting(false);
    setStudio(next);
    scrollToTop(panelRef.current);
  }

  function goHome() {
    setPresenting(false);
    scrollToTop(homeRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPanelOpen(false);
      setStudio(null);
      return;
    }
    setPanelOpen(false);
  }

  function onPanelTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (!panelOpen) setStudio(null);
  }

  return (
    <div className="app-shell">
      <div
        ref={homeRef}
        className={`home-layer${panelOpen ? " is-pushed" : ""}`}
        aria-hidden={panelOpen}
        inert={panelOpen}
      >
        <Home
          onOpenLyrics={() => openView("lyrics")}
          onOpenTimer={() => openView("timer")}
          onOpenImages={() => openView("images")}
          onOpenSongs={() => openView("songs")}
        />
      </div>

      {studio ? (
        <div
          key={studio}
          ref={panelRef}
          className={`page-panel${panelOpen ? " is-in" : ""}`}
          onTransitionEnd={onPanelTransitionEnd}
        >
          {studio === "lyrics" ? (
            <LyricsStudio
              onBack={goHome}
              presenting={presenting}
              onPresent={setPresenting}
              libraryBg={libraryBg}
              onLibraryBg={setLibraryBg}
            />
          ) : null}
          {studio === "timer" ? (
            <TimerStudio onBack={goHome} libraryBg={libraryBg} onLibraryBg={setLibraryBg} />
          ) : null}
          {studio === "images" ? <ImagesStudio onBack={goHome} /> : null}
          {studio === "songs" ? <SongsStudio onBack={goHome} /> : null}
        </div>
      ) : null}
    </div>
  );
}
