/* LDNDRC concept map — pan/zoom SVG map, route builder, sheet reader. */
(function () {
  "use strict";

  var G = window.__LDNDRC_GRAPH || { topics: [], goals: [], domains: [] };
  var SVGNS = "http://www.w3.org/2000/svg";

  var byId = Object.create(null);
  var domById = Object.create(null);
  G.domains.forEach(function (d, i) { d.index = i; domById[d.id] = d; });
  G.topics.forEach(function (t) { t.goal = false; byId[t.id] = t; });
  G.goals.forEach(function (g) { g.goal = true; g.domain = "direction"; byId[g.id] = g; });

  var W = 224, H = 76;          // structured (route-mode) tile size from the build
  var R = 22, GOAL_R = 28;      // scatter-mode circle radii

  /* ---------- state ---------- */

  var done = new Set();
  try {
    var raw = localStorage.getItem("ldndrc.docs.done");
    if (raw) JSON.parse(raw).forEach(function (id) { done.add(id); });
  } catch (e) {}

  var state = {
    route: null,        // { goalId, ids: [] }
    topic: null,
    domain: null,       // legend filter
    mode: "scatter",    // "scatter" | "route"
    z: { k: 1, tx: 0, ty: 0 },
    fit: { k: 1, tx: 0, ty: 0 },
    moved: false
  };

  /* ---------- scatter layout (deterministic per build) ---------- */

  function hash32(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Scatter: each domain owns one angular sector; ranks radiate outward inside
   * it with seeded jitter. The structured column layout is kept as rx/ry for
   * route mode. Circle centres everywhere.
   */
  function computeLayouts() {
    var all = G.topics.concat(G.goals);
    all.forEach(function (t) {
      t.rx = t.x + W / 2;
      t.ry = t.y + H / 2;
    });

    var maxRank = 0;
    var byRank = new Map();
    G.topics.forEach(function (t) {
      maxRank = Math.max(maxRank, t.rank || 0);
      var rank = t.rank || 0;
      if (!byRank.has(rank)) byRank.set(rank, []);
      byRank.get(rank).push(t);
    });
    var gap = 176, rowGap = 142;
    for (var rank = 0; rank <= maxRank; rank++) {
      var list = byRank.get(rank) || [];
      list.sort(function (a, b) {
        var pa = (a.requires || []).reduce(function (n, id) { return n + (byId[id] && byId[id].sx || 0); }, 0);
        var pb = (b.requires || []).reduce(function (n, id) { return n + (byId[id] && byId[id].sx || 0); }, 0);
        return pa - pb || (domById[a.domain].index - domById[b.domain].index) || a.id.localeCompare(b.id);
      });
      var start = -((list.length - 1) * gap) / 2;
      list.forEach(function (t, i) {
        var rand = rng(hash32(t.id));
        t.sx = Math.round(start + i * gap + (rand() - 0.5) * 20);
        t.sy = Math.round(rank * rowGap + (rand() - 0.5) * 12);
      });
    }
    G.goals.forEach(function (g, i) {
      var start = -((G.goals.length - 1) * gap) / 2;
      g.sx = Math.round(start + i * gap);
      g.sy = (maxRank + 1) * rowGap;
    });
  }

  /** Current position of a node centre, depending on map mode. */
  function pos(t) {
    return state.mode === "route" ? { x: t.rx, y: t.ry } : { x: t.sx, y: t.sy };
  }

  function nodeRadius(t) {
    return t.goal ? GOAL_R : R;
  }

  /* ---------- elements ---------- */

  var stage = document.getElementById("stage");
  var svg = document.getElementById("map");
  var world = document.getElementById("world");
  var sheet = document.getElementById("sheet");
  var sheetHead = document.getElementById("sheet-head");
  var sheetBody = document.getElementById("sheet-body");
  var sheetFoot = document.getElementById("sheet-foot");
  var scrim = document.getElementById("scrim");
  var searchInput = document.getElementById("search-input");
  var paletteList = document.getElementById("palette-list");
  var routeBanner = document.getElementById("route-banner");
  var routeBannerText = document.getElementById("route-banner-text");

  /* ---------- svg helpers ---------- */

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function titleLines(text, max) {
    if (text.length <= max) return [text];
    var mid = Math.floor(text.length / 2);
    var best = -1;
    for (var i = 0; i < text.length; i++) {
      if (text[i] === " " && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    if (best < 0) return [text.slice(0, max - 1) + "…"];
    var a = text.slice(0, best);
    var b = text.slice(best + 1);
    if (b.length > max + 2) b = b.slice(0, max) + "…";
    return [a, b];
  }

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* ---------- render map ---------- */

  function edgePath(e) {
    var a = pos(e.from), b = pos(e.to);
    var r1 = nodeRadius(e.from), r2 = nodeRadius(e.to);
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var x1 = a.x + ux * (r1 + 3), y1 = a.y + uy * (r1 + 3);
    var x2 = b.x - ux * (r2 + 5), y2 = b.y - uy * (r2 + 5);
    // gentle perpendicular bow so the galaxy does not look like spokes
    var mid = (y1 + y2) / 2;
    return "M" + x1 + " " + y1 + " C" + x1 + " " + mid + ", " +
      x2 + " " + mid + ", " + x2 + " " + y2;
  }

  /** (Re)draw all edge paths for the current mode. */
  function redrawEdges() {
    var route = state.route;
    var order = null, posIdx = null;
    if (route && state.mode === "route") {
      order = route.ids.indexOf(route.goalId) === -1
        ? route.ids.concat([route.goalId])
        : route.ids.slice();
      posIdx = Object.create(null);
      order.forEach(function (id, i) { posIdx[id] = i; });
    }
    var frag = document.createDocumentFragment();
    state.edgeEls.forEach(function (o) {
      var active;
      if (posIdx) {
        var ia = posIdx[o.e.from.id], ib = posIdx[o.e.targetId];
        active = ia != null && ib != null && Math.abs(ib - ia) === 1;
      } else {
        active = true;
      }
      o.path.setAttribute("d", edgePath(o.e));
      o.path.classList.toggle("route", !!active && state.mode === "route");
      o.path.classList.toggle("edge-hidden", !active);
      if (active) frag.appendChild(o.path);
    });
    state.gEdges.innerHTML = "";
    state.gEdges.appendChild(frag);
    // let node movement land first, then fade the (re)drawn edges in
    state.gEdges.style.opacity = "0";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { state.gEdges.style.opacity = "1"; });
    });
  }

  function render() {
    var gEdges = el("g", { class: "edges" });
    var gNodes = el("g", { class: "nodes" });

    var edges = [];
    G.topics.forEach(function (t) {
      (t.requires || []).forEach(function (r) {
        var p = byId[r];
        if (p) edges.push({ from: p, to: t, targetId: t.id });
      });
    });
    G.goals.forEach(function (g) {
      (g.requires || []).forEach(function (r) {
        var p = byId[r];
        if (p) edges.push({ from: p, to: g, targetId: g.id, goal: true });
      });
    });

    var edgeEls = [];
    edges.forEach(function (e) {
      var path = el("path", { d: "", class: "edge", "data-from": e.from.id, "data-to": e.targetId });
      path.style.setProperty("--rt", (domById[e.to.domain] || {}).color || "#fabd2f");
      if (e.goal) path.setAttribute("stroke-dasharray", "2 6");
      edgeEls.push({ path: path, e: e });
    });

    var nodeEls = [];
    G.topics.concat(G.goals).forEach(function (t) {
      var dom = domById[t.domain] || { color: "#504945", name: "Topic" };
      var rad = nodeRadius(t);
      var g = el("g", {
        class: "node" + (t.goal ? " goal" : "") + " " + (t.status || ""),
        "data-id": t.id,
        tabindex: "0",
        role: "button",
        "aria-label": t.title + " — " + (t.goal ? "build a route" : (t.summary || ""))
      });
      g.style.setProperty("--dom", dom.color);

      g.appendChild(el("circle", { class: "tile-shadow", cx: 0, cy: 5, r: rad }));
      g.appendChild(el("circle", { class: "tile ring", r: rad }));
      g.appendChild(el("use", {
        class: "glyph", href: "#i-" + (t.glyph || "box"),
        x: -9, y: -9, width: 18, height: 18
      }));

      var check = el("text", {
        class: "check", x: rad - 4, y: rad - 2,
        fill: "#b8bb26", "font-size": "14", "font-weight": "700",
        "font-family": "JetBrains Mono, monospace"
      });
      check.textContent = "✓";
      g.appendChild(check);

      var lines = titleLines(t.title, 22);
      var l1 = el("text", { class: "label", y: rad + 17, "text-anchor": "middle" });
      l1.textContent = lines[0];
      g.appendChild(l1);
      if (lines[1]) {
        var l2 = el("text", { class: "label label-2", y: rad + 30, "text-anchor": "middle" });
        l2.textContent = lines[1];
        g.appendChild(l2);
      }

      g.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (t.goal) showRoute(t.id);
        else openTopic(t.id);
      });
      g.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          if (t.goal) showRoute(t.id);
          else openTopic(t.id);
        }
      });
      g.addEventListener("pointerenter", function () {
        if (drag) return;
        showHovercard(t);
      });
      g.addEventListener("pointerleave", scheduleHide);
      g.addEventListener("focus", function () { showHovercard(t); });
      g.addEventListener("blur", hideHovercard);

      gNodes.appendChild(g);
      nodeEls.push({ el: g, t: t });
    });

    var edgeFrag = document.createDocumentFragment();
    edgeEls.forEach(function (o) { edgeFrag.appendChild(o.path); });
    gEdges.appendChild(edgeFrag);
    world.innerHTML = "";
    world.appendChild(gEdges);
    world.appendChild(gNodes);
    state.gEdges = gEdges;
    state.edgeEls = edgeEls;
    state.nodeEls = new Map();
    nodeEls.forEach(function (n) { state.nodeEls.set(n.t.id, n.el); });

    applyPositions();
    applyDone();
    applyRoute();
    updateStatus();
  }

  /* ---------- pan / zoom ---------- */

  function bounds() {
    var all = G.topics.concat(G.goals);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    all.forEach(function (t) {
      var p = pos(t);
      var rad = nodeRadius(t);
      minX = Math.min(minX, p.x - rad);
      minY = Math.min(minY, p.y - rad);
      maxX = Math.max(maxX, p.x + rad);
      maxY = Math.max(maxY, p.y + rad + 34); // labels hang below
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  /** Place every node at its current-mode position (CSS transitions animate it). */
  function applyPositions() {
    (state.nodeEls || new Map()).forEach(function (elx, id) {
      var t = byId[id];
      var p = pos(t);
      elx.style.transform = "translate(" + p.x + "px," + p.y + "px)";
    });
  }

  /* ---------- hover card ---------- */

  var hovercard = document.getElementById("hovercard");
  var hoverHideTimer = null;

  function scheduleHide() {
    if (hoverHideTimer) clearTimeout(hoverHideTimer);
    hoverHideTimer = setTimeout(hideHovercard, 160);
  }
  function cancelHide() {
    if (hoverHideTimer) { clearTimeout(hoverHideTimer); hoverHideTimer = null; }
  }

  function showHovercard(t) {
    if (!hovercard) return;
    cancelHide();
    applyTrace(t.id);
    var dom = domById[t.domain] || { name: "", color: "#504945" };
    var status = t.status || "shipped";
    var routeBtn = '<button class="btn primary" data-hc-route>' +
      '<svg aria-hidden="true"><use href="#i-route"/></svg> Build route</button>';
    var openBtn = t.goal ? "" :
      '<button class="btn" data-hc-open>Open lesson</button>';
    hovercard.innerHTML =
      '<div class="hc-meta"><span class="hc-dom" style="color:' + dom.color + '">' + esc(dom.name) + "</span>" +
      '<span class="chip ' + status + '">' + status + "</span><span>" + (t.minutes || 3) + " min</span></div>" +
      "<h3>" + esc(t.title) + "</h3>" +
      (t.summary ? "<p>" + esc(t.summary) + "</p>" : "") +
      '<div class="hc-actions">' + openBtn + routeBtn + "</div>";
    hovercard.style.setProperty("--dom", dom.color);

    hovercard.hidden = false;
    hovercard.classList.add("show");

    var p = pos(t);
    var x = state.z.tx + p.x * state.z.k;
    var y = state.z.ty + p.y * state.z.k;
    var cardW = hovercard.offsetWidth || 250;
    var cardH = hovercard.offsetHeight || 150;
    var left = x - cardW / 2;
    var top = y - nodeRadius(t) * state.z.k - cardH - 10;
    if (top < 8) top = y + (nodeRadius(t) + 40) * state.z.k + 10;
    left = Math.max(8, Math.min(left, stage.clientWidth - cardW - 8));
    top = Math.max(8, Math.min(top, stage.clientHeight - cardH - 8));
    hovercard.style.left = left + "px";
    hovercard.style.top = top + "px";

    var ob = hovercard.querySelector("[data-hc-open]");
    if (ob) ob.addEventListener("click", function () { hideHovercard(); openTopic(t.id); });
    hovercard.querySelector("[data-hc-route]").addEventListener("click", function () {
      hideHovercard();
      showRoute(t.id);
    });
  }

  function hideHovercard() {
    if (!hovercard) return;
    cancelHide();
    clearTrace();
    hovercard.classList.remove("show");
    hovercard.hidden = true;
  }

  function traceIds(id) {
    var ids = new Set([id]);
    function walk(current) {
      var t = byId[current];
      (t && t.requires || []).forEach(function (parent) {
        if (!ids.has(parent) && byId[parent]) {
          ids.add(parent);
          walk(parent);
        }
      });
    }
    walk(id);
    return ids;
  }

  function applyTrace(id) {
    var ids = traceIds(id);
    state.traceId = id;
    (state.nodeEls || new Map()).forEach(function (node, nodeId) {
      node.classList.toggle("trace", ids.has(nodeId));
      node.classList.toggle("trace-focus", nodeId === id);
      node.classList.toggle("ghost", !ids.has(nodeId));
    });
    (state.edgeEls || []).forEach(function (edge) {
      var on = ids.has(edge.e.from.id) && ids.has(edge.e.targetId);
      edge.path.classList.toggle("trace-edge", on);
      edge.path.classList.toggle("ghost-edge", !on);
    });
  }

  function clearTrace() {
    state.traceId = null;
    (state.nodeEls || new Map()).forEach(function (node) {
      node.classList.remove("trace", "trace-focus", "ghost");
    });
    (state.edgeEls || []).forEach(function (edge) {
      edge.path.classList.remove("trace-edge", "ghost-edge");
    });
  }

  if (hovercard) {
    hovercard.addEventListener("pointerenter", cancelHide);
    hovercard.addEventListener("pointerleave", scheduleHide);
  }

  function applyTransform() {
    world.setAttribute("transform", "translate(" + state.z.tx + "," + state.z.ty + ") scale(" + state.z.k + ")");
  }

  function fit(animate) {
    var b = bounds();
    var pad = 90;
    var vw = stage.clientWidth, vh = stage.clientHeight;
    var bw = b.maxX - b.minX + pad * 2;
    var bh = b.maxY - b.minY + pad * 2;
    var k = Math.min(vw / bw, vh / bh, 1.15);
    k = Math.max(0.2, k);
    state.fit = {
      k: k,
      tx: vw / 2 - ((b.minX + b.maxX) / 2) * k,
      ty: vh / 2 - ((b.minY + b.maxY) / 2) * k
    };
    state.z = { k: state.fit.k, tx: state.fit.tx, ty: state.fit.ty };
    if (animate) {
      world.style.transition = "transform .45s cubic-bezier(.16,1,.3,1)";
      applyTransform();
      setTimeout(function () { world.style.transition = ""; }, 480);
    } else {
      applyTransform();
    }
  }

  function animateTo(z) {
    state.z = z;
    world.style.transition = "transform .45s cubic-bezier(.16,1,.3,1)";
    applyTransform();
    setTimeout(function () { world.style.transition = ""; }, 480);
  }

  function visibleWidth() {
    var sheetW = 0;
    if (window.innerWidth > 720 && sheet.classList.contains("open")) {
      sheetW = Math.min(560, window.innerWidth - 24) + 12;
    }
    return Math.max(320, stage.clientWidth - sheetW);
  }

  /** Frame a set of node ids in the part of the stage that is not under the sheet. */
  function frameIds(ids) {
    if (!ids.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var t = byId[id];
      if (!t) return;
      var p = pos(t);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y + 34);
    });
    var pad = 90;
    var vw = visibleWidth(), vh = stage.clientHeight;
    var bw = maxX - minX + pad * 2;
    var bh = maxY - minY + pad * 2;
    var k = Math.max(0.28, Math.min(vw / bw, vh / bh, 1.2));
    animateTo({
      k: k,
      tx: vw / 2 - ((minX + maxX) / 2) * k,
      ty: vh / 2 - ((minY + maxY) / 2) * k
    });
  }

  function frameRoute() {
    if (!state.route) return;
    var ids = state.route.ids.concat([state.route.goalId]);
    if (ids.length > 5) {
      var minX = Infinity, maxX = -Infinity;
      ids.forEach(function (id) {
        var t = byId[id];
        if (!t) return;
        var p = pos(t);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      });
      var k = visibleWidth() / (maxX - minX + 180);
      // a 13-step route would zoom out past readability; show its destination instead
      if (k < 0.6) ids = ids.slice(-4);
    }
    frameIds(ids);
  }

  function zoomAt(factor, mx, my) {
    var k = state.z.k;
    var k2 = Math.max(0.18, Math.min(2.6, k * factor));
    state.z.tx = mx - (mx - state.z.tx) * (k2 / k);
    state.z.ty = my - (my - state.z.ty) * (k2 / k);
    state.z.k = k2;
    applyTransform();
  }

  svg.addEventListener("wheel", function (e) {
    e.preventDefault();
    hideHovercard();
    var r = stage.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  var drag = null;
  svg.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    hideHovercard();
    if (e.target.closest && e.target.closest(".node")) return;
    drag = { x: e.clientX, y: e.clientY, tx: state.z.tx, ty: state.z.ty, moved: false };
    svg.classList.add("dragging");
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    state.z.tx = drag.tx + dx;
    state.z.ty = drag.ty + dy;
    applyTransform();
  });
  svg.addEventListener("pointerup", function (e) {
    if (!drag) return;
    svg.classList.remove("dragging");
    if (!drag.moved) closeSheet();
    drag = null;
  });
  svg.addEventListener("pointercancel", function () { drag = null; svg.classList.remove("dragging"); });

  document.getElementById("zoom-in").addEventListener("click", function () {
    zoomAt(1.25, stage.clientWidth / 2, stage.clientHeight / 2);
  });
  document.getElementById("zoom-out").addEventListener("click", function () {
    zoomAt(0.8, stage.clientWidth / 2, stage.clientHeight / 2);
  });
  document.getElementById("fit").addEventListener("click", function () { fit(true); });

  window.addEventListener("resize", function () {
    if (state.route) { frameRoute(); return; }
    // keep scale, re-centre only if the user has not zoomed away from the fit
    if (Math.abs(state.z.k - state.fit.k) < 0.001) fit(false);
  });

  /* ---------- pages ---------- */

  var pageCache = Object.create(null);
  function loadDomain(domain) {
    if (pageCache[domain]) return pageCache[domain];
    pageCache[domain] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "data/pages/" + domain + ".js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return pageCache[domain];
  }

  function pageFor(id) {
    var t = byId[id];
    if (!t) return Promise.resolve("<p>Missing topic.</p>");
    return loadDomain(t.domain).then(function () {
      var pages = window.__LDNDRC_PAGES || {};
      return pages[id] || "<p>Lesson body not built yet.</p>";
    }).catch(function () {
      return "<p>Could not load this lesson.</p>";
    });
  }

  /* ---------- routing ---------- */

  function ancestors(id, acc) {
    var t = byId[id];
    if (!t) return acc;
    (t.requires || []).forEach(function (r) {
      if (!acc.has(r) && byId[r]) {
        acc.add(r);
        ancestors(r, acc);
      }
    });
    return acc;
  }

  function routeFor(targetId) {
    var t = byId[targetId];
    if (!t) return [];
    var set = new Set();
    (t.requires || []).forEach(function (r) {
      if (byId[r]) { set.add(r); ancestors(r, set); }
    });
    if (!t.goal) set.add(targetId);
    var ids = Array.from(set);
    ids.sort(function (a, b) {
      var A = byId[a], B = byId[b];
      var ra = A.rank || 0, rb = B.rank || 0;
      if (ra !== rb) return ra - rb;
      var da = (domById[A.domain] || {}).index || 0;
      var db = (domById[B.domain] || {}).index || 0;
      if (da !== db) return da - db;
      return (A.y || 0) - (B.y || 0);
    });
    return ids;
  }

  function routeMinutes(ids) {
    return ids.reduce(function (n, id) { return n + (byId[id].minutes || 3); }, 0);
  }

  function applyRoute() {
    var route = state.route;
    var order = route
      ? (route.ids.indexOf(route.goalId) === -1 ? route.ids.concat([route.goalId]) : route.ids.slice())
      : null;
    var set = order ? new Set(order) : null;
    var orderPos = null;
    if (order) {
      orderPos = Object.create(null);
      order.forEach(function (id, i) { orderPos[id] = i; });
    }
    state.mode = route ? "route" : "scatter";
    if (route) layoutRoute(order);
    svg.classList.toggle("route-mode", !!route);

    (state.nodeEls || new Map()).forEach(function (elx, id) {
      var inRoute = !!(set && set.has(id));
      elx.classList.toggle("route", inRoute);
      elx.classList.toggle("dim", !!(set && !inRoute));
      elx.classList.toggle("hidden", !!(set && !inRoute));
    });
    applyPositions();
    redrawEdges();

    if (route) {
      var goal = byId[route.goalId];
      routeBanner.hidden = false;
      routeBannerText.innerHTML = "Route to <b>" + esc(goal ? goal.title : route.goalId) + "</b> · " +
        route.ids.length + " steps";
    } else {
      routeBanner.hidden = true;
    }
  }

  function layoutRoute(order) {
    var levels = Object.create(null);
    order.forEach(function (id) {
      var t = byId[id];
      var rank = t && t.rank || 0;
      (levels[rank] || (levels[rank] = [])).push(t);
    });
    Object.keys(levels).forEach(function (rank) {
      var list = levels[rank];
      list.sort(function (a, b) { return (a.y || 0) - (b.y || 0); });
      var gap = 155;
      var start = -((list.length - 1) * gap) / 2;
      list.forEach(function (t, i) {
        t.rx = start + i * gap;
        t.ry = Number(rank) * 135;
      });
    });
  }

  function showRoute(targetId, push) {
    var ids = routeFor(targetId);
    if (!ids.length) return;
    hideHovercard();
    state.route = { goalId: targetId, ids: ids };
    applyRoute();
    renderRouteSheet();
    frameRoute();
    if (push !== false) setHash("#/route/" + targetId);
  }

  function clearRoute() {
    state.route = null;
    applyRoute();
    closeSheet();
    fit(true);
    setHash("#/");
  }

  function nextReadingId(id) {
    var ordered = G.topics.slice().sort(function (a, b) {
      return (a.rank || 0) - (b.rank || 0) || (a.y || 0) - (b.y || 0);
    });
    var index = ordered.findIndex(function (t) { return t.id === id; });
    for (var i = index + 1; i < ordered.length; i++) {
      if (!done.has(ordered[i].id)) return ordered[i].id;
    }
    return ordered[index + 1] ? ordered[index + 1].id : null;
  }

  function previousReadingId(id) {
    var ordered = G.topics.slice().sort(function (a, b) {
      return (a.rank || 0) - (b.rank || 0) || (a.y || 0) - (b.y || 0);
    });
    var index = ordered.findIndex(function (t) { return t.id === id; });
    for (var i = index - 1; i >= 0; i--) {
      if (!done.has(ordered[i].id)) return ordered[i].id;
    }
    return ordered[index - 1] ? ordered[index - 1].id : null;
  }

  function goNext(id) {
    if (state.route) {
      var i = state.route.ids.indexOf(id);
      var next = i >= 0 ? state.route.ids[i + 1] : null;
      if (next) {
        openTopic(next);
        return;
      }
      state.route.ids.forEach(function (step) { done.add(step); });
      try { localStorage.setItem("ldndrc.docs.done", JSON.stringify(Array.from(done))); } catch (e) {}
      state.route = null;
      applyDone();
      applyRoute();
      closeSheet();
      setHash("#/");
      return;
    }
    var nextId = nextReadingId(id);
    if (nextId) openTopic(nextId);
  }

  function goPrev(id) {
    var ordered = state.route ? state.route.ids : G.topics.slice().sort(function (a, b) {
      return (a.rank || 0) - (b.rank || 0) || (a.y || 0) - (b.y || 0);
    }).map(function (t) { return t.id; });
    var i = ordered.indexOf(id);
    if (i > 0) openTopic(ordered[i - 1]);
  }

  document.getElementById("route-banner-clear").addEventListener("click", clearRoute);

  /* ---------- sheet ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openSheet(domId) {
    var d = domById[domId];
    sheet.style.setProperty("--dom", d ? d.color : "#fabd2f");
    sheet.classList.add("open");
    document.body.classList.add("sheet-open");
    sheet.setAttribute("aria-hidden", "false");
    sheetBody.scrollTop = 0;
    updateStatus();
  }

  function closeSheet() {
    var wasOpen = sheet.classList.contains("open");
    state.topic = null;
    sheet.classList.remove("open");
    document.body.classList.remove("sheet-open");
    sheet.setAttribute("aria-hidden", "true");
    sheetFoot.hidden = true;
    if (location.hash.indexOf("#/route/") !== 0) setHash("#/", true);
    if (wasOpen && !state.route) fit(true);
    updateStatus();
  }

  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  function toggleSheetMax() {
    sheet.classList.toggle("maximized");
    var expanded = sheet.classList.contains("maximized");
    document.querySelectorAll(".sheet-expand").forEach(function (button) {
      button.textContent = expanded ? "›" : (button.classList.contains("sheet-expand-left") ? "‹" : "›");
      button.setAttribute("aria-label", expanded ? "Restore document panel" : "Expand document panel");
      button.setAttribute("title", expanded ? "Restore document panel" : "Expand document panel");
    });
    if (state.route) frameRoute();
    else if (state.topic) frameIds([state.topic].concat((byId[state.topic] || {}).requires || []));
  }
  document.getElementById("sheet-expand-left").addEventListener("click", toggleSheetMax);
  document.getElementById("sheet-expand-right").addEventListener("click", toggleSheetMax);

  function metaLine(t) {
    var dom = domById[t.domain] || { name: "Topic" };
    var status = t.status || "shipped";
    return '<span class="dom">' + esc(dom.name) + "</span>" +
      '<span class="chip ' + status + '">' + status + "</span>" +
      "<span>" + (t.minutes || 3) + " min</span>" +
      (t.spine ? "<span>core</span>" : "");
  }

  function renderRouteSheet() {
    var route = state.route;
    if (!route) return;
    var goal = byId[route.goalId];
    var head = '<div class="meta"><span class="dom">Route</span><span>' +
      route.ids.length + " steps</span><span>~" + routeMinutes(route.ids) + " min</span></div>" +
      "<h1 id=\"sheet-title\">Route to " + esc(goal ? goal.title : "this topic") + "</h1>" +
      '<p class="lede">' + esc(goal && goal.blurb ? goal.blurb : (goal ? goal.summary : "")) + "</p>";

    var finished = route.ids.filter(function (id) { return done.has(id); }).length;
    var list = route.ids.map(function (id, i) {
      var t = byId[id];
      var dom = domById[t.domain] || { name: "" };
      return '<li class="' + (done.has(id) ? "done" : "") + (i === 0 && !done.has(id) ? " current" : "") +
        '" data-id="' + id + '">' +
        '<span><span class="r-title">' + esc(t.title) + "</span><br>" +
        '<span class="r-dom">' + esc(dom.name) + "</span></span>" +
        '<span class="r-min">' + (t.minutes || 3) + "m</span></li>";
    }).join("");

    sheetHead.innerHTML = head;
    sheetBody.innerHTML = '<div class="route-summary"><span><b>' + finished + "</b> already read</span>" +
      "<span><b>" + (route.ids.length - finished) + "</b> to go</span></div>" +
      '<ol class="route-list" id="route-list">' + list + "</ol>" +
      '<p style="color:var(--text-faint);font-size:.82rem;line-height:1.5;margin-top:16px">' +
      "Each step assumes the one before it. Finished lessons are marked with a check.</p>";

    sheetFoot.hidden = false;
    sheetFoot.innerHTML = '<button class="btn primary" id="start-route">' +
      '<svg aria-hidden="true"><use href="#i-play"/></svg> Start route</button>' +
      '<button class="btn" id="clear-route-foot">Clear</button>';

    document.getElementById("start-route").addEventListener("click", function () {
      var next = route.ids.filter(function (id) { return !done.has(id); })[0] || route.ids[0];
      openTopic(next);
    });
    document.getElementById("clear-route-foot").addEventListener("click", clearRoute);

    sheetBody.querySelectorAll("#route-list li").forEach(function (li) {
      li.addEventListener("click", function () { openTopic(li.getAttribute("data-id")); });
    });

    openSheet(goal ? goal.domain : "direction");
  }

  function openTopic(id, opts) {
    var t = byId[id];
    if (!t) return;
    if (t.goal) { showRoute(id); return; }
    hideHovercard();
    state.topic = id;

    var dom = domById[t.domain] || { name: "Topic" };
    sheetHead.innerHTML = '<div class="meta">' + metaLine(t) + "</div>" +
      '<h1 id="sheet-title">' + esc(t.title) + "</h1>" +
      '<p class="lede">' + esc(t.summary || "") + "</p>";
    sheetBody.innerHTML = '<div class="prose" id="lesson"><p style="color:var(--text-faint)">Loading…</p></div>';
    sheetFoot.hidden = true;
    openSheet(t.domain);

    // keep the thing you just opened on screen, next to the sheet
    if (state.route) frameRoute();
    else frameIds([id].concat(t.requires || []));

    if (!opts || opts.push !== false) {
      if (state.route) setHash("#/route/" + state.route.goalId + "/" + id);
      else setHash("#/" + id);
    }

    pageFor(id).then(function (html) {
      var lesson = document.getElementById("lesson");
      if (!lesson) return;
      var cta = "";
       if (!state.route) {
        cta = '<div class="route-cta"><span class="eyebrow">Build a route</span>' +
          "<p>See every concept you need before this one, in order.</p>" +
          '<button class="btn" id="route-to-here"><svg aria-hidden="true"><use href="#i-route"/></svg>' +
          " Route to here</button></div>";
      }
      var verify = "";
      if (t.verify) {
        verify = '<div class="verify"><div class="verify-head">' +
          '<svg aria-hidden="true"><use href="#i-check"/></svg> Verify</div>' +
          '<div class="code term"><button class="copy" data-copy aria-label="Copy command">' +
          '<svg aria-hidden="true"><use href="#i-copy"/></svg></button>' +
          "<pre><code class=\"hljs\">" + esc(t.verify) + "</code></pre></div></div>";
      }
      var sources = "";
      if (t.sourceLinks && t.sourceLinks.length) {
        sources = '<div class="source-list"><span class="eyebrow">Sources</span>' +
          t.sourceLinks.map(function (s) {
            return '<a href="' + s.href + '"><svg width="12" height="12" aria-hidden="true"><use href="#i-book"/></svg>' +
              esc(s.label) + "</a>";
          }).join("") + "</div>";
      }

      lesson.innerHTML = cta + html + verify + sources;
      bindCopyButtons(lesson);
      var btn = document.getElementById("route-to-here");
      if (btn) btn.addEventListener("click", function () { showRoute(id); });

      // footer: step context or mark-done
      var stepNote = "";
      if (state.route) {
        var i = state.route.ids.indexOf(id);
        if (i >= 0) {
          var nextId = state.route.ids[i + 1];
          stepNote = "<span class=\"step-note\">Step <b>" + (i + 1) + "</b> of " +
            state.route.ids.length + (nextId ? " · up next: <b>" + esc(byId[nextId].title) + "</b>" : " · final step") +
            "</span>";
        }
      }
      sheetFoot.hidden = false;
       var routeIndex = state.route ? state.route.ids.indexOf(id) : -1;
    var previousId = routeIndex > 0 ? state.route.ids[routeIndex - 1] : (!state.route ? previousReadingId(id) : null);
       sheetFoot.innerHTML = (stepNote || '<span class="step-note"></span>') +
        '<button class="btn icon previous-btn" id="previous-topic" title="Previous chapter" aria-label="Previous chapter"' +
        (previousId ? "" : ' disabled aria-disabled="true"') + '><svg aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-arrow"/></svg></button>' +
        '<button class="btn ' + (done.has(id) ? "" : "primary") + '" id="mark-done">' +
        '<svg aria-hidden="true"><use href="#i-check"/></svg>' +
         (done.has(id) ? " Done" : " Mark as read") + "</button>" +
        '<button class="btn icon next-btn" id="next-topic" title="Next chapter" aria-label="Next chapter">' +
        '<svg aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
        '<a class="btn icon" href="d/' + id + '.html" title="Open as a full page" aria-label="Open as a full page">' +
        '<svg aria-hidden="true"><use href="#i-fit"/></svg></a>';

       document.getElementById("mark-done").addEventListener("click", function () { toggleDone(id); });
       document.getElementById("previous-topic").addEventListener("click", function () { if (previousId) goPrev(id); });
      document.getElementById("next-topic").addEventListener("click", function () { goNext(id); });
    });
  }

  /* ---------- done ---------- */

  function applyDone() {
    (state.nodeEls || new Map()).forEach(function (elx, id) {
      elx.classList.toggle("done", done.has(id));
    });
    updateStatus();
  }

  function toggleDone(id) {
    if (done.has(id)) done.delete(id);
    else done.add(id);
    try { localStorage.setItem("ldndrc.docs.done", JSON.stringify(Array.from(done))); } catch (e) {}
    applyDone();
    if (state.topic === id) openTopic(id, { push: false });
  }

  /* ---------- domain legend ---------- */

  var legendEl = document.getElementById("legend");

  function applyDomain() {
    var d = state.domain;
    (state.nodeEls || new Map()).forEach(function (elx, id) {
      var t = byId[id];
      elx.classList.toggle("faded", !!(d && t && t.domain !== d && !t.goal));
    });
    (state.edgeEls || []).forEach(function (o) {
      var on = !d || o.e.from.domain === d || o.e.to.domain === d;
      o.path.classList.toggle("faded", !on);
    });
    if (legendEl) {
      legendEl.querySelectorAll("[data-dom]").forEach(function (b) {
        b.classList.toggle("on", (b.getAttribute("data-dom") || null) === d);
      });
    }
  }

  function renderLegend() {
    if (!legendEl) return;
    var counts = Object.create(null);
    G.topics.forEach(function (t) { counts[t.domain] = (counts[t.domain] || 0) + 1; });
    var html = '<span class="legend-title">domains</span>';
    html += '<button class="legend-item all" data-dom="">All</button>';
    G.domains.forEach(function (dom) {
      if (!counts[dom.id]) return;
      html += '<button class="legend-item" data-dom="' + dom.id + '" style="--dom:' + dom.color + '">' +
        '<span class="dot"></span>' + esc(dom.name) + '<b>' + counts[dom.id] + "</b></button>";
    });
    legendEl.innerHTML = html;
    legendEl.querySelectorAll("[data-dom]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-dom") || null;
        state.domain = state.domain === id ? null : id;
        applyDomain();
        updateStatus();
      });
    });
    applyDomain();
  }

  function updateStatus() {
    var total = G.topics.length;
    var n = 0;
    G.topics.forEach(function (t) { if (done.has(t.id)) n++; });
    var pct = total ? Math.round((n / total) * 100) : 0;
    var pt = document.getElementById("status-progress-text");
    var pb = document.getElementById("status-progress");
    var st = document.getElementById("status-total");
    if (pt) pt.innerHTML = "<b>" + n + "</b>/" + total + " read";
    if (pb) pb.style.width = pct + "%";
    if (st) st.textContent = total;
    var sd = document.getElementById("status-domain");
    if (sd) {
      var dom = state.topic ? domById[(byId[state.topic] || {}).domain]
        : (state.domain ? domById[state.domain] : null);
      sd.textContent = dom ? dom.name.toLowerCase() : (state.route ? "route" : "map");
    }
  }

  /* ---------- copy buttons ---------- */

  function bindCopyButtons(root) {
    root.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var code = btn.parentElement.querySelector("code");
        var text = code ? code.textContent : "";
        var finish = function () {
          btn.classList.add("copied");
          setTimeout(function () { btn.classList.remove("copied"); }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(finish, finish);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta);
          finish();
        }
      });
    });
  }

  /* ---------- search ---------- */

  var paletteIndex = 0;
  var paletteResults = [];

  function openSearch() {
    scrim.classList.add("open");
    searchInput.value = "";
    searchInput.focus();
    renderPalette("");
  }
  function closeSearch() {
    scrim.classList.remove("open");
  }

  function renderPalette(q) {
    q = q.trim().toLowerCase();
    var items = G.topics.map(function (t) {
      var dom = domById[t.domain] || { name: "" };
      return { id: t.id, title: t.title, sub: dom.name + " · " + (t.status || ""), kind: "topic" };
    }).concat(G.goals.map(function (g) {
      return { id: g.id, title: g.title, sub: "route destination", kind: "goal" };
    }));

    if (q) {
      items = items.filter(function (it) {
        return (it.title + " " + it.sub).toLowerCase().indexOf(q) >= 0;
      });
    }
    paletteResults = items.slice(0, 40);
    paletteIndex = 0;
    if (!paletteResults.length) {
      paletteList.innerHTML = '<div class="palette-empty">Nothing matches “' + esc(q) + "”.</div>";
      return;
    }
    paletteList.innerHTML = paletteResults.map(function (it, i) {
      return '<button class="palette-item' + (i === 0 ? " active" : "") + '" data-i="' + i + '">' +
        '<span class="p-title">' + esc(it.title) + "</span>" +
        '<span class="p-sub">' + esc(it.sub) + "</span></button>";
    }).join("");
    paletteList.querySelectorAll(".palette-item").forEach(function (b) {
      b.addEventListener("click", function () { choosePalette(Number(b.getAttribute("data-i"))); });
    });
  }

  function choosePalette(i) {
    var it = paletteResults[i];
    if (!it) return;
    closeSearch();
    if (it.kind === "goal") showRoute(it.id);
    else openTopic(it.id);
  }

  function movePalette(dir) {
    if (!paletteResults.length) return;
    paletteIndex = (paletteIndex + dir + paletteResults.length) % paletteResults.length;
    paletteList.querySelectorAll(".palette-item").forEach(function (b, i) {
      b.classList.toggle("active", i === paletteIndex);
      if (i === paletteIndex) b.scrollIntoView({ block: "nearest" });
    });
  }

  searchInput.addEventListener("input", function () { renderPalette(searchInput.value); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
    else if (e.key === "Enter") { e.preventDefault(); choosePalette(paletteIndex); }
  });
  scrim.addEventListener("click", function (e) { if (e.target === scrim) closeSearch(); });
  document.getElementById("search-btn").addEventListener("click", openSearch);

  /* ---------- hash routing ---------- */

  function setHash(h, replace) {
    if (location.hash === h) return;
    if (replace && history.replaceState) history.replaceState(null, "", h);
    else location.hash = h;
  }

  function routeFromHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h || h === "/") { closeSheet(); return; }
    if (h.indexOf("/route/") === 0) {
      var parts = h.slice(7).split("/").filter(Boolean);
      var goal = parts[0];
      if (byId[goal]) {
        if (!state.route || state.route.goalId !== goal) showRoute(goal, false);
        else if (!parts[1]) renderRouteSheet();
        if (parts[1] && byId[parts[1]] && state.topic !== parts[1]) openTopic(parts[1], { push: false });
      }
      return;
    }
    if (h.indexOf("/") === 0) {
      var id = h.slice(1);
      if (byId[id] && !byId[id].goal && state.topic !== id) openTopic(id, { push: false });
    }
  }

  window.addEventListener("hashchange", routeFromHash);

  /* ---------- keys ---------- */

  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (scrim.classList.contains("open")) closeSearch(); else openSearch();
      return;
    }
    if (e.key === "Escape") {
      if (scrim.classList.contains("open")) closeSearch();
      else if (sheet.classList.contains("open")) closeSheet();
      return;
    }
    if (e.key === "/" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      openSearch();
    }
  });

  /* ---------- boot ---------- */

  var brand = document.getElementById("brand");
  var brandSub = brand && brand.querySelector(".brand-sub");

  if (brand && brandSub) {
    var fullName = "LOCAL DYNAMIC NODE DISCOVERY ROS CLUSTER";
    var defaultName = "CONCEPT MAP";
    var frame = 0;
    var glyphs = "░▒▓█#%&@01<>/\\\\";
    var decode = function (target) {
      if (frame) cancelAnimationFrame(frame);
      var started = performance.now();
      var run = function (now) {
        var progress = Math.min(1, (now - started) / 680);
        var locked = Math.floor(progress * target.length);
        var output = "";
        for (var i = 0; i < target.length; i++) {
          output += i < locked ? target[i] : glyphs[(i * 11 + Math.floor(now / 42)) % glyphs.length];
        }
        brandSub.textContent = output;
        if (progress < 1) frame = requestAnimationFrame(run);
        else brandSub.textContent = target;
      };
      frame = requestAnimationFrame(run);
    };
    brand.addEventListener("pointerenter", function () {
      decode(fullName);
      brand.classList.add("decoding");
    });
    brand.addEventListener("pointerleave", function () {
      decode(defaultName);
      brand.classList.remove("decoding");
    });
    brand.addEventListener("focus", function () {
      decode(fullName);
      brand.classList.add("decoding");
    });
    brand.addEventListener("blur", function () {
      decode(defaultName);
      brand.classList.remove("decoding");
    });
  }

  computeLayouts();
  render();
  fit(false);
  renderLegend();

  var hint = document.getElementById("hint");
  if (!localStorage.getItem("ldndrc.docs.seen")) {
    hint.classList.add("show");
    try { localStorage.setItem("ldndrc.docs.seen", "1"); } catch (e) {}
    setTimeout(function () { hint.classList.remove("show"); }, 5200);
  }

  routeFromHash();
})();
