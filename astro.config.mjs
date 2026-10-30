import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/consts";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "ignore",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark-dimmed", wrap: true },
  },
});
