/* =========================================================
   MBW Floating Menu
   Fixed positions — right side cluster. Drag allowed but not saved.
   orderBy removed — client-side sort
   ========================================================= */
(function setupFloatingMenu() {
  const buttonEls = {
    b1: document.getElementById("fmMainBtn1"),
    b2: document.getElementById("fmMainBtn2"),
    b3: document.getElementById("fmMainBtn3")
  };
  const overlay = document.getElementById("fmOverlay");
  const hub     = document.getElementById("fmCenterHub");
  const ring    = document.getElementById("fmOrbitRing");
  if (!overlay || !hub || !ring) return;
  if (!buttonEls.b1 && !buttonEls.b2 && !buttonEls.b3) return;

  let currentButton = "b1";
  let mainButtonsCfg = {
    b1: { enabled: true, name: "MBW",  icon: "", autoCategories: false },
    b2: { enabled: true, name: "Shop", icon: "", autoCategories: true  },
    b3: { enabled: true, name: "Menu", icon: "", autoCategories: false }
  };
  let allFloatingItems = [];
  let allCategories = [];
  let allBrands = [];
  let isOpen = false;
  let closeTimer = null;

  try {
    localStorage.removeItem("mbw_mainbtn_b1_pos");
    localStorage.removeItem("mbw_mainbtn_b2_pos");
    localStorage.removeItem("mbw_mainbtn_b3_pos");
  } catch (e) {}

  function escapeHtmlSimple(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function mainBtnFontSize(text) {
    const trimmed = String(text || "").trim();
    const len = trimmed.length;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (words >= 3) {
      if (len <= 12) return "0.66rem";
      if (len <= 16) return "0.58rem";
      if (len <= 20) return "0.52rem";
      return "0.46rem";
    }
    if (words === 2) {
      if (len <= 6)  return "0.86rem";
      if (len <= 9)  return "0.76rem";
      if (len <= 12) return "0.66rem";
      if (len <= 16) return "0.56rem";
      return "0.48rem";
    }
    if (len <= 2)  return "1.05rem";
    if (len <= 5)  return "0.92rem";
    if (len <= 8)  return "0.8rem";
    if (len <= 12) return "0.68rem";
    if (len <= 16) return "0.58rem";
    return "0.48rem";
  }

  function hubFontSize(text) {
    const trimmed = String(text || "").trim();
    const len = trimmed.length;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (words >= 3) {
      if (len <= 14) return "0.68rem";
      if (len <= 18) return "0.6rem";
      return "0.52rem";
    }
    if (words === 2) {
      if (len <= 6)  return "1.1rem";
      if (len <= 9)  return "0.92rem";
      if (len <= 12) return "0.78rem";
      if (len <= 15) return "0.68rem";
      return "0.58rem";
    }
    if (len <= 3) return "1.55rem";
    if (len <= 5) return "1.28rem";
    if (len <= 7) return "1.05rem";
    if (len <= 9) return "0.9rem";
    if (len <= 11) return "0.78rem";
    return "0.66rem";
  }

  function applyMainButtons(cfg) {
    Object.keys(buttonEls).forEach((key) => {
      const btn = buttonEls[key];
      if (!btn) return;
      const c = Object.assign({}, mainButtonsCfg[key], (cfg && cfg[key]) || {});
      mainButtonsCfg[key] = c;

      if (c.enabled === false) { btn.style.display = "none"; return; }
      btn.style.display = "";

      const iconSvg = c.icon && window.mbwEmojiToSvg ? window.mbwEmojiToSvg(c.icon) : null;
      if (iconSvg) {
        btn.innerHTML = '<span class="fm-main-icon">' + iconSvg + '</span>';
      } else {
        const name = String(c.name || "Menu").trim();
        const size = mainBtnFontSize(name);
        btn.innerHTML = '<span class="fm-main-label" style="font-size:' + size + '">' +
                        escapeHtmlSimple(name) + '</span>';
      }
    });
  }

  db.collection("settings").doc("mainButtons").onSnapshot((doc) => {
    applyMainButtons(doc.exists ? doc.data() : {});
  }, () => applyMainButtons({}));

  function autoIconFromLabel(label) {
    const l = String(label || "").toLowerCase();
    if (/(rate|review|feedback|star|rating)/.test(l)) return "⭐";
    if (/(wish|heart|favourite|favorite|save)/.test(l)) return "❤️";
    if (/(whatsapp|wa\b|chat|message)/.test(l)) return "💬";
    if (/(call|phone|dial|contact)/.test(l)) return "📞";
    if (/(map|location|address|direction|visit|reach)/.test(l)) return "📍";
    if (/(offer|sale|discount|deal|coupon|special)/.test(l)) return "🎁";
    if (/(youtube|yt\b|video)/.test(l)) return "▶️";
    if (/(instagram|ig\b|insta|reel)/.test(l)) return "📸";
    if (/(facebook|fb\b)/.test(l)) return "👍";
    if (/(twitter|tweet|\bx\b)/.test(l)) return "🐦";
    if (/(email|mail|gmail)/.test(l)) return "✉️";
    if (/(website|site|web|link)/.test(l)) return "🌐";
    if (/(battery|charge|power|cell)/.test(l)) return "🔋";
    if (/(inverter|electric|light|bulb|current)/.test(l)) return "⚡";
    if (/(cooler|fan|\bac\b|cool|air)/.test(l)) return "❄️";
    if (/(heater|warm|heat|winter)/.test(l)) return "🔥";
    if (/(home|house|shop|store|dukan)/.test(l)) return "🏪";
    if (/(cart|order|buy|purchase)/.test(l)) return "🛒";
    if (/(share|send)/.test(l)) return "🔗";
    if (/(privacy|policy|secure|lock)/.test(l)) return "🔒";
    if (/(terms|condition|document|rule)/.test(l)) return "📄";
    if (/(info|about|help|support)/.test(l)) return "ℹ️";
    if (/(service|repair|fix|mechanic)/.test(l)) return "🛠️";
    if (/(warranty|guarantee|verify)/.test(l)) return "✅";
    if (/(exide)/.test(l)) return "🔋";
    if (/(amaron|livguard|luminous|okaya|microtek)/.test(l)) return "⚡";
    return "✨";
  }

  function pickIcon(item) {
    const adminEmoji = String(item.icon || "").trim();
    if (adminEmoji) return adminEmoji;
    return autoIconFromLabel(item.label || "");
  }

  function isWishlistUrl(u){ return /^action:wishlist$/i.test(u || ""); }
  function isCategoryUrl(u){ const m = String(u || "").match(/^action:cat:(.+)$/i); return m ? m[1] : null; }
  function isBrandUrl(u){ const m = String(u || "").match(/^action:brand:(.+)$/i); return m ? m[1] : null; }

  function doAfterClose(fn) {
    closeOverlay();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(fn, 700);
  }

  function handleLinkClick(item) {
    const url = item.url || "";
    doAfterClose(() => {
      if (isWishlistUrl(url)) {
        if (typeof window.activateWishlistFilter === "function") window.activateWishlistFilter();
        else window.location.href = "index.html";
        return;
      }
      const catId = isCategoryUrl(url);
      if (catId) {
        if (typeof window.filterByCategory === "function") window.filterByCategory(catId, item.label || "");
        else window.location.href = "index.html#cat=" + encodeURIComponent(catId);
        return;
      }
      const brandId = isBrandUrl(url);
      if (brandId) {
        if (typeof window.filterByBrand === "function") window.filterByBrand(brandId, item.label || "");
        else window.location.href = "index.html#brand=" + encodeURIComponent(brandId);
        return;
      }
      if (/^(rateus|about|privacy|terms|developer)\.html/i.test(url)) {
        window.location.href = url;
        return;
      }
      if (url) window.open(url, "_blank", "noopener");
    });
  }

  function handleCategoryClick(catId, catName) {
    doAfterClose(() => {
      if (typeof window.filterByCategory === "function") window.filterByCategory(catId, catName);
      else window.location.href = "index.html#cat=" + encodeURIComponent(catId);
    });
  }

  function getRadius() {
    return window.innerWidth < 480 ? 100 : 130;
  }

  function getItemsForButton(btnKey) {
    const cfg = mainButtonsCfg[btnKey] || {};
    const linkItems = allFloatingItems
      .filter(it => (it.buttonId || "b1") === btnKey)
      .map(it => {
        const isBrand = allBrands.some(b =>
          b.name && b.name.toLowerCase() === String(it.label || "").toLowerCase()
        ) || /^action:brand:/i.test(String(it.url || ""));
        return { ...it, _type: "link", _isBrand: isBrand };
      });
    const catItems = [];
    if (cfg.autoCategories === true) {
      allCategories.forEach(c => {
        catItems.push({ id: c.id, label: c.name, _type: "category" });
      });
    }
    return [...linkItems, ...catItems];
  }

  function subLabelFontSize(text) {
    const len = String(text || "").length;
    if (len <= 6)  return "";
    if (len <= 9)  return "0.66rem";
    if (len <= 12) return "0.6rem";
    if (len <= 16) return "0.54rem";
    return "0.48rem";
  }

  function renderRing() {
    ring.innerHTML = "";
    const combined = getItemsForButton(currentButton);
    const N = combined.length;
    if (!N) {
      ring.innerHTML = '<div class="fm-empty-msg">No items here yet</div>';
      return;
    }
    const radius = getRadius();

    combined.forEach((item, i) => {
      const angle = (360 / N) * i - 90;
      const rad = angle * Math.PI / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;

      const itemEl = document.createElement("div");
      itemEl.className = "fm-orbit-item";
      itemEl.style.setProperty("--x", x.toFixed(1) + "px");
      itemEl.style.setProperty("--y", y.toFixed(1) + "px");
      itemEl.style.setProperty("--delay-open",  (i * 85) + "ms");
      itemEl.style.setProperty("--delay-close", ((N - 1 - i) * 85) + "ms");

      const counter = document.createElement("div");
      counter.className = "fm-orbit-counter";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fm-orbit-icon-btn";

      const hasLabel = String(item.label || "").trim().length > 0;

      if (item._type === "category") {
        btn.setAttribute("aria-label", item.label || "Category");
        btn.classList.add("fm-orbit-cat-btn");
        btn.innerHTML = '<span class="fm-orbit-catname">' + escapeHtmlSimple(String(item.label || "").trim()) + '</span>';
        btn.addEventListener("click", (e) => { e.stopPropagation(); handleCategoryClick(item.id, item.label || ""); });
      } else if (item._isBrand) {
        btn.setAttribute("aria-label", item.label || "Brand");
        btn.classList.add("fm-orbit-brand-btn");
        btn.innerHTML = '<span class="fm-orbit-catname">' + escapeHtmlSimple(String(item.label || "").trim()) + '</span>';
        btn.addEventListener("click", (e) => { e.stopPropagation(); handleLinkClick(item); });
      } else {
        btn.setAttribute("aria-label", item.label || "Action");
        const iconKey = pickIcon(item);
        const svgMarkup = (window.mbwEmojiToSvg && window.mbwEmojiToSvg(iconKey)) || null;
        btn.innerHTML = svgMarkup
          ? '<span class="fm-orbit-svg">' + svgMarkup + '</span>'
          : '<span class="fm-orbit-emoji">' + iconKey + '</span>';
        btn.addEventListener("click", (e) => { e.stopPropagation(); handleLinkClick(item); });
      }

      counter.appendChild(btn);

      if (hasLabel) {
        const label = document.createElement("span");
        label.className = "fm-orbit-label";
        label.textContent = item.label || "";
        const customSize = subLabelFontSize(item.label || "");
        if (customSize) label.style.fontSize = customSize;
        counter.appendChild(label);
      }

      itemEl.appendChild(counter);
      ring.appendChild(itemEl);
    });
  }

  function restartOrbitAnimations() {
    const animatedEls = [ring, ...ring.querySelectorAll(".fm-orbit-counter")];
    animatedEls.forEach((el) => { el.style.animation = "none"; });
    void ring.offsetWidth;
    animatedEls.forEach((el) => { el.style.animation = ""; });
  }

  function openOverlay(btnKey) {
    currentButton = btnKey || "b1";
    isOpen = true;
    clearTimeout(closeTimer);

    const cfg = mainButtonsCfg[currentButton] || {};
    const hubBrand = hub.querySelector(".fm-hub-brand");
    if (hubBrand) {
      const name = String(cfg.name || "MBW").trim();
      hubBrand.textContent = name;
      hubBrand.style.fontSize = hubFontSize(name);
    }

    renderRing();
    document.body.classList.add("fm-menu-open");
    document.body.style.overflow = "hidden";
    restartOrbitAnimations();
    requestAnimationFrame(() => { overlay.classList.add("open"); });
  }

  function closeOverlay() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("open");
    document.body.classList.remove("fm-menu-open");
    document.body.style.overflow = "";
  }

  function applyPosToBtn(btn, x, y) {
    const margin = 6;
    const w = btn.offsetWidth || 62;
    const h = btn.offsetHeight || 62;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    const cx = Math.min(Math.max(x, margin), maxX);
    const cy = Math.min(Math.max(y, margin), maxY);
    btn.style.right = "auto";
    btn.style.bottom = "auto";
    btn.style.left = cx + "px";
    btn.style.top = cy + "px";
  }

  function makeDraggable(btn) {
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      const rect = btn.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      btn.classList.add("fm-dragging");
    });

    btn.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
      if (moved) applyPosToBtn(btn, startLeft + dx, startTop + dy);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove("fm-dragging");
      try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
      // Position save NAHI hoti — reload pe reset
    }

    btn.addEventListener("pointerup", endDrag);
    btn.addEventListener("pointercancel", endDrag);

    btn.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  }

  Object.keys(buttonEls).forEach((key) => {
    const btn = buttonEls[key];
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (isOpen && currentButton === key) closeOverlay();
      else openOverlay(key);
    });
    makeDraggable(btn);
  });

  window.addEventListener("resize", () => {
    Object.keys(buttonEls).forEach((key) => {
      const btn = buttonEls[key];
      if (!btn) return;
      if (btn.style.left || btn.style.top) {
        const rect = btn.getBoundingClientRect();
        applyPosToBtn(btn, rect.left, rect.top);
      }
    });
  });

  hub.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeOverlay();
  });

  /* ---- Firestore listeners (orderBy removed — client-side sort) ---- */
  db.collection("floating_menu").onSnapshot((snap) => {
    allFloatingItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allFloatingItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (isOpen) { renderRing(); restartOrbitAnimations(); }
  }, () => {});

  db.collection("categories").onSnapshot((snap) => {
    allCategories = snap.docs.map((d) => ({ id: d.id, name: d.data().name || "Category", order: d.data().order || 0 }));
    allCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (isOpen) { renderRing(); restartOrbitAnimations(); }
  }, () => {});

  db.collection("brands").onSnapshot((snap) => {
    allBrands = snap.docs.map((d) => ({ id: d.id, name: d.data().name || "" }));
    if (isOpen) { renderRing(); restartOrbitAnimations(); }
  }, () => {});
})();
