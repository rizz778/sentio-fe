import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  assetsInclude: ["**/*.lottie"],
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "src/assets/gif/*.lottie", // Copy .lottie files from src/assets/gif
          dest: "assets/gif", // Place them in dist/assets/gif
        },
      ],
    }),
  ],
  esbuild: {
    jsxInject: `import 'regenerator-runtime/runtime'`,
  },
});

