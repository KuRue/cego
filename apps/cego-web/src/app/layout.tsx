import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import { getSiteSettings, type BrandSettings, defaults } from "@/lib/settings";
import MiniAppSessionRefresher from "@/components/mini-app-session-refresher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Cormorant_Garamond({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  let tagline = "Community Event Group Orchestrator";

  try {
    const settings = await getSiteSettings();
    tagline = settings.tagline;
  } catch {}

  return {
    metadataBase: new URL(process.env.APP_BASE_URL || "https://cego.example.com"),
    title: {
      default: tagline,
      template: `%s | ${tagline}`,
    },
    description:
      "Telegram-first planning, RSVP, and registration tools for private community events.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: BrandSettings;

  try {
    settings = await getSiteSettings();
  } catch {
    settings = defaults;
  }

  const brandCss = `
    :root {
      --color-accent: ${settings.accentColor};
      --color-accent-light: ${settings.accentColor};
      --color-badge-text: ${settings.accentColor};
      --color-highlight: ${settings.highlightColor};
      --color-on-accent: ${isLightColor(settings.accentColor) ? "#1a1d23" : "#ffffff"};
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --color-accent: ${settings.accentColorDark};
        --color-accent-light: ${settings.accentColorDark};
        --color-badge-text: ${settings.accentColorDark};
        --color-on-accent: ${isLightColor(settings.accentColorDark) ? "#1a1d23" : "#0f1117"};
      }
    }
  `;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
        {settings.logoUrl ? (
          <link rel="icon" href={settings.logoUrl} />
        ) : null}
      </head>
  <body className="min-h-full antialiased">
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="beforeInteractive"
    />
    <MiniAppSessionRefresher />
    <div className="bg-layer">
          {settings.backgroundUrl ? (
            <>
              <div
                className="bg-layer-image"
                style={{ backgroundImage: `url('${settings.backgroundUrl}')` }}
              />
              <div className="bg-layer-dim" />
            </>
          ) : (
            <>
              <div
                className="bg-layer-blob"
                style={{
                  width: "60vw",
                  height: "60vw",
                  maxWidth: "800px",
                  maxHeight: "800px",
                  top: "-15%",
                  left: "-10%",
                  background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 30%, transparent) 0%, transparent 70%)",
                }}
              />
              <div
                className="bg-layer-blob"
                style={{
                  width: "50vw",
                  height: "50vw",
                  maxWidth: "700px",
                  maxHeight: "700px",
                  bottom: "-10%",
                  right: "-5%",
                  background: "radial-gradient(circle, color-mix(in srgb, var(--color-highlight) 25%, transparent) 0%, transparent 70%)",
                }}
              />
              <div
                className="bg-layer-blob"
                style={{
                  width: "40vw",
                  height: "40vw",
                  maxWidth: "500px",
                  maxHeight: "500px",
                  top: "35%",
                  left: "30%",
                  background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent-light) 20%, transparent) 0%, transparent 70%)",
                }}
              />
            </>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
