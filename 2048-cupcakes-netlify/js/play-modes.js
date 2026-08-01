/**
 * Client-only play modes — no backend required.
 * Daily Challenge (seeded board), Challenge Friend (URL), local top scores.
 */
var PlayModes = (function () {
  "use strict";

  var game = null;
  var mode = "free";
  var rng = null;
  var challenge = null;
  var DAILY_KEY_PREFIX = "cupcakesDaily_";
  var TOP_SCORES_KEY = "cupcakesTopScores";
  var MODE_KEY = "cupcakesPlayMode";

  function $(sel) {
    return document.querySelector(sel);
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "" + (m < 10 ? "0" : "") + m + (day < 10 ? "0" : "") + day;
  }

  function dateSeed() {
    return parseInt(todayKey(), 10);
  }

  function seededRandom() {
    if (mode === "daily" && rng) return rng();
    return Math.random();
  }

  function flavorLabel(score) {
    return typeof Localize === "function" ? Localize("p" + score) : String(score);
  }

  function formatNum(n) {
    return Number(n).toLocaleString();
  }

  function getDailyBest() {
    try {
      return JSON.parse(localStorage.getItem(DAILY_KEY_PREFIX + todayKey()) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveDailyBest(entry) {
    localStorage.setItem(DAILY_KEY_PREFIX + todayKey(), JSON.stringify(entry));
  }

  function getTopScores() {
    try {
      return JSON.parse(localStorage.getItem(TOP_SCORES_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveTopScore(entry) {
    var list = getTopScores();
    list.push(entry);
    list.sort(function (a, b) {
      return b.points - a.points || b.score - a.score;
    });
    list = list.slice(0, 10);
    localStorage.setItem(TOP_SCORES_KEY, JSON.stringify(list));
    renderTopScores();
    return list;
  }

  function parseChallengeFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var pts = parseInt(params.get("pts") || params.get("points") || "0", 10);
    var cup = parseInt(params.get("cup") || params.get("score") || "0", 10);
    var name = params.get("beat") || params.get("name") || "";

    if (pts > 0 || cup > 0) {
      return {
        name: name || "Friend",
        points: pts,
        score: cup
      };
    }
    return null;
  }

  function buildChallengeUrl(name, points, score) {
    var base = (window.SiteConfig && SiteConfig.getBaseUrl()) ||
      (window.location.origin + window.location.pathname.replace(/\/[^/]*\.html$/, "/").replace(/\/?$/, "/"));
    base = String(base).replace(/\/$/, "");
    var params = new URLSearchParams();
    params.set("beat", name || "Friend");
    params.set("pts", String(points));
    params.set("cup", String(score));
    return base + "/?" + params.toString();
  }

  function resetRng() {
    if (mode === "daily") {
      rng = mulberry32(dateSeed());
    } else {
      rng = null;
    }
  }

  function updateModeButtons() {
    document.querySelectorAll(".play-mode-btn").forEach(function (btn) {
      btn.classList.toggle("play-mode-btn--active", btn.getAttribute("data-mode") === mode);
    });
  }

  function updateBanner() {
    var banner = $("#play-mode-banner");
    if (!banner) return;

    if (challenge && mode === "challenge") {
      banner.hidden = false;
      banner.className = "play-mode-banner play-mode-banner--challenge";
      banner.innerHTML =
        "⚔️ Beat <strong>" + escapeHtml(challenge.name) + "</strong> — " +
        formatNum(challenge.points) + " Kcal · " + flavorLabel(challenge.score) +
        " <button type=\"button\" class=\"play-mode-banner__clear\" id=\"btn-clear-challenge\">✕</button>";
      var clearBtn = $("#btn-clear-challenge");
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          challenge = null;
          setMode("free", true);
          window.history.replaceState({}, "", window.location.pathname);
        });
      }
      return;
    }

    if (mode === "daily") {
      var best = getDailyBest();
      banner.hidden = false;
      banner.className = "play-mode-banner play-mode-banner--daily";
      banner.innerHTML =
        "📅 <strong>Today’s Challenge</strong> — same board for everyone! " +
        (best
          ? "Your best today: <strong>" + formatNum(best.points) + " Kcal</strong>"
          : "Play now and set your daily score");
      return;
    }

    banner.hidden = true;
    banner.innerHTML = "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderTopScores() {
    var el = $("#local-top-scores");
    if (!el) return;

    var list = getTopScores();
    if (!list.length) {
      el.innerHTML = '<p class="local-scores-empty">No scores yet — finish a game!</p>';
      return;
    }

    el.innerHTML = list.slice(0, 5).map(function (s, i) {
      var label = s.mode === "daily" ? "📅" : s.mode === "challenge" ? "⚔️" : "🎮";
      return (
        "<div class=\"local-score-row\">" +
          "<span class=\"local-score-rank\">" + (i + 1) + "</span>" +
          "<span class=\"local-score-meta\">" + label + " " + formatNum(s.points) + " Kcal</span>" +
          "<span class=\"local-score-tier\">" + flavorLabel(s.score) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function showResultToast(html) {
    var toast = document.createElement("div");
    toast.className = "play-result-toast";
    toast.innerHTML = html;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("play-result-toast--in");
    });
    setTimeout(function () {
      toast.classList.add("play-result-toast--out");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 4500);
  }

  function compareChallenge(metadata) {
    if (!challenge) return;

    var won =
      metadata.points > challenge.points ||
      (metadata.points === challenge.points && metadata.score > challenge.score);

    if (won) {
      showResultToast(
        "🏆 <strong>You won!</strong> " + formatNum(metadata.points) + " Kcal beat " +
        escapeHtml(challenge.name) + "'s " + formatNum(challenge.points) + " Kcal"
      );
      if (window.SoundManager) SoundManager.achievement();
    } else {
      showResultToast(
        "😅 <strong>Not yet!</strong> You got " + formatNum(metadata.points) +
        " Kcal — need " + formatNum(challenge.points) + "+ to beat " + escapeHtml(challenge.name)
      );
    }
  }

  function recordDaily(metadata) {
    var best = getDailyBest();
    var entry = {
      points: metadata.points,
      score: metadata.score,
      date: todayKey()
    };

    if (!best || metadata.points > best.points ||
        (metadata.points === best.points && metadata.score > best.score)) {
      saveDailyBest(entry);
      showResultToast(
        "📅 <strong>New daily best!</strong> " + formatNum(metadata.points) + " Kcal today 🧁"
      );
      updateBanner();
    }
  }

  function onGameEnd(metadata) {
    saveTopScore({
      points: metadata.points,
      score: metadata.score,
      mode: mode,
      date: todayKey()
    });

    if (mode === "challenge") compareChallenge(metadata);
    if (mode === "daily") recordDaily(metadata);
  }

  function startFreshGame() {
    if (!game) return;
    game.storageManager.clearGameState();
    resetRng();
    if (game._originalRestart) {
      game._originalRestart();
    } else {
      game.restart();
    }
  }

  function setMode(nextMode, restart) {
    mode = nextMode;
    localStorage.setItem(MODE_KEY, mode);
    updateModeButtons();
    updateBanner();
    resetRng();
    if (restart) startFreshGame();
  }

  function buildUI() {
    if ($("#play-modes")) return;

    var bar = document.createElement("div");
    bar.className = "play-modes";
    bar.id = "play-modes";
    bar.innerHTML =
      '<button type="button" class="play-mode-btn play-mode-btn--active" data-mode="free">🎮 Free Play</button>' +
      '<button type="button" class="play-mode-btn" data-mode="daily">📅 Daily Challenge</button>' +
      '<button type="button" class="play-mode-btn" data-mode="challenge" id="btn-challenge-friend" hidden>⚔️ Beat Friend</button>';

    var banner = document.createElement("div");
    banner.className = "play-mode-banner";
    banner.id = "play-mode-banner";
    banner.hidden = true;

    var aboveGame = $(".above-game");
    var gameContainer = $(".game-container");
    var parent = (gameContainer && gameContainer.parentNode) || (aboveGame && aboveGame.parentNode);
    if (parent) {
      // Place modes under the board so play UI stays clean on mobile
      var anchor = gameContainer || aboveGame;
      parent.insertBefore(bar, anchor.nextSibling);
      parent.insertBefore(banner, bar.nextSibling);
    }

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".play-mode-btn");
      if (!btn || btn.id === "btn-challenge-friend") return;
      var next = btn.getAttribute("data-mode");
      if (next === mode) return;
      challenge = null;
      window.history.replaceState({}, "", window.location.pathname);
      setMode(next, true);
      if (window.SoundManager) SoundManager.click();
    });

    var settingsModal = $(".modal-card--settings");
    if (settingsModal) {
      var block = document.createElement("div");
      block.className = "local-scores-block";
      block.innerHTML =
        "<h4>🏅 Your Top Scores <small>(this device)</small></h4>" +
        '<div id="local-top-scores"></div>' +
        '<button type="button" class="game-btn game-btn--full" id="btn-copy-challenge">⚔️ Copy Challenge Link</button>';
      var body = settingsModal.querySelector(".settings-modal__body");
      var actions = settingsModal.querySelector(".settings-quick-actions");
      if (body) {
        body.appendChild(block);
      } else if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(block, actions.nextSibling);
      }
    }

    $("#btn-copy-challenge").addEventListener("click", copyChallengeLink);
    renderTopScores();
  }

  function copyChallengeLink() {
    if (!game) return;
    var name = prompt("Your name for the challenge link:", "Me") || "Friend";
    var url = buildChallengeUrl(name.trim(), game.points, game.score);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showResultToast("🔗 Challenge link copied! Send it to a friend.");
      }).catch(function () {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
    if (window.SoundManager) SoundManager.click();
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showResultToast("🔗 Challenge link copied!");
    } catch (e) {
      prompt("Copy this challenge link:", text);
    }
    document.body.removeChild(ta);
  }

  function shareChallenge() {
    if (!game) return;
    var name = prompt("Your name on the challenge:", "Me") || "Friend";
    var flavor = flavorLabel(game.score);
    var text =
      "I scored " + formatNum(game.points) + " Kcal (" + flavor + ") in 2048 Cupcakes! Can you beat me? 🧁";
    var url = buildChallengeUrl(name.trim(), game.points, game.score);

    if (navigator.share) {
      navigator.share({ title: "2048 Cupcakes Challenge", text: text, url: url }).catch(function () {});
    } else {
      var tweet =
        "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
      window.open(tweet, "_blank", "width=550,height=420");
    }
    if (window.SoundManager) SoundManager.click();
  }

  function hookRandom() {
    Grid.prototype.randomAvailableCell = function () {
      var cells = this.availableCells();
      if (cells.length) {
        return cells[Math.floor(seededRandom() * cells.length)];
      }
    };

    GameManager.prototype.addRandomTile = function () {
      if (this.grid.cellsAvailable()) {
        var value = seededRandom() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);
        this.grid.insertTile(tile);
      }
    };
  }

  function hookGameEnd() {
    var prevActuate = HTMLActuator.prototype.actuate;
    HTMLActuator.prototype.actuate = function (grid, metadata) {
      prevActuate.call(this, grid, metadata);
      if (metadata.terminated) onGameEnd(metadata);
    };
  }

  function init(gameInstance) {
    game = gameInstance;
    buildUI();
    hookRandom();
    hookGameEnd();

    challenge = parseChallengeFromUrl();
    if (challenge) {
      mode = "challenge";
      var challengeBtn = $("#btn-challenge-friend");
      if (challengeBtn) challengeBtn.hidden = false;
    } else {
      var saved = localStorage.getItem(MODE_KEY);
      mode = saved === "daily" ? "daily" : "free";
    }

    resetRng();
    updateModeButtons();
    updateBanner();

    if (challenge || mode === "daily") {
      resetRng();
      if (game._originalRestart) {
        game._originalRestart();
      } else {
        game.storageManager.clearGameState();
        game.grid = new Grid(game.size);
        game.score = 0;
        game.points = 0;
        game.over = false;
        game.won = false;
        game.keepPlaying = false;
        game.addStartTiles();
        game.actuate();
      }
    }
  }

  return {
    init: init,
    shareChallenge: shareChallenge,
    getChallengeUrl: buildChallengeUrl,
    getMode: function () { return mode; }
  };
})();
