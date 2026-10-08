import type { House } from "@/lib/owl-post/houses";
import { FLYING_GEM_SVG } from "./art";
import { EASE, boxIn, prefersReducedMotion, sceneScale } from "./motion";

/** A gem arcs from the vote button into the writer's house hourglass, which pulses as it lands. */
export async function flyGem(scene: HTMLElement, from: Element, house: House, className: string) {
  const glass = scene.querySelector(`[data-glass="${house}"]`);
  if (!glass || prefersReducedMotion()) return;
  const scale = sceneScale(scene);
  const a = boxIn(from, scene, scale);
  const b = boxIn(glass, scene, scale);
  const apex = { x: (a.cx + b.cx) / 2, y: Math.min(a.cy, b.cy) - 150 };
  const gem = document.createElement("div");
  gem.className = className;
  gem.dataset.house = house;
  gem.innerHTML = FLYING_GEM_SVG; // a constant drawing; no user data
  scene.append(gem);
  await gem.animate([
    { transform: `translate(${a.cx - 8}px, ${a.cy - 10}px) scale(.4) rotate(0deg)`, opacity: 0, easing: "cubic-bezier(.2,.6,.4,1)" },
    { transform: `translate(${apex.x - 8}px, ${apex.y - 10}px) scale(1.5) rotate(200deg)`, opacity: 1, offset: 0.45, easing: "cubic-bezier(.6,0,.8,.4)" },
    { transform: `translate(${b.cx - 8}px, ${b.cy - 10}px) scale(.7) rotate(360deg)`, opacity: 1 },
  ], { duration: 720, fill: "forwards" }).finished.catch(() => undefined);
  gem.remove();
  glass.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 300, easing: EASE.settle });
}
