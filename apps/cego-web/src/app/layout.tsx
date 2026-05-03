import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    metadataBase: new URL(process.env.APP_BASE_URL || "https://cego.example.com"),
    title: {
      default: settings.tagline,
      template: `%s | ${settings.tagline}`,
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
  const settings = await getSiteSettings();

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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
        {settings.logoUrl ? (
          <link rel="icon" href={settings.logoUrl} />
        ) : null}
      </head>
      <body className="min-h-full antialiased">{children}</body>
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
