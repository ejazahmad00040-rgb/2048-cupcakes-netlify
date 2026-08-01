var GameEnhancements = (function () {
  "use strict";

  var game = null;
  var undoStack = [];
  var moveCount = 0;
  var mergeCount = 0;
  var startTime = null;
  var timerInterval = null;
  var showNumbers = false;
  var gamesPlayed = 0;
  var achievements = {};
  var ACH_KEY = "cupcakesAchievements";
  var GAMES_KEY = "cupcakesGamesPlayed";

  var TIER_MILESTONES = [64, 128, 256, 512, 1024, 2048, 4096, 8192];
  var ACHIEVEMENTS = [
    { id: "first_merge", label: "First Merge!", check: function () { return mergeCount >= 1; } },
    { id: "tier_512", label: "Cookie Master — reached 512!", check: function (s) { return s >= 512; } },
    { id: "tier_1024", label: "Sundae Supreme — reached 1024!", check: function (s) { return s >= 1024; } },
    { id: "tier_2048", label: "Peppermint Champion — you won!", check: function (s) { return s >= 2048; } },
    { id: "tier_8192", label: "Rainbow Legend — ultimate cupcake!", check: function (s) { return s >= 8192; } },
    { id: "moves_100", label: "100 Moves — keep baking!", check: function () { return moveCount >= 100; } },
    { id: "kcal_5000", label: "5000 Kcal earned in one game!", check: function (_, p) { return p >= 5000; } }
  ];

  function loadAchievements() {
    try {
      achievements = JSON.parse(localStorage.getItem(ACH_KEY) || "{}");
    } catch (e) {
      achievements = {};
    }
    gamesPlayed = parseInt(localStorage.getItem(GAMES_KEY) || "0", 10);
  }

  function saveAchievements() {
    localStorage.setItem(ACH_KEY, JSON.stringify(achievements));
    localStorage.setItem(GAMES_KEY, String(gamesPlayed));
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function nextTier(value) {
    if (value >= 8192) return null;
    var v = value || 2;
    return v < 2 ? 2 : v * 2;
  }

  function buildUI() {
    if (document.getElementById("game-modals")) return;

    var hidden = document.createElement("div");
    hidden.id = "game-hidden-stats";
    hidden.className = "game-hidden-stats";
    hidden.innerHTML =
      '<span id="stat-moves">0</span>' +
      '<span id="stat-time">00:00</span>' +
      '<span id="stat-combo">x0</span>' +
      '<span id="combo-display"></span>' +
      '<span id="tier-current"></span>' +
      '<span id="tier-next"></span>' +
      '<div id="tier-progress-fill"></div>';
    document.body.appendChild(hidden);

    var modals = document.createElement("div");
    modals.id = "game-modals";
    modals.innerHTML =
      '<div class="modal-overlay" id="modal-settings" hidden>' +
        '<div class="modal-card modal-card--settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">' +
          '<div class="settings-modal__header">' +
            '<h3 id="settings-title">⚙ Settings</h3>' +
            '<button type="button" class="modal-close" id="btn-close-settings-x" aria-label="Close settings">✕</button>' +
          "</div>" +
          '<div class="settings-modal__body">' +
            '<div class="settings-stats">' +
              '<span>Moves: <strong id="settings-moves">0</strong></span>' +
              '<span>Time: <strong id="settings-time">00:00</strong></span>' +
            "</div>" +
            '<div class="settings-list">' +
              '<label class="setting-toggle">' +
                '<span class="setting-toggle__info"><strong>Sound effects</strong><small>Merge &amp; move sounds</small></span>' +
                '<input type="checkbox" id="setting-sfx" checked><span class="setting-toggle__switch" aria-hidden="true"></span>' +
              "</label>" +
              '<label class="setting-toggle">' +
                '<span class="setting-toggle__info"><strong>Background music</strong><small>Playful beat</small></span>' +
                '<input type="checkbox" id="setting-music"><span class="setting-toggle__switch" aria-hidden="true"></span>' +
              "</label>" +
              '<label class="setting-toggle">' +
                '<span class="setting-toggle__info"><strong>Particles &amp; confetti</strong><small>Merge celebrations</small></span>' +
                '<input type="checkbox" id="setting-particles" checked><span class="setting-toggle__switch" aria-hidden="true"></span>' +
              "</label>" +
              '<label class="setting-toggle">' +
                '<span class="setting-toggle__info"><strong>Tile numbers</strong><small>Show 2, 4, 8 on tiles</small></span>' +
                '<input type="checkbox" id="setting-numbers"><span class="setting-toggle__switch" aria-hidden="true"></span>' +
              "</label>" +
              '<label class="setting-toggle">' +
                '<span class="setting-toggle__info"><strong>Vibration</strong><small>Mobile haptic feedback</small></span>' +
                '<input type="checkbox" id="setting-vibrate"><span class="setting-toggle__switch" aria-hidden="true"></span>' +
              "</label>" +
            "</div>" +
            '<div class="settings-quick-actions">' +
              '<button type="button" class="game-btn" id="btn-undo" disabled>↩ Undo</button>' +
              '<button type="button" class="game-btn" id="btn-share">📤 Share Score</button>' +
            "</div>" +
          "</div>" +
          '<div class="settings-modal__footer modal-actions">' +
            '<button type="button" class="game-btn" id="btn-clear-data">Clear data</button>' +
            '<button type="button" class="game-btn game-btn--primary" id="btn-close-settings">Done</button>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="modal-overlay" id="modal-restart" hidden>' +
        '<div class="modal-card modal-card--sm" role="dialog" aria-modal="true" aria-labelledby="restart-title">' +
          '<h3 id="restart-title">Start a new game?</h3>' +
          "<p>Your current progress will be lost.</p>" +
          '<div class="modal-actions">' +
            '<button type="button" class="game-btn" id="btn-cancel-restart">Cancel</button>' +
            '<button type="button" class="game-btn game-btn--primary" id="btn-confirm-restart">New Game</button>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div id="achievement-toasts" class="achievement-toasts"></div>' +
      '<div class="enhanced-win-stats" id="enhanced-win-stats" hidden></div>';

    document.body.appendChild(modals);
    bindUI();
  }

  function bindUI() {
    var settingsBtn = $("#btn-settings");
    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
    $("#btn-undo").addEventListener("click", undo);
    $("#btn-share").addEventListener("click", shareScore);
    $("#btn-close-settings").addEventListener("click", closeSettings);
    $("#btn-close-settings-x").addEventListener("click", closeSettings);
    $("#btn-clear-data").addEventListener("click", clearAllData);
    $("#btn-cancel-restart").addEventListener("click", closeRestartModal);
    $("#btn-confirm-restart").addEventListener("click", confirmRestart);

    var modalSettings = $("#modal-settings");
    if (modalSettings) {
      modalSettings.addEventListener("click", function (e) {
        if (e.target === modalSettings) closeSettings();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var settings = $("#modal-settings");
      var restart = $("#modal-restart");
      if (settings && !settings.hidden) closeSettings();
      else if (restart && !restart.hidden) closeRestartModal();
    });

    syncSettingsUI();

    $("#setting-sfx").addEventListener("change", function () {
      SoundManager.setSfxEnabled(this.checked);
    });
    $("#setting-music").addEventListener("change", function () {
      SoundManager.setMusicEnabled(this.checked);
    });
    $("#setting-particles").addEventListener("change", function () {
      EffectsManager.setParticlesEnabled(this.checked);
    });
    $("#setting-numbers").addEventListener("change", function () {
      showNumbers = this.checked;
      localStorage.setItem("cupcakesShowNumbers", showNumbers ? "true" : "false");
      document.body.classList.toggle("show-tile-numbers", showNumbers);
    });
    $("#setting-vibrate").addEventListener("change", function () {
      localStorage.setItem("cupcakesVibrate", this.checked ? "true" : "false");
    });
  }

  function syncSettingsUI() {
    if ($("#setting-sfx")) $("#setting-sfx").checked = SoundManager.isSfxEnabled();
    if ($("#setting-music")) $("#setting-music").checked = SoundManager.isMusicEnabled();
    if ($("#setting-particles")) $("#setting-particles").checked = EffectsManager.isParticlesEnabled();
    if ($("#setting-numbers")) $("#setting-numbers").checked = showNumbers;
    if ($("#setting-vibrate")) {
      $("#setting-vibrate").checked = localStorage.getItem("cupcakesVibrate") === "true";
    }
  }

  function openSettings() {
    syncSettingsUI();
    updateStatsUI();
    $("#modal-settings").hidden = false;
    document.body.classList.add("modal-open");
    if (SoundManager.isSfxEnabled()) SoundManager.click();
  }

  function closeSettings() {
    $("#modal-settings").hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openRestartModal() {
    $("#modal-restart").hidden = false;
  }

  function closeRestartModal() {
    $("#modal-restart").hidden = true;
  }

  function confirmRestart() {
    closeRestartModal();
    gamesPlayed++;
    saveAchievements();
    if (game && game._originalRestart) game._originalRestart();
  }

  function clearAllData() {
    if (confirm("Clear all saved scores, game state, and achievements?")) {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (key.indexOf("cupcakes") === 0 || key.indexOf("Cupcakes") !== -1 ||
            key === "gameStateCupcakes" || key === "bestScoreCupcakes" || key === "bestPointsCupcakes")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
      achievements = {};
      gamesPlayed = 0;
      location.reload();
    }
  }

  function startTimer(reset) {
    if (reset || !startTime) startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(function () {
      updateStatsUI();
    }, 1000);
  }

  function saveUndoState() {
    if (!game) return;
    undoStack.push(JSON.stringify(game.serialize()));
    if (undoStack.length > 20) undoStack.shift();
    $("#btn-undo").disabled = false;
  }

  function undo() {
    if (!undoStack.length || !game) return;
    SoundManager.undo();
    if (window.FunLayer) FunLayer.noteUndo();
    var state = JSON.parse(undoStack.pop());
    game.grid = new Grid(state.grid.size, state.grid.cells);
    game.score = state.score;
    game.points = state.points;
    game.over = state.over;
    game.won = state.won;
    game.keepPlaying = state.keepPlaying;
    moveCount = Math.max(0, moveCount - 1);
    game.actuate();
    updateStatsUI();
    if (!undoStack.length) $("#btn-undo").disabled = true;
  }

  function shareScore() {
    if (window.PlayModes) {
      PlayModes.shareChallenge();
      return;
    }
    if (!game) return;
    var flavor = typeof Localize === "function" ? Localize("p" + game.score) : game.score;
    var text = "I reached " + flavor + " with " + game.points + " Kcal in 2048 Cupcakes! Can you beat me? 🧁";
    var url = window.location.href.split("#")[0];

    if (navigator.share) {
      navigator.share({ title: "2048 Cupcakes", text: text, url: url }).catch(function () {});
    } else {
      var tweet = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
      window.open(tweet, "_blank", "width=550,height=420");
    }
    SoundManager.click();
  }

  function showAchievement(id, label) {
    if (achievements[id]) return;
    achievements[id] = true;
    saveAchievements();
    SoundManager.achievement();

    var container = $("#achievement-toasts");
    var toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = "🏆 <strong>" + label + "</strong>";
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("achievement-toast--out");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 2800);
  }

  function checkAchievements(score, points) {
    ACHIEVEMENTS.forEach(function (a) {
      if (!achievements[a.id] && a.check(score, points)) {
        showAchievement(a.id, a.label);
      }
    });
  }

  function updateProgressBar(score) {
    var nt = nextTier(score);
    var fill = $("#tier-progress-fill");
    var cur = $("#tier-current");
    var nxt = $("#tier-next");
    if (!fill) return;

    if (typeof Localize === "function") {
      if (cur) cur.textContent = Localize("p" + (score || 2));
      if (nxt) nxt.textContent = nt ? Localize("p" + nt) : "Max!";
    }
  }

  function updateStatsUI() {
    if ($("#stat-moves")) {
      var moves = moveCount;
      $("#stat-moves").textContent = moves;
      if ($("#settings-moves")) $("#settings-moves").textContent = moves;
    }
    if ($("#stat-time") && startTime) {
      var t = formatTime(Date.now() - startTime);
      $("#stat-time").textContent = t;
      if ($("#settings-time")) $("#settings-time").textContent = t;
    }
    if (game) updateProgressBar(game.score);
  }

  function showEnhancedWinStats(metadata, won) {
    var el = $("#enhanced-win-stats");
    if (!el) return;

    var flavor = typeof Localize === "function" ? Localize("p" + metadata.score) : metadata.score;
    var timeStr = startTime ? formatTime(Date.now() - startTime) : "00:00";

    el.hidden = false;
    el.innerHTML =
      '<div class="win-stats-grid">' +
        '<div class="win-stat"><span class="win-stat__icon">🧁</span><span class="win-stat__val">' + flavor + '</span><span class="win-stat__lbl">Best Cupcake</span></div>' +
        '<div class="win-stat"><span class="win-stat__icon">🔥</span><span class="win-stat__val">' + metadata.points + '</span><span class="win-stat__lbl">Kcal</span></div>' +
        '<div class="win-stat"><span class="win-stat__icon">🎯</span><span class="win-stat__val">' + moveCount + '</span><span class="win-stat__lbl">Moves</span></div>' +
        '<div class="win-stat"><span class="win-stat__icon">⏱</span><span class="win-stat__val">' + timeStr + '</span><span class="win-stat__lbl">Time</span></div>' +
      '</div>';

    if (won) {
      if (window.GameJuice) GameJuice.onWin(metadata.points, metadata.score);
    } else {
      if (window.GameJuice) GameJuice.onLose(metadata.points);
    }
  }

  function hideEnhancedWinStats() {
    var el = $("#enhanced-win-stats");
    if (el) el.hidden = true;
  }

  function hookGameManager() {
    var originalMove = GameManager.prototype.move;
    var originalRestart = GameManager.prototype.restart;
    var combo = 0;

    GameManager.prototype.move = function (direction) {
      if (this.isGameTerminated()) return;

      var beforePoints = this.points;
      var beforeScore = this.score;
      var beforeState = JSON.stringify(this.serialize());

      saveUndoState();
      originalMove.call(this, direction);

      var afterState = JSON.stringify(this.serialize());
      if (beforeState === afterState) {
        undoStack.pop();
        if (!undoStack.length) $("#btn-undo").disabled = true;
        return;
      }

      moveCount++;
      SoundManager.unlock();

      if (this.points > beforePoints) {
        mergeCount++;
        combo++;
        var mergedValue = this.lastMerge ? this.lastMerge.value : this.score;
        var kcalGained = this.points - beforePoints;
        var isNewTier = this.score > beforeScore;

        if (window.GameJuice) {
          GameJuice.onMerge({
            value: mergedValue,
            kcal: kcalGained,
            isNewTier: isNewTier,
            cell: this.lastMerge ? this.lastMerge.cell : null
          });
        }

        var comboEl = $("#combo-display");
        if (combo >= 2 && comboEl) {
          $("#stat-combo").textContent = "x" + combo;
        }

        if (localStorage.getItem("cupcakesVibrate") === "true" && navigator.vibrate) {
          navigator.vibrate(isNewTier ? [50, 40, 50] : 30);
        }
      } else {
        if (window.GameJuice) GameJuice.onSlide();
        combo = 0;
        if ($("#stat-combo")) $("#stat-combo").textContent = "x0";
      }

      checkAchievements(this.score, this.points);
      updateStatsUI();
    };

    GameManager.prototype.restart = function () {
      openRestartModal();
    };

    game._originalRestart = function () {
      undoStack = [];
      moveCount = 0;
      mergeCount = 0;
      combo = 0;
      startTimer(true);
      if (window.GameJuice) GameJuice.resetSession();
      if (window.FunLayer) FunLayer.resetRound();
      originalRestart.call(game);
      updateStatsUI();
      $("#btn-undo").disabled = true;
      hideEnhancedWinStats();
    };

    var originalActuatorActuate = HTMLActuator.prototype.actuate;
    HTMLActuator.prototype.actuate = function (grid, metadata) {
      originalActuatorActuate.call(this, grid, metadata);
      if (metadata.terminated) {
        showEnhancedWinStats(metadata, metadata.won);
      } else {
        hideEnhancedWinStats();
      }
    };
  }

  function interceptRestartButton() {
    var restartBtn = $(".restart-button");
    var retryBtn = $(".retry-button");
    if (restartBtn) {
      restartBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openRestartModal();
      }, true);
    }
    if (retryBtn) {
      retryBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideEnhancedWinStats();
        if (game && game._originalRestart) game._originalRestart();
      }, true);
    }
    var keepBtn = $(".keep-playing-button");
    if (keepBtn) {
      keepBtn.addEventListener("click", function () {
        hideEnhancedWinStats();
      });
    }
  }

  function init(gameInstance) {
    game = gameInstance;
    loadAchievements();
    showNumbers = localStorage.getItem("cupcakesShowNumbers") === "true";
    document.body.classList.toggle("show-tile-numbers", showNumbers);

    buildUI();
    hookGameManager();
    interceptRestartButton();
    startTimer(true);
    updateStatsUI();
    // Do not force GameJuice/audio start here — browsers block AudioContext without a gesture.
  }

  return { init: init, confirmRestart: confirmRestart };
})();
