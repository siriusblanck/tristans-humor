import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/{profile,avatars,avatar-urls,auth,characters,image-signature,sky}.ts",
        "src/lib/supabase/{client,config,server}.ts",
        "src/lib/owl-post/*.ts",
        "src/proxy.ts",
        "src/app/auth/{actions,callback/route}.ts",
        "src/app/profile/actions.ts",
        "src/app/_front-page/{actions,boot-script,return-to-owl}.ts",
      ],
      // Thin I/O adapters are exercised by the live checks in scripts/check-supabase.mjs.
      exclude: ["src/lib/owl-post/{gemini,generation-deps,repository}.ts"],
    },
  },
});
