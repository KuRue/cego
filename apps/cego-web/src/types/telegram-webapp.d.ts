export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        /** True when the Mini App is in fullscreen mode (no bot-name bar at top). Bot API 8.0+. */
        isFullscreen?: boolean;
        requestFullscreen?: () => void;
        exitFullscreen?: () => void;
        /** Request device orientation permission in Telegram Mini App. Allows listening to deviceorientation events. */
        requestDeviceOrientation?: () => void;
        /** True when running in Telegram's simulator (testing mode). */
        isSimulating?: boolean;
        /** Closes the Mini App. The user must reopen via the bot/menu to get fresh initData. */
        close?: () => void;
        /** Subscribe to a WebApp event. Available events include "fullscreenChanged", "fullscreenFailed", "viewportChanged", etc. */
        onEvent?: (event: string, handler: () => void) => void;
        offEvent?: (event: string, handler: () => void) => void;
      };
    };
  }
}
