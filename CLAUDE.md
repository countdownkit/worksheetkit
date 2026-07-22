# CLAUDE.md — worksheetkit

Project instructions for Claude Code working in this repo. Inherits the ElevatedProgress
venture playbook from the parent folder's CLAUDE.md.

## What this is

A zero-dependency static-site generator for **free printable math worksheets with answer
keys**. `generate.js` reads `data/worksheets.json` + `assets/` and writes one page per math
skill into `public/`. Target: https://worksheets.elevatedprogress.com/. One SEO page per
worksheet type (slugs match real searches): addition / subtraction / multiplication /
division / mixed-operations / times-tables worksheets, plus the homepage.

## The product rule

**The artifact IS the page.** Each page server-renders a real worksheet of generated
problems plus a hidden answer key; `assets/tool.js` only re-renders it (difficulty/range,
problem count, key show/hide) and calls `window.print()`. Print CSS strips everything with
`.no-print`; the answer key prints on its own page; "save as PDF" is just the print dialog.
Never turn this into a download/builder flow — instant-print is the differentiator.

Problem generation + rendering live in `assets/gen.js`, a UMD module required by BOTH
`generate.js` (server) and `tool.js` (browser) so their output matches exactly for a given
seed + params.

## Reproducible builds (important)

Problems come from a **seeded PRNG (mulberry32) in `gen.js`, seeded from the page slug**, so
`node generate.js` emits **byte-identical HTML every build** — no needless git churn. Never
use `Math.random` for the server-rendered default. The client-only **"New problems"** button
reseeds at random. **Answers are COMPUTED** in `gen.js` (built by construction — divisions
divide evenly, subtractions never go negative), never a hand-typed table.

## Deploy — just push

`git push` to `main` is the deploy — GitHub Actions (`.github/workflows/deploy.yml`).

- **Never manually build and commit output.** `public/` is git-ignored build output.
- **Never hand-edit anything in `public/`.**
- Commit as the neutral identity:
  `git -c user.name="worksheetkit" -c user.email="worksheetkit@users.noreply.github.com" commit …`

## Local build / preview

```
node generate.js     # writes ./public
node server.js       # preview at http://localhost:5067 (5060-5062 are Chrome-blocked ports)
```

## Page families

- `/<type>-worksheets/` — one worksheet per skill, from `data/worksheets.json`. Each type
  sets its `op` and a list of difficulty `levels` (operand ranges / table). Add a worksheet
  type by adding an entry to the JSON — no generator changes needed.
- `/` — homepage linking every type.

## Don't break these (generated, must keep serving)

- `ads.txt` + AdSense loader in `<head>` — publisher `ca-pub-5580575158570188`.
- GA4 `G-TJY4TRRKD6` (shared across all EP sites; hostname splits them).
- `sitemap.xml`, `robots.txt`, `.nojekyll`, `CNAME` (worksheets.elevatedprogress.com).
- GSC verification file once the property is verified.

## Config knobs

`DOMAIN` and `BASE`, same semantics as the other tools. Production values in the workflow.
Default problem count `DEFAULT_COUNT` and `COUNT_OPTS` live at the top of `generate.js`.
