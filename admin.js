/* =========================================================
   Shree Shiv Alankar Mandir — Admin Panel
   ========================================================= */

const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});

const loginIdInput = document.getElementById("adminId");
const loginPassInput = document.getElementById("adminPass");
const loginError = document.getElementById("loginError");
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

async function attemptLogin() {
  loginError.textContent = "";
  const idVal = loginIdInput.value.trim();
  const passVal = loginPassInput.value;
  if (!idVal || !passVal) { loginError.textContent = "Please enter both fields."; return; }
  try {
    await auth.signInWithEmailAndPassword(idVal, passVal);
  } catch (err) {
    loginError.textContent = "Wrong ID or password. Please try again.";
  }
}
document.getElementById("loginSubmitBtn").addEventListener("click", attemptLogin);
[loginIdInput, loginPassInput].forEach((input) => input.addEventListener("keydown", (e) => { if (e.key === "Enter") attemptLogin(); }));

let dashboardStarted = false;

auth.onAuthStateChanged((user) => {
  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    if (!dashboardStarted) { dashboardStarted = true; initDashboard(); }
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut().catch(() => {});
  window.location.reload();
});

/* ---------- tab switching ---------- */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* =========================================================
   CLOUDINARY UPLOAD (via Cloudflare Worker)
   ========================================================= */
const CLOUDINARY_SIGN_WORKER = "https://PASTE_FRIEND_WORKER_URL.workers.dev";

async function uploadToCloudinary(file, resourceType) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Login required for upload.");
  const idToken = await user.getIdToken();

  const signRes = await fetch(CLOUDINARY_SIGN_WORKER, {
    method: "POST",
    headers: { "Authorization": "Bearer " + idToken },
  });
  if (!signRes.ok) {
    const errData = await signRes.json().catch(() => ({}));
    throw new Error(errData.error || ("Signing failed (" + signRes.status + ")"));
  }
  const { signature, timestamp, api_key, cloud_name } = await signRes.json();

  const url = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error ? data.error.message : "Upload failed");
  return data.secure_url;
}

/* =========================================================
   INIT DASHBOARD
   ========================================================= */
function initDashboard() {
  initCategories();
  initBrands();
  initProducts();
  initBanner();
  initPosters();
  initPageEditors();
  initMainButtons();
  initFloatingMenu();
  initSettings();
  initSocialLinks();
  initCustomerReviews();
}

/* =========================================================
   MAIN BUTTONS
   ========================================================= */
function initMainButtons() {
  const form = document.getElementById("mainButtonsForm");
  if (!form) return;
  db.collection("settings").doc("mainButtons").get().then((doc) => {
    const d = doc.exists ? doc.data() : {};
    for (let i = 1; i <= 3; i++) {
      const b = d["b" + i] || {};
      document.getElementById("mb" + i + "Enabled").checked = b.enabled !== false;
      document.getElementById("mb" + i + "Name").value = b.name || "";
      document.getElementById("mb" + i + "Icon").value = b.icon || "";
      const autoEl = document.getElementById("mb" + i + "AutoCats");
      if (autoEl) autoEl.checked = b.autoCategories === true;
    }
  }).catch(() => {});
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("mainButtonsStatus");
    const data = {};
    for (let i = 1; i <= 3; i++) {
      const autoEl = document.getElementById("mb" + i + "AutoCats");
      data["b" + i] = {
        enabled: document.getElementById("mb" + i + "Enabled").checked,
        name: document.getElementById("mb" + i + "Name").value.trim(),
        icon: document.getElementById("mb" + i + "Icon").value.trim(),
        autoCategories: autoEl ? autoEl.checked : false
      };
    }
    try {
      await db.collection("settings").doc("mainButtons").set(data, { merge: true });
      statusEl.textContent = "✅ Saved!";
      setTimeout(() => { statusEl.textContent = ""; }, 3000);
    } catch (err) { statusEl.textContent = "Error: " + err.message; }
  });
}

/* =========================================================
   PAGE EDITORS
   ========================================================= */
const PAGE_STARTERS = {
  about: [
    { type: "text", title: "About Shree Shiv Alankar Mandir", text: "Shree Shiv Alankar Mandir is a trusted jewellery shop located in Marihan, Mirzapur, Uttar Pradesh. We offer a wide range of gold, silver and diamond jewellery with hallmark certification." },
    { type: "list", title: "What We Offer", items: ["Gold Jewellery (22K, 18K Hallmark)","Silver Jewellery","Diamond Collection","Bridal Sets","Temple Jewellery","Custom Design Orders"] },
    { type: "text", title: "Visit Our Shop", text: "Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur. Open daily 10:00 AM – 8:00 PM." }
  ],
  privacy: [
    { type: "text", title: "Introduction", text: "This Privacy Policy explains how Shree Shiv Alankar Mandir collects, uses, stores and protects information when you use our website." },
    { type: "list", title: "Information We Collect", items: ["Your name and address when you submit a review","Your star rating and feedback message","Basic device information for security"] },
    { type: "text", title: "Contact Us", text: "Shree Shiv Alankar Mandir, Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur." }
  ],
  terms: [
    { type: "text", title: "About Us", text: "Shree Shiv Alankar Mandir is a jewellery shop located at Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur." },
    { type: "list", title: "Products & Pricing", items: ["All products are genuine and hallmark certified","Prices are for reference only","Product images are for illustration","Stock availability changes"] },
    { type: "text", title: "Contact", text: "Shree Shiv Alankar Mandir, Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur." }
  ],
  developer: [
    { type: "text", title: "Rahul Maurya", text: "Designer & Developer of Shree Shiv Alankar Mandir website." },
    { type: "text", title: "About Me", text: "I design and build clean, fast and modern websites for small businesses. From beautiful storefronts to admin panels, I help shops take their business online." },
    { type: "list", title: "What I Do", items: ["Website Design","Web Development","Firebase Backend","Cloudinary Media","Cloudflare Hosting"] },
    { type: "text", title: "Contact Me", text: "You can reach me via WhatsApp or Email. I'd love to hear from you." }
  ]
};

function initPageEditors() {
  document.querySelectorAll(".page-editor").forEach((container) => {
    const pageKey = container.getAttribute("data-page");
    if (pageKey) buildPageEditorUI(container, pageKey);
  });
}

