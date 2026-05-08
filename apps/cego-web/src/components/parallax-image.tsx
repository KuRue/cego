"use client";

import Image, { ImageProps } from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface ParallaxImageProps extends Omit<ImageProps, "alt"> {
  alt?: string;
}

export default function ParallaxImage({ alt = "", ...imageProps }: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isSupported, setIsSupported] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      return; // Don't enable parallax if user prefers reduced motion
    }

    let disposed = false;
    let cleanupDeviceOrientation: (() => void) | null = null;

    const setupDeviceOrientationListener = () => {
      if (disposed || cleanupDeviceOrientation) return;

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
      cleanupDeviceOrientation = () => window.removeEventListener("deviceorientation", handleDeviceOrientation);
      setIsSupported(true);
    };

    const enableDeviceOrientation = async () => {
      try {
        const wa = window.Telegram?.WebApp;
        if (!wa?.isSimulating && typeof wa?.requestDeviceOrientation === "function") {
          wa.requestDeviceOrientation();
          setupDeviceOrientationListener();
          return;
        }
      } catch {
        // Silently fail, will try browser API.
      }

      try {
        if (typeof DeviceOrientationEvent === "undefined") return;

        const orientationEvent = DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<PermissionState>;
        };

        if (typeof orientationEvent.requestPermission === "function") {
          // iOS 13+ requires permission.
          const permission = await orientationEvent.requestPermission();
          if (permission !== "granted") return;
        }

        setupDeviceOrientationListener();
      } catch {
        // Silently fail.
      }
    };

    void enableDeviceOrientation();

    return () => {
      disposed = true;
      cleanupDeviceOrientation?.();
    };
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

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}
