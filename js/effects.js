var EffectsManager = (function () {
  "use strict";

  var particlesEnabled = true;
  var STORAGE_KEY = "cupcakesParticlesEnabled";

  function loadSettings() {
    var stored = localStorage.getItem(STORAGE_KEY);
    particlesEnabled = stored !== "false";
  }

  function setParticlesEnabled(value) {
    particlesEnabled = !!value;
    localStorage.setItem(STORAGE_KEY, particlesEnabled ? "true" : "false");
  }

  function isParticlesEnabled() {
    return particlesEnabled;
  }

  function shakeIntensity(value) {
    if (value >= 512) return "board-shake--big";
    if (value >= 64) return "board-shake--med";
    return "board-shake";
  }

  function shakeBoard(intensity) {
    var board = document.querySelector(".game-container");
    if (!board) return;
    var cls = typeof intensity === "number" ? shakeIntensity(intensity) : "board-shake";
    board.classList.remove("board-shake", "board-shake--med", "board-shake--big");
    void board.offsetWidth;
    board.classList.add(cls);
    setTimeout(function () {
      board.classList.remove("board-shake", "board-shake--med", "board-shake--big");
    }, cls === "board-shake--big" ? 500 : 350);
  }

  function spawnParticlesAtCell(cell, value) {
    var count = 16;
    var color = "#f67098";
    if (value >= 256) { count = 28; color = "#ffd700"; }
    else if (value >= 64) { count = 22; color = "#ff6b9d"; }

    if (!particlesEnabled || !cell) {
      spawnParticlesCenter(count, color);
      return;
    }
    var board = document.querySelector(".game-container");
    if (!board) return;
    var rect = board.getBoundingClientRect();
    var tileSize = board.offsetWidth / 4;
    var x = rect.left + (cell.x + 0.5) * tileSize;
    var y = rect.top + (cell.y + 0.5) * tileSize;
    spawnParticles(x, y, color, count);
  }

  function spawnParticlesCenter(count, color) {
    var board = document.querySelector(".game-container");
    if (!board) return;
    var rect = board.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, color, count);
  }

  function spawnParticles(x, y, color, count) {
    if (!particlesEnabled) return;
    var container = document.querySelector(".game-container");
    if (!container) return;

    var rect = container.getBoundingClientRect();
    var n = count || 12;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("span");
      p.className = "merge-particle";
      var size = 8 + Math.random() * 12;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = (x - rect.left) + "px";
      p.style.top = (y - rect.top) + "px";
      p.style.background = color || "#f67098";
      p.style.setProperty("--dx", (Math.random() * 100 - 50) + "px");
      p.style.setProperty("--dy", (Math.random() * -90 - 30) + "px");
      container.appendChild(p);
      setTimeout(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }.bind(null, p), 800);
    }
  }

  function confetti(duration) {
    if (!particlesEnabled) return;
    var canvas = document.getElementById("confetti-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "confetti-canvas";
      canvas.className = "confetti-canvas";
      document.body.appendChild(canvas);
    }

    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var colors = ["#f67098", "#582e74", "#fbb8cc", "#fff", "#ffd700", "#ff6b9d", "#7a3d9e"];
    var pieces = [];
    var total = Math.min(180, 80 + (duration || 0) / 30);

    for (var i = 0; i < total; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 4,
        h: Math.random() * 7 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 4 + 2,
        vx: Math.random() * 3 - 1.5,
        rot: Math.random() * 360,
        vr: Math.random() * 10 - 5
      });
    }

    var start = Date.now();
    var ms = duration || 2500;

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (Date.now() - start < ms) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    frame();
  }

  function flashScore(el) {
    if (!el) return;
    el.classList.add("score-flash");
    setTimeout(function () {
      el.classList.remove("score-flash");
    }, 500);
  }

  loadSettings();

  return {
    shakeBoard: shakeBoard,
    spawnParticles: spawnParticles,
    spawnParticlesAtCell: spawnParticlesAtCell,
    confetti: confetti,
    flashScore: flashScore,
    setParticlesEnabled: setParticlesEnabled,
    isParticlesEnabled: isParticlesEnabled
  };
})();
