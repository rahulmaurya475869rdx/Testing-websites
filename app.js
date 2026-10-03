/* =========================================================
   Shree Shiv Alankar Mandir — customer-facing site logic
   ========================================================= */

let allCategories = [];
let allProducts = [];
let allBrands = [];
let allPosters = [];
let activeCategory = "all";
let activeBrand = null;
let searchTerm = "";
let shopSettings = {};
let pendingCategoryFromHash = null;
let pendingBrandFromHash = null;
let firstProductsLoad = true;

let videoSoundOn = false;

/* ---------------- Wishlist ---------------- */
let myWishlist = [];
let wishlistFilterActive = false;
const wishlistDeviceFp = getSimpleDeviceId();

function loadMyWishlist() {
  db.collection("wishlists").doc(wishlistDeviceFp).get().then((doc) => {
    myWishlist = doc.exists && Array.isArray(doc.data().productIds) ? doc.data().productIds : [];
    renderCategoryChips();
    renderProducts();
  }).catch(() => {});
}
loadMyWishlist();

function activateWishlistFilter() {
  wishlistFilterActive = true;
  activeCategory = "all";
  activeBrand = null;
  closeDetail();
  renderCategoryChips();
  renderProducts();
  const section = document.querySelector(".products-section");
  if (section) section.scrollIntoView({ behavior: "smooth" });
}

