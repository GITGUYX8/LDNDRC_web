const diagrams = [...document.querySelectorAll(".mermaid-diagram")];

if (diagrams.length) {
  function loadMermaid() {
    return Promise.resolve(window.mermaid);
  }

  function mount(diagram, index) {
    const source = diagram.dataset.mermaid || "";
    diagram.innerHTML = `
      <div class="diagram-toolbar" role="toolbar" aria-label="Diagram controls">
        <button type="button" data-diagram-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-diagram-reset aria-label="Reset diagram zoom">Fit</button>
        <button type="button" data-diagram-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" data-diagram-fullscreen aria-label="Open diagram fullscreen">⛶</button>
      </div>
      <div class="diagram-viewport" tabindex="0" aria-label="Interactive Mermaid diagram">
        <div class="diagram-canvas"></div>
      </div>`;
    const viewport = diagram.querySelector(".diagram-viewport");
    const canvas = diagram.querySelector(".diagram-canvas");
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    function transform() {
      canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }
    function reset() { scale = 1; panX = 0; panY = 0; transform(); }
    function zoom(amount) {
      scale = Math.max(.45, Math.min(3.5, scale + amount));
      transform();
    }
    diagram.querySelector('[data-diagram-zoom="in"]').onclick = () => zoom(.2);
    diagram.querySelector('[data-diagram-zoom="out"]').onclick = () => zoom(-.2);
    diagram.querySelector("[data-diagram-reset]").onclick = reset;
    diagram.querySelector("[data-diagram-fullscreen]").onclick = async () => {
      if (document.fullscreenEnabled && diagram.requestFullscreen) {
        await diagram.requestFullscreen().catch(() => diagram.classList.toggle("theater"));
      } else diagram.classList.toggle("theater");
      reset();
    };
    viewport.addEventListener("wheel", (event) => { event.preventDefault(); zoom(event.deltaY < 0 ? .12 : -.12); }, { passive: false });
    viewport.addEventListener("pointerdown", (event) => {
      dragging = true; viewport.setPointerCapture(event.pointerId);
      startX = event.clientX; startY = event.clientY; startPanX = panX; startPanY = panY;
      viewport.classList.add("dragging");
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      panX = startPanX + event.clientX - startX;
      panY = startPanY + event.clientY - startY;
      transform();
    });
    viewport.addEventListener("pointerup", () => { dragging = false; viewport.classList.remove("dragging"); });
    viewport.addEventListener("pointercancel", () => { dragging = false; viewport.classList.remove("dragging"); });

    loadMermaid().then((mermaid) => {
      if (!mermaid) throw new Error("Mermaid browser bundle did not load");
      mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base", themeVariables: {
        background: "#1d2021", primaryColor: "#3c3836", primaryTextColor: "#fbf1c7",
        primaryBorderColor: "#fabd2f", lineColor: "#b8bb26", secondaryColor: "#32302f",
        tertiaryColor: "#282828", fontFamily: "JetBrains Mono, monospace"
      }});
      return mermaid.render(`ldndrc-diagram-${Date.now()}-${index}`, source);
    }).then(({ svg }) => {
      canvas.innerHTML = svg;
      diagram.classList.add("diagram-ready");
    }).catch((error) => {
      canvas.innerHTML = `<pre class="diagram-error">Mermaid could not render this diagram.\n${String(error)}</pre>`;
    });
  }
  diagrams.forEach(mount);
}
