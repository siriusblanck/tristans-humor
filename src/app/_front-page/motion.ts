// Shared choreography for the front page. Timings and curves match the design scope.

export const EASE = {
  flight: "cubic-bezier(.3,0,.2,1)",
  drop: "cubic-bezier(.55,0,.85,.35)",
  settle: "cubic-bezier(.2,.9,.3,1.25)",
  out: "cubic-bezier(.2,.7,.2,1)",
  in: "cubic-bezier(.5,0,.9,.4)",
} as const;

/**
 * The desktop scene: a 1200 × 760 stage scaled to fit. Smaller windows get the compact layout.
 * Every front-page stylesheet repeats this rule; tests/front-page-breakpoint.test.ts keeps them in step.
 */
export const DESKTOP_QUERY = "(min-width: 1024px) and (min-height: 600px)";
export const SCENE_WIDTH = 1200;
export const SCENE_HEIGHT = 760;

export const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How much the scene is scaled on screen (1 in the compact layout, which isn't scaled). */
export function sceneScale(scene: HTMLElement) {
  return isDesktop() ? scene.getBoundingClientRect().width / SCENE_WIDTH || 1 : 1;
}

/** An element's box in the scene's own (unscaled) coordinates. */
export function boxIn(element: Element, frame: Element, scale: number) {
  const box = element.getBoundingClientRect();
  const origin = frame.getBoundingClientRect();
  return {
    left: (box.left - origin.left) / scale,
    top: (box.top - origin.top) / scale,
    width: box.width / scale,
    height: box.height / scale,
    cx: (box.left - origin.left + box.width / 2) / scale,
    cy: (box.top - origin.top + box.height / 2) / scale,
  };
}

/** Runs a Web Animation and settles when it ends or is cancelled. Reduced motion skips straight to the end. */
export function play(
  element: Element | null | undefined,
  keyframes: Keyframe[],
  duration: number,
  easing: string = "linear",
  options: KeyframeAnimationOptions = {},
): Promise<void> {
  if (!element) return Promise.resolve();
  const animation = element.animate(keyframes, {
    duration: prefersReducedMotion() ? 1 : duration,
    easing,
    fill: "both",
    ...options,
    delay: prefersReducedMotion() ? 0 : options.delay,
  });
  return animation.finished.then(() => undefined, () => undefined);
}

/** Animations this code started; CSS loops (wing flaps, the dock's bob) are left running. */
export function isScripted(animation: Animation) {
  return !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition);
}

export function clearScripted(element: Element | null | undefined) {
  element?.getAnimations({ subtree: true }).filter(isScripted).forEach((animation) => animation.cancel());
}

export function finishScripted(element: Element | null | undefined) {
  element?.getAnimations({ subtree: true }).filter(isScripted).forEach((animation) => {
    try {
      animation.finish();
    } catch {
      animation.cancel(); // an endless animation can't finish; cancelling ends it just the same
    }
  });
}

/** The zoom on full-screen sheets: the desktop stage's --s, or 1 in the compact layout. */
export function stageScale() {
  if (!isDesktop()) return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--s")) || 1;
}
