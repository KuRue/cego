"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrCodeDisplay({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [data]);

  return <canvas ref={canvasRef} />;
}
