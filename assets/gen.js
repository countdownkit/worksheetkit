/*
 * Shared worksheet logic — used by BOTH generate.js (Node, server render) and
 * tool.js (browser, re-render on control change) so server + client output match.
 * UMD-ish: attaches to module.exports under Node, window.GEN in the browser.
 *
 * A SEEDED PRNG (mulberry32) drives problem generation, seeded from the page
 * slug so `node generate.js` produces the SAME worksheet on every build (no git
 * churn). The client "New problems" button reseeds from a fresh random string.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GEN = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // ---- seeded PRNG -------------------------------------------------------
  // Hash a string to a 32-bit seed, then mulberry32 for a fast, stable stream.
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedStr) { return mulberry32(hashSeed(String(seedStr))); }
  function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

  // ---- problem generation ------------------------------------------------
  // opts: { op, level, count, seed }
  //   op    "+" | "-" | "×" | "÷" | "mixed" | "times"
  //   level params object from data/worksheets.json (min/max, aMin.., table, ...)
  //   count number of problems
  //   seed  string (page slug on the server; random on "New problems")
  // Returns [{ a, b, op, answer }]  — answers are COMPUTED, never faked.
  function buildProblems(opts) {
    const rng = makeRng(opts.seed);
    const lv = opts.level || {};
    const count = opts.count || 20;
    const out = [];
    for (let i = 0; i < count; i++) out.push(oneProblem(opts.op, lv, rng, i));
    return out;
  }

  function oneProblem(op, lv, rng, i) {
    if (op === "mixed") op = ["+", "-", "×"][randInt(rng, 0, 2)];

    if (op === "+") {
      const a = randInt(rng, lv.min, lv.max), b = randInt(rng, lv.min, lv.max);
      return { a, b, op: "+", answer: a + b };
    }
    if (op === "-") {
      let a = randInt(rng, lv.min, lv.max), b = randInt(rng, lv.min, lv.max);
      if (b > a) { const t = a; a = b; b = t; }   // keep the result non-negative
      return { a, b, op: "−", answer: a - b };
    }
    if (op === "×") {
      const aMin = lv.aMin != null ? lv.aMin : lv.min;
      const aMax = lv.aMax != null ? lv.aMax : lv.max;
      const bMin = lv.bMin != null ? lv.bMin : aMin;
      const bMax = lv.bMax != null ? lv.bMax : aMax;
      const a = randInt(rng, aMin, aMax), b = randInt(rng, bMin, bMax);
      return { a, b, op: "×", answer: a * b };
    }
    if (op === "÷") {
      const b = randInt(rng, lv.bMin, lv.bMax);                 // divisor (>= 1)
      const q = randInt(rng, lv.qMin, lv.qMax);                 // quotient
      const a = b * q;                                          // exact, no remainder
      return { a, b, op: "÷", answer: q };
    }
    if (op === "times") {
      const t = lv.table ? lv.table : randInt(rng, 1, 12);      // 0/undefined => mixed tables
      const b = lv.table ? (i % 12) + 1 : randInt(rng, 1, 12);  // fixed table walks 1..12
      return { a: t, b, op: "×", answer: t * b };
    }
    // fallback: simple addition
    const a = randInt(rng, 0, 20), b = randInt(rng, 0, 20);
    return { a, b, op: "+", answer: a + b };
  }

  // ---- rendering ---------------------------------------------------------
  function renderProblems(problems) {
    return `<ol class="problems">` + problems.map(p =>
      `<li><span class="expr">${p.a} ${p.op} ${p.b} =</span><span class="blank"></span></li>`
    ).join("") + `</ol>`;
  }
  function renderKey(problems) {
    return `<ol class="key-list">` + problems.map(p =>
      `<li><span class="expr">${p.a} ${p.op} ${p.b} =</span> <b>${p.answer}</b></li>`
    ).join("") + `</ol>`;
  }

  return { hashSeed, mulberry32, makeRng, randInt, buildProblems, renderProblems, renderKey };
});