function buildPageEditorUI(container, pageKey) {
  container.innerHTML = `
    <div class="about-toggle-wrap">
      <label class="about-toggle">
        <input type="checkbox" id="${pageKey}VisibleToggle" checked>
        <span>Show content on the "${pageKey}" page</span>
      </label>
    </div>
    <h3 class="about-subheading">Add a new block</h3>
    <form id="${pageKey}AddForm" class="admin-form">
      <label>Block Type</label>
      <select id="${pageKey}NewType">
        <option value="text">Text</option>
        <option value="list">List</option>
      </select>
      <label>Heading</label>
      <input type="text" id="${pageKey}NewTitle" required>
      <div id="${pageKey}NewTextWrap">
        <label>Paragraph</label>
        <textarea id="${pageKey}NewText" rows="4"></textarea>
      </div>
      <div id="${pageKey}NewListWrap" class="hidden">
        <label>List items (one per line)</label>
        <textarea id="${pageKey}NewItems" rows="5"></textarea>
      </div>
      <div class="form-btn-row">
        <button type="submit" id="${pageKey}AddSubmit">Add Block</button>
        <button type="button" id="${pageKey}AddCancelEdit" class="secondary-btn hidden">Cancel Edit</button>
        <button type="button" id="${pageKey}LoadDefaults" class="secondary-btn">📥 Load Starter Content</button>
      </div>
      <input type="hidden" id="${pageKey}EditIndex" value="">
    </form>
    <h3 class="about-subheading">Current blocks</h3>
    <div class="admin-list" id="${pageKey}BlocksList"></div>
  `;

  let sections = [];
  let visible = true;

  const visibleToggle = document.getElementById(pageKey + "VisibleToggle");
  const form = document.getElementById(pageKey + "AddForm");
  const newType = document.getElementById(pageKey + "NewType");
  const newTitle = document.getElementById(pageKey + "NewTitle");
  const newText = document.getElementById(pageKey + "NewText");
  const newItems = document.getElementById(pageKey + "NewItems");
  const textWrap = document.getElementById(pageKey + "NewTextWrap");
  const listWrap = document.getElementById(pageKey + "NewListWrap");
  const cancelBtn = document.getElementById(pageKey + "AddCancelEdit");
  const editIndexInput = document.getElementById(pageKey + "EditIndex");
  const blocksList = document.getElementById(pageKey + "BlocksList");
  const loadDefaultsBtn = document.getElementById(pageKey + "LoadDefaults");

  function resetForm() {
    form.reset();
    editIndexInput.value = "";
    cancelBtn.classList.add("hidden");
    textWrap.classList.remove("hidden");
    listWrap.classList.add("hidden");
  }

  function renderBlocks() {
    if (!sections.length) { blocksList.innerHTML = '<p class="empty-msg">No blocks yet.</p>'; return; }
    blocksList.innerHTML = sections.map((s, i) => {
      const preview = s.type === "list" ? (s.items || []).slice(0, 3).join(" · ") : (s.text || "").slice(0, 100);
      return `<div class="admin-item">
        <div class="item-main">
          <strong>${escHtml(s.title || "")}</strong>
          <small>[${s.type}] ${escHtml(preview)}</small>
        </div>
        <div class="item-actions">
          <button data-up="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button data-down="${i}" ${i === sections.length - 1 ? "disabled" : ""}>↓</button>
          <button data-edit="${i}">Edit</button>
          <button class="danger" data-del="${i}">Delete</button>
        </div>
      </div>`;
    }).join("");
    blocksList.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", async () => {
      const i = Number(b.dataset.up); if (i === 0) return;
      const arr = [...sections]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      sections = arr;
      await db.collection("settings").doc(pageKey).set({ sections: arr }, { merge: true });
    }));
    blocksList.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", async () => {
      const i = Number(b.dataset.down); if (i >= sections.length - 1) return;
      const arr = [...sections]; [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      sections = arr;
      await db.collection("settings").doc(pageKey).set({ sections: arr }, { merge: true });
    }));
    blocksList.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.edit); const s = sections[i]; if (!s) return;
      editIndexInput.value = i;
      newType.value = s.type || "text";
      newTitle.value = s.title || "";
      if (s.type === "list") { newItems.value = (s.items || []).join("\n"); textWrap.classList.add("hidden"); listWrap.classList.remove("hidden"); }
      else { newText.value = s.text || ""; textWrap.classList.remove("hidden"); listWrap.classList.add("hidden"); }
      cancelBtn.classList.remove("hidden");
    }));
    blocksList.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const i = Number(b.dataset.del);
      if (!confirm("Delete this block?")) return;
      const arr = sections.filter((_, idx) => idx !== i);
      sections = arr;
      await db.collection("settings").doc(pageKey).set({ sections: arr }, { merge: true });
    }));
  }

  db.collection("settings").doc(pageKey).onSnapshot((doc) => {
    const data = doc.exists ? doc.data() : {};
    visible = data.visible !== false;
    sections = Array.isArray(data.sections) ? data.sections : [];
    visibleToggle.checked = visible;
    renderBlocks();
  });

  visibleToggle.addEventListener("change", async (e) => {
    visible = e.target.checked;
    await db.collection("settings").doc(pageKey).set({ visible: visible }, { merge: true });
  });
  newType.addEventListener("change", (e) => {
    const t = e.target.value;
    textWrap.classList.toggle("hidden", t !== "text");
    listWrap.classList.toggle("hidden", t !== "list");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editIdx = editIndexInput.value;
    const type = newType.value;
    const title = newTitle.value.trim();
    if (!title) return;
    const section = { id: "s_" + Date.now().toString(36), type, title };
    if (type === "list") section.items = (newItems.value || "").split("\n").map(s => s.trim()).filter(s => s.length > 0);
    else section.text = (newText.value || "").trim();
    let updated = [...sections];
    if (editIdx !== "") { const idx = Number(editIdx); if (updated[idx] && updated[idx].id) section.id = updated[idx].id; updated[idx] = section; }
    else updated.push(section);
    try { await db.collection("settings").doc(pageKey).set({ sections: updated }, { merge: true }); resetForm(); }
    catch (err) { alert("Couldn't save: " + err.message); }
  });
  cancelBtn.addEventListener("click", resetForm);
  loadDefaultsBtn.addEventListener("click", async () => {
    if (!confirm("Load starter content? Existing blocks will be replaced.")) return;
    const defaults = (PAGE_STARTERS[pageKey] || []).map((s, i) => ({ id: "s_" + Date.now().toString(36) + "_" + i, ...s }));
    try { await db.collection("settings").doc(pageKey).set({ sections: defaults, visible: true }, { merge: true }); alert("Loaded."); }
    catch (err) { alert("Couldn't load: " + err.message); }
  });
}

