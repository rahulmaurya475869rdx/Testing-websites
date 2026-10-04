/* =========================================================
   Sree Shiv Alankar Mandir — Jewellery Rate Calculator
   - Floating "Rate" button (draggable, resets to bottom-left)
   - Only appears on index.html (main page)
   - Fully controlled by admin via Firestore settings/rateCalculator
   ========================================================= */
(function setupRateCalculator() {
  'use strict';

  // Only on main page
  if (!document.getElementById("homePage")) return;

  /* ---------- Purity options per metal ---------- */
  const PURITY_OPTIONS = {
    gold: [
      { key: "gold24k", label: "24K (999) — Pure Gold" },
      { key: "gold22k", label: "22K (916) — Standard" },
      { key: "gold18k", label: "18K (750) — Diamond" },
      { key: "gold14k", label: "14K (585) — Light" }
    ],
    silver: [
      { key: "silver999", label: "999 — Pure Silver" },
      { key: "silver925", label: "925 — Sterling Silver" }
    ]
  };

  /* ---------- State ---------- */
  const state = {
    metal: "gold",
    purityKey: "gold22k",
    weight: 0,
    rates: {
      gold24k: 0, gold22k: 0, gold18k: 0, gold14k: 0,
      silver999: 0, silver925: 0,
      makingPercent: 0, gst: 3, hallmarkPerPiece: 0,
      enabled: true
    }
  };

  /* ---------- Floating Button ---------- */
  const fab = document.createElement("button");
  fab.type = "button";
  fab.id = "rcFab";
  fab.className = "rc-fab";
  fab.setAttribute("aria-label", "Open Rate Calculator");
  fab.innerHTML = '<span class="rc-fab-label">Rate</span>';

  /* ---------- Overlay ---------- */
  const overlay = document.createElement("div");
  overlay.id = "rcOverlay";
  overlay.className = "rc-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="rc-card" role="document">
      <div class="rc-header">
        <h2 class="rc-title">
          <span class="rc-title-icon">💎</span>
          <span>Jewellery Rate Calculator</span>
        </h2>
        <button type="button" class="rc-close" aria-label="Close calculator">✕</button>
      </div>

      <div class="rc-body">

        <div class="rc-notice">
          <span class="rc-notice-icon">⚠️</span>
          <p class="rc-notice-text">Please confirm the latest gold / silver rate with the shop owner before making any purchase. Precious metal rates change daily according to market conditions. This calculator provides an approximate value only.</p>
        </div>

        <div class="rc-metal-tabs" role="tablist">
          <button type="button" class="rc-metal-tab active" data-metal="gold" role="tab">
            <span class="rc-metal-icon">🥇</span> Gold
          </button>
          <button type="button" class="rc-metal-tab" data-metal="silver" role="tab">
            <span class="rc-metal-icon">🥈</span> Silver
          </button>
        </div>

        <label class="rc-field-label" for="rcPurity">Purity</label>
        <select id="rcPurity" class="rc-select"></select>

        <label class="rc-field-label" for="rcWeight">Weight (grams)</label>
        <input type="number" id="rcWeight" class="rc-input" placeholder="e.g. 5.5" min="0" step="0.01" inputmode="decimal">

        <div class="rc-breakdown">
          <div class="rc-row">
            <span class="rc-row-label">Metal rate (per gram)</span>
            <span class="rc-row-val" id="rcRate">₹ 0</span>
          </div>
          <div class="rc-row">
            <span class="rc-row-label">Metal value</span>
            <span class="rc-row-val" id="rcMetalValue">₹ 0</span>
          </div>
          <div class="rc-row">
            <span class="rc-row-label">Making charges (<span id="rcMakingPct">0</span>%)</span>
            <span class="rc-row-val" id="rcMaking">₹ 0</span>
          </div>
          <div class="rc-row rc-row-sub">
            <span class="rc-row-label">Subtotal</span>
            <span class="rc-row-val" id="rcSubtotal">₹ 0</span>
          </div>
          <div class="rc-row">
            <span class="rc-row-label">GST (<span id="rcGstPct">3</span>%)</span>
            <span class="rc-row-val" id="rcGst">₹ 0</span>
          </div>
          <div class="rc-row">
            <span class="rc-row-label">Hallmark charge</span>
            <span class="rc-row-val" id="rcHallmark">₹ 0</span>
          </div>
        </div>

        <div class="rc-total">
          <span class="rc-total-label">Estimated Total</span>
          <span class="rc-total-val" id="rcTotal">₹ 0</span>
        </div>

        <p class="rc-footnote" id="rcFootnote">Enter weight to see estimated value.</p>

      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(overlay);

  /* ---------- Refs ---------- */
  const puritySel = overlay.querySelector("#rcPurity");
  const weightInput = overlay.querySelector("#rcWeight");
  const closeBtn = overlay.querySelector(".rc-close");
  const metalTabs = overlay.querySelectorAll(".rc-metal-tab");

  const refs = {
    rate: overlay.querySelector("#rcRate"),
    metalValue: overlay.querySelector("#rcMetalValue"),
    makingPct: overlay.querySelector("#rcMakingPct"),
    making: overlay.querySelector("#rcMaking"),
    subtotal: overlay.querySelector("#rcSubtotal"),
    gstPct: overlay.querySelector("#rcGstPct"),
    gst: overlay.querySelector("#rcGst"),
    hallmark: overlay.querySelector("#rcHallmark"),
    total: overlay.querySelector("#rcTotal"),
    footnote: overlay.querySelector("#rcFootnote")
  };

  /* ---------- Format currency ---------- */
  function formatINR(n) {
    if (!isFinite(n) || n <= 0) return "₹ 0";
    return "₹ " + Math.round(n).toLocaleString("en-IN");
  }

  /* ---------- Render purity options ---------- */
  function renderPurityOptions() {
    const opts = PURITY_OPTIONS[state.metal] || [];
    puritySel.innerHTML = opts.map(o =>
      `<option value="${o.key}">${o.label}</option>`
    ).join("");
    const valid = opts.some(o => o.key === state.purityKey);
    if (!valid && opts.length) state.purityKey = opts[0].key;
    puritySel.value = state.purityKey;
  }

  /* ---------- Calculate ---------- */
  function calculate() {
    const rate = Number(state.rates[state.purityKey]) || 0;
    const weight = Number(state.weight) || 0;
    const makingPct = Number(state.rates.makingPercent) || 0;
    const gstPct = Number(state.rates.gst) || 0;
    const hallmark = Number(state.rates.hallmarkPerPiece) || 0;

    const metalValue = rate * weight;
    const making = metalValue * (makingPct / 100);
    const subtotal = metalValue + making;
    const gst = subtotal * (gstPct / 100);
    const hallmarkTotal = weight > 0 ? hallmark : 0;
    const total = subtotal + gst + hallmarkTotal;

    return { rate, weight, metalValue, making, subtotal, gst, hallmark: hallmarkTotal, total, makingPct, gstPct };
  }

  /* ---------- Update UI ---------- */
  function updateUI() {
    const r = calculate();
    refs.rate.textContent = formatINR(r.rate);
    refs.metalValue.textContent = formatINR(r.metalValue);
    refs.makingPct.textContent = r.makingPct;
    refs.making.textContent = formatINR(r.making);
    refs.subtotal.textContent = formatINR(r.subtotal);
    refs.gstPct.textContent = r.gstPct;
    refs.gst.textContent = formatINR(r.gst);
    refs.hallmark.textContent = formatINR(r.hallmark);
    refs.total.textContent = formatINR(r.total);

    if (r.weight > 0) {
      refs.footnote.textContent = "Approximate value only. Final price may vary based on design, stones and finish.";
    } else {
      refs.footnote.textContent = "Enter weight to see estimated value.";
    }
  }

  /* ---------- Load rates from Firestore ---------- */
  function loadRates() {
    db.collection("settings").doc("rateCalculator").onSnapshot((doc) => {
      const d = doc.exists ? doc.data() : {};
      state.rates = {
        gold24k: Number(d.gold24k) || 0,
        gold22k: Number(d.gold22k) || 0,
        gold18k: Number(d.gold18k) || 0,
        gold14k: Number(d.gold14k) || 0,
        silver999: Number(d.silver999) || 0,
        silver925: Number(d.silver925) || 0,
        makingPercent: Number(d.makingPercent) || 0,
        gst: d.gst != null ? Number(d.gst) : 3,
        hallmarkPerPiece: Number(d.hallmarkPerPiece) || 0,
        enabled: d.enabled !== false
      };
      if (!state.rates.enabled) {
        fab.style.display = "none";
        closeCalc();
      } else {
        fab.style.display = "";
      }
      updateUI();
    }, () => { updateUI(); });
  }

  /* ---------- Metal tabs ---------- */
  metalTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const m = tab.dataset.metal;
      if (m === state.metal) return;
      state.metal = m;
      metalTabs.forEach(t => t.classList.toggle("active", t.dataset.metal === m));
      renderPurityOptions();
      updateUI();
    });
  });

  puritySel.addEventListener("change", () => {
    state.purityKey = puritySel.value;
    updateUI();
  });

  weightInput.addEventListener("input", () => {
    const v = parseFloat(weightInput.value);
    state.weight = isFinite(v) && v >= 0 ? v : 0;
    updateUI();
  });

  /* ---------- Open / Close ---------- */
  function openCalc() {
    document.body.classList.add("rc-open");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    updateUI();
  }
  function closeCalc() {
    document.body.classList.remove("rc-open");
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  closeBtn.addEventListener("click", closeCalc);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCalc();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeCalc();
  });

  /* ---------- Draggable button ---------- */
  let dragging = false, moved = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function applyPos(x, y) {
    const margin = 6;
    const w = fab.offsetWidth || 62;
    const h = fab.offsetHeight || 62;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    const cx = Math.min(Math.max(x, margin), maxX);
    const cy = Math.min(Math.max(y, margin), maxY);
    fab.style.right = "auto";
    fab.style.bottom = "auto";
    fab.style.left = cx + "px";
    fab.style.top = cy + "px";
  }

  fab.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    const rect = fab.getBoundingClientRect();
    startLeft = rect.left; startTop = rect.top;
    try { fab.setPointerCapture(e.pointerId); } catch (err) {}
    fab.classList.add("rc-dragging");
  });

  fab.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
    if (moved) applyPos(startLeft + dx, startTop + dy);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove("rc-dragging");
    try { fab.releasePointerCapture(e.pointerId); } catch (err) {}
    // Position NOT saved — resets to bottom-left on reload
  }
  fab.addEventListener("pointerup", endDrag);
  fab.addEventListener("pointercancel", endDrag);

  fab.addEventListener("click", (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    if (overlay.classList.contains("open")) closeCalc();
    else openCalc();
  }, true);

  window.addEventListener("resize", () => {
    if (fab.style.left || fab.style.top) {
      const rect = fab.getBoundingClientRect();
      applyPos(rect.left, rect.top);
    }
  });

  /* ---------- Init ---------- */
  renderPurityOptions();
  loadRates();
  updateUI();
})();
