/* =========================================================
   Shree Shiv Alankar Mandir — Shared Helpers
   ========================================================= */

/* ---------- HTML escape ---------- */
function escHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
var escapeHtml = escHtml;
var escapeHtmlA = escHtml;

/* ---------- Simple device ID (localStorage based) ---------- */
/* Replaces the old canvas+WebGL fingerprint system. */
function getSimpleDeviceId() {
  try {
    let id = localStorage.getItem("ssam_device_id");
    if (!id) {
      id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("ssam_device_id", id);
    }
    return id;
  } catch (e) {
    return "dev_fallback_" + Math.random().toString(36).slice(2, 10);
  }
}

/* ---------- Social icons ---------- */
function socialIconSvg(platform) {
  const emojiMap = {
    youtube:   "▶️",
    instagram: "📸",
    facebook:  "📘",
    whatsapp:  "💬",
    maps:      "📍",
    twitter:   "🐦",
    website:   "🌐"
  };
  const emoji = emojiMap[platform] || emojiMap.website;
  if (window.mbwEmojiToSvg) {
    const svg = window.mbwEmojiToSvg(emoji);
    if (svg) return svg;
  }
  const fallback = {
    youtube:   '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="10,9 10,15 15,12" fill="currentColor"/></svg>',
    instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
    facebook:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="16.5" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">f</text></svg>',
    whatsapp:  '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.6 19L4 20Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg>',
    maps:      '<svg viewBox="0 0 24 24"><path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9" r="2.3" fill="currentColor"/></svg>',
    twitter:   '<svg viewBox="0 0 24 24"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.2"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2.2"/></svg>',
    website:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  return fallback[platform] || fallback.website;
}

/* ---------- Render social links ---------- */
function renderSocialLinksFromFirestore() {
  if (typeof db === "undefined") return;
  var wrap = document.getElementById("socialLinks");
  if (!wrap) return;
  db.collection("social_links").onSnapshot(function (snap) {
    var arr = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    arr.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    wrap.innerHTML = arr.map(function (l) {
      var label = l.label || l.platform || "Link";
      return '<a href="' + escHtml(l.url) + '" target="_blank" rel="noopener" aria-label="' + escHtml(label) + '">' +
        '<span class="social-icon-circle">' + socialIconSvg(l.platform) + '</span>' +
        '<span class="social-label">' + escHtml(label) + '</span>' +
        '</a>';
    }).join("");
  }, function () {});
}

/* ---------- Render footer ---------- */
function renderFooterFromFirestore() {
  if (typeof db === "undefined") return;
  db.collection("settings").doc("general").get().then(function (doc) {
    var d = doc.exists ? doc.data() : {};
    var shopName = d.shopName || "Shree Shiv Alankar Mandir";
    var address = d.address || "Robertsganj road, Devpura, Bhawa Bazar, Marihan, Mirzapur";

    var fName = document.getElementById("footerShopName");
    if (fName) fName.textContent = shopName;
    var fTag = document.getElementById("footerTagline");
    if (fTag) fTag.textContent = d.footerTagline || "Timeless jewellery, trusted since generations.";
    var fAddr = document.getElementById("footerAddressLine");
    if (fAddr) fAddr.textContent = address;
    var cAddr = document.getElementById("contactAddress");
    if (cAddr) cAddr.textContent = address;

    var cLine = document.getElementById("copyrightLine");
    if (cLine) {
      cLine.innerHTML = '© ' + new Date().getFullYear() + ' ' + escHtml(shopName) +
        '. All Rights Reserved. | Designed &amp; Developed by ' +
        '<a href="developer.html" class="credit-name shimmer-name">Rahul Maurya</a>';
    }
  }).catch(function () {});
}
