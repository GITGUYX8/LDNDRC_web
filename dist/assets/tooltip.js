/* Jargon hover previews for lesson and library prose. */
(function () {
  var glossary = window.__LDNDRC_GLOSSARY || {};
  var card = null;
  var activeTerm = null;
  var pinned = false;
  var hideTimer = 0;

  function getCard() {
    if (card) return card;
    card = document.createElement("div");
    card.className = "term-card";
    card.setAttribute("role", "tooltip");
    card.hidden = true;
    document.body.appendChild(card);
    return card;
  }

  function fill(entry) {
    var el = getCard();
    el.textContent = "";
    var head = document.createElement("div");
    head.className = "term-card-head";
    head.textContent = entry.title || "";
    var body = document.createElement("p");
    body.textContent = entry.summary || "";
    el.appendChild(head);
    el.appendChild(body);
    if (entry.example) {
      var pre = document.createElement("pre");
      pre.textContent = entry.example;
      el.appendChild(pre);
    }
  }

  function position(term) {
    var el = getCard();
    var rect = term.getBoundingClientRect();
    var margin = 12;
    var gap = 10;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    var left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
    var top = rect.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      var above = rect.top - gap - height;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
  }

  function show(term, pin) {
    var entry = glossary[term.getAttribute("data-term")];
    if (!entry) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    activeTerm = term;
    pinned = !!pin;
    fill(entry);
    card.hidden = false;
    position(term);
  }

  function hide(force) {
    if (pinned && !force) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    activeTerm = null;
    pinned = false;
    if (card) card.hidden = true;
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { hide(false); }, 90);
  }

  function termFrom(target) {
    return target && target.closest ? target.closest(".term") : null;
  }

  document.addEventListener("pointerover", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    var term = termFrom(e.target);
    if (term && term !== activeTerm) show(term, false);
  });

  document.addEventListener("pointerout", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    var term = termFrom(e.target);
    if (term && term === activeTerm && !pinned) scheduleHide();
  });

  document.addEventListener("focusin", function (e) {
    var term = termFrom(e.target);
    if (term) show(term, false);
  });

  document.addEventListener("focusout", function (e) {
    var term = termFrom(e.target);
    if (term && term === activeTerm) hide(true);
  });

  document.addEventListener("click", function (e) {
    var term = termFrom(e.target);
    if (term) {
      if (term === activeTerm && pinned) hide(true);
      else show(term, true);
    } else if (pinned) {
      hide(true);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide(true);
  });

  window.addEventListener("scroll", function () { hide(true); }, true);
  window.addEventListener("resize", function () { hide(true); });
})();
