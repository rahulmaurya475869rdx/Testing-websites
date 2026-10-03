/* =========================================================
   Rate Us — Shree Shiv Alankar Mandir
   ========================================================= */

let selectedStars = 0;
let myDeviceId = null;
let hasExistingReview = false;

/* ---------- star picker ---------- */
const starSpans = document.querySelectorAll("#starPicker span");
function paintStars() {
  starSpans.forEach((s) => {
    s.classList.toggle("selected", parseInt(s.dataset.star, 10) <= selectedStars);
  });
}
starSpans.forEach((span) => {
  span.addEventListener("click", () => {
    selectedStars = parseInt(span.dataset.star, 10);
    paintStars();
  });
});

function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

/* ---------- audio ---------- */
let __rateusAudioSource = null;
async function playAudioFromUrl(url) {
  if (!url) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
    __rateusAudioSource = source;
  } catch (e) {}
}

function vibrateOnce() {
  if (!navigator.vibrate) return;
  navigator.vibrate([300, 150, 300]);
}

/* ---------- outcome screens ---------- */
function showNotice(message) {
  document.getElementById("rateusForm").classList.add("hidden");
  const notice = document.getElementById("rateusNotice");
  notice.textContent = message;
  notice.classList.remove("hidden");
}

function showAbuseAlert() {
  document.getElementById("rateusForm").classList.add("hidden");
  document.getElementById("rateusAbuseAlert").classList.remove("hidden");
  db.collection("settings").doc("feedback").get().then((doc) => {
    const url = doc.exists ? doc.data().abuseSirenUrl : "";
    playAudioFromUrl(url);
  });
  vibrateOnce();
}

async function showCelebration() {
  const doc = await db.collection("settings").doc("feedback").get();
  const d = doc.exists ? doc.data() : {};
  const text = d.thankYouText || "Thank you for your feedback!";
  let seconds = d.animationSeconds || 5;
  if (seconds < 2) seconds = 2;
  if (seconds > 15) seconds = 15;

  document.getElementById("rateusThankYouText").textContent = text;

  const overlay = document.getElementById("rateusCelebrate");
  const fallWrap = document.getElementById("rateusFallWrap");
  fallWrap.innerHTML = "";
  const emojis = ["⭐", "✨", "💎", "💍", "🌟"];
  for (let i = 0; i < 34; i++) {
    const span = document.createElement("span");
    span.className = "fall-particle";
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = Math.random() * 100 + "%";
    span.style.fontSize = (1.1 + Math.random() * 1.3) + "rem";
    span.style.animationDuration = (seconds * 0.55 + Math.random() * seconds * 0.55) + "s";
    span.style.animationDelay = (Math.random() * seconds * 0.35) + "s";
    fallWrap.appendChild(span);
  }

  overlay.classList.remove("hidden");
  if (d.celebrationAudioUrl) playAudioFromUrl(d.celebrationAudioUrl);

  setTimeout(() => {
    overlay.classList.add("hidden");
    fallWrap.innerHTML = "";
    showPlainThanks();
  }, seconds * 1000);
}

function showPlainThanks() {
  document.getElementById("rateusForm").classList.add("hidden");
  const notice = document.getElementById("rateusNotice");
  notice.textContent = "Thank you for sharing your feedback — we appreciate it.";
  notice.classList.remove("hidden");
}

/* ---------- pre-checks ---------- */
async function checkAccessAndInit() {
  myDeviceId = getSimpleDeviceId();
  try {
    const existing = await db.collection("reviews").doc(myDeviceId).get();
    if (existing.exists) {
      hasExistingReview = true;
      const d = existing.data();
      selectedStars = d.stars || 0;
      paintStars();
      document.getElementById("rateusName").value = d.name || "";
      document.getElementById("rateusDescription").value = d.description || "";
      document.querySelector("#rateusForm button[type=submit]").textContent = "Update Feedback";
      const hint = document.getElementById("rateusFormStatus");
      hint.textContent = "You've already shared feedback — editing it below will update your entry.";
    }
  } catch (e) {}
  document.getElementById("rateusForm").classList.remove("hidden");
}

