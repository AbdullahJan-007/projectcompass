"use client";

import { useEffect } from "react";

/**
 * Automatically unregisters any stale Service Worker left over on localhost
 * from older builds so users never see outdated cached pages or Server Action hashes.
 */
export function SwCleanup() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const reg of registrations) {
          void reg.unregister();
        }
      })
      .catch(() => {
        // Ignore service worker API errors in restricted contexts
      });
  }, []);

  return null;
}
