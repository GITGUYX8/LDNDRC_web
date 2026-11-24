#!/usr/bin/env node
/**
 * Build the LDNDRC docs map.
 *
 *   content/graph.json   topic registry: domains, goals, topics, prerequisites
 *   content/topics/*.md  one lesson per topic
 *   src/{index.html,theme.css,app.js}
 *
 * Outputs a fully static site in dist/ that works from file:// — no server,
 * no runtime dependencies, no fetch() (which file:// blocks).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import hljs from "highlight.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = process.env.LDNDRC_SOURCE_ROOT
  ? path.resolve(process.env.LDNDRC_SOURCE_ROOT)
  : path.join(root, "sources");
const dist = path.join(root, "dist");

const GRAPH = JSON.parse(fs.readFileSync(path.join(root, "content/graph.json"), "utf8"));
const TOPICS_DIR = path.join(root, "content/topics");

/* ------------------------------------------------------------------ utils */

const W = 224;
const H = 76;
const X_GAP = 262;
const Y_GAP = 98;

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function write(file, body) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, body);
}
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function librarySlug(file) {
  return file.replace(/\.md$/, "").replace(/\//g, "--");
}
function humanBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

/* ------------------------------------------------------------- graph prep */

const domains = GRAPH.domains;
const domainById = Object.fromEntries(domains.map((d, i) => [d.id, { ...d, index: i }]));
const topicById = Object.fromEntries(GRAPH.topics.map((t) => [t.id, t]));
const goalById = Object.fromEntries(GRAPH.goals.map((g) => [g.id, g]));
const linkableById = { ...topicById, ...goalById };

// validate the graph before doing anything expensive
let graphErrors = 0;
for (const t of GRAPH.topics) {
  if (!domainById[t.domain]) {
    console.error(`  ! ${t.id}: unknown domain "${t.domain}"`);
    graphErrors++;
  }
  for (const r of t.requires || []) {
    if (!topicById[r]) {
      console.error(`  ! ${t.id}: unknown prerequisite "${r}"`);
      graphErrors++;
    }
  }
  const md = path.join(TOPICS_DIR, t.id + ".md");
  if (!fs.existsSync(md)) {
    console.error(`  ! ${t.id}: missing content/topics/${t.id}.md`);
    graphErrors++;
  }
}
for (const g of GRAPH.goals) {
  for (const r of g.requires || []) {
    if (!topicById[r]) {
      console.error(`  ! goal ${g.id}: unknown prerequisite "${r}"`);
      graphErrors++;
    }
  }
}
if (graphErrors) {
  console.error(`\n${graphErrors} graph error(s) — refusing to build.\n`);
  process.exit(1);
}

// longest-path rank; guarantees prerequisites sort before dependents
for (const t of GRAPH.topics) t.rank = 0;
for (let pass = 0; pass <= GRAPH.topics.length; pass++) {
  let changed = false;
  for (const t of GRAPH.topics) {
    const wants = (t.requires || []).reduce(
      (m, r) => Math.max(m, (topicById[r].rank ?? 0) + 1),
      0
    );
    if ((t.rank ?? 0) < wants) {
      t.rank = wants;
      changed = true;
    }
  }
  if (!changed) break;
  if (pass === GRAPH.topics.length) {
    console.error("  ! prerequisite cycle detected in graph.json");
    process.exit(1);
  }
}

const maxRank = Math.max(...GRAPH.topics.map((t) => t.rank ?? 0));

// layout: one column per rank, nodes centred vertically per column
const columns = new Map();
for (const t of GRAPH.topics) {
  if (!columns.has(t.rank)) columns.set(t.rank, []);
  columns.get(t.rank).push(t);
}
for (const [, list] of columns) {
  list.sort((a, b) => {
    const da = domainById[a.domain].index;
    const db = domainById[b.domain].index;
    if (da !== db) return da - db;
    if (!!a.spine !== !!b.spine) return a.spine ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
const tallest = Math.max(...[...columns.values()].map((l) => l.length));
const totalHeight = (tallest - 1) * Y_GAP;
for (const [rank, list] of columns) {
  const colHeight = (list.length - 1) * Y_GAP;
  const offset = (totalHeight - colHeight) / 2;
  list.forEach((t, i) => {
    t.x = rank * X_GAP;
    t.y = Math.round(offset + i * Y_GAP);
    t.w = W;
    t.h = H;
  });
}

// goals get their own final column, ordered by how much they need
GRAPH.goals.sort((a, b) => a.requires.length - b.requires.length);
GRAPH.goals.forEach((g, i) => {
  g.x = (maxRank + 1) * X_GAP;
  g.y = Math.round((i - (GRAPH.goals.length - 1) / 2) * (Y_GAP + 16) + totalHeight / 2);
  g.w = W;
  g.h = H;
  g.rank = maxRank + 1;
  g.status = "designed";
  g.minutes = 0;
  g.spine = false;
});

console.log(`  graph: ${GRAPH.topics.length} topics, ${GRAPH.goals.length} goals, ${domains.length} domains, ranks 0..${maxRank}`);

/* ----------------------------------------------------------- markdown */

const marked = new Marked({ gfm: true, breaks: false });

const renderer = {
  code(token) {
    const lang = (token.lang || "").trim().split(/\s+/)[0];
    if (lang === "mermaid") {
      return `<div class="mermaid-diagram" data-mermaid="${escapeHtml(token.text)}">` +
        `<pre><code class="language-mermaid">${escapeHtml(token.text)}</code></pre></div>`;
    }
    const terminal = ["bash", "sh", "shell", "console", "text", "txt", ""].includes(lang);
    let html;
    if (lang && hljs.getLanguage(lang)) {
      html = hljs.highlight(token.text, { language: lang }).value;
    } else {
      html = escapeHtml(token.text);
    }
    return (
      `<div class="code${terminal ? " term" : ""}" data-lang="${escapeHtml(lang)}">` +
      `<span class="lang-tag">${escapeHtml(lang || "text")}</span>` +
      `<button class="copy" data-copy aria-label="Copy code"><svg aria-hidden="true"><use href="#i-copy"/></svg></button>` +
      `<pre><code class="hljs${lang ? " language-" + escapeHtml(lang) : ""}">${html}</code></pre></div>`
    );
  },
  heading(token) {
    const id = slugify(token.text);
    const inner = this.parser.parseInline(token.tokens);
    return `<h${token.depth} id="${id}">${inner}</h${token.depth}>`;
  },
  link(token) {
    const href = token.href || "";
    const inner = this.parser.parseInline(token.tokens);
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    const external = /^https?:/i.test(href);
    return `<a href="${escapeHtml(href)}"${title}${external ? ' target="_blank" rel="noreferrer"' : ""}>${inner}</a>`;
  },
};

marked.use({ renderer });

/** Turn [[topic-id]] into a real link, but never inside <pre>. */
function expandWikiLinks(html, linkFor) {
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/g);
  return parts
    .map((chunk) => {
      if (chunk.startsWith("<pre")) return chunk;
      return chunk.replace(/\[\[([a-z0-9-]+)\]\]/g, (m, id) => {
        const t = linkableById[id];
        if (!t) return m;
        return `<a href="${linkFor(id)}" class="topic-link">${escapeHtml(t.title)}</a>`;
      });
    })
    .join("");
}

function renderTopicBody(id, { mode }) {
  const file = path.join(TOPICS_DIR, id + ".md");
  let md = fs.readFileSync(file, "utf8");
  // drop an H1 if the author included one — the sheet supplies the title
  md = md.replace(/^#\s+.*\n+/, "");
  let html = marked.parse(md);
  html = expandWikiLinks(html, (tid) =>
    goalById[tid]
      ? (mode === "page" ? `../index.html#/route/${tid}` : `#/route/${tid}`)
      : (mode === "page" ? `${tid}.html` : `#/${tid}`)
  );
  return html.trim();
}

/* ------------------------------------------------------------ source links */

function rawSlug(file) {
  return "raw-" + slugify(file);
}

/** Every source reference must resolve to a page that exists in dist/. */
function sourceHref(src, mode) {
  const prefix = mode === "page" ? "../" : "";
  if (src.endsWith("/")) return `${prefix}library/index.html`;
  if (src.endsWith(".md")) return `${prefix}library/${librarySlug(src.replace(/\.md$/, ""))}.html`;
  return `${prefix}library/${rawSlug(src)}.html`;
}

function sourceLinks(t, { mode }) {
  return (t.sources || []).map((src) => ({
    label: src,
    href: sourceHref(src, mode),
  }));
}

/* --------------------------------------------------------------- html shell */

const SPRITE = fs
  .readFileSync(path.join(root, "src/index.html"), "utf8")
  .match(/<svg width="0"[\s\S]*?<\/svg>/)[0];

function head({ title, description, cssHref, extra = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description || "")}">
<link rel="stylesheet" href="${cssHref}">
<script type="module" src="${cssHref.replace("theme.css", "mermaid-viewer.js")}"></script>
${extra}
</head>`;
}

function docPage({ title, description, body, cssHref }) {
  return `${head({ title, description, cssHref })}
<body class="standalone">
${SPRITE}
<div class="page-doc">
  <a class="back" href="../index.html#/">← back to the map</a>
  ${body}
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------- build */

console.log("  cleaning dist/");
rm(dist);
mkdir(dist);

// 1. assets
console.log("  copying assets");
mkdir(path.join(dist, "assets"));
// Inline the woff2 files so @font-face also works when dist/index.html is
// opened from file://, where Chromium blocks cross-origin font fetches.
let themeSrc = fs.readFileSync(path.join(root, "src/theme.css"), "utf8");
themeSrc = themeSrc.replace(/url\("\.\/fonts\/([^"]+)"\)/g, (m, name) => {
  const file = path.join(root, "assets/fonts", name);
  if (!fs.existsSync(file)) return m;
  return `url("data:font/woff2;base64,${fs.readFileSync(file).toString("base64")}")`;
});
fs.writeFileSync(path.join(dist, "assets/theme.css"), themeSrc);
fs.copyFileSync(path.join(root, "src/app.js"), path.join(dist, "assets/app.js"));
fs.copyFileSync(path.join(root, "src/mermaid-viewer.js"), path.join(dist, "assets/mermaid-viewer.js"));
mkdir(path.join(dist, "assets/vendor"));
fs.copyFileSync(
  path.join(root, "node_modules/mermaid/dist/mermaid.esm.min.mjs"),
  path.join(dist, "assets/vendor/mermaid.esm.min.mjs")
);
mkdir(path.join(dist, "assets/fonts"));
for (const f of fs.readdirSync(path.join(root, "assets/fonts"))) {
  fs.copyFileSync(
    path.join(root, "assets/fonts", f),
    path.join(dist, "assets/fonts", f)
  );
}

// 2. graph data
console.log("  writing data/graph.js");
const graphOut = {
  site: GRAPH.site,
  domains,
  goals: GRAPH.goals,
  topics: GRAPH.topics.map((t) => ({
    ...t,
    sourceLinks: sourceLinks(t, { mode: "sheet" }),
  })),
};
write(
  path.join(dist, "data/graph.js"),
  "window.__LDNDRC_GRAPH = " + JSON.stringify(graphOut, null, 0) + ";\n"
);

// 3. lesson payloads, grouped by domain (script injection, file:// safe)
console.log("  rendering topic lessons");
const pagesByDomain = new Map();
for (const t of GRAPH.topics) {
  const html = renderTopicBody(t.id, { mode: "sheet" });
  if (!pagesByDomain.has(t.domain)) pagesByDomain.set(t.domain, {});
  pagesByDomain.get(t.domain)[t.id] = html;
}
for (const [domain, pages] of pagesByDomain) {
  write(
    path.join(dist, "data/pages", domain + ".js"),
    "window.__LDNDRC_PAGES = Object.assign(window.__LDNDRC_PAGES || {}, " +
      JSON.stringify(pages) +
      ");\n"
  );
  const bytes = fs.statSync(path.join(dist, "data/pages", domain + ".js")).size;
  console.log(`    ${domain.padEnd(12)} ${Object.keys(pages).length} lessons, ${humanBytes(bytes)}`);
}

// 4. standalone topic pages
console.log("  writing standalone topic pages");
for (const t of GRAPH.topics) {
  const dom = domainById[t.domain];
  const body = renderTopicBody(t.id, { mode: "page" });
  const verify = t.verify
    ? `<div class="verify"><div class="verify-head"><svg aria-hidden="true"><use href="#i-check"/></svg> Verify</div>
<div class="code term"><pre><code class="hljs">${escapeHtml(t.verify)}</code></pre></div></div>`
    : "";
  const sources = `<div class="source-list"><span class="eyebrow">Sources</span>${(t.sources || [])
    .map((s) => `<a href="${sourceHref(s, "page")}">${escapeHtml(s)}</a>`)
    .join("")}</div>`;
  const html = docPage({
    title: `${t.title} — LDNDRC`,
    description: t.summary,
    cssHref: "../assets/theme.css",
    body: `<div class="meta" style="display:flex;gap:10px;align-items:center;font-family:var(--font-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-faint);margin-bottom:12px">
      <span style="color:${dom.color}">${escapeHtml(dom.name)}</span>
      <span class="chip ${t.status}">${t.status}</span>
      <span>${t.minutes || 3} min</span>
    </div>
    <h1 class="page-title">${escapeHtml(t.title)}</h1>
    <p style="color:var(--text-soft);font-size:1.05rem;line-height:1.55;margin:0 0 18px">${escapeHtml(t.summary || "")}</p>
    <div class="prose">${body}</div>
    ${verify}${sources}`,
  });
  write(path.join(dist, "d", t.id + ".html"), html);
}

// 5. library (raw markdown, rendered)
console.log("  rendering library");
const RAW_FILES = [];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "docs-site", "vendor", ".venv"]);
function walk(dir, base = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) walk(full, rel);
    else if (entry.name.endsWith(".md")) RAW_FILES.push(rel);
  }
}
walk(repo);

