"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const TRANSITION_MS = 500;
const STRIP_COPIES = 3;

export default function ImageCarousel({ images }: { images: string[] }) {
  const N = images.length;
  const stripImages = N > 1
    ? Array.from({ length: STRIP_COPIES }, () => images).flat()
    : images;
  const startOffset = N > 1 ? N : 0; // start at the first image of the middle copy

  const [displayIndex, setDisplayIndex] = useState(startOffset);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const activeIndex = N > 0 ? ((displayIndex % N) + N) % N : 0;

  // Auto-advance
  useEffect(() => {
    if (N <= 1 || paused) return;

    const timer = setInterval(() => {
      setTransitionEnabled(true);
      setDisplayIndex((d) => d + 1);
    }, 5000);

    return () => clearInterval(timer);
  }, [N, paused]);

  // Pause when tab is hidden
  useEffect(() => {
    function onVisibilityChange() {
      setPaused(document.hidden);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Re-enable transition on the frame after a silent recenter, so the snap is invisible
  useEffect(() => {
    if (transitionEnabled) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true));
    });
    return () => cancelAnimationFrame(id);
  }, [transitionEnabled]);

  function goNext() {
    setTransitionEnabled(true);
    setDisplayIndex((d) => d + 1);
  }

  function goPrev() {
    setTransitionEnabled(true);
    setDisplayIndex((d) => d - 1);
  }

  function showSlide(targetReal: number) {
    if (N <= 1) return;
    const normalized = ((targetReal % N) + N) % N;
    setTransitionEnabled(true);
    // Take the shorter path so dot clicks don't slide all the way around.
    setDisplayIndex((d) => {
      const currentReal = ((d % N) + N) % N;
      const forwardDelta = (normalized - currentReal + N) % N;
      const backwardDelta = (currentReal - normalized + N) % N;
      return forwardDelta <= backwardDelta ? d + forwardDelta : d - backwardDelta;
    });
  }

  function handleTransitionEnd() {
    if (N <= 1) return;
    // Recenter into [N, 2N) silently so we can keep sliding forever.
    if (displayIndex >= 2 * N) {
      setTransitionEnabled(false);
      setDisplayIndex((d) => d - N);
    } else if (displayIndex < N) {
      setTransitionEnabled(false);
      setDisplayIndex((d) => d + N);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (N <= 1) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartX.current = event.clientX;
    setPaused(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null || N <= 1) {
      setPaused(false);
      return;
    }

    const deltaX = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    setPaused(false);

    if (Math.abs(deltaX) < 40) return;

    if (deltaX > 0) goPrev();
    else goNext();
  }

  if (N === 0) return null;

  // Single image — no strip needed, no transition logic.
  if (N === 1) {
    return (
      <div className="relative h-64 overflow-hidden sm:h-80">
        <Image
          src={images[0]}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="(max-width: 640px) 100vw, 960px"
          draggable={false}
        />
      </div>
    );
  }

  const slidePercent = 100 / stripImages.length;

  return (
    <div
      className="relative h-64 overflow-hidden sm:h-80"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Event photos"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null;
        setPaused(false);
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="flex h-full"
        style={{
          width: `${stripImages.length * 100}%`,
          transform: `translate3d(${-slidePercent * displayIndex}%, 0, 0)`,
          transition: transitionEnabled ? `transform ${TRANSITION_MS}ms ease-in-out` : "none",
          willChange: "transform",
        }}
        onTransitionEnd={handleTransitionEnd}
        aria-live="polite"
      >
        {stripImages.map((src, i) => {
          const realIndex = i % N;
          return (
            <div
              key={`${i}-${src}`}
              className="relative h-full shrink-0"
              style={{ width: `${slidePercent}%` }}
              aria-hidden={realIndex !== activeIndex}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                priority={i === startOffset}
                sizes="(max-width: 640px) 100vw, 960px"
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => showSlide(i)}
            className="h-2 w-2 rounded-full transition-opacity"
            style={{
              background: "rgba(255,255,255,0.9)",
              opacity: i === activeIndex ? 1 : 0.4,
            }}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === activeIndex}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={goPrev}
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity"
        style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
        aria-label="Previous photo"
      >
        &#8249;
      </button>
      <button
        type="button"
        onClick={goNext}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity"
        style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
        aria-label="Next photo"
      >
        &#8250;
      </button>
    </div>
  );
}
