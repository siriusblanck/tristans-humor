import { describe, expect, it, vi } from "vitest";
import { bootScript, deliveryKey } from "@/app/_front-page/boot-script";

/* Behavior inventory:
 * It acts on the front page, and scales the profile page's sheet too. Each week has its own "delivered" key. Before first paint the script scales the scene to
 * the window (keeping it in step on resize) and asks for the owl delivery only when this
 * week's letter hasn't been seen; if the page never claims the intro, the flag clears itself.
 * Blocked storage never stops the page. The script text can't close its <script> tag.
 */
function run(monday: string, { stored, storageThrows = false, width = 1440, height = 900, path = "/" }: { stored?: string; storageThrows?: boolean; width?: number; height?: number; path?: string } = {}) {
  const root = { dataset: {} as Record<string, string>, style: { props: new Map<string, string>(), setProperty(name: string, value: string) { this.props.set(name, value); } } };
  const listeners: Record<string, () => void> = {};
  const timers: Array<() => void> = [];
  const window = {
    innerWidth: width, innerHeight: height, location: { pathname: path },
    document: { documentElement: root },
    localStorage: { getItem: vi.fn((key: string) => { if (storageThrows) throw new Error("blocked"); return key === deliveryKey(monday) ? (stored ?? null) : null; }) },
    addEventListener: (event: string, listener: () => void) => { listeners[event] = listener; },
    setTimeout: (callback: () => void) => { timers.push(callback); },
  } as Record<string, unknown>;
  new Function("window", `with (window) { ${bootScript(monday)} }`)(window);
  return { root, listeners, timers, window };
}

describe("front page boot script", () => {
  it("names one delivery key per week", () => {
    expect(deliveryKey("2026-10-05")).toBe("hw:delivered:2026-10-05");
  });

  it("scales the scene to fit the window and follows resizes", () => {
    const { root, listeners, window } = run("2026-10-05", { stored: "1", width: 1440, height: 900 });
    expect(root.style.props.get("--s")).toBe(String(Math.min(1440 / 1200, 900 / 760)));
    Object.assign(window, { innerWidth: 1200, innerHeight: 600 });
    listeners.resize();
    expect(root.style.props.get("--s")).toBe(String(600 / 760));
  });

  it("asks for the delivery only until this week's letter has been seen", () => {
    expect(run("2026-10-05").root.dataset.intro).toBe("play");
    expect(run("2026-10-05", { stored: "1" }).root.dataset.intro).toBeUndefined();
  });

  it("clears the flag if the page never takes over the intro", () => {
    const unclaimed = run("2026-10-05");
    unclaimed.timers.forEach((timer) => timer());
    expect(unclaimed.root.dataset.intro).toBeUndefined();

    const claimed = run("2026-10-05");
    claimed.window.__hwIntro = true;
    claimed.timers.forEach((timer) => timer());
    expect(claimed.root.dataset.intro).toBe("play");
  });

  it("skips the delivery quietly when storage is blocked", () => {
    expect(run("2026-10-05", { storageThrows: true }).root.dataset.intro).toBeUndefined();
  });

  it("scales the profile page without asking for the delivery", () => {
    const { root, listeners } = run("2026-10-05", { path: "/profile", width: 1200, height: 380 });
    expect(root.style.props.get("--s")).toBe("0.5");
    expect(listeners.resize).toBeDefined();
    expect(root.dataset.intro).toBeUndefined();
  });

  it("does nothing on other pages", () => {
    const { root, listeners } = run("2026-10-05", { path: "/privacy" });
    expect(root.dataset.intro).toBeUndefined();
    expect(root.style.props.size).toBe(0);
    expect(listeners.resize).toBeUndefined();
  });

  it("can't close its own script tag", () => {
    expect(bootScript("2026-10-05")).not.toMatch(/<\/script/i);
    expect(bootScript('</script><script>alert(1)</script>')).not.toMatch(/<\/script/i);
  });
});