/* =========================================================
   CATEGORIES
   ========================================================= */
let allCategoriesAdmin = [];
function initCategories() {
  db.collection("categories").onSnapshot((snap) => {
    allCategoriesAdmin = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allCategoriesAdmin.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderCategoriesList();
    fillCategorySelect();
    renderProductFilterChips();
  });
  document.getElementById("categoryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("categoryEditId").value;
    const name = document.getElementById("categoryName").value.trim();
    if (!name) return;
    if (editId) await db.collection("categories").doc(editId).update({ name });
    else await db.collection("categories").add({ name, order: Date.now() });
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryEditId").value = "";
  });
}
function renderCategoriesList() {
  const wrap = document.getElementById("categoriesList");
  if (!allCategoriesAdmin.length) { wrap.innerHTML = '<p class="empty-msg">No categories yet.</p>'; return; }
  wrap.innerHTML = allCategoriesAdmin.map((c) => `
    <div class="admin-item">
      <div class="item-main"><strong>${escHtml(c.name)}</strong></div>
      <div class="item-actions">
        <button data-edit="${c.id}">Edit</button>
        <button class="danger" data-del="${c.id}">Delete</button>
      </div>
    </div>`).join("");
  wrap.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const c = allCategoriesAdmin.find((x) => x.id === b.dataset.edit);
    document.getElementById("categoryEditId").value = c.id;
    document.getElementById("categoryName").value = c.name;
  }));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this category?")) await db.collection("categories").doc(b.dataset.del).delete();
  }));
}
function fillCategorySelect() {
  const sel = document.getElementById("productCategory");
  const current = sel.value;
  sel.innerHTML = allCategoriesAdmin.map((c) => `<option value="${c.id}">${escHtml(c.name)}</option>`).join("");
  if (current) sel.value = current;
}

/* =========================================================
   BRANDS
   ========================================================= */
let allBrandsAdmin = [];
function initBrands() {
  db.collection("brands").onSnapshot((snap) => {
    allBrandsAdmin = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allBrandsAdmin.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderBrandsList();
    fillBrandSelect();
  }, (err) => { console.warn("Brands listener error:", err); });
  document.getElementById("brandForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("brandEditId").value;
    const name = document.getElementById("brandName").value.trim();
    if (!name) return;
    try {
      if (editId) await db.collection("brands").doc(editId).update({ name });
      else await db.collection("brands").add({ name, order: Date.now() });
      document.getElementById("brandForm").reset();
      document.getElementById("brandEditId").value = "";
    } catch (err) { alert("Save error: " + err.message); }
  });
}
function renderBrandsList() {
  const wrap = document.getElementById("brandsList");
  if (!allBrandsAdmin.length) { wrap.innerHTML = '<p class="empty-msg">No brands yet.</p>'; return; }
  wrap.innerHTML = allBrandsAdmin.map((c) => `
    <div class="admin-item">
      <div class="item-main"><strong>${escHtml(c.name)}</strong></div>
      <div class="item-actions">
        <button data-edit="${c.id}">Edit</button>
        <button class="danger" data-del="${c.id}">Delete</button>
      </div>
    </div>`).join("");
  wrap.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const c = allBrandsAdmin.find((x) => x.id === b.dataset.edit);
    document.getElementById("brandEditId").value = c.id;
    document.getElementById("brandName").value = c.name;
  }));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this brand?")) await db.collection("brands").doc(b.dataset.del).delete();
  }));
}
function fillBrandSelect() {
  const sel = document.getElementById("productBrand");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— None —</option>' +
    allBrandsAdmin.map((c) => `<option value="${c.id}">${escHtml(c.name)}</option>`).join("");
  if (current) sel.value = current;
}

/* =========================================================
   PRODUCTS
   ========================================================= */
let allProductsAdmin = [];
let editingImages = [];
let editingVideoUrl = null;
let productListSearchTerm = "";
let productListActiveCategory = "all";

