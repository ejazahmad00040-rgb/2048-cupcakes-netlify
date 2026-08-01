/**
 * GameJuice v3 — impossible to miss party feel
 */
var GameJuice = (function () {
  "use strict";

  var combo = 0;
  var started = false;
  var seenTiers = {};
  var sparkleCanvas = null;
  var sparkleCtx = null;
  var sparkleAnim = null;

  var TIER_PARTY = {
    64: { title: "❄️ MINTY!", sub: "Chocolate Mint Fudge" },
    128: { title: "🕸️ WEB SPUN!", sub: "Chocolate Spider Web" },
    256: { title: "🔥 TOASTY!", sub: "Toasted Marshmallow" },
    512: { title: "🍪 BOSS MODE!", sub: "Cookies and Creme" },
    1024: { title: "🍨 SUNDAE TIME!", sub: "Chocolate Sundae" },
    2048: { title: "🎉 YOU WIN! 🎉", sub: "White Chocolate Peppermint!" },
    4096: { title: "👑 LEGEND!", sub: "Confetti Vanilla!" },
    8192: { title: "🌈 RAINBOW GOD!", sub: "Ultimate master!" }
  };

  var EMOJIS = ["🧁", "✨", "🎉", "💖", "⭐", "🍰", "💫", "🔥"];

  function $(id) { return document.getElementById(id); }

  function init() {
    buildFlash();
    buildSplashLayer();
    buildComboHud();
    buildMergePopup();
    buildSparkles();
    bindStart();
    startGame(true);
  }

  function buildFlash() {
    if ($("juice-flash")) return;
    var f = document.createElement("div");
    f.id = "juice-flash";
    f.className = "juice-flash";
    document.body.appendChild(f);
  }

  function buildSplashLayer() {
    if ($("juice-splash-layer")) return;
    var layer = document.createElement("div");
    layer.id = "juice-splash-layer";
    layer.className = "juice-splash-layer";
    document.body.appendChild(layer);
  }

  function buildComboHud() {
    if ($("juice-combo-hud")) return;
    var hud = document.createElement("div");
    hud.id = "juice-combo-hud";
    hud.className = "juice-combo-hud juice-combo-hud--idle";
    hud.innerHTML =
      '<span class="juice-combo-hud__fire">🔥</span>' +
      '<span class="juice-combo-hud__text">COMBO <strong id="juice-combo-num">x0</strong></span>';
    document.body.appendChild(hud);
  }

  function buildMergePopup() {
    if ($("juice-merge-popup")) return;
    var pop = document.createElement("div");
    pop.id = "juice-merge-popup";
    pop.className = "juice-merge-popup";
    pop.innerHTML =
      '<div class="juice-merge-popup__card">' +
        '<button type="button" class="juice-merge-popup__close" aria-label="Close">✕</button>' +
        '<img class="juice-merge-popup__img" src="" alt="New cupcake">' +
        '<div class="juice-merge-popup__badge">NEW!</div>' +
        '<h3 class="juice-merge-popup__title"></h3>' +
        '<p class="juice-merge-popup__kcal"></p>' +
      "</div>";
    pop.addEventListener("click", function (e) {
      if (e.target === pop || e.target.closest(".juice-merge-popup__close")) hideMergePopup();
    });
    document.body.appendChild(pop);
  }

  function buildSparkles() {
    var wrap = document.querySelector(".game-wrap");
    if (!wrap || $("juice-sparkle-canvas")) return;
    sparkleCanvas = document.createElement("canvas");
    sparkleCanvas.id = "juice-sparkle-canvas";
    sparkleCanvas.className = "juice-sparkle-canvas";
    wrap.insertBefore(sparkleCanvas, wrap.firstChild);
    sparkleCtx = sparkleCanvas.getContext("2d");
    resizeSparkles();
    window.addEventListener("resize", resizeSparkles);
  }

  function resizeSparkles() {
    if (!sparkleCanvas) return;
    var wrap = document.querySelector(".game-wrap");
    if (!wrap) return;
    sparkleCanvas.width = wrap.offsetWidth;
    sparkleCanvas.height = wrap.offsetHeight;
  }

  function startSparkles() {
    if (!sparkleCtx || sparkleAnim) return;
    var dots = [];
    for (var i = 0; i < 40; i++) {
      dots.push({
        x: Math.random() * sparkleCanvas.width,
        y: Math.random() * sparkleCanvas.height,
        r: Math.random() * 3 + 1,
        a: Math.random(),
        sp: Math.random() * 0.02 + 0.005
      });
    }
    function frame() {
      if (!started) return;
      sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);
      dots.forEach(function (d) {
        d.a += d.sp;
        if (d.a > 1) d.a = 0;
        var alpha = d.a < 0.5 ? d.a * 2 : (1 - d.a) * 2;
        sparkleCtx.beginPath();
        sparkleCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        sparkleCtx.fillStyle = "rgba(246,112,152," + alpha + ")";
        sparkleCtx.fill();
      });
      sparkleAnim = requestAnimationFrame(frame);
    }
    frame();
  }

  function bindStart() {
    document.addEventListener("keydown", function (e) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0) {
        ensureStarted();
      }
    });
    document.addEventListener("touchstart", function () { ensureStarted(); }, { passive: true });
  }

  function startGame(quiet) {
    if (started) return;
    started = true;
    document.body.classList.add("party-mode-active");
    startSparkles();
    if (!quiet && window.SoundManager) {
      SoundManager.unlock();
      if (SoundManager.isMusicEnabled()) SoundManager.startMusic();
    }
  }

  function ensureStarted() {
    if (!started) startGame(false);
    if (window.SoundManager) {
      SoundManager.unlock();
      if (SoundManager.isMusicEnabled()) SoundManager.startMusic();
    }
  }

  function flashScreen(color) {
    var f = $("juice-flash");
    if (!f) return;
    f.style.background = color || "rgba(246, 112, 152, 0.65)";
    f.classList.remove("juice-flash--on");
    void f.offsetWidth;
    f.classList.add("juice-flash--on");
  }

  function showSplash(main, emoji, sub) {
    var layer = $("juice-splash-layer");
    if (!layer) return;
    var el = document.createElement("div");
    el.className = "juice-merge-splash";
    el.innerHTML =
      '<div class="juice-merge-splash__ring"></div>' +
      '<span class="juice-merge-splash__emoji">' + (emoji || "🧁") + '</span>' +
      '<span class="juice-merge-splash__word">' + main + '</span>' +
      (sub ? '<span class="juice-merge-splash__sub">' + sub + '</span>' : "");
    layer.appendChild(el);
    setTimeout(function () {
      el.classList.add("juice-merge-splash--out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 900);
  }

  function emojiBurst(cell) {
    var board = document.querySelector(".game-container");
    if (!board || !cell) return;
    var rect = board.getBoundingClientRect();
    var tileSize = board.offsetWidth / 4;
    var cx = rect.left + (cell.x + 0.5) * tileSize;
    var cy = rect.top + (cell.y + 0.5) * tileSize;

    for (var i = 0; i < 8; i++) {
      var em = document.createElement("span");
      em.className = "juice-emoji-burst";
      em.textContent = EMOJIS[i % EMOJIS.length];
      em.style.left = cx + "px";
      em.style.top = cy + "px";
      em.style.setProperty("--ex", (Math.random() * 120 - 60) + "px");
      em.style.setProperty("--ey", (Math.random() * -100 - 40) + "px");
      document.body.appendChild(em);
      setTimeout(function (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }.bind(null, em), 800);
    }
  }

  function pulseBoard() {
    var board = document.querySelector(".game-container");
    if (!board) return;
    board.classList.remove("juice-board-pulse");
    void board.offsetWidth;
    board.classList.add("juice-board-pulse");
    setTimeout(function () { board.classList.remove("juice-board-pulse"); }, 550);
  }

  function updateComboHud() {
    var hud = $("juice-combo-hud");
    var num = $("juice-combo-num");
    if (!hud || !num) return;
    num.textContent = "x" + combo;
    if (combo >= 2) {
      hud.className = "juice-combo-hud juice-combo-hud--hot";
      hud.style.display = "flex";
    } else if (combo === 1) {
      hud.className = "juice-combo-hud juice-combo-hud--warm";
      hud.style.display = "flex";
    } else {
      hud.className = "juice-combo-hud juice-combo-hud--idle";
      hud.style.display = "none";
    }
  }

  function floatKcal(cell, kcal) {
    if (!cell) return;
    var board = document.querySelector(".game-container");
    if (!board) return;
    var rect = board.getBoundingClientRect();
    var tileSize = board.offsetWidth / 4;
    var x = rect.left + (cell.x + 0.5) * tileSize;
    var y = rect.top + (cell.y + 0.5) * tileSize;
    var el = document.createElement("div");
    el.className = "juice-float-kcal";
    el.textContent = "+" + kcal;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }

  function showMergePopup(value, kcal) {
    var pop = $("juice-merge-popup");
    if (!pop) return;
    pop.querySelector(".juice-merge-popup__img").src = "style/img/" + value + ".jpg";
    pop.querySelector(".juice-merge-popup__title").textContent = flavor(value);
    pop.querySelector(".juice-merge-popup__kcal").textContent = "+" + kcal + " Kcal!";
    pop.querySelector(".juice-merge-popup__badge").textContent = value >= 2048 ? "🏆 EPIC!" : "✨ NEW TIER!";
    pop.classList.add("juice-merge-popup--show");
    clearTimeout(showMergePopup._timer);
    showMergePopup._timer = setTimeout(hideMergePopup, value >= 64 ? 2500 : 1800);
  }

  function hideMergePopup() {
    var pop = $("juice-merge-popup");
    if (pop) pop.classList.remove("juice-merge-popup--show");
  }

  function shakePage(big) {
    document.body.classList.remove("juice-shake", "juice-shake--big");
    void document.body.offsetWidth;
    document.body.classList.add(big ? "juice-shake--big" : "juice-shake");
    setTimeout(function () {
      document.body.classList.remove("juice-shake", "juice-shake--big");
    }, big ? 650 : 400);
  }

  function flavor(value) {
    return typeof Localize === "function" ? Localize("p" + value) : String(value);
  }

  function onMerge(info) {
    ensureStarted();
    var value = info.value;
    var kcal = info.kcal;
    var isNewTier = info.isNewTier;
    combo++;

    flashScreen(value >= 256 ? "rgba(255, 215, 0, 0.7)" : "rgba(246, 112, 152, 0.6)");
    shakePage(value >= 32);
    pulseBoard();
    floatKcal(info.cell, kcal);
    emojiBurst(info.cell);
    updateComboHud();

    var word = value >= 512 ? "LEGENDARY!" : value >= 128 ? "AMAZING!" : value >= 32 ? "YUM!" : "MERGE!";
    showSplash(word, "🧁", "+" + kcal + " Kcal");

    if (window.SoundManager) SoundManager.mergeByTier(value, combo);
    if (window.EffectsManager) {
      EffectsManager.shakeBoard(value);
      EffectsManager.spawnParticlesAtCell(info.cell, value);
      EffectsManager.confetti(value >= 128 ? 2500 : value >= 32 ? 1500 : 900);
      EffectsManager.flashScore(document.querySelector(".score-points"));
      EffectsManager.flashScore(document.querySelector(".score-container"));
    }

    if (combo >= 2) {
      setTimeout(function () {
        showSplash("COMBO x" + combo + "!", "🔥", "On fire!");
      }, 200);
      if (window.SoundManager) SoundManager.combo(combo);
      document.body.classList.toggle("fun-combo-hot", combo >= 4);
    } else {
      document.body.classList.remove("fun-combo-hot");
    }

    if (isNewTier && !seenTiers[value]) {
      seenTiers[value] = true;
      showMergePopup(value, kcal);
      var party = TIER_PARTY[value];
      if (party) {
        setTimeout(function () { showSplash(party.title, "🏆", party.sub); }, 350);
        flashScreen(value >= 256 ? "rgba(255,215,0,0.75)" : "rgba(246,112,152,0.7)");
        shakePage(true);
      } else {
        setTimeout(function () {
          showSplash("NEW CUPCAKE!", "✨", flavor(value));
        }, 300);
      }
      if (window.SoundManager) SoundManager.tierUp(value);
      if (window.EffectsManager) EffectsManager.confetti(value >= 128 ? 4500 : 2800);
      if (window.FunLayer) FunLayer.showFlavorLine(value);
    }

    if (window.FunLayer && window.game) {
      FunLayer.trackMerge(info, window.game, combo);
    }
  }

  function onSlide() {
    ensureStarted();
    combo = 0;
    updateComboHud();
    if (window.SoundManager) {
      SoundManager.move();
      SoundManager.spawn();
    }
  }

  function onWin(points, score) {
    showSplash("YOU WIN!", "🏆", flavor(score) + " · " + points + " Kcal");
    if (window.EffectsManager) EffectsManager.confetti(5000);
    if (window.SoundManager) SoundManager.win();
  }

  function onLose(points) {
    showSplash("GAME OVER", "💪", points + " Kcal baked");
    if (window.SoundManager) SoundManager.lose();
  }

  function resetSession() {
    combo = 0;
    seenTiers = {};
    updateComboHud();
    hideMergePopup();
  }

  function onTileMergedDOM(wrapper, value) {
    if (!wrapper) return;
    wrapper.classList.add("juice-tile-boom");
    if (value >= 32) wrapper.classList.add("juice-tile-boom--big");
    setTimeout(function () {
      wrapper.classList.remove("juice-tile-boom", "juice-tile-boom--big");
    }, 500);
  }

  return {
    init: init,
    onMerge: onMerge,
    onSlide: onSlide,
    onWin: onWin,
    onLose: onLose,
    resetSession: resetSession,
    onTileMergedDOM: onTileMergedDOM,
    ensureStarted: ensureStarted
  };
})();

// Script may be injected after DOMContentLoaded (delayed extras bundle)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () { GameJuice.init(); });
} else {
  GameJuice.init();
}
