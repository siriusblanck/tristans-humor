// Runs inline (from the root layout) before the front page paints: scales the desktop scene
// to the window and decides whether this week's owl delivery plays, so neither causes a
// flash. The profile page's sheet is scaled the same way; other pages are left alone. Both
// pages repeat the scaling on in-app navigations, where inline scripts don't run.

export const DELIVERY_KEY_PREFIX = "hw:delivered:";
const UNCLAIMED_INTRO_TIMEOUT_MS = 6000;

export function deliveryKey(monday: string) {
  return `${DELIVERY_KEY_PREFIX}${monday}`;
}

/** Inline-script text for the week starting `monday`. */
export function bootScript(monday: string) {
  const key = JSON.stringify(deliveryKey(monday)).replace(/</g, "\\u003c");
  return [
    "(function(){",
    'var p=location.pathname;if(p!=="/"&&p!=="/profile")return;',
    "var d=document.documentElement;",
    'function fit(){d.style.setProperty("--s",String(Math.min(innerWidth/1200,innerHeight/760)))}',
    'fit();addEventListener("resize",fit);',
    'if(p!=="/")return;',
    `try{if(!localStorage.getItem(${key})){d.dataset.intro="play";`,
    // If the page never takes over the intro (a script error, say), show the page anyway.
    `setTimeout(function(){if(!window.__hwIntro)delete d.dataset.intro},${UNCLAIMED_INTRO_TIMEOUT_MS})}}catch(e){}`,
    "})();",
  ].join("");
}