function initProducts() {
  db.collection("products").onSnapshot((snap) => {
    allProductsAdmin = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allProductsAdmin.sort((a, b) => (b.order || 0) - (a.order || 0));
    renderProductsListAdmin();
  }, (err) => { console.warn("Products listener error:", err); });
  document.getElementById("productForm").addEventListener("submit", handleProductSubmit);
  document.getElementById("productCancelEdit").addEventListener("click", resetProductForm);
  document.getElementById("productSearchInput").addEventListener("input", (e) => {
    productListSearchTerm = e.target.value.trim();
    renderProductsListAdmin();
  });
}
function renderProductFilterChips() {
  const wrap = document.getElementById("productCategoryFilterChips");
  if (!wrap) return;
  const chips = [`<button class="chip ${productListActiveCategory === "all" ? "active" : ""}" data-cat="all">All Categories</button>`];
  allCategoriesAdmin.forEach((c) => {
    chips.push(`<button class="chip ${productListActiveCategory === c.id ? "active" : ""}" data-cat="${c.id}">${escHtml(c.name)}</button>`);
  });
  wrap.innerHTML = chips.join("");
  wrap.querySelectorAll(".chip").forEach((btn) => btn.addEventListener("click", () => {
    productListActiveCategory = btn.dataset.cat;
    renderProductFilterChips();
    renderProductsListAdmin();
  }));
}
function renderProductsListAdmin() {
  const wrap = document.getElementById("productsList");
  const filtered = allProductsAdmin.filter((p) => {
    const matchesCat = productListActiveCategory === "all" || p.categoryId === productListActiveCategory;
    const matchesSearch = !productListSearchTerm || (p.name || "").toLowerCase().includes(productListSearchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });
  if (!filtered.length) { wrap.innerHTML = allProductsAdmin.length ? '<p class="empty-msg">No products match.</p>' : '<p class="empty-msg">No products yet.</p>'; return; }
  wrap.innerHTML = filtered.map((p) => {
    const cat = allCategoriesAdmin.find((c) => c.id === p.categoryId);
    const brand = allBrandsAdmin.find((b) => b.id === p.brandId);
    const img = (p.images && p.images[0]) || "";
    return `<div class="admin-item">
      ${img ? `<img src="${img}" alt="">` : ""}
      <div class="item-main">
        <strong>${escHtml(p.name || "")}</strong>
        <small>${cat ? escHtml(cat.name) : "No category"}${brand ? " · " + escHtml(brand.name) : ""} ${p.price ? "· ₹" + p.price : ""} ${p.inStock === false ? "· Out of stock" : ""}</small>
      </div>
      <div class="item-actions">
        <button data-edit="${p.id}">Edit</button>
        <button class="danger" data-del="${p.id}">Delete</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => loadProductIntoForm(b.dataset.edit)));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this product?")) await db.collection("products").doc(b.dataset.del).delete();
  }));
}
function loadProductIntoForm(id) {
  const p = allProductsAdmin.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("productEditId").value = p.id;
  document.getElementById("productName").value = p.name || "";
  document.getElementById("productCategory").value = p.categoryId || "";
  document.getElementById("productBrand").value = p.brandId || "";
  document.getElementById("productPrice").value = p.price || "";
  document.getElementById("productDesc").value = p.description || "";
  document.getElementById("productInStock").checked = p.inStock !== false;
  editingImages = p.images ? [...p.images] : [];
  editingVideoUrl = p.videoUrl || null;
  renderImagePreview();
  document.getElementById("productExistingVideoNote").classList.toggle("hidden", !editingVideoUrl);
  document.getElementById("productCancelEdit").classList.remove("hidden");
  document.getElementById("tab-products").scrollIntoView({ behavior: "smooth" });
}
function renderImagePreview() {
  const wrap = document.getElementById("productImagePreview");
  wrap.innerHTML = editingImages.map((url, i) => `
    <div class="thumb-wrap"><img src="${url}"><button type="button" data-i="${i}">×</button></div>
  `).join("");
  wrap.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    editingImages.splice(Number(btn.dataset.i), 1); renderImagePreview();
  }));
}
function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productEditId").value = "";
  document.getElementById("productCancelEdit").classList.add("hidden");
  document.getElementById("productExistingVideoNote").classList.add("hidden");
  editingImages = []; editingVideoUrl = null; renderImagePreview();
}
async function handleProductSubmit(e) {
  e.preventDefault();
  const statusEl = document.getElementById("productUploadStatus");
  const editId = document.getElementById("productEditId").value;
  const imageFiles = Array.from(document.getElementById("productImages").files);
  const videoFile = document.getElementById("productVideo").files[0];
  try {
    statusEl.textContent = imageFiles.length || videoFile ? "Uploading..." : "Saving...";
    const newImageUrls = [];
    for (const file of imageFiles) newImageUrls.push(await uploadToCloudinary(file, "image"));
    let videoUrl = editingVideoUrl;
    if (videoFile) videoUrl = await uploadToCloudinary(videoFile, "video");
    const finalImages = [...editingImages, ...newImageUrls];
    const existing = editId ? allProductsAdmin.find((p) => p.id === editId) : null;
    const data = {
      name: document.getElementById("productName").value.trim(),
      categoryId: document.getElementById("productCategory").value,
      brandId: document.getElementById("productBrand").value || null,
      price: Number(document.getElementById("productPrice").value) || null,
      description: document.getElementById("productDesc").value.trim(),
      images: finalImages,
      videoUrl: videoUrl || null,
      inStock: document.getElementById("productInStock").checked,
      order: existing ? existing.order : Date.now()
    };
    if (editId) await db.collection("products").doc(editId).update(data);
    else await db.collection("products").add(data);
    statusEl.textContent = "Saved!";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
    resetProductForm();
  } catch (err) { statusEl.textContent = "Error: " + err.message; }
}

/* =========================================================
   BANNER
   ========================================================= */
function initBanner() {
  db.collection("settings").doc("hero").onSnapshot((doc) => {
    const data = doc.exists ? doc.data() : {};
    let items = Array.isArray(data.items) ? data.items : [];
    if (!items.length && Array.isArray(data.images)) {
      items = data.images.map(url => ({ type: "image", url: url }));
    }
    renderBannerList(items);
  });

  const bannerTypeEl = document.getElementById("bannerType");
  if (bannerTypeEl) {
    bannerTypeEl.addEventListener("change", (e) => {
      const t = e.target.value;
      document.getElementById("bannerImageWrap").classList.toggle("hidden", t !== "image");
      document.getElementById("bannerVideoWrap").classList.toggle("hidden", t !== "video");
    });
  }

  document.getElementById("bannerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("bannerUploadStatus");
    const type = document.getElementById("bannerType").value;
    let file, resourceType;
    if (type === "image") { file = document.getElementById("bannerImageInput").files[0]; resourceType = "image"; }
    else { file = document.getElementById("bannerVideoInput").files[0]; resourceType = "video"; }
    if (!file) { statusEl.textContent = "Please choose a file."; return; }
    try {
      statusEl.textContent = "Uploading...";
      const url = await uploadToCloudinary(file, resourceType);
      const doc = await db.collection("settings").doc("hero").get();
      let items = [];
      if (doc.exists) {
        const d = doc.data();
        if (Array.isArray(d.items)) items = d.items.slice();
        else if (Array.isArray(d.images)) items = d.images.map(u => ({ type: "image", url: u }));
      }
      items.push({ type: type, url: url });
      await db.collection("settings").doc("hero").set({ items: items }, { merge: true });
      statusEl.textContent = "Added!";
      document.getElementById("bannerForm").reset();
      document.getElementById("bannerImageWrap").classList.remove("hidden");
      document.getElementById("bannerVideoWrap").classList.add("hidden");
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) { statusEl.textContent = "Error: " + err.message; }
  });
}
function renderBannerList(items) {
  const wrap = document.getElementById("bannerList");
  if (!items.length) { wrap.innerHTML = '<p class="empty-msg">No banner items yet.</p>'; return; }
  wrap.innerHTML = items.map((it, i) => {
    const preview = it.type === "video"
      ? '<video src="' + it.url + '" muted preload="metadata"></video>'
      : '<img src="' + it.url + '" alt="">';
    return `<div class="admin-item">
      ${preview}
      <div class="item-main">
        <strong>${it.type === "video" ? "🎥 Video" : "🖼 Image"} #${i + 1}</strong>
        <small>${escHtml((it.url || "").substring(0, 50))}...</small>
      </div>
      <div class="item-actions">
        <button data-up="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button data-down="${i}" ${i === items.length - 1 ? "disabled" : ""}>↓</button>
        <button class="danger" data-remove="${i}">Remove</button>
      </div>
    </div>`;
  }).join("");

  wrap.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", async () => {
    const i = Number(b.dataset.up); if (i === 0) return;
    const arr = items.slice();
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    await db.collection("settings").doc("hero").set({ items: arr }, { merge: true });
  }));
  wrap.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", async () => {
    const i = Number(b.dataset.down); if (i >= items.length - 1) return;
    const arr = items.slice();
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    await db.collection("settings").doc("hero").set({ items: arr }, { merge: true });
  }));
  wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Remove this item?")) return;
    const i = Number(b.dataset.remove);
    const arr = items.filter((_, idx) => idx !== i);
    await db.collection("settings").doc("hero").set({ items: arr }, { merge: true });
  }));
}

/* =========================================================
   POSTERS
   ========================================================= */
let allPosters = [];
let editingPosterImages = [];
let editingPosterVideoUrl = "";

function initPosters() {
  const form = document.getElementById("posterForm");
  if (!form) return;
  db.collection("posters").onSnapshot((snap) => {
    allPosters = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allPosters.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderPostersList();
  });
  document.getElementById("posterType").addEventListener("change", (e) => {
    const t = e.target.value;
    document.getElementById("posterImagesWrap").classList.toggle("hidden", t !== "image");
    document.getElementById("posterVideoWrap").classList.toggle("hidden", t !== "video");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("posterUploadStatus");
    const editId = document.getElementById("posterEditId").value;
    const type = document.getElementById("posterType").value;
    const linkUrl = document.getElementById("posterLinkUrl").value.trim();
    try {
      statusEl.textContent = "Saving...";
      let finalImages = [...editingPosterImages];
      let videoUrl = editingPosterVideoUrl;
      if (type === "image") {
        const files = Array.from(document.getElementById("posterImagesInput").files);
        for (const file of files) finalImages.push(await uploadToCloudinary(file, "image"));
      } else {
        const vfile = document.getElementById("posterVideoInput").files[0];
        if (vfile) videoUrl = await uploadToCloudinary(vfile, "video");
      }
      const data = { type, linkUrl, order: Date.now() };
      if (type === "image") { data.images = finalImages; data.videoUrl = ""; }
      else { data.videoUrl = videoUrl; data.images = []; }
      if (editId) { delete data.order; await db.collection("posters").doc(editId).update(data); }
      else await db.collection("posters").add(data);
      statusEl.textContent = "Saved!";
      resetPosterForm();
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) { statusEl.textContent = "Error: " + err.message; }
  });
  document.getElementById("posterCancelEdit").addEventListener("click", resetPosterForm);
}

function resetPosterForm() {
  document.getElementById("posterForm").reset();
  document.getElementById("posterEditId").value = "";
  document.getElementById("posterCancelEdit").classList.add("hidden");
  editingPosterImages = [];
  editingPosterVideoUrl = "";
  renderPosterImagePreview();
  document.getElementById("posterExistingVideoNote").textContent = "";
}

function renderPosterImagePreview() {
  const wrap = document.getElementById("posterImagePreview");
  if (!wrap) return;
  wrap.innerHTML = editingPosterImages.map((url, i) => `
    <div class="thumb-wrap"><img src="${url}"><button type="button" data-i="${i}">×</button></div>
  `).join("");
  wrap.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    editingPosterImages.splice(Number(btn.dataset.i), 1);
    renderPosterImagePreview();
  }));
}

function renderPostersList() {
  const wrap = document.getElementById("postersList");
  if (!wrap) return;
  if (!allPosters.length) { wrap.innerHTML = '<p class="empty-msg">No posters yet.</p>'; return; }
  wrap.innerHTML = allPosters.map((p) => {
    const preview = p.type === "video" ? '<video src="' + p.videoUrl + '" muted preload="metadata"></video>' :
                    (p.images && p.images[0] ? '<img src="' + p.images[0] + '" alt="">' : '');
    return `<div class="admin-item">
      ${preview}
      <div class="item-main">
        <strong>Poster (${p.type})</strong>
        <small>${p.images && p.images.length ? p.images.length + " images" : ""} ${p.linkUrl ? "· Link: " + escHtml(p.linkUrl) : ""}</small>
      </div>
      <div class="item-actions">
        <button data-p-edit="${p.id}">Edit</button>
        <button class="danger" data-p-del="${p.id}">Delete</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-p-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this poster?")) await db.collection("posters").doc(b.dataset.pDel).delete();
  }));
  wrap.querySelectorAll("[data-p-edit]").forEach((b) => b.addEventListener("click", () => {
    const p = allPosters.find((x) => x.id === b.dataset.pEdit);
    if (!p) return;
    document.getElementById("posterEditId").value = p.id;
    document.getElementById("posterType").value = p.type || "image";
    document.getElementById("posterLinkUrl").value = p.linkUrl || "";
    editingPosterImages = p.images ? [...p.images] : [];
    editingPosterVideoUrl = p.videoUrl || "";
    renderPosterImagePreview();
    document.getElementById("posterExistingVideoNote").textContent = editingPosterVideoUrl ? "A video is already attached (upload new to replace)." : "";
    document.getElementById("posterImagesWrap").classList.toggle("hidden", p.type !== "image");
    document.getElementById("posterVideoWrap").classList.toggle("hidden", p.type !== "video");
    document.getElementById("posterCancelEdit").classList.remove("hidden");
    document.getElementById("tab-posters").scrollIntoView({ behavior: "smooth" });
  }));
}

