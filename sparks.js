/* =========================================================
   MBW Name Sparks — Premium Gold Fairy Dust
   Rahul Maurya ke naam ke around 3 tarah ke sparks udte hain:
   ✦ 4-point star, ● dot, ◆ diamond
   Upar ki taraf biased motion, twinkle, aur gold glow.
   ========================================================= */
(function setupNameSparks() {
  // Gold-heavy palette — matches shop's red+gold theme
  const COLORS = [
    '#ffd700', // rich gold
    '#ffb300', // amber
    '#f5c451', // brand gold
    '#ffe082', // light gold
    '#fff8c4', // pale gold
    '#ffffff', // white
    '#ff8a65'  // warm ember (occasional)
  ];
  const TYPES = ['star', 'dot', 'diamond'];

  const MIN_LIFETIME = 1400;
  const MAX_LIFETIME = 2200;
  const SPAWN_INTERVAL_MS = 180;
  const SPARKS_PER_TICK = 2;

  function spawnOne(host, rect) {
    const spark = document.createElement('span');
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    spark.className = 'name-spark name-spark-' + type;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    spark.style.setProperty('--spark-color', color);

    // Position: full width, middle band vertically (near letters)
    const startX = Math.random() * rect.width;
    const startY = rect.height * (0.25 + Math.random() * 0.5);
    spark.style.left = startX + 'px';
    spark.style.top = startY + 'px';

    // Upward biased direction (embers rising), slight sideways
    const isBig = Math.random() < 0.12;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const distance = isBig ? 45 + Math.random() * 45 : 20 + Math.random() * 35;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    spark.style.setProperty('--dx', dx.toFixed(1) + 'px');
    spark.style.setProperty('--dy', dy.toFixed(1) + 'px');

    // Size
    const size = isBig
      ? (5 + Math.random() * 2.5).toFixed(1)
      : (2 + Math.random() * 2).toFixed(1);
    spark.style.width = size + 'px';
    spark.style.height = size + 'px';

    // Random rotation for stars/diamonds
    spark.style.setProperty('--rotate', (Math.random() * 360).toFixed(0) + 'deg');

    // Random duration
    const duration = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
    spark.style.animationDuration = duration.toFixed(0) + 'ms';

    host.appendChild(spark);
    setTimeout(() => {
      if (spark.parentNode) spark.parentNode.removeChild(spark);
    }, duration);
  }

  function startSpawning(host) {
    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.classList.add('spark-host');

    setInterval(() => {
      if (document.hidden) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      for (let i = 0; i < SPARKS_PER_TICK; i++) spawnOne(host, rect);
    }, SPAWN_INTERVAL_MS);
  }

  function init() {
    document.querySelectorAll('.shimmer-name').forEach(startSpawning);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // New shimmer-name elements handle karo (dynamic pages ke liye)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.classList && n.classList.contains('shimmer-name')) startSpawning(n);
        if (n.querySelectorAll) n.querySelectorAll('.shimmer-name').forEach(startSpawning);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
