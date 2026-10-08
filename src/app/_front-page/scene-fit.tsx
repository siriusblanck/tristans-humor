"use client";

import { useSceneFit } from "./hooks";

/** Keeps --s fitted to the window on pages that aren't the front page (the profile sheet). */
export default function SceneFit() {
  useSceneFit();
  return null;
}
