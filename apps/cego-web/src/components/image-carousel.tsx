"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative h-64 sm:h-80">
        <Image src={images[0]} alt="" fill className="object-cover" priority />
      </div>
    );
  }

  return (
    <div className="relative h-64 sm:h-80 overflow-hidden">
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          className="object-cover transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
          priority={i === 0}
        />
      ))}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setCurrent(i);
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                setCurrent((prev) => (prev + 1) % images.length);
              }, 5000);
            }}
            className="h-2 w-2 rounded-full transition-opacity"
            style={{
              background: "rgba(255,255,255,0.9)",
              opacity: i === current ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setCurrent((prev) => (prev - 1 + images.length) % images.length);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
          }, 5000);
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-opacity"
        style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
        aria-label="Previous"
      >
        &#8249;
      </button>
      <button
        type="button"
        onClick={() => {
          setCurrent((prev) => (prev + 1) % images.length);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
          }, 5000);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-opacity"
        style={{ background: "rgba(0,0,0,0.3)", color: "#fff", opacity: 0.7 }}
        aria-label="Next"
      >
        &#8250;
      </button>
    </div>
  );
}
