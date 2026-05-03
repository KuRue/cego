import Script from "next/script";
import MiniAppSession from "./session";

export const metadata = {
  title: "Telegram Mini App",
};

export default function MiniAppPage() {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <MiniAppSession />
    </>
  );
}
