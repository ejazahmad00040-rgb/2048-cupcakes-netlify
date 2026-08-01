/**
 * FunLayer — missions, streak, blitz, D-pad, danger, victory card
 * Makes the game feel alive without any backend.
 */
var FunLayer = (function () {
  "use strict";

  var game = null;
  var missionState = null;
  var streak = 0;
  var blitzTimer = null;
  var blitzLeft = 0;
  var blitzActive = false;
  var dangerOn = false;
  var mergeSession = 0;
  var undosUsed = 0;
  var reachedTier = 0;
  var maxCombo = 0;
  var cardShown = false;
  var bootDone = false;

  var STREAK_KEY = "cupcakesStreak";
  var STREAK_DAY_KEY = "cupcakesStreakDay";
  var MISSION_KEY = "cupcakesMissions";

  var FLAVOR_LINES = {
    4: "Bubblegum vibes 💗",
    8: "Sunshine unlocked ☀️",
    16: "Ganache goals ✨",
    32: "Peanut butter power 🥜",
    64: "Minty fresh! ❄️",
    128: "Spider web magic 🕸️",
    256: "Toasty marshmallow 🔥",
    512: "Cookies & creme boss 🍪",
    1024: "Sundae supreme 🍨",
    2048: "PEPPERMINT CHAMPION! 🏆",
    4096: "Confetti royalty 👑",
    8192: "RAINBOW LEGEND 🌈"
  };

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function $(sel) { return document.querySelector(sel); }
  function $id(id) { return document.getElementById(id); }

  function loadStreak() {
    streak = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10) || 0;
    var last = localStorage.getItem(STREAK_DAY_KEY) || "";
    var today = todayKey();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var ym = yesterday.getMonth() + 1;
    var yd = yesterday.getDate();
    var y = yesterday.getFullYear() + "-" + (ym < 10 ? "0" : "") + ym + "-" + (yd < 10 ? "0" : "") + yd;

    if (last && last !== today && last !== y) {
      streak = 0;
      localStorage.setItem(STREAK_KEY, "0");
    }
  }

  function bumpStreak() {
    var today = todayKey();
    if (localStorage.getItem(STREAK_DAY_KEY) === today) return;
    var last = localStorage.getItem(STREAK_DAY_KEY) || "";
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var ym = yesterday.getMonth() + 1;
    var yd = yesterday.getDate();
    var y = yesterday.getFullYear() + "-" + (ym < 10 ? "0" : "") + ym + "-" + (yd < 10 ? "0" : "") + yd;

    streak = last === y ? streak + 1 : 1;
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(STREAK_DAY_KEY, today);
    renderHud();
    toast("🔥 " + streak + "-day streak!", "Keep baking tomorrow!");
  }

  function pickMissions() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(MISSION_KEY) || "null"); } catch (e) {}
    if (saved && saved.day === todayKey()) {
      missionState = saved;
      return;
    }

    var pool = [
      { id: "merges_8", label: "Make 8 merges", target: 8, progress: 0, type: "merges" },
      { id: "merges_15", label: "Make 15 merges", target: 15, progress: 0, type: "merges" },
      { id: "tier_64", label: "Reach Mint Fudge (64)", target: 64, progress: 0, type: "tier" },
      { id: "tier_128", label: "Reach Spider Web (128)", target: 128, progress: 0, type: "tier" },
      { id: "kcal_1500", label: "Earn 1,500 Kcal", target: 1500, progress: 0, type: "kcal" },
      { id: "kcal_3000", label: "Earn 3,000 Kcal", target: 3000, progress: 0, type: "kcal" },
      { id: "combo_3", label: "Hit a x3 combo", target: 3, progress: 0, type: "combo" },
      { id: "no_undo_5", label: "5 merges, no undo", target: 5, progress: 0, type: "clean" }
    ];

    // Deterministic daily pick (Fisher–Yates — never infinite-loops)
    var seed = parseInt(todayKey().replace(/-/g, ""), 10) || 1;
    var shuffled = pool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      var j = seed % (i + 1);
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    var picks = shuffled.slice(0, 3).map(function (m) {
      return JSON.parse(JSON.stringify(m));
    });
    missionState = { day: todayKey(), missions: picks };
    saveMissions();
  }

  function saveMissions() {
    localStorage.setItem(MISSION_KEY, JSON.stringify(missionState));
  }

  function buildUI() {
    if ($id("fun-hud")) return;

    var hud = document.createElement("div");
    hud.id = "fun-hud";
    hud.className = "fun-hud";
    hud.innerHTML =
      '<div class="fun-hud__streak" id="fun-streak">🔥 0 day streak</div>' +
      '<div class="fun-hud__missions" id="fun-missions"></div>' +
      '<div class="fun-hud__blitz" id="fun-blitz" hidden>⏱ <strong id="fun-blitz-time">60</strong>s · <span id="fun-blitz-kcal">0</span> Kcal</div>';

    var danger = document.createElement("div");
    danger.id = "fun-danger";
    danger.className = "fun-danger";
    danger.hidden = true;
    danger.innerHTML = "⚠ BOARD ALMOST FULL — think fast!";

    var dpad = document.createElement("div");
    dpad.id = "fun-dpad";
    dpad.className = "fun-dpad";
    dpad.innerHTML =
      '<button type="button" class="fun-dpad__btn fun-dpad__up" data-dir="0" aria-label="Up">▲</button>' +
      '<button type="button" class="fun-dpad__btn fun-dpad__left" data-dir="3" aria-label="Left">◀</button>' +
      '<button type="button" class="fun-dpad__btn fun-dpad__down" data-dir="2" aria-label="Down">▼</button>' +
      '<button type="button" class="fun-dpad__btn fun-dpad__right" data-dir="1" aria-label="Right">▶</button>';

    var line = document.createElement("div");
    line.id = "fun-flavor-line";
    line.className = "fun-flavor-line";

    var card = document.createElement("div");
    card.id = "fun-victory-card";
    card.className = "fun-victory-card";
    card.hidden = true;
    card.innerHTML =
      '<div class="fun-victory-card__panel">' +
        '<button type="button" class="fun-victory-card__close" id="fun-card-close" aria-label="Close">✕</button>' +
        '<h3 id="fun-card-title">Nice bake!</h3>' +
        '<canvas id="fun-card-canvas" width="540" height="300"></canvas>' +
        '<div class="fun-victory-card__actions">' +
          '<button type="button" class="game-btn game-btn--primary" id="fun-card-share">📤 Share card</button>' +
          '<button type="button" class="game-btn" id="fun-card-again">Play Again</button>' +
        "</div>" +
      "</div>";

    var wrap = $(".game-wrap .container") || $(".game-wrap");
    if (wrap) {
      var gameContainer = $(".game-container");
      var legend = $(".game-legend-collapse");
      // Keep board first: missions go after tile legend, not between board and play area
      if (legend && legend.parentNode) {
        legend.parentNode.insertBefore(hud, legend.nextSibling);
      } else {
        wrap.appendChild(hud);
      }
      wrap.appendChild(danger);

      // D-pad in document flow under the board (not fixed over Play Again)
      if (gameContainer && gameContainer.parentNode) {
        gameContainer.parentNode.insertBefore(dpad, gameContainer.nextSibling);
      } else {
        wrap.appendChild(dpad);
      }
    } else {
      document.body.appendChild(dpad);
    }
    document.body.appendChild(line);
    document.body.appendChild(card);

    dpad.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-dir]");
      if (!btn || !game) return;
      var dir = parseInt(btn.getAttribute("data-dir"), 10);
      if (window.SoundManager) SoundManager.unlock();
      game.inputManager.emit("move", dir);
      btn.classList.add("fun-dpad__btn--press");
      setTimeout(function () { btn.classList.remove("fun-dpad__btn--press"); }, 120);
    });

    $id("fun-card-close").addEventListener("click", hideVictoryCard);
    $id("fun-card-again").addEventListener("click", function () {
      hideVictoryCard();
      if (game && game._originalRestart) game._originalRestart();
      else if ($(".restart-button")) $(".restart-button").click();
    });
    $id("fun-card-share").addEventListener("click", shareVictoryCard);
  }

  function renderHud() {
    var streakEl = $id("fun-streak");
    if (streakEl) {
      streakEl.textContent = streak > 0 ? ("🔥 " + streak + "-day streak") : "🔥 Start a streak today!";
    }
    var box = $id("fun-missions");
    if (!box || !missionState) return;
    box.innerHTML = missionState.missions.map(function (m) {
      var done = m.done || m.progress >= m.target;
      var pct = Math.min(100, Math.round((m.progress / m.target) * 100));
      return (
        '<div class="fun-mission' + (done ? " fun-mission--done" : "") + '">' +
          '<div class="fun-mission__top"><span>' + (done ? "✅ " : "🎯 ") + m.label +
          '</span><span>' + Math.min(m.progress, m.target) + "/" + m.target + "</span></div>" +
          '<div class="fun-mission__bar"><i style="width:' + pct + '%"></i></div>' +
        "</div>"
      );
    }).join("");
  }

  function toast(title, sub) {
    var el = document.createElement("div");
    el.className = "fun-toast";
    el.innerHTML = "<strong>" + title + "</strong>" + (sub ? "<small>" + sub + "</small>" : "");
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("fun-toast--in"); });
    setTimeout(function () {
      el.classList.add("fun-toast--out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }, 2800);
  }

  function showFlavorLine(value) {
    var text = FLAVOR_LINES[value];
    if (!text) return;
    var el = $id("fun-flavor-line");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("fun-flavor-line--show");
    void el.offsetWidth;
    el.classList.add("fun-flavor-line--show");
    clearTimeout(showFlavorLine._t);
    showFlavorLine._t = setTimeout(function () {
      el.classList.remove("fun-flavor-line--show");
    }, 2200);
  }

  function updateMissions(evt) {
    if (!missionState) return;
    var changed = false;
    missionState.missions.forEach(function (m) {
      if (m.done) return;
      var before = m.progress;
      if (m.type === "merges" && evt.merges) m.progress = Math.min(m.target, m.progress + evt.merges);
      if (m.type === "tier" && evt.tier) m.progress = Math.max(m.progress, evt.tier);
      if (m.type === "kcal" && evt.kcal != null) m.progress = Math.max(m.progress, evt.kcal);
      if (m.type === "combo" && evt.combo) m.progress = Math.max(m.progress, evt.combo);
      if (m.type === "clean" && evt.cleanMerge) {
        if (undosUsed === 0) m.progress = Math.min(m.target, m.progress + 1);
      }
      if (m.progress >= m.target && !m.done) {
        m.done = true;
        changed = true;
        toast("🎯 Mission complete!", m.label);
        if (window.SoundManager) SoundManager.achievement();
        if (window.EffectsManager) EffectsManager.confetti(2000);
      } else if (m.progress !== before) {
        changed = true;
      }
    });
    if (changed) {
      saveMissions();
      renderHud();
      var allDone = missionState.missions.every(function (m) { return m.done; });
      if (allDone) bumpStreak();
    }
  }

  function countEmpty(grid) {
    var n = 0;
    grid.eachCell(function (x, y, tile) {
      if (!tile) n++;
    });
    return n;
  }

  function checkDanger() {
    if (!game || !game.grid || game.over) {
      setDanger(false);
      return;
    }
    var empty = countEmpty(game.grid);
    setDanger(empty <= 2 && !game.won);
  }

  function setDanger(on) {
    if (dangerOn === on) return;
    dangerOn = on;
    document.body.classList.toggle("fun-danger-active", on);
    var el = $id("fun-danger");
    if (el) el.hidden = !on;
    if (on && window.SoundManager) SoundManager.dangerPulse();
  }

  function startBlitz() {
    stopBlitz();
    blitzActive = true;
    blitzLeft = 60;
    document.body.classList.add("fun-blitz-active");
    var panel = $id("fun-blitz");
    if (panel) panel.hidden = false;
    updateBlitzHud();
    if (game && game._originalRestart) game._originalRestart();
    else if (game) {
      game.storageManager.clearGameState();
      game.setup();
    }
    toast("⏱ Blitz mode!", "Score as many Kcal as you can in 60 seconds");
    blitzTimer = setInterval(function () {
      blitzLeft--;
      updateBlitzHud();
      if (blitzLeft <= 0) endBlitz();
    }, 1000);
  }

  function updateBlitzHud() {
    var t = $id("fun-blitz-time");
    var k = $id("fun-blitz-kcal");
    if (t) {
      t.textContent = String(Math.max(0, blitzLeft));
      t.parentElement.classList.toggle("fun-hud__blitz--low", blitzLeft <= 10);
    }
    if (k && game) k.textContent = String(game.points || 0);
  }

  function stopBlitz() {
    blitzActive = false;
    if (blitzTimer) {
      clearInterval(blitzTimer);
      blitzTimer = null;
    }
    document.body.classList.remove("fun-blitz-active");
    var panel = $id("fun-blitz");
    if (panel) panel.hidden = true;
  }

  function endBlitz() {
    if (!blitzActive) return;
    var points = game ? game.points : 0;
    var score = game ? game.score : 0;
    stopBlitz();
    cardShown = true;
    if (game && !game.over) {
      game.over = true;
      game.actuate();
    }
    toast("⏱ Time's up!", points + " Kcal in Blitz");
    showVictoryCard({ won: false, blitz: true, points: points, score: score });
  }

  function drawVictoryCard(meta) {
    var canvas = $id("fun-card-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;

    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#582e74");
    grad.addColorStop(0.5, "#f67098");
    grad.addColorStop(1, "#ffb4c8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (var i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 18 + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Clear Sans, Arial, sans-serif";
    ctx.fillText("🧁 2048 Cupcakes", 28, 48);

    var title = meta.blitz ? "BLITZ RESULT" : meta.won ? "YOU WIN!" : "GAME OVER";
    ctx.font = "bold 42px Clear Sans, Arial, sans-serif";
    ctx.fillText(title, 28, 110);

    var flavor = typeof Localize === "function" ? Localize("p" + (meta.score || 2)) : String(meta.score || 2);
    ctx.font = "22px Clear Sans, Arial, sans-serif";
    ctx.fillText("Best cupcake: " + flavor, 28, 160);
    ctx.font = "bold 36px Clear Sans, Arial, sans-serif";
    ctx.fillText((meta.points || 0).toLocaleString() + " Kcal", 28, 210);

    ctx.font = "16px Clear Sans, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Can you beat this? Play free →", 28, 260);
  }

  function showVictoryCard(meta) {
    drawVictoryCard(meta);
    var title = $id("fun-card-title");
    if (title) {
      title.textContent = meta.blitz
        ? "Blitz finished!"
        : meta.won
          ? "Sweet victory!"
          : "Tasty run!";
    }
    var card = $id("fun-victory-card");
    if (card) card.hidden = false;
    bumpStreak();
  }

  function hideVictoryCard() {
    var card = $id("fun-victory-card");
    if (card) card.hidden = true;
  }

  function shareVictoryCard() {
    var canvas = $id("fun-card-canvas");
    if (!canvas) return;
    var url = (window.SiteConfig && SiteConfig.getBaseUrl()) || location.href.split("?")[0];
    var text = "I just scored in 2048 Cupcakes! Can you beat me? 🧁";

    canvas.toBlob(function (blob) {
      if (!blob) {
        fallbackShare(text, url);
        return;
      }
      var file = new File([blob], "2048-cupcakes-score.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "2048 Cupcakes", text: text, url: url }).catch(function () {});
      } else if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(function () {
          toast("📋 Card copied!", "Paste it in WhatsApp / Instagram");
        }).catch(function () {
          fallbackShare(text, url);
        });
      } else {
        fallbackShare(text, url);
      }
    }, "image/png");
  }

  function fallbackShare(text, url) {
    if (navigator.share) {
      navigator.share({ title: "2048 Cupcakes", text: text, url: url }).catch(function () {});
    } else {
      var tweet = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
      window.open(tweet, "_blank", "noopener,noreferrer,width=550,height=420");
    }
  }

  function onMerge(info, gameRef, combo) {
    mergeSession++;
    if (info.isNewTier) {
      reachedTier = Math.max(reachedTier, info.value);
    }
    if (combo > maxCombo) maxCombo = combo;

    updateMissions({
      merges: 1,
      tier: gameRef.score,
      kcal: gameRef.points,
      combo: combo,
      cleanMerge: true
    });

    if (blitzActive) updateBlitzHud();
    checkDanger();

    if (info.value >= 64 && window.EffectsManager) {
      EffectsManager.confetti(info.value >= 256 ? 2800 : 1400);
    }
  }

  function onGameEnd(metadata) {
    if (!bootDone) return; // don't popup victory card on refresh of an old finished game
    if (cardShown) return;
    cardShown = true;
    setDanger(false);
    if (blitzActive && blitzLeft > 0) {
      stopBlitz();
    }
    showVictoryCard({
      won: !!metadata.won,
      points: metadata.points,
      score: metadata.score,
      blitz: false
    });
    updateMissions({ kcal: metadata.points, tier: metadata.score });
  }

  function resetRound() {
    mergeSession = 0;
    undosUsed = 0;
    reachedTier = 0;
    maxCombo = 0;
    cardShown = false;
    setDanger(false);
    hideVictoryCard();
  }

  function noteUndo() {
    undosUsed++;
  }

  function trackMerge(info, gameRef, comboCount) {
    onMerge(info, gameRef, comboCount || 1);
  }

  function trackEnd(metadata) {
    onGameEnd(metadata);
  }

  function addBlitzButton() {
    var bar = $id("play-modes");
    if (!bar || $id("btn-blitz-mode")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-blitz-mode";
    btn.className = "play-mode-btn";
    btn.setAttribute("data-mode", "blitz");
    btn.textContent = "⏱ Blitz 60s";
    bar.appendChild(btn);
    btn.addEventListener("click", function () {
      document.querySelectorAll(".play-mode-btn").forEach(function (b) {
        b.classList.toggle("play-mode-btn--active", b === btn);
      });
      startBlitz();
      if (window.SoundManager) SoundManager.click();
    });
  }

  function init(gameInstance) {
    game = gameInstance;
    try {
      loadStreak();
      pickMissions();
      buildUI();
      renderHud();
      addBlitzButton();
      checkDanger();
    } catch (err) {
      console.warn("FunLayer UI init skipped:", err);
    }

    var prev = HTMLActuator.prototype.actuate;
    HTMLActuator.prototype.actuate = function (grid, metadata) {
      prev.call(this, grid, metadata);
      try {
        checkDanger();
        if (blitzActive) updateBlitzHud();
        if (bootDone && metadata.terminated && !metadata._funHandled) {
          metadata._funHandled = true;
          setTimeout(function () { trackEnd(metadata); }, 600);
        }
      } catch (err) {
        console.warn("FunLayer actuate hook:", err);
      }
    };

    // Allow first paint / restored board before enabling end-game UI
    setTimeout(function () { bootDone = true; }, 800);
  }

  return {
    init: init,
    trackMerge: trackMerge,
    noteUndo: noteUndo,
    resetRound: resetRound,
    startBlitz: startBlitz,
    isBlitz: function () { return blitzActive; },
    showFlavorLine: showFlavorLine
  };
})();