/* =========================================================
   FLOATING MENU
   ========================================================= */
let allFloatingItems = [];
const FLOATING_PRESETS = {
  rateus: { label: "Rate Us", icon: "⭐", url: "rateus.html" },
  wishlist: { label: "Wishlist", icon: "❤️", url: "action:wishlist" },
  whatsapp: { label: "WhatsApp", icon: "💬", url: "https://wa.me/91XXXXXXXXXX" },
  call: { label: "Call Us", icon: "📞", url: "tel:+91XXXXXXXXXX" },
  location: { label: "Location", icon: "📍", url: "https://maps.google.com/?q=Shree+Shiv+Alankar+Mandir" },
  offer: { label: "Special Offer", icon: "🎁", url: "https://example.com/offer" },
  youtube: { label: "YouTube", icon: "▶️", url: "https://youtube.com/@yourchannel" },
  instagram: { label: "Instagram", icon: "📸", url: "https://instagram.com/yourpage" },
  facebook: { label: "Facebook", icon: "👍", url: "https://facebook.com/yourpage" },
  twitter: { label: "Twitter / X", icon: "🐦", url: "https://x.com/yourhandle" },
  email: { label: "Email Us", icon: "✉️", url: "mailto:your@email.com" },
  website: { label: "Website", icon: "🌐", url: "https://example.com" },
  about: { label: "About Us", icon: "ℹ️", url: "about.html" },
  privacy: { label: "Privacy Policy", icon: "🔒", url: "privacy.html" },
  terms: { label: "Terms & Conditions", icon: "📄", url: "terms.html" }
};

