"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Avatar from "@/components/avatar";
import { Html5Qrcode } from "html5-qrcode";

type EventOption = {
  id: string;
  title: string;
  slug: string;
};

type ScanResult = {
  ok: boolean;
  error?: string;
  displayName?: string;
  photoUrl?: string | null;
  plusOneName?: string | null;
};

export default function CheckInScanner({ events }: { events: EventOption[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const showResult = useCallback((res: ScanResult) => {
    setResult(res);
    setFlash(res.ok ? "green" : "red");
    setTimeout(() => {
      setFlash(null);
    }, 1500);
  }, []);

  const processScan = useCallback(
    async (rsvpId: string) => {
      const now = Date.now();
      if (rsvpId === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
      lastScanRef.current = rsvpId;
      lastScanTimeRef.current = now;

      try {
        const res = await fetch("/api/admin/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rsvpId, eventId: selectedEventId }),
        });
        const data: ScanResult = await res.json();
        showResult(data);
      } catch {
        showResult({ ok: false, error: "Network error" });
      }
    },
    [selectedEventId, showResult],
  );

  const startScanning = useCallback(async () => {
    if (!selectedEventId || !containerRef.current) return;

    setResult(null);
    setFlash(null);

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          processScan(decodedText);
        },
        () => {},
      );
      setScanning(true);
    } catch {
      try {
        await scanner.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            processScan(decodedText);
          },
          () => {},
        );
        setScanning(true);
      } catch (err) {
        setResult({ ok: false, error: "Camera access denied or unavailable" });
      }
    }
  }, [selectedEventId, processScan]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      stopScanning();
    }
    setResult(null);
    setFlash(null);
    lastScanRef.current = "";
  }, [selectedEventId]);

  return (
    <div className="mt-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Event</span>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="form-select"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        {!scanning ? (
          <button
            type="button"
            onClick={startScanning}
            disabled={!selectedEventId}
            className="h-11 rounded-xl px-6 text-sm font-semibold transition"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-on-accent)",
              opacity: selectedEventId ? 1 : 0.5,
            }}
          >
            Start Scanner
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanning}
            className="h-11 rounded-xl px-6 text-sm font-semibold transition"
            style={{
              background: "var(--color-surface-hover)",
              border: "1px solid var(--color-surface-border)",
              color: "var(--color-foreground)",
            }}
          >
            Stop Scanner
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative mt-4 overflow-hidden rounded-2xl"
        style={{
          border: flash
            ? `3px solid ${flash === "green" ? "var(--color-success)" : "var(--color-danger)"}`
            : "1px solid var(--color-surface-border)",
          transition: "border-color 0.2s",
        }}
      >
        <div id="qr-reader" />

        {flash && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                flash === "green"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
              transition: "background 0.2s",
            }}
          />
        )}
      </div>

      {result && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{
            border: `1px solid ${
              result.ok ? "var(--color-success)" : "var(--color-danger)"
            }`,
            background: result.ok ? "var(--color-success-bg)" : "var(--color-danger-bg)",
          }}
        >
          <div className="flex items-center gap-3">
            {result.photoUrl !== undefined && (
              <Avatar
                displayName={result.displayName ?? "?"}
                photoUrl={result.photoUrl ?? null}
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">
                {result.ok ? "Checked in" : "Problem"}
              </p>
              {result.displayName && (
                <p className="text-sm">{result.displayName}</p>
              )}
              {result.plusOneName && (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  +1: {result.plusOneName}
                </p>
              )}
              {result.error && (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                  {result.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
