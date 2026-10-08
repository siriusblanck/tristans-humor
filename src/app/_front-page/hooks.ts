"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./motion";

/** Keeps the desktop stage fitted to the window (the boot script covers the first paint). */
export function useSceneFit() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const fit = () => root.style.setProperty("--s", String(Math.min(window.innerWidth / SCENE_WIDTH, window.innerHeight / SCENE_HEIGHT)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
}

export type Toast = { message: string; tone: "status" | "alert"; id: number };

const TOAST_MS = { status: 2600, alert: 6000 };

/** One short message at a time; alerts stay a little longer. */
export function useToast(initialAlert?: string) {
  const count = useRef(0);
  const [toast, setToast] = useState<Toast | null>(() => (initialAlert ? { message: initialAlert, tone: "alert", id: 0 } : null));

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS[toast.tone]);
    return () => clearTimeout(timer);
  }, [toast]);

  function show(message: string, tone: Toast["tone"] = "status") {
    count.current += 1;
    setToast({ message, tone, id: count.current });
  }

  return [toast, show] as const;
}