function filterByCategory(catId) {
  if (!catId) return;
  const exists = allCategories.some(c => c.id === catId);
  if (!exists) { setTimeout(() => filterByCategory(catId), 400); return; }
  activeCategory = catId;
  activeBrand = null;
  wishlistFilterActive = false;
  closeDetail();
  renderCategoryChips();
  renderProducts();
  document.body.style.overflow = "";
  setTimeout(() => {
    const section = document.querySelector(".products-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function filterByBrand(brandId) {
  if (!brandId) return;
  const exists = allBrands.some(b => b.id === brandId);
  if (!exists) { setTimeout(() => filterByBrand(brandId), 400); return; }
  activeBrand = brandId;
  activeCategory = "all";
  wishlistFilterActive = false;
  closeDetail();
  renderCategoryChips();
  renderProducts();
  document.body.style.overflow = "";
  setTimeout(() => {
    const section = document.querySelector(".products-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

async function toggleWishlist(productId) {
  const idx = myWishlist.indexOf(productId);
  const adding = idx === -1;
  if (adding) myWishlist.push(productId); else myWishlist.splice(idx, 1);
  renderCategoryChips();
  renderProducts();

  if (!document.getElementById("productDetailPage").classList.contains("hidden") && currentDetailProductId) {
    const wished = myWishlist.includes(productId);
    if (productId === currentDetailProductId) {
      const mainWishBtn = document.getElementById("detailWishBtn");
      if (mainWishBtn) {
        mainWishBtn.textContent = wished ? "❤ In Your Wishlist" : "🤍 Add to Wishlist";
        mainWishBtn.classList.toggle("active", wished);
      }
    }
    const similarBtn = document.querySelector('.similar-card[data-id="' + productId + '"] .wishlist-btn');
    if (similarBtn) {
      similarBtn.classList.toggle("active", wished);
      similarBtn.textContent = wished ? "❤" : "🤍";
    }
  }

  try {
    await db.collection("wishlists").doc(wishlistDeviceFp).set({
      productIds: adding ? firebase.firestore.FieldValue.arrayUnion(productId) : firebase.firestore.FieldValue.arrayRemove(productId),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    if (adding) myWishlist = myWishlist.filter((id) => id !== productId);
    else myWishlist.push(productId);
    renderCategoryChips();
    renderProducts();
  }
}

window.activateWishlistFilter = activateWishlistFilter;
window.filterByCategory = filterByCategory;
window.filterByBrand = filterByBrand;

/* ---------------- Shop settings ---------------- */
db.collection("settings").doc("general").get().then((doc) => {
  shopSettings = doc.exists ? doc.data() : {};
  const shopName = shopSettings.shopName || "Shree Shiv Alankar Mandir";
  const shopEl = document.getElementById("shopNameHeading");
  if (shopEl) shopEl.textContent = shopName;
  if (shopSettings.tagline) {
    const t = document.getElementById("shopTagline");
    if (t) t.textContent = shopSettings.tagline;
  }
  if (shopSettings.address) {
    const a = document.getElementById("contactAddress");
    if (a) a.textContent = shopSettings.address;
  }
  const heroEye = document.getElementById("heroEyebrow");
  if (heroEye) heroEye.textContent = shopSettings.heroEyebrow || "Timeless since generations";
  const heroHead = document.getElementById("heroHeadline");
  if (heroHead) heroHead.textContent = shopSettings.heroHeadline || "Jewellery that tells your story.";
  const heroDesc = document.getElementById("heroDescription");
  if (heroDesc) heroDesc.textContent = shopSettings.heroDescription ||
    "Gold, silver and diamond jewellery — hallmark certified, trusted by families.";
}).catch(() => {});

/* ---------------- Footer + Social links ---------------- */
renderFooterFromFirestore();
renderSocialLinksFromFirestore();

document.addEventListener("contextmenu", (e) => { if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") e.preventDefault(); });

/* =========================================================
   VIDEO SOUND
   ========================================================= */
function applyVideoSound() {
  document.querySelectorAll(".hero-video, .poster-video").forEach((v) => {
    v.muted = !videoSoundOn;
  });
  document.querySelectorAll(".slide-mute-btn, .poster-mute-btn").forEach((b) => {
    b.classList.toggle("sound-on", videoSoundOn);
    b.textContent = videoSoundOn ? "🔊" : "🔇";
  });
}

function setupMuteButtons(container) {
  const scope = container || document;
  scope.querySelectorAll(".slide-mute-btn, .poster-mute-btn").forEach((btn) => {
    if (btn.dataset.muteBound === "1") return;
    btn.dataset.muteBound = "1";
    btn.classList.toggle("sound-on", videoSoundOn);
    btn.textContent = videoSoundOn ? "🔊" : "🔇";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      videoSoundOn = !videoSoundOn;
      applyVideoSound();
      if (videoSoundOn) {
        document.querySelectorAll(".hero-video, .poster-video").forEach((v) => {
          if (v.paused) v.play().catch(() => {});
        });
      }
    });
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  });
}

/* =========================================================
   HERO SLIDER
   ========================================================= */
const heroSlider = document.getElementById("heroSlider");
let heroSlideTimer = null;
let heroSlideIdx = 0;

if (heroSlider) {
  db.collection("settings").doc("hero").get().then((doc) => {
    const data = doc.exists ? doc.data() : {};
    let items = Array.isArray(data.items) ? data.items : [];
    if (!items.length && Array.isArray(data.images)) {
      items = data.images.map(url => ({ type: "image", url: url }));
    }
    items = items.filter(it => it && it.url);

    if (!items.length) {
      heroSlider.innerHTML = '<div class="slider-placeholder">Shree Shiv Alankar Mandir — Trusted Jewellery Shop</div>';
      return;
    }

    const dotsHtml = items.length > 1
      ? `<div class="hero-dots">${items.map((_, i) => `<span class="hero-dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`).join("")}</div>`
      : "";

    heroSlider.innerHTML = items.map((it, i) => {
      if (it.type === "video") {
        return `<div class="hero-slide hero-slide-video ${i === 0 ? 'active' : ''}" data-type="video">
          <video src="${escHtml(it.url)}" muted loop playsinline preload="metadata"
                 disablepictureinpicture controlslist="nodownload nofullscreen noremoteplayback"
                 class="hero-video" oncontextmenu="return false;"></video>
          <button type="button" class="slide-mute-btn" aria-label="Toggle sound">🔇</button>
        </div>`;
      }
      return `<div class="hero-slide ${i === 0 ? 'active' : ''}" data-type="image" style="background-image:url('${escHtml(it.url)}')">
        <img src="${escHtml(it.url)}" alt="Banner ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">
      </div>`;
    }).join("") + dotsHtml;

    setupMuteButtons(heroSlider);
    setupHeroAutoAdvance();
    setupHeroSwipe();
    setupHeroDotClicks();
  }).catch(() => {});
}

function setupHeroDotClicks() {
  const dots = heroSlider.querySelectorAll(".hero-dot");
  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = Number(dot.dataset.i);
      if (target === heroSlideIdx) return;
      clearTimeout(heroSlideTimer);
      const slides = heroSlider.querySelectorAll(".hero-slide");
      const oldVideo = slides[heroSlideIdx].querySelector("video");
      if (oldVideo) oldVideo.pause();
      slides[heroSlideIdx].classList.remove("active");
      if (dots[heroSlideIdx]) dots[heroSlideIdx].classList.remove("active");
      heroSlideIdx = target;
      slides[heroSlideIdx].classList.add("active");
      if (dots[heroSlideIdx]) dots[heroSlideIdx].classList.add("active");
      setupHeroAutoAdvance();
    });
  });
}

function setupHeroAutoAdvance() {
  clearTimeout(heroSlideTimer);
  const slides = heroSlider.querySelectorAll(".hero-slide");
  if (slides.length <= 1) return;
  const current = slides[heroSlideIdx];
  const video = current.querySelector("video");
  if (video) { video.muted = !videoSoundOn; video.play().catch(() => {}); }
  let delay = 4200;
  if (video) {
    if (video.duration && isFinite(video.duration)) delay = video.duration * 1000 + 800;
    else delay = 15000;
    delay = Math.max(4000, Math.min(delay, 30000));
  }
  heroSlideTimer = setTimeout(() => advanceHeroSlide(1), delay);
}

function advanceHeroSlide(dir) {
  const slides = heroSlider.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  const dots = heroSlider.querySelectorAll(".hero-dot");
  const oldVideo = slides[heroSlideIdx].querySelector("video");
  if (oldVideo) oldVideo.pause();
  slides[heroSlideIdx].classList.remove("active");
  if (dots[heroSlideIdx]) dots[heroSlideIdx].classList.remove("active");
  heroSlideIdx = (heroSlideIdx + dir + slides.length) % slides.length;
  slides[heroSlideIdx].classList.add("active");
  if (dots[heroSlideIdx]) dots[heroSlideIdx].classList.add("active");
  setupHeroAutoAdvance();
}

function setupHeroSwipe() {
  let startX = 0, startY = 0, isDown = false;
  heroSlider.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX = e.clientX; startY = e.clientY; isDown = true;
  });
  heroSlider.addEventListener("pointerup", (e) => {
    if (!isDown) return;
    isDown = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      clearTimeout(heroSlideTimer);
      advanceHeroSlide(dx < 0 ? 1 : -1);
    }
  });
  heroSlider.addEventListener("pointercancel", () => { isDown = false; });
  heroSlider.addEventListener("pointerleave", () => { isDown = false; });
}

/* ---------------- Hash ---------------- */
if (location.hash.startsWith("#cat=")) {
  pendingCategoryFromHash = decodeURIComponent(location.hash.slice(5));
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
if (location.hash.startsWith("#brand=")) {
  pendingBrandFromHash = decodeURIComponent(location.hash.slice(7));
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}

/* ---------------- Categories ---------------- */
db.collection("categories").onSnapshot((snap) => {
  allCategories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderCategoryChips();
  if (pendingCategoryFromHash) {
    const exists = allCategories.some(c => c.id === pendingCategoryFromHash);
    if (exists) {
      activeCategory = pendingCategoryFromHash;
      activeBrand = null;
      wishlistFilterActive = false;
      pendingCategoryFromHash = null;
      renderCategoryChips(); renderProducts();
      document.body.style.overflow = "";
      setTimeout(() => {
        const section = document.querySelector(".products-section");
        if (section) section.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  }
});

function renderCategoryChips() {
  const wrap = document.getElementById("categoryChips");
  if (!wrap) return;
  const chips = [
    `<button class="chip ${activeCategory === "all" && !wishlistFilterActive && !activeBrand ? "active" : ""}" data-cat="all">All Items</button>`
  ];
  allCategories.forEach((c) => {
    chips.push(`<button class="chip ${activeCategory === c.id && !wishlistFilterActive && !activeBrand ? "active" : ""}" data-cat="${c.id}">${escHtml(c.name)}</button>`);
  });
  if (activeBrand) {
    const b = allBrands.find(x => x.id === activeBrand);
    if (b) chips.push(`<button class="chip chip-brand active" data-brand-chip="1">💎 ${escHtml(b.name)} ✕</button>`);
  }
  chips.push(`<button class="chip wishlist-chip ${wishlistFilterActive ? "active" : ""}" data-cat="__wishlist__">❤ My Wishlist${myWishlist.length ? " (" + myWishlist.length + ")" : ""}</button>`);
  wrap.innerHTML = chips.join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.brandChip) { activeBrand = null; renderCategoryChips(); renderProducts(); return; }
      if (btn.dataset.cat === "__wishlist__") { wishlistFilterActive = !wishlistFilterActive; activeBrand = null; }
      else { activeCategory = btn.dataset.cat; wishlistFilterActive = false; activeBrand = null; }
      renderCategoryChips(); renderProducts();
    });
  });
}

/* ---------------- Brands ---------------- */
db.collection("brands").onSnapshot((snap) => {
  allBrands = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allBrands.sort((a, b) => (a.order || 0) - (b.order || 0));
  attachBrandNames();
  if (pendingBrandFromHash) {
    const exists = allBrands.some(b => b.id === pendingBrandFromHash);
    if (exists) { filterByBrand(pendingBrandFromHash); pendingBrandFromHash = null; }
  }
  renderProducts();
}, () => {});

/* ---------------- Products ---------------- */
db.collection("products").onSnapshot((snap) => {
  allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allProducts.sort((a, b) => (b.order || 0) - (a.order || 0));
  attachBrandNames();
  firstProductsLoad = false;
  renderProducts();
}, () => {});

function attachBrandNames() {
  allProducts = allProducts.map((p) => {
    const b = allBrands.find((x) => x.id === p.brandId);
    return { ...p, brandName: b ? b.name : "" };
  });
}

/* ---------------- Posters ---------------- */
db.collection("posters").onSnapshot((snap) => {
  allPosters = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allPosters.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderProducts();
}, () => {});

/* ---------------- Skeleton ---------------- */
function showSkeleton() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  let html = "";
  for (let i = 0; i < 8; i++) {
    html += `<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-info"><div class="skeleton-line skeleton-line-title"></div><div class="skeleton-line skeleton-line-price"></div><div class="skeleton-line skeleton-line-stock"></div></div></div>`;
  }
  grid.innerHTML = html;
}
showSkeleton();

