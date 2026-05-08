"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
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
  username?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  plusOneName?: string | null;
  rsvpTags?: string[] | null;
  rsvpNotes?: string | null;
};

export default function CheckInScanner({ events }: { events: EventOption[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const showResult = useCallback((res: ScanResult) => {
    setResult(res);
    setFlash(res.ok ? "green" : "red");
    setTimeout(() => setFlash(null), 1500);
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
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
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
    if (!selectedEventId) return;
    setResult(null);
    setFlash(null);

    let scanner = scannerRef.current;
    if (scanner) {
      try { await scanner.stop(); scanner.clear(); } catch {}
      scanner = null;
      scannerRef.current = null;
    }

    scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const onSuccess = (decodedText: string) => { processScan(decodedText); };

    try {
      await scanner.start({ facingMode: "environment" }, config, onSuccess, () => {});
      setScanning(true);
    } catch {
      try {
        await scanner.start({ facingMode: "user" }, config, onSuccess, () => {});
        setScanning(true);
      } catch {
        scannerRef.current = null;
        setResult({ ok: false, error: "Camera access denied or unavailable" });
      }
    }
  }, [selectedEventId, processScan]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
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
    if (scanning) stopScanning();
    setResult(null);
    setFlash(null);
    lastScanRef.current = "";
  }, [selectedEventId]);

  return (
    <div>
      {!scanning ? (
        <div className="mt-6 flex flex-col gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Event</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="form-select"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={startScanning}
            className="h-11 rounded-xl px-6 text-sm font-semibold transition"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            Start Scanner
          </button>
          {result && !result.ok && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>{result.error}</p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between px-1 pb-2">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-8 rounded-lg px-2 text-xs outline-none"
              style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={stopScanning}
              className="text-xs font-semibold"
              style={{ color: "var(--color-danger)" }}
            >
              Stop
            </button>
          </div>
        </div>
      )}

      <div
        id="qr-reader"
        className="mx-auto overflow-hidden rounded-2xl"
        style={{
          maxWidth: 320,
          marginTop: scanning ? 0 : 0,
          height: scanning ? undefined : 0,
          overflow: "hidden",
          border: flash
            ? `3px solid ${flash === "green" ? "var(--color-success)" : "var(--color-danger)"}`
            : scanning ? "1px solid var(--color-surface-border)" : "none",
          transition: "border-color 0.2s",
        }}
      />

      {scanning && flash && (
        <div
          className="mx-auto pointer-events-none rounded-2xl"
          style={{
            maxWidth: 320,
            marginTop: -320,
            height: 320,
            position: "relative",
            background: flash === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          }}
        />
      )}

      {scanning && result && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{
            border: `1px solid ${result.ok ? "var(--color-success)" : "var(--color-danger)"}`,
            background: result.ok ? "var(--color-success-bg)" : "var(--color-danger-bg)",
          }}
        >
          <div className="flex items-center gap-3">
            {result.photoUrl !== undefined && (
              <Avatar displayName={result.displayName ?? "?"} photoUrl={result.photoUrl ?? null} size="lg" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{result.ok ? "Checked in" : "Problem"}</p>
              {result.displayName && <p className="text-sm font-semibold">{result.displayName}</p>}
              {result.username && <p className="text-xs" style={{ color: "var(--color-muted)" }}>@{result.username}</p>}
            </div>
          </div>

          {result.plusOneName && (
            <div className="mt-3 rounded-lg p-2" style={{ background: "var(--color-surface-hover)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>+1</p>
              <p className="text-sm font-medium">{result.plusOneName}</p>
            </div>
          )}

          {result.email && <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>{result.email}</p>}

          {(result.rsvpTags ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {result.rsvpTags!.map((tag) => (
                <span key={tag} className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--color-accent)", color: "var(--color-on-accent)", opacity: 0.85 }}>{tag}</span>
              ))}
            </div>
          )}

          {result.rsvpNotes && (
            <p className="mt-2 text-xs whitespace-pre-line" style={{ color: "var(--color-muted)" }}>{result.rsvpNotes}</p>
          )}

          {result.error && (
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--color-danger)" }}>{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
