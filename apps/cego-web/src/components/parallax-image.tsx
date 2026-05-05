"use client";

import Image, { ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

interface ParallaxImageProps extends Omit<ImageProps, "alt"> {
  alt?: string;
}

export default function ParallaxImage({ alt = "", ...imageProps }: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isSupported, setIsSupported] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if prefers-reduced-motion is set
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return; // Don't enable parallax if user prefers reduced motion
    }

    let hasPermission = false;

    // Try Telegram native DeviceOrientation API first
    const tryTelegramPermission = async () => {
      try {
        const wa = window.Telegram?.WebApp;
        if (!wa?.isSimulating && typeof wa?.requestDeviceOrientation === "function") {
          // Telegram Mini App native permission request
          wa.requestDeviceOrientation?.();
          hasPermission = true;
          setIsSupported(true);
          setupDeviceOrientationListener();
        }
      } catch {
        // Silently fail, will try browser API
      }
    };

    // Try browser DeviceOrientationEvent API
    const tryBrowserPermission = async () => {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission === "function"
        ) {
          // iOS 13+ requires permission
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === "granted") {
            hasPermission = true;
            setIsSupported(true);
            setupDeviceOrientationListener();
          }
        } else if (typeof DeviceOrientationEvent !== "undefined") {
          // Android or older browsers don't require permission
          hasPermission = true;
          setIsSupported(true);
          setupDeviceOrientationListener();
        }
      } catch {
        // Silently fail
      }
    };

    const setupDeviceOrientationListener = () => {
      const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
        // beta: rotation around x-axis (-180 to 180), front/back tilt
        // gamma: rotation around y-axis (-90 to 90), left/right tilt
        const beta = event.beta ?? 0; // -180 to 180
        const gamma = event.gamma ?? 0; // -90 to 90

        // Scale to subtle 5-8 degree effect
        // beta controls rotateX (tilt forward/backward)
        // gamma controls rotateY (tilt left/right)
        const maxRotation = 8;
        const rotateX = (beta / 180) * maxRotation;
        const rotateY = (gamma / 90) * maxRotation;

        setRotation({ x: rotateX, y: rotateY });
      };

      window.addEventListener("deviceorientation", handleDeviceOrientation);
      return () => window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };

    // Try Telegram first, fall back to browser
    tryTelegramPermission();

    // If Telegram didn't work, try browser
    if (!hasPermission) {
      tryBrowserPermission();
    }
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !isSupported) {
    // Return plain image without parallax
    return (
      <div ref={containerRef}>
        <Image {...imageProps} alt={alt} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.1s ease-out",
          backfaceVisibility: "hidden",
        }}
      >
        <Image {...imageProps} alt={alt} />
      </div>
    </div>
  );
}