function initFloatingMenu() {
  db.collection("floating_menu").onSnapshot((snap) => {
    allFloatingItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allFloatingItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderFloatingMenuList();
  });
  const preset = document.getElementById("floatingMenuPreset");
  if (preset) preset.addEventListener("change", (e) => {
    const key = e.target.value;
    if (!key || !FLOATING_PRESETS[key]) return;
    const p = FLOATING_PRESETS[key];
    document.getElementById("floatingMenuLabel").value = p.label;
    document.getElementById("floatingMenuIcon").value = p.icon;
    document.getElementById("floatingMenuUrl").value = p.url;
  });
  const brandPicker = document.getElementById("floatingMenuBrandPicker");
  if (brandPicker) {
    db.collection("brands").onSnapshot((snap) => {
      const brands = snap.docs.map((d) => ({ id: d.id, name: d.data().name || "", order: d.data().order || 0 }));
      brands.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
      brandPicker.innerHTML = '<option value="">— Choose a brand —</option>' +
        brands.map((b) => `<option value="${b.id}">${escHtml(b.name)}</option>`).join("");
    }, () => {});
    brandPicker.addEventListener("change", (e) => {
      const brandId = e.target.value;
      if (!brandId) return;
      const brandName = e.target.options[e.target.selectedIndex].textContent;
      document.getElementById("floatingMenuUrl").value = "action:brand:" + brandId;
      const labelEl = document.getElementById("floatingMenuLabel");
      if (!labelEl.value.trim()) labelEl.value = brandName;
      const iconEl = document.getElementById("floatingMenuIcon");
      if (!iconEl.value.trim()) iconEl.value = "💎";
    });
  }
  document.getElementById("floatingMenuForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("floatingMenuSubmitBtn");
    const editId = document.getElementById("floatingMenuEditId").value;
    const buttonId = document.getElementById("floatingMenuButtonId").value || "b1";
    const label = document.getElementById("floatingMenuLabel").value.trim();
    const icon = document.getElementById("floatingMenuIcon").value.trim();
    const url = document.getElementById("floatingMenuUrl").value.trim();
    if (!url) { alert("Please fill in the Link / Action."); return; }
    btn.disabled = true;
    try {
      if (editId) await db.collection("floating_menu").doc(editId).update({ buttonId, label, icon, url });
      else await db.collection("floating_menu").add({ buttonId, label, icon, url, order: Date.now() });
      resetFloatingMenuForm();
    } catch (err) { alert("Couldn't save: " + err.message); }
    btn.disabled = false;
  });
  document.getElementById("floatingMenuCancelEdit").addEventListener("click", resetFloatingMenuForm);
}
function resetFloatingMenuForm() {
  document.getElementById("floatingMenuForm").reset();
  document.getElementById("floatingMenuEditId").value = "";
  document.getElementById("floatingMenuButtonId").value = "b1";
  document.getElementById("floatingMenuCancelEdit").classList.add("hidden");
  document.getElementById("floatingMenuPreset").value = "";
  const bp = document.getElementById("floatingMenuBrandPicker");
  if (bp) bp.value = "";
}
function renderFloatingMenuList() {
  const wrap = document.getElementById("floatingMenuList");
  if (!allFloatingItems.length) { wrap.innerHTML = '<p class="empty-msg">No floating buttons yet.</p>'; return; }
  wrap.innerHTML = allFloatingItems.map((it) => {
    const iconKey = it.icon || "✨";
    const svgMarkup = window.mbwEmojiToSvg ? window.mbwEmojiToSvg(iconKey) : null;
    const previewIcon = svgMarkup ? '<span class="fm-preview-svg">' + svgMarkup + '</span>' : escHtml(iconKey);
    return `
    <div class="admin-item">
      <div class="fm-preview-icon">${previewIcon}</div>
      <div class="item-main">
        <strong>${escHtml(it.label || "(no name)")} <span class="btn-badge">${escHtml(it.buttonId || "b1")}</span></strong>
        <small>→ ${escHtml(it.url || "")}${it.icon ? "" : " · auto emoji"}</small>
      </div>
      <div class="item-actions">
        <button data-fm-edit="${it.id}">Edit</button>
        <button class="danger" data-fm-del="${it.id}">Delete</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-fm-edit]").forEach((b) => b.addEventListener("click", () => {
    const it = allFloatingItems.find((x) => x.id === b.dataset.fmEdit);
    if (!it) return;
    document.getElementById("floatingMenuEditId").value = it.id;
    document.getElementById("floatingMenuButtonId").value = it.buttonId || "b1";
    document.getElementById("floatingMenuLabel").value = it.label || "";
    document.getElementById("floatingMenuIcon").value = it.icon || "";
    document.getElementById("floatingMenuUrl").value = it.url || "";
    document.getElementById("floatingMenuPreset").value = "";
    document.getElementById("floatingMenuCancelEdit").classList.remove("hidden");
    document.getElementById("tab-floating").scrollIntoView({ behavior: "smooth" });
  }));
  wrap.querySelectorAll("[data-fm-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this floating button?")) await db.collection("floating_menu").doc(b.dataset.fmDel).delete();
  }));
}

/* =========================================================
   SHOP SETTINGS
   ========================================================= */
function initSettings() {
  db.collection("settings").doc("general").get().then((doc) => {
    const d = doc.exists ? doc.data() : {};
    document.getElementById("settingShopName").value = d.shopName || "Shree Shiv Alankar Mandir";
    document.getElementById("settingTagline").value = d.tagline || "";
    document.getElementById("settingAddress").value = d.address || "Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur";
    document.getElementById("settingPhone").value = d.phone || "";
    document.getElementById("settingWhatsapp").value = d.whatsapp || "";
    document.getElementById("settingHeroEyebrow").value = d.heroEyebrow || "";
    document.getElementById("settingHeroHeadline").value = d.heroHeadline || "";
    document.getElementById("settingHeroDescription").value = d.heroDescription || "";
    document.getElementById("settingFooterTagline").value = d.footerTagline || "";
  });
  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("settingsStatus");
    const data = {
      shopName: document.getElementById("settingShopName").value.trim(),
      tagline: document.getElementById("settingTagline").value.trim(),
      address: document.getElementById("settingAddress").value.trim(),
      phone: document.getElementById("settingPhone").value.trim(),
      whatsapp: document.getElementById("settingWhatsapp").value.trim(),
      heroEyebrow: document.getElementById("settingHeroEyebrow").value.trim(),
      heroHeadline: document.getElementById("settingHeroHeadline").value.trim(),
      heroDescription: document.getElementById("settingHeroDescription").value.trim(),
      footerTagline: document.getElementById("settingFooterTagline").value.trim()
    };
    await db.collection("settings").doc("general").set(data, { merge: true });
    statusEl.textContent = "Saved!";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
  });
}

/* =========================================================
   SOCIAL LINKS
   ========================================================= */
let allSocialLinksAdmin = [];
function initSocialLinks() {
  db.collection("social_links").onSnapshot((snap) => {
    allSocialLinksAdmin = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allSocialLinksAdmin.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderSocialLinksList();
  });
  document.getElementById("socialLinkForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("socialLinkEditId").value;
    const platform = document.getElementById("socialLinkPlatform").value;
    const label = document.getElementById("socialLinkLabel").value.trim();
    const url = document.getElementById("socialLinkUrl").value.trim();
    if (!url) return;
    if (editId) await db.collection("social_links").doc(editId).update({ platform, label, url });
    else await db.collection("social_links").add({ platform, label, url, order: Date.now() });
    document.getElementById("socialLinkForm").reset();
    document.getElementById("socialLinkEditId").value = "";
  });
}
function renderSocialLinksList() {
  const wrap = document.getElementById("socialLinksList");
  if (!allSocialLinksAdmin.length) { wrap.innerHTML = '<p class="empty-msg">No social links yet.</p>'; return; }
  wrap.innerHTML = allSocialLinksAdmin.map((l) => `
    <div class="admin-item">
      <div class="item-main"><strong>${escHtml(l.label || l.platform)}</strong><small>${escHtml(l.platform)} · ${escHtml(l.url)}</small></div>
      <div class="item-actions">
        <button data-edit="${l.id}">Edit</button>
        <button class="danger" data-del="${l.id}">Delete</button>
      </div>
    </div>`).join("");
  wrap.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const l = allSocialLinksAdmin.find((x) => x.id === b.dataset.edit);
    document.getElementById("socialLinkEditId").value = l.id;
    document.getElementById("socialLinkPlatform").value = l.platform;
    document.getElementById("socialLinkLabel").value = l.label || "";
    document.getElementById("socialLinkUrl").value = l.url;
  }));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this social link?")) await db.collection("social_links").doc(b.dataset.del).delete();
  }));
}

/* =========================================================
   REVIEWS
   ========================================================= */
let wordsRevealed = false;
let allReviewsAdmin = [];
let reviewsPrivateMap = {};
let allBadWords = [];
let testAudioSource = null;
let badWordsExpanded = false;

function stopTestAudio() { if (testAudioSource) { try { testAudioSource.stop(); } catch (e) {} testAudioSource = null; } }
async function playAudioFromUrl(url) {
  stopTestAudio();
  if (!url) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url); const buf = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    const source = ctx.createBufferSource(); source.buffer = audioBuffer; source.connect(ctx.destination); source.start();
    testAudioSource = source;
  } catch (e) {}
}
function maskWord(w) { if (w.length <= 1) return "*"; return w[0] + "*".repeat(w.length - 1); }

function renderReviewsAdminList() {
  const wrap = document.getElementById("reviewsAdminList");
  if (!allReviewsAdmin.length) { wrap.innerHTML = '<p class="empty-msg">No reviews yet.</p>'; return; }
  wrap.innerHTML = allReviewsAdmin.map((r) => {
    const when = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString("en-IN") : "—";
    const address = reviewsPrivateMap[r.id] || "(not found)";
    const replyLine = r.ownerReply ? `<small>Your reply: "${escHtml(r.ownerReply)}"</small>` : "";
    return `<div class="admin-item">
      <div class="item-main">
        <strong>${escHtml(r.name)} — ${"★".repeat(r.stars || 0)}${"☆".repeat(5 - (r.stars || 0))}</strong>
        <small>${escHtml(r.description || "")}</small>
        <small>Address: ${escHtml(address)} · ${when}</small>
        ${replyLine}
      </div>
      <div class="item-actions">
        <button data-reply-review="${r.id}">${r.ownerReply ? "Edit Reply" : "Reply"}</button>
        <button class="danger" data-del-review="${r.id}">Delete</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-del-review]").forEach((b) => b.addEventListener("click", async () => {
    if (confirm("Delete this review?")) {
      await db.collection("reviews").doc(b.dataset.delReview).delete();
      await db.collection("reviews_private").doc(b.dataset.delReview).delete().catch(() => {});
    }
  }));
  wrap.querySelectorAll("[data-reply-review]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.replyReview;
    const existing = allReviewsAdmin.find((r) => r.id === id);
    const reply = prompt("Your public reply:", existing && existing.ownerReply ? existing.ownerReply : "");
    if (reply === null) return;
    await db.collection("reviews").doc(id).update({ ownerReply: reply.trim(), ownerReplyAt: firebase.firestore.FieldValue.serverTimestamp() });
  }));
}

