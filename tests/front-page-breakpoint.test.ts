import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DESKTOP_QUERY } from "@/app/_front-page/motion";

/* Behavior inventory:
 * "Desktop" (the scaled stage) is one rule: the stylesheets and the script that measures the
 * layout must agree on it, or positions and gem flights drift apart.
 */
const folders = ["src/app/_front-page", "src/app/profile"].map((folder) => join(process.cwd(), folder));
const sizeConditions = (text: string) => [...text.matchAll(/\(min-width:\s*(\d+)px\)\s*and\s*\(min-height:\s*(\d+)px\)/g)].map(([, width, height]) => `${width}x${height}`);

describe("the desktop breakpoint", () => {
  it("is written the same way in every scene stylesheet as in the script", () => {
    const [expected] = sizeConditions(DESKTOP_QUERY);
    expect(expected).toBe("1024x600");
    const sheets = folders.flatMap((folder) => readdirSync(folder).filter((name) => name.endsWith(".module.css")).map((name) => join(folder, name)));
    const found = sheets.flatMap((path) => sizeConditions(readFileSync(path, "utf8")).map((rule) => [path, rule]));
    expect(found.length).toBeGreaterThan(5);
    expect(found.filter(([, rule]) => rule !== expected)).toEqual([]);
  });
});