/* ---------- form submit ---------- */
document.getElementById("rateusForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("rateusFormStatus");
  statusEl.textContent = "";

  if (selectedStars < 1) { statusEl.textContent = "Please select a star rating."; return; }
  const name = document.getElementById("rateusName").value.trim();
  const address = document.getElementById("rateusAddress").value.trim();
  const description = document.getElementById("rateusDescription").value.trim();
  if (!name) { statusEl.textContent = "Please enter your name."; return; }
  if (!address) { statusEl.textContent = "Please enter your address."; return; }

  const submitBtn = document.querySelector("#rateusForm button[type=submit]");
  submitBtn.disabled = true;
  statusEl.textContent = "Submitting...";

  try {
    const deviceId = myDeviceId || getSimpleDeviceId();

    // Bad words check
    const badWordsDoc = await db.collection("settings").doc("bad_words").get();
    const badWords = badWordsDoc.exists ? (badWordsDoc.data().words || []) : [];
    const combinedText = (name + " " + description).toLowerCase();
    const hitWord = badWords.find((w) => {
      if (!w) return false;
      try {
        const re = new RegExp("\\b" + w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        return re.test(combinedText);
      } catch (e) { return false; }
    });

    if (hitWord) {
      showAbuseAlert();
      return;
    }

    const wasNewReview = !hasExistingReview;
    const reviewRef = db.collection("reviews").doc(deviceId);
    await reviewRef.set({
      name: name,
      stars: selectedStars,
      description: description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection("reviews_private").doc(deviceId).set({ address: address }, { merge: true });

    if (wasNewReview) hasExistingReview = true;

    try { loadTotalCount(); } catch (e) {}

    if (selectedStars >= 4) {
      showCelebration();
    } else {
      showPlainThanks();
    }
  } catch (err) {
    statusEl.textContent = "Something went wrong: " + (err && err.message ? err.message : "please try again.");
    submitBtn.disabled = false;
  }
});

/* ---------- public review list ---------- */
let allPublicReviews = [];
let visibleCount = 5;

function renderPublicReviews() {
  const wrap = document.getElementById("rateusList");
  const toShow = allPublicReviews.slice(0, visibleCount);
  if (!toShow.length) {
    wrap.innerHTML = '<p class="empty-msg">No reviews yet — be the first to share your experience!</p>';
  } else {
    wrap.innerHTML = toShow.map((r) => {
      const when = r.createdAt && r.createdAt.toDate
        ? r.createdAt.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
        : "";
      const stars = "★".repeat(r.stars || 0) + "☆".repeat(5 - (r.stars || 0));
      const reply = r.ownerReply
        ? `<div class="owner-reply"><strong>Shop's reply:</strong> ${escapeHtml(r.ownerReply)}</div>`
        : "";
      return `<div class="review-card">
        <span class="review-stars">${stars}</span>
        <p class="review-name">${escapeHtml(r.name)}</p>
        ${r.description ? `<p class="review-desc">${escapeHtml(r.description)}</p>` : ""}
        <p class="review-date">${when}</p>
        ${reply}
      </div>`;
    }).join("");
  }
  const moreBtn = document.getElementById("rateusMoreBtn");
  if (visibleCount < allPublicReviews.length) moreBtn.classList.remove("hidden");
  else moreBtn.classList.add("hidden");
}

document.getElementById("rateusMoreBtn").addEventListener("click", () => {
  visibleCount = Math.min(visibleCount + 5, 20);
  renderPublicReviews();
});

function loadReviews() {
  db.collection("reviews").limit(50).onSnapshot((snap) => {
    let arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    arr.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    allPublicReviews = arr.slice(0, 20);
    renderPublicReviews();
  }, () => {
    document.getElementById("rateusList").innerHTML = '<p class="empty-msg">Couldn\u2019t load reviews right now.</p>';
  });
}

/* ---------- total count ---------- */
function loadTotalCount() {
  try {
    db.collection("reviews").get().then((snap) => {
      const total = snap.size || 0;
      document.getElementById("rateusTotalCount").textContent = "Total feedback received: " + total;
    }).catch(() => {
      document.getElementById("rateusTotalCount").textContent = "Total feedback received: —";
    });
  } catch (e) {
    document.getElementById("rateusTotalCount").textContent = "Total feedback received: —";
  }
}

checkAccessAndInit();
loadReviews();
loadTotalCount();
setInterval(loadTotalCount, 60 * 1000);