/* =========================================================
   POSTER — BULLETPROOF
   ========================================================= */
function getValidImages(poster) {
  if (!poster || !Array.isArray(poster.images)) return [];
  return poster.images.filter(function(u) {
    return u && typeof u === "string" && u.length > 5;
  });
}

function posterHasContent(p) {
  if (!p) return false;
  const imgs = getValidImages(p);
  const vid = (p.videoUrl || "").trim();
  return imgs.length > 0 || vid.length > 5;
}

function buildPosterHtml(poster, posterIndex) {
  if (!poster) return "";

  const validImages = getValidImages(poster);
  const videoUrl = String(poster.videoUrl || "").trim();
  const hasVideo = videoUrl.length > 5;

  if (!hasVideo && validImages.length === 0) {
    return "";
  }

  let innerHtml = "";

  if (hasVideo) {
    innerHtml = '<video src="' + videoUrl + '" muted loop playsinline preload="metadata" ' +
                'disablepictureinpicture controlslist="nodownload nofullscreen noremoteplayback" ' +
                'class="poster-video" oncontextmenu="return false;" ' +
                'style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#000;display:block;"></video>' +
                '<button type="button" class="poster-mute-btn" style="position:absolute;top:8px;left:8px;z-index:5;width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.55);border:1.5px solid rgba(255,255,255,.35);color:#fff;font-size:1.05rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">🔇</button>';
  } else if (validImages.length === 1) {
    innerHtml = '<img src="' + validImages[0] + '" alt="Poster" ' +
                'style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#0a0a0a;display:block;" />';
  } else {
    const slidesHtml = validImages.map(function(url, i) {
      return '<div class="poster-slide' + (i === 0 ? ' active' : '') + '" data-slide="' + i + '" ' +
             'style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:' + (i === 0 ? '1' : '0') + ';transition:opacity 1.2s ease-in-out;background:#0a0a0a;display:flex;align-items:center;justify-content:center;">' +
             '<img src="' + url + '" alt="Poster ' + (i + 1) + '" ' +
             'style="position:relative;z-index:1;width:100%;height:100%;object-fit:contain;display:block;" />' +
             '</div>';
    }).join("");

    const dotsHtml = '<div class="poster-dots" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;z-index:4;padding:5px 10px;background:rgba(0,0,0,.45);border-radius:999px;">' +
      validImages.map(function(_, i) {
        return '<span class="poster-dot' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" ' +
               'style="width:' + (i === 0 ? '18px' : '6px') + ';height:6px;border-radius:50%;background:' + (i === 0 ? '#f5c451' : 'rgba(255,255,255,.45)') + ';cursor:pointer;transition:all .25s ease;"></span>';
      }).join("") +
      '</div>';

    innerHtml = slidesHtml + dotsHtml;
  }

  const linkOpen = poster.linkUrl ? '<a href="' + poster.linkUrl + '" target="_blank" rel="noopener" style="display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;"></a>' : "";

  return '<div class="poster-card" data-poster-idx="' + posterIndex + '" ' +
    'style="grid-column:1 / -1;position:relative;width:100%;aspect-ratio:16 / 9;border-radius:14px;overflow:hidden;border:2px solid #f5c451;box-shadow:0 0 26px rgba(245,196,81,.35), 0 10px 30px rgba(0,0,0,.55);background:#0a0a0a;margin:8px 0;">' +
    innerHtml +
    linkOpen +
  '</div>';
}

