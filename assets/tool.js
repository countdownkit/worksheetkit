// Worksheet controls: difficulty/range, problem count, answer-key toggle,
// "New problems", and print. The worksheet is server-rendered for SEO; this
// re-renders it (via the shared GEN module) whenever a control changes, so the
// client output matches the server for a given seed + params.
(function () {
  const wrap = document.querySelector(".ws-wrap");
  if (!wrap || !window.GEN) return;

  const cfg = JSON.parse(wrap.querySelector("[data-cfg]").textContent);
  const gridEl = wrap.querySelector("[data-grid]");
  const keyWrap = wrap.querySelector("[data-key]");
  const keyGrid = wrap.querySelector("[data-keygrid]");
  const ctl = name => document.querySelector(`[data-ctl=${name}]`);

  let seed = wrap.dataset.seed;            // page slug on first load => matches server HTML
  const levelByValue = v => cfg.levels.find(l => l.value === v) || cfg.levels[0];

  function currentLevel() {
    const sel = ctl("level");
    return sel ? levelByValue(sel.value) : cfg.levels[0];
  }
  function render() {
    const count = +ctl("count").value || 20;
    const problems = GEN.buildProblems({ op: cfg.op, level: currentLevel(), count, seed });
    gridEl.innerHTML = GEN.renderProblems(problems);
    keyGrid.innerHTML = GEN.renderKey(problems);
  }

  const levelCtl = ctl("level");
  if (levelCtl) levelCtl.addEventListener("change", render);
  ctl("count").addEventListener("change", render);
  ctl("key").addEventListener("change", e => { keyWrap.hidden = e.target.value !== "1"; });
  ctl("new").addEventListener("click", () => {
    seed = "r" + Date.now() + "-" + Math.floor(Math.random() * 1e9); // fresh random set
    render();
  });
  ctl("print").addEventListener("click", () => window.print());
})();
