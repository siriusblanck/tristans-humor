import { defineConfig } from "vitest/config";
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
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/{profile,avatars,auth}.ts", "src/lib/supabase/*.ts", "src/proxy.ts", "src/app/auth/{actions,callback/route}.ts", "src/app/profile/actions.ts"],
    },
  },
});