let posterTimers = [];
let posterVideoObserver = null;

function startPosterSliders() {
  posterTimers.forEach((t) => clearInterval(t));
  posterTimers = [];

  document.querySelectorAll(".poster-card").forEach(function(card) {
    const slides = card.querySelectorAll(".poster-slide");
    if (slides.length <= 1) return;

    const dots = card.querySelectorAll(".poster-dot");
    let idx = 0;

    const timer = setInterval(function() {
      slides[idx].style.opacity = "0";
      slides[idx].classList.remove("active");
      if (dots[idx]) {
        dots[idx].style.width = "6px";
        dots[idx].style.background = "rgba(255,255,255,.45)";
        dots[idx].classList.remove("active");
      }

      idx = (idx + 1) % slides.length;

      slides[idx].style.opacity = "1";
      slides[idx].classList.add("active");
      if (dots[idx]) {
        dots[idx].style.width = "18px";
        dots[idx].style.background = "#f5c451";
        dots[idx].classList.add("active");
      }
    }, 3500);

    posterTimers.push(timer);

    dots.forEach(function(dot) {
      dot.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        const target = Number(dot.dataset.i);
        const currentIdx = Array.from(slides).findIndex(function(s) {
          return s.style.opacity === "1" || s.classList.contains("active");
        });
        if (currentIdx === target) return;

        slides.forEach(function(s, si) {
          s.style.opacity = si === target ? "1" : "0";
          s.classList.toggle("active", si === target);
        });
        dots.forEach(function(d, di) {
          d.style.width = di === target ? "18px" : "6px";
          d.style.background = di === target ? "#f5c451" : "rgba(255,255,255,.45)";
          d.classList.toggle("active", di === target);
        });
      });
    });
  });
}

