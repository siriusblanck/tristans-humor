// The owl delivery, step by step. Timings and curves follow the design scope; Skip shortens
// everything to an instant, and reduced motion swaps the flight for a plain fade.

import { EASE, boxIn, isDesktop, prefersReducedMotion, sceneScale } from "./motion";

export type DeliveryParts = {
  courier: HTMLElement | null;
  owl: HTMLElement | null;
  envelope: HTMLElement | null;
  flap: HTMLElement | null;
  envelopeSeal: HTMLElement | null;
  hero: HTMLElement | null;
  skipButton: HTMLElement | null;
};

export type Timing = {
  reduce: boolean;
  animate: (element: Element | null | undefined, frames: Keyframe[], ms: number, easing?: string, delay?: number) => Promise<void>;
  /** A pause for reading: reduced motion keeps it; only Skip cuts it short. */
  wait: (ms: number) => Promise<void>;
};

const noop = () => undefined;

export function makeTiming(skipping: () => boolean, waiters: Array<() => void>): Timing {
  const reduce = prefersReducedMotion();
  const fast = () => skipping() || reduce;
  return {
    reduce,
    animate: (element, frames, ms, easing = "linear", delay = 0) => element
      ? element.animate(frames, { duration: fast() ? 1 : ms, delay: fast() ? 0 : delay, easing, fill: "both" }).finished.then(noop, noop)
      : Promise.resolve(),
    wait: (ms) => new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, skipping() ? 1 : ms);
      waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    }),
  };
}

/** The owl swoops in, drops the envelope, the seal pops, the flap opens and the letter rises. */
export async function deliverLetter(parts: DeliveryParts, { animate, reduce }: Timing) {
  const { courier, owl, envelope, flap, envelopeSeal, hero } = parts;
  if (reduce) {
    if (courier) courier.style.visibility = "hidden";
    await animate(hero, [{ opacity: 1 }, { opacity: 1 }], 1);
    return;
  }
  const desktop = isDesktop();
  const width = desktop ? 1200 : window.innerWidth;
  const height = desktop ? 760 : window.innerHeight;
  const size = desktop ? 1 : 0.8;
  const at = (x: number, y: number, rotate: number) => `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${size})`;
  const drop = desktop ? 142 : height * 0.2;

  await animate(courier, [
    { transform: at(width + 60, -170, -14) },
    { transform: at(width * 0.8, 30, -14), offset: 0.4 },
    { transform: at(width * 0.583, 100, -6), offset: 0.72 },
    { transform: at(width / 2 - (170 * size) / 2, desktop ? 90 : height * 0.1, 0) },
  ], 1300, EASE.flight);
  void animate(owl, [{ transform: "none" }, { transform: "translate(-70px, -24px)", offset: 0.25 }, { transform: "translate(-760px, -280px) rotate(-8deg)" }], 1000, EASE.in);
  await animate(envelope, [
    { transform: "translateY(0) rotate(0deg)", easing: EASE.drop },
    { transform: `translateY(${drop + 8}px) rotate(-5deg)`, offset: 0.78, easing: EASE.out },
    { transform: `translateY(${drop - 4}px) rotate(2deg)`, offset: 0.9 },
    { transform: `translateY(${drop}px) rotate(0deg)` },
  ], 600);
  await animate(envelopeSeal, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.4)", opacity: 0 }], 220, EASE.out);
  await animate(flap, [{ transform: "rotateX(0deg)" }, { transform: "rotateX(178deg)" }], 300, EASE.out);
  void animate(envelope, [{ transform: `translateY(${drop}px)`, opacity: 1 }, { transform: `translateY(${drop + 58}px)`, opacity: 0 }], 420, EASE.out);
  await animate(hero, [{ transform: "translateY(40px) scale(.36)", opacity: 0 }, { transform: "translateY(-8px) scale(1.02)", opacity: 1, offset: 0.75 }, { transform: "none", opacity: 1 }], 620, EASE.out);
}

/** The letter flies up into the prompt bar while the page deals itself in underneath. */
export function dealInPage(scene: HTMLElement, parts: DeliveryParts, { animate }: Timing) {
  const pick = (name: string) => [...scene.querySelectorAll<HTMLElement>(`[data-reveal="${name}"]`)];
  const [chip] = pick("chip");
  const [rail] = pick("rail");
  if (chip && parts.hero) {
    const scale = sceneScale(scene);
    const from = boxIn(parts.hero, scene, scale);
    const to = boxIn(chip, scene, scale);
    void animate(parts.hero, [{ transform: "none", opacity: 1 }, { transform: `translate(${to.cx - from.cx}px, ${to.cy - from.cy}px) scale(${to.height / from.height})`, opacity: 0 }], 640, EASE.flight);
  }
  void animate(parts.courier, [{ opacity: 1 }, { opacity: 0 }], 200, EASE.out);
  void animate(parts.skipButton, [{ opacity: 1 }, { opacity: 0 }], 200, EASE.out);

  const fade = [{ opacity: 0 }, { opacity: 1 }];
  if (rail) rail.dataset.fill = "empty";
  void animate(pick("topbar")[0], fade, 400, EASE.out, 200);
  void animate(chip, [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1.04)", offset: 0.6 }, { opacity: 1, transform: "none" }], 620, EASE.settle, 380);
  void animate(rail, fade, 300, EASE.out, 380);
  pick("card").reverse().forEach((card, index) => {
    const rest = getComputedStyle(card).transform;
    void animate(card, [{ transform: `translateY(320px) rotate(${index % 2 ? 7 : -7}deg)`, opacity: 0 }, { transform: rest, opacity: 1 }], 560, EASE.settle, 380 + index * 70);
  });
  void animate(pick("dock")[0], [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], 460, EASE.settle, 760);
  void animate(pick("counter")[0], fade, 300, EASE.out, 680);
  void animate(pick("legal")[0], fade, 300, EASE.out, 680);
  const [fab] = pick("fab");
  void animate(fab, [{ transform: "translateY(40px) rotate(-4deg)", opacity: 0 }, { transform: "translateY(-4px) rotate(1deg)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }], 520, EASE.settle, 900);
  void animate(fab?.firstElementChild, [{ transform: "scale(1.8)", opacity: 0 }, { transform: "scale(.9)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }], 520, EASE.settle, 1060);
  return rail;
}
