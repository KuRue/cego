"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrCodeDisplay({
  data,
  size = 200,
  accent,
}: {
  data: string;
  size?: number;
  accent?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const dark = accent ?? "#000000";
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark, light: "#ffffff" },
    });
  }, [data, size, accent]);

  return <canvas ref={canvasRef} role="img" aria-label="Check-in QR code" />;
}