function setupPosterVideoObserver() {
  if (posterVideoObserver) posterVideoObserver.disconnect();
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".poster-video").forEach(function(v) {
      v.muted = !videoSoundOn;
      v.play().catch(function() {});
    });
    return;
  }
  posterVideoObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.muted = !videoSoundOn;
        video.play().catch(function() {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".poster-video").forEach(function(v) {
    posterVideoObserver.observe(v);
  });
}

/* ---------------- Render Products ---------------- */
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = allProducts.filter((p) => {
    const matchesCat = activeCategory === "all" || p.categoryId === activeCategory;
    const matchesBrand = !activeBrand || p.brandId === activeBrand;
    const matchesSearch = !searchTerm || (p.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWishlist = !wishlistFilterActive || myWishlist.includes(p.id);
    return matchesCat && matchesBrand && matchesSearch && matchesWishlist;
  });

  if (!filtered.length) {
    grid.innerHTML = wishlistFilterActive
      ? '<p class="empty-msg">Your wishlist is empty.</p>'
      : '<p class="empty-msg">No products found.</p>';
    return;
  }

  const validPosters = allPosters.filter(posterHasContent);

  let html = "";
  let posterIdx = 0;

  filtered.forEach((p, i) => {
    const img = (p.images && p.images[0]) || "";
    const priceHtml = p.price ? `<p class="price">₹${p.price}</p>` : "<p class=\"price\">&nbsp;</p>";
    const stockHtml = p.inStock === false ? '<p class="out-tag">Out of stock</p>' : '<p class="in-stock-tag">In stock</p>';
    const isWished = myWishlist.includes(p.id);

    html += `<div class="product-card" data-id="${p.id}">
      <div class="product-img-wrap" style="background-image:url('${img}')">
        <button type="button" class="wishlist-btn ${isWished ? "active" : ""}" data-wish="${p.id}">${isWished ? "❤" : "🤍"}</button>
        <img src="${img}" alt="${escHtml(p.name || "")}" loading="lazy">
      </div>
      <div class="product-info">
        <h3>${escHtml(p.name || "")}</h3>
        ${p.brandName ? `<p class="brand-tag">${escHtml(p.brandName)}</p>` : ""}
        ${priceHtml}
        ${stockHtml}
      </div>
    </div>`;

    if ((i + 1) % 10 === 0 && validPosters.length) {
      const poster = validPosters[posterIdx % validPosters.length];
      posterIdx++;
      html += buildPosterHtml(poster, posterIdx - 1);
    }
  });

  grid.innerHTML = html;

  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".wishlist-btn")) return;
      openProductDetail(card.dataset.id);
    });
  });
  grid.querySelectorAll(".wishlist-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleWishlist(btn.dataset.wish); });
  });

  startPosterSliders();
  setupMuteButtons(grid);
  setupPosterVideoObserver();
}

