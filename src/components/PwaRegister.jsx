"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!("isSecureContext" in window) || !window.isSecureContext) {
      // Di HTTP/local development bisa gagal; install PWA butuh konteks aman (HTTPS).
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  }, []);

  return null;
}