function renderBadWordsList() {
  const wrap = document.getElementById("badWordsList");
  if (!allBadWords.length) { wrap.innerHTML = '<p class="empty-msg">No words yet.</p>'; return; }
  const showCount = 5;
  const visible = badWordsExpanded ? allBadWords : allBadWords.slice(0, showCount);
  const rest = allBadWords.length - showCount;
  let html = visible.map((w) => `
    <div class="admin-item">
      <div class="item-main"><strong>${escHtml(wordsRevealed ? w : maskWord(w))}</strong></div>
      <div class="item-actions"><button class="danger" data-del-word="${escHtml(w)}">Remove</button></div>
    </div>`).join("");
  if (rest > 0) html += `<button type="button" class="secondary-btn" id="toggleBadWordsExpand">${badWordsExpanded ? "▲ Fewer" : `▼ All (${allBadWords.length})`}</button>`;
  wrap.innerHTML = html;
  wrap.querySelectorAll("[data-del-word]").forEach((b) => b.addEventListener("click", async () => {
    const updated = allBadWords.filter((w) => w !== b.dataset.delWord);
    await db.collection("settings").doc("bad_words").set({ words: updated }, { merge: true });
  }));
  const toggleBtn = document.getElementById("toggleBadWordsExpand");
  if (toggleBtn) toggleBtn.addEventListener("click", () => { badWordsExpanded = !badWordsExpanded; renderBadWordsList(); });
}