/* =========================================================
   PRODUCT DETAIL PAGE
   ========================================================= */
let currentDetailProductId = null;

function openProductDetail(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  const url = new URL(window.location.href);
  url.searchParams.set("product", productId);
  history.pushState({ product: productId }, "", url.toString());
  showDetail(productId);
}

function showDetail(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) { closeDetail(); return; }
  currentDetailProductId = productId;
  const homePage = document.getElementById("homePage");
  const detailPage = document.getElementById("productDetailPage");
  document.querySelectorAll(".hero-video, .poster-video").forEach((v) => v.pause());
  homePage.classList.add("hidden");
  detailPage.classList.remove("hidden");
  document.body.classList.add("detail-open");
  renderDetail(productId);
  window.scrollTo(0, 0);
}

function closeDetail() {
  const homePage = document.getElementById("homePage");
  const detailPage = document.getElementById("productDetailPage");

  detailPage.classList.add("hidden");
  homePage.classList.remove("hidden");
  document.body.classList.remove("detail-open");
  currentDetailProductId = null;

  document.title = "Shree Shiv Alankar Mandir — Trusted Jewellery Shop in Marihan, Mirzapur";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content",
      "Shree Shiv Alankar Mandir — Trusted jewellery shop in Marihan, Mirzapur. Gold, silver and diamond jewellery with hallmark certification.");
  }
  const canonical = document.getElementById("canonicalLink");
  if (canonical) canonical.setAttribute("href", "https://shree-shiv-alankar.pages.dev/");
  const oldSchema = document.getElementById("productSchema");
  if (oldSchema) oldSchema.remove();
  const oldBC = document.getElementById("breadcrumbSchema");
  if (oldBC) oldBC.remove();

  const activeSlide = heroSlider ? heroSlider.querySelector(".hero-slide.active") : null;
  if (activeSlide) {
    const video = activeSlide.querySelector("video");
    if (video) {
      video.muted = !videoSoundOn;
      video.play().catch(() => {});
    }
  }
}

