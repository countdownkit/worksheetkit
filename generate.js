/*
 * Static generator for the printable math-worksheet site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families:
 *   /<type>-worksheets/   one printable worksheet per math skill (from data/worksheets.json)
 *   /                     homepage
 *
 * The artifact IS the page: each page server-renders a real worksheet of
 * generated problems, plus a hidden answer key, printed via the browser (or
 * saved as PDF from the print dialog). Print CSS strips everything but the sheet.
 *
 * Reproducible builds: problems come from a SEEDED PRNG (in assets/gen.js),
 * seeded from the page slug, so every build emits byte-identical HTML — no git
 * churn. The client "New problems" button reseeds at random. Answers are
 * COMPUTED in the shared module, never faked.
 */
const fs = require("fs");
const path = require("path");
const GEN = require("./assets/gen.js");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://worksheets.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Worksheet Maker";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "worksheets.json"), "utf8"));
const TYPES = DATA.types;
const DEFAULT_COUNT = 20;
const COUNT_OPTS = [15, 20, 25, 30];

const defaultLevel = t => t.levels.find(l => l.default) || t.levels[0];

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, body }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head no-print"><div class="wrap">
  <a class="brand" href="${BASE}/">✏️ ${SITE}</a>
  <nav class="nav"><a href="${BASE}/#operations">Operations</a><a href="${BASE}/#tables">Times tables</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs no-print"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1 class="no-print">${h1}</h1>
  ${body}
</main>
<footer class="site-foot no-print"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/#operations">Operations</a><a href="${BASE}/#tables">Times tables</a>
  <span>· ${SITE} — free printable math worksheets with answer keys. No downloads, no signups: generate and print. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>.</span>
</div></footer>
<script src="${BASE}/gen.js"></script>
<script src="${BASE}/tool.js" defer></script>
</body>
</html>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}

// ---- controls -----------------------------------------------------------
function controls(t) {
  const levelSel = `<div><label for="lv">Difficulty / range</label><select id="lv" data-ctl="level">${
    t.levels.map(l => `<option value="${l.value}"${l.default ? " selected" : ""}>${l.label}</option>`).join("")
  }</select></div>`;
  const countSel = `<div><label for="n">Problems</label><select id="n" data-ctl="count">${
    COUNT_OPTS.map(c => `<option value="${c}"${c === DEFAULT_COUNT ? " selected" : ""}>${c}</option>`).join("")
  }</select></div>`;
  return `<div class="controls no-print">
    <div class="row">
      ${levelSel}
      ${countSel}
      <div><label for="k">Answer key</label><select id="k" data-ctl="key"><option value="0" selected>Hide</option><option value="1">Show</option></select></div>
    </div>
    <div class="ctl-foot">
      <button type="button" class="print-btn" data-ctl="print">🖨️ Print worksheet</button>
      <button type="button" class="ghost-btn" data-ctl="new">🎲 New problems</button>
      <span class="hint">Tip: "New problems" makes a fresh set. "Save as PDF" is a destination in the print dialog.</span>
    </div>
  </div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

// ---- worksheet page -----------------------------------------------------
function worksheetPage(t, related) {
  const lv = defaultLevel(t);
  // Seed from the slug => reproducible across builds (byte-identical output).
  const problems = GEN.buildProblems({ op: t.op, level: lv, count: DEFAULT_COUNT, seed: t.slug });
  const cfgJson = JSON.stringify({ op: t.op, slug: t.slug, levels: t.levels });

  const sheet = `<div class="ws-wrap" data-seed="${t.slug}">
    <script type="application/json" data-cfg>${cfgJson}</script>
    <div class="paper" data-paper>
      <div class="ws-head">
        <h2 class="ws-title">${t.title}</h2>
        <div class="ws-meta"><span>Name: <span class="fill"></span></span><span>Date: <span class="fill"></span></span><span>Score: <span class="fill short"></span></span></div>
      </div>
      <div data-grid>${GEN.renderProblems(problems)}</div>
    </div>
    <div class="paper answer-key" data-key hidden>
      <h2 class="ws-title">Answer Key — ${t.title}</h2>
      <div data-keygrid>${GEN.renderKey(problems)}</div>
    </div>
  </div>`;

  const title = `${t.title} — Free Printable with Answer Key (PDF)`;
  const body = `${controls(t)}
  ${sheet}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose no-print">
    <p>${t.blurb}</p>
    <p><b>Grade / skill:</b> ${t.skill}</p>
    <p><b>To print:</b> choose a difficulty and problem count above, then hit Print. <b>To save a PDF instead:</b> pick "Save as PDF" as the printer in the print dialog — nothing to install. <b>Answer key:</b> set it to "Show" to check work; in print it starts on its own page. Everything except the worksheet is stripped from the printout.</p>
  </div>
  <h2 class="no-print">More worksheets</h2>
  <div class="no-print">${grid(related)}</div>
  <div class="ad-slot no-print">Advertisement</div>`;
  writePage(`/${t.slug}/`, layout({ title, desc: t.desc, urlPath: `/${t.slug}/`, h1: t.title, body }));
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

const typeLink = t => ({ href: `/${t.slug}/`, emoji: t.emoji, label: t.title });

for (const t of TYPES) {
  const related = TYPES.filter(o => o.slug !== t.slug).map(typeLink);
  worksheetPage(t, related);
}

// -- homepage --
{
  const title = `Free Printable Math Worksheets with Answer Keys (PDF)`;
  const desc = `Free printable math worksheets — addition, subtraction, multiplication, division, mixed operations and times tables. Set the range and count, show the answer key, then print or save as a PDF. No signup.`;
  const body = `<p class="lead">Pick a skill, set the number range and how many problems you want, then print — or save as a PDF from the print dialog. Every worksheet comes with a matching answer key. No downloads, no account, nothing to install.</p>
  <h2 id="operations">The four operations</h2>
  ${grid(TYPES.filter(t => t.op !== "times").map(typeLink))}
  <h2 id="tables">Times tables</h2>
  ${grid(TYPES.filter(t => t.op === "times").map(typeLink))}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose"><p>These are working worksheets, not static template downloads: the problems you see on each page are the ones that print, and the answers are computed — never faked. Change the difficulty or count and the sheet regenerates instantly; hit "New problems" for a fresh set every time you need one. The print stylesheet strips the site chrome so only the worksheet lands on paper, and the answer key prints on its own page.</p></div>`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Free Printable Math Worksheets`, body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "worksheets.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
