"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export default function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const activeIndex = images.length > 0 ? Math.min(current, images.length - 1) : 0;

  useEffect(() => {
    if (images.length <= 1 || paused) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [images.length, paused]);

  function showSlide(index: number) {
    setCurrent((index + images.length) % images.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (images.length <= 1) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(activeIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + 1);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartX.current = event.clientX;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null || images.length <= 1) return;

    const deltaX = event.clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (Math.abs(deltaX) < 40) return;

    showSlide(deltaX > 0 ? activeIndex - 1 : activeIndex + 1);
  }

  if (images.length === 0) return null;

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
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ touchAction: "pan-y" }}
    >
      <Image
        key={images[activeIndex]}
        src={images[activeIndex]}
        alt=""
        fill
        className="object-cover"
        priority={activeIndex === 0}
        sizes="(max-width: 640px) 100vw, 960px"
        draggable={false}
      />

      {images.length > 1 ? (
        <>
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
            onClick={() => showSlide(activeIndex - 1)}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity"
            style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <button
            type="button"
            onClick={() => showSlide(activeIndex + 1)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity"
            style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </>
      ) : null}
    </div>
  );
}