const LIB_GROUPS = [
  { name: "Start", match: (f) => ["README.md", "CONTRIBUTING.md", "ldndrc-workshop-design.md", "plan.md"].includes(f) },
  { name: "Docs", match: (f) => f.startsWith("docs/") },
  { name: "Build checkpoints", match: (f) => f.startsWith("local_dev_docs/checkpoint-") },
  { name: "Reports & reference", match: (f) => f.startsWith("local_dev_docs/") },
  { name: "Other", match: () => true },
];

function groupFor(file) {
  for (const g of LIB_GROUPS) if (g.match(file)) return g.name;
  return "Other";
}

function firstHeading(md, fallback) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

const libIndex = [];
for (const file of RAW_FILES) {
  const raw = fs.readFileSync(path.join(repo, file), "utf8");
  const slug = librarySlug(file);
  const title = firstHeading(raw, file);
  libIndex.push({ file, slug, title, group: groupFor(file), bytes: Buffer.byteLength(raw) });

  // The page shell supplies the document title; avoid rendering the source H1 twice.
  const libraryMarkdown = raw.replace(/^#\s+.*\n+/, "");
  let html = marked.parse(libraryMarkdown);
  // relative .md links → library pages
  html = html.replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (m, p, hash) => {
    const clean = p.replace(/^\.\//, "");
    return `href="${librarySlug(clean)}.html${hash || ""}"`;
  });
  html = expandWikiLinks(html, (tid) => "../d/" + tid + ".html");

  write(
    path.join(dist, "library", slug + ".html"),
    docPage({
      title: `${title} — LDNDRC library`,
      description: `Source document: ${file}`,
      cssHref: "../assets/theme.css",
      body: `<div class="eyebrow" style="margin-bottom:10px">source document · ${escapeHtml(file)} · ${humanBytes(libIndex[libIndex.length - 1].bytes)}</div>
<h1 class="page-title">${escapeHtml(title)}</h1>
<div class="prose">${html}</div>`,
    })
  );
}

// 5b. non-markdown sources (scripts, workflow YAML) — shown verbatim, never rewritten
const RAW_SOURCES = new Set();
for (const t of GRAPH.topics) {
  for (const s of t.sources || []) {
    if (!s.endsWith("/") && !s.endsWith(".md")) RAW_SOURCES.add(s);
  }
}
let rawCount = 0;
for (const src of RAW_SOURCES) {
  const full = path.join(repo, src);
  if (!fs.existsSync(full)) {
    console.warn(`  ! source not found, skipping: ${src}`);
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  const bytes = Buffer.byteLength(text);
  write(
    path.join(dist, "library", rawSlug(src) + ".html"),
    docPage({
      title: `${src} — LDNDRC library`,
      description: `Source file: ${src}`,
      cssHref: "../assets/theme.css",
      body: `<div class="eyebrow" style="margin-bottom:10px">source file · ${escapeHtml(src)} · ${humanBytes(bytes)}</div>
<h1 class="page-title">${escapeHtml(src)}</h1>
<p style="color:var(--text-soft);max-width:62ch;line-height:1.6">Shown verbatim from the repository. This is evidence, not documentation.</p>
<div class="code term"><pre><code class="hljs">${escapeHtml(text)}</code></pre></div>`,
    })
  );
  rawCount++;
}
if (rawCount) console.log(`    ${rawCount} raw source files`);

const grouped = new Map();
for (const item of libIndex) {
  if (!grouped.has(item.group)) grouped.set(item.group, []);
  grouped.get(item.group).push(item);
}
const order = ["Start", "Docs", "Build checkpoints", "Reports & reference", "Other"];
const libBody = order
  .filter((g) => grouped.has(g))
  .map((g) => {
    const items = grouped
      .get(g)
      .sort((a, b) => a.file.localeCompare(b.file))
      .map(
        (it) =>
          `<a class="lib-item" href="${it.slug}.html"><span class="li-title">${escapeHtml(it.title)}</span><span class="li-path">${escapeHtml(it.file)}</span></a>`
      )
      .join("");
    return `<section class="lib-group"><h2>${escapeHtml(g)} · ${grouped.get(g).length}</h2>${items}</section>`;
  })
  .join("");

write(
  path.join(dist, "library/index.html"),
  docPage({
    title: "Library — LDNDRC",
    description: "Every source document, rendered.",
    cssHref: "../assets/theme.css",
    body: `<h1 class="page-title">Library</h1>
<p style="color:var(--text-soft);max-width:62ch;line-height:1.6">The raw documents the map was distilled from. The map is the guided path; this is the archive. Nothing here has been rewritten.</p>
${libBody}`,
  })
);

console.log(`    ${libIndex.length} source documents`);

// 6. index.html
console.log("  writing index.html");
let index = fs.readFileSync(path.join(root, "src/index.html"), "utf8");
// keep the sprite, point at dist paths
write(path.join(dist, "index.html"), index);

// 7. manifest for the server / humans
const manifest = {
  built: new Date().toISOString(),
  topics: GRAPH.topics.length,
  goals: GRAPH.goals.length,
  lessons: Object.fromEntries([...pagesByDomain].map(([d, p]) => [d, Object.keys(p).length])),
  library: libIndex.length,
};
write(path.join(dist, "build.json"), JSON.stringify(manifest, null, 2) + "\n");

// 8. tiny static server (file:// works too, but a server avoids CORS surprises)
write(
  path.join(root, "serve.mjs"),
  `#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/markdown; charset=utf-8" };
const port = Number(process.env.PORT || 8090);

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/favicon.ico") { res.writeHead(204).end(); return; }
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, path.normalize(p).replace(/^(\\.\\.[\\/\\\\])+/, ""));
  if (!file.startsWith(root)) { res.writeHead(403).end("forbidden"); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("not found: " + p); return; }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log("LDNDRC docs → http://127.0.0.1:" + port + "/"));
`
);

function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}
console.log(`\n  dist ready — ${humanBytes(dirSize(dist))}`);
console.log("  open dist/index.html or: npm run serve\n");
