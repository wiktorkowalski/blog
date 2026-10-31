# blog.wiktorkowalski.pl

Astro static blog, hosted on Cloudflare Workers (static assets).

## Writing a post

1. Create a folder `src/content/blog/<slug>/` with an `index.md`:

   ```md
   ---
   title: "My post"
   description: "One line used in the list, RSS and link previews"
   date: 2026-10-30
   tags: [aws, dotnet]
   draft: true
   ---

   ## First section

   ![Screenshot](./screenshot.png)
   ```

2. Put images next to `index.md` and link them with `./file.png`. That works in the VS Code preview, on GitHub and in the build (Astro optimizes them).
3. `npm run dev` → http://localhost:4321 with hot reload. Drafts are visible in dev only.
4. Push a branch / open a PR → Cloudflare builds a preview URL. Remove `draft: true` and merge to `master` to publish.

The URL is `/<slug>/`. Use `##` for sections (the title is the page's `#`). A link preview image is generated for every post automatically.

## Commands

| Command | |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` | build to `dist/` |
| `npm run check` | type/content checks (also run in CI) |
| `npm run format` | prettier |

## Other bits

- `public/_redirects` keeps the old `/posts/<slug>` links working (301).
- `/posts.json` is read by wiktorkowalski.pl at build time to show the latest posts.
- `src/consts.ts` holds the site title, nav and social links.