function renderDetail(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  document.title = (p.name || "Product") + " — Shree Shiv Alankar Mandir, Marihan, Mirzapur";

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content",
      (p.name || "") + " available at Shree Shiv Alankar Mandir, Marihan, Mirzapur. " +
      (p.description || "").slice(0, 140) + " Contact us on WhatsApp.");
  }

  const canonical = document.getElementById("canonicalLink");
  if (canonical) canonical.setAttribute("href", window.location.href);

  const oldSchema = document.getElementById("productSchema");
  if (oldSchema) oldSchema.remove();
  if (p.name) {
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.id = "productSchema";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "description": p.description || "Available at Shree Shiv Alankar Mandir, Marihan, Mirzapur.",
      "image": (p.images && p.images[0]) ? p.images[0] : "",
      "brand": {
        "@type": "Brand",
        "name": p.brandName || "Shree Shiv Alankar Mandir"
      },
      "offers": {
        "@type": "Offer",
        "availability": p.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
        "seller": {
          "@type": "LocalBusiness",
          "name": "Shree Shiv Alankar Mandir",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Robertsganj road, Devpura, Bhawa Bazar",
            "addressLocality": "Marihan",
            "addressRegion": "Mirzapur",
            "addressCountry": "IN"
          }
        }
      }
    });
    document.head.appendChild(schema);
  }

  const oldBC = document.getElementById("breadcrumbSchema");
  if (oldBC) oldBC.remove();
  const bc = document.createElement("script");
  bc.type = "application/ld+json";
  bc.id = "breadcrumbSchema";
  bc.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://shree-shiv-alankar.pages.dev/" },
      { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://shree-shiv-alankar.pages.dev/" },
      { "@type": "ListItem", "position": 3, "name": p.name }
    ]
  });
  document.head.appendChild(bc);

  const detailPage = document.getElementById("productDetailPage");
  const images = p.images && p.images.length ? p.images : [""];
  const isWished = myWishlist.includes(p.id);
  const wa = shopSettings.whatsapp || shopSettings.phone || "";
  const msg = encodeURIComponent(`Hi, I would like more information about "${p.name}".`);
  const waLink = wa ? `https://wa.me/${wa.replace(/\D/g, "")}?text=${msg}` : "#";

  const sameCat = allProducts.filter(x => x.id !== p.id && x.categoryId === p.categoryId).slice(0, 4);
  const otherCat = allProducts
    .filter(x => x.id !== p.id && x.categoryId !== p.categoryId && !sameCat.find(y => y.id === x.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
  const similar = [...sameCat, ...otherCat];

  const priceHtml = p.price ? `<p class="detail-price">₹${p.price}</p>` : "";
  const stockHtml = p.inStock === false
    ? '<p class="detail-stock detail-out">Out of stock</p>'
    : '<p class="detail-stock detail-in">✓ In stock</p>';

  detailPage.innerHTML = `
    <div class="detail-container">
      <div class="detail-top-bar">
        <button type="button" class="detail-back-btn" id="detailBackBtn">← Back</button>
      </div>
      <div class="detail-layout">
        <div class="detail-gallery">
          <div class="detail-main-img" id="detailMainImgWrap">
            <img id="detailMainImg" src="${escHtml(images[0])}" alt="${escHtml(p.name || "")}">
          </div>
          ${images.length > 1 ? `
            <div class="detail-thumbs" id="detailThumbs">
              ${images.map((url, i) => `<img src="${escHtml(url)}" class="${i === 0 ? "active-thumb" : ""}" data-i="${i}" alt="Product image ${i+1}">`).join("")}
            </div>
          ` : ""}
          ${p.videoUrl ? `
            <div class="detail-video-wrap">
              <video src="${escHtml(p.videoUrl)}" controls playsinline></video>
            </div>
          ` : ""}
        </div>
        <div class="detail-info">
          ${p.brandName ? `<p class="detail-brand">${escHtml(p.brandName)}</p>` : ""}
          <h1 class="detail-name">${escHtml(p.name || "")}</h1>
          ${priceHtml}
          ${stockHtml}
          <p class="detail-desc">${escHtml(p.description || "No description available.")}</p>
          <div class="detail-actions">
            <a href="${waLink}" target="_blank" rel="noopener" class="detail-wa-btn">💬 Order on WhatsApp</a>
            <button type="button" id="detailWishBtn" class="detail-wish-btn ${isWished ? "active" : ""}">
              ${isWished ? "❤ In Your Wishlist" : "🤍 Add to Wishlist"}
            </button>
          </div>
        </div>
      </div>
      ${similar.length ? `
        <div class="similar-section">
          <h2 class="section-title">You May Also Like</h2>
          <div class="similar-grid">
            ${similar.map(sp => {
              const simg = (sp.images && sp.images[0]) || "";
              const isW = myWishlist.includes(sp.id);
              return `<div class="product-card similar-card" data-id="${sp.id}">
                <div class="product-img-wrap" style="background-image:url('${simg}')">
                  <button type="button" class="wishlist-btn ${isW ? "active" : ""}" data-wish="${sp.id}">${isW ? "❤" : "🤍"}</button>
                  <img src="${simg}" alt="${escHtml(sp.name || "")}" loading="lazy">
                </div>
                <div class="product-info">
                  <h3>${escHtml(sp.name || "")}</h3>
                  ${sp.brandName ? `<p class="brand-tag">${escHtml(sp.brandName)}</p>` : ""}
                  ${sp.price ? `<p class="price">₹${sp.price}</p>` : "<p class=\"price\">&nbsp;</p>"}
                  ${sp.inStock === false ? '<p class="out-tag">Out of stock</p>' : '<p class="in-stock-tag">In stock</p>'}
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>
      ` : ""}
    </div>
  `;

  const thumbsWrap = document.getElementById("detailThumbs");
  if (thumbsWrap) {
    thumbsWrap.querySelectorAll("img").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const idx = Number(thumb.dataset.i);
        document.getElementById("detailMainImg").src = images[idx];
        thumbsWrap.querySelectorAll("img").forEach(t => t.classList.remove("active-thumb"));
        thumb.classList.add("active-thumb");
      });
    });
  }

  document.getElementById("detailBackBtn").addEventListener("click", () => history.back());

  const wishBtn = document.getElementById("detailWishBtn");
  if (wishBtn) wishBtn.addEventListener("click", () => toggleWishlist(p.id));

  detailPage.querySelectorAll(".similar-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".wishlist-btn")) return;
      openProductDetail(card.dataset.id);
    });
  });
  detailPage.querySelectorAll(".similar-card .wishlist-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleWishlist(btn.dataset.wish); });
  });
}

/* ---------------- Back/forward ---------------- */
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("product");
  if (productId && allProducts.find(p => p.id === productId)) showDetail(productId);
  else closeDetail();
});

/* ---------------- Initial URL ---------------- */
(function checkInitialURL() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("product");
  if (productId) {
    const checkInterval = setInterval(() => {
      if (allProducts.length > 0) {
        clearInterval(checkInterval);
        if (allProducts.find(p => p.id === productId)) showDetail(productId);
        else {
          const url = new URL(window.location.href);
          url.searchParams.delete("product");
          history.replaceState({}, "", url.toString());
        }
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
})();

/* ---------------- Search ---------------- */
const searchForm = document.getElementById("searchForm");
if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("searchInput").value.trim();
    if (val.toUpperCase() === "MBW LOGIN") {
      document.getElementById("searchInput").value = "";
      window.location.href = "admin.html";
      return;
    }
    searchTerm = val;
    closeDetail();
    renderProducts();
  });
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    const si = document.getElementById("searchInput");
    if (si) si.value = "";
  }
});

/* Pause when hidden */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    document.querySelectorAll(".hero-video, .poster-video").forEach((v) => v.pause());
  } else {
    const activeHero = heroSlider ? heroSlider.querySelector(".hero-slide.active video") : null;
    if (activeHero) activeHero.play().catch(() => {});
    document.querySelectorAll(".poster-video").forEach((v) => {
      const rect = v.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) v.play().catch(() => {});
    });
    setupHeroAutoAdvance();
  }
});