function initCustomerReviews() {
  function refreshTotalCount() {
    try {
      db.collection("reviews").get().then((snap) => {
        document.getElementById("reviewsTotalCount").textContent = "Total feedback received: " + (snap.size || 0);
      }).catch(() => {
        document.getElementById("reviewsTotalCount").textContent = "Total feedback received: —";
      });
    } catch (e) {
      document.getElementById("reviewsTotalCount").textContent = "Total feedback received: —";
    }
  }
  refreshTotalCount();

  db.collection("reviews").limit(50).onSnapshot((snap) => {
    let arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    arr.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    allReviewsAdmin = arr.slice(0, 20);
    renderReviewsAdminList(); refreshTotalCount();
  }, () => {});

  db.collection("reviews_private").onSnapshot((snap) => {
    const map = {}; snap.docs.forEach((d) => { map[d.id] = (d.data() || {}).address || ""; });
    reviewsPrivateMap = map; renderReviewsAdminList();
  }, () => {});

  db.collection("settings").doc("bad_words").onSnapshot((doc) => {
    allBadWords = doc.exists ? (doc.data().words || []) : [];
    renderBadWordsList();
  });

  document.getElementById("toggleWordsVisible").addEventListener("click", () => {
    wordsRevealed = !wordsRevealed;
    document.getElementById("toggleWordsVisible").textContent = wordsRevealed ? "🙈 Mask" : "👁 Show";
    renderBadWordsList();
  });

  document.getElementById("badWordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("badWordInput");
    const status = document.getElementById("badWordStatus");
    const w = input.value.trim().toLowerCase();
    if (!w) return;
    status.textContent = "Saving...";
    try {
      if (!allBadWords.includes(w)) await db.collection("settings").doc("bad_words").set({ words: firebase.firestore.FieldValue.arrayUnion(w) }, { merge: true });
      input.value = ""; status.textContent = "Added.";
    } catch (err) { status.textContent = "Couldn't save."; }
  });

  document.getElementById("badWordBulkForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = document.getElementById("badWordBulkInput");
    const status = document.getElementById("badWordStatus");
    const words = textarea.value.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0);
    const uniqueNew = [...new Set(words)].filter((w) => !allBadWords.includes(w));
    if (!uniqueNew.length) { status.textContent = "Nothing new."; return; }
    try {
      await db.collection("settings").doc("bad_words").set({ words: firebase.firestore.FieldValue.arrayUnion(...uniqueNew) }, { merge: true });
      textarea.value = ""; status.textContent = "Added " + uniqueNew.length + " words.";
    } catch (err) { status.textContent = "Couldn't save."; }
  });

  db.collection("settings").doc("feedback").get().then((doc) => {
    const d = doc.exists ? doc.data() : {};
    document.getElementById("feedbackThankYouText").value = d.thankYouText || "Thank you for your feedback!";
    document.getElementById("feedbackAnimDuration").value = d.animationSeconds || 5;
  });

  document.getElementById("feedbackSettingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("feedbackSettingsStatus");
    const text = document.getElementById("feedbackThankYouText").value.trim() || "Thank you for your feedback!";
    let secs = parseInt(document.getElementById("feedbackAnimDuration").value, 10);
    if (!secs || secs < 2) secs = 5;
    if (secs > 15) secs = 15;
    await db.collection("settings").doc("feedback").set({ thankYouText: text, animationSeconds: secs }, { merge: true });
    statusEl.textContent = "Saved!";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
  });

  document.getElementById("celebrationSoundSaveBtn").addEventListener("click", async () => {
    const statusEl = document.getElementById("celebrationSoundStatus");
    const file = document.getElementById("celebrationSoundInput").files[0];
    if (!file) { statusEl.textContent = "Choose audio."; return; }
    try {
      statusEl.textContent = "Uploading...";
      const url = await uploadToCloudinary(file, "video");
      await db.collection("settings").doc("feedback").set({ celebrationAudioUrl: url }, { merge: true });
      statusEl.textContent = "Saved!"; setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) { statusEl.textContent = "Error: " + err.message; }
  });

  document.getElementById("celebrationSoundTestBtn").addEventListener("click", async () => {
    const doc = await db.collection("settings").doc("feedback").get();
    const url = doc.exists ? doc.data().celebrationAudioUrl : "";
    if (url) { playAudioFromUrl(url); setTimeout(stopTestAudio, 5000); }
  });

  document.getElementById("abuseSoundSaveBtn").addEventListener("click", async () => {
    const statusEl = document.getElementById("abuseSoundStatus");
    const file = document.getElementById("abuseSoundInput").files[0];
    if (!file) { statusEl.textContent = "Choose audio."; return; }
    try {
      statusEl.textContent = "Uploading...";
      const url = await uploadToCloudinary(file, "video");
      await db.collection("settings").doc("feedback").set({ abuseSirenUrl: url }, { merge: true });
      statusEl.textContent = "Saved!"; setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) { statusEl.textContent = "Error: " + err.message; }
  });

  document.getElementById("abuseSoundTestBtn").addEventListener("click", async () => {
    const doc = await db.collection("settings").doc("feedback").get();
    const url = doc.exists ? doc.data().abuseSirenUrl : "";
    if (url) { playAudioFromUrl(url); setTimeout(stopTestAudio, 3000); }
  });
                              }
