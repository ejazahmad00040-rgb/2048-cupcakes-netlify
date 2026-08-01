var SoundManager = (function () {
  "use strict";

  var ctx = null;
  var sfxEnabled = true;
  var musicEnabled = false;
  var unlocked = false;
  var musicPlaying = false;
  var musicTimer = null;

  var SFX_KEY = "cupcakesSfxEnabled";
  var MUSIC_KEY = "cupcakesMusicEnabled";

  var clips = {
    merge: "assets/sounds/merge.mp3",
    pop: "assets/sounds/pop.mp3",
    coin: "assets/sounds/coin.mp3"
  };

  var pool = {};

  function getContext() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        ctx = null;
      }
    }
    return ctx;
  }

  function unlock() {
    // Only create/resume after a real user gesture path calls this.
    var audio = getContext();
    if (!audio) return;
    if (audio.state === "suspended") {
      audio.resume().then(function () { unlocked = true; }).catch(function () {});
    } else {
      unlocked = true;
    }
  }

  function loadClip(name) {
    if (pool[name]) return pool[name];
    var src = clips[name];
    if (!src) return null;
    var list = [];
    // One element, no preload — eager preload was keeping the tab "loading" forever
    var a = new Audio();
    a.preload = "none";
    a.src = src;
    list.push(a);
    pool[name] = { list: list, idx: 0 };
    return pool[name];
  }

  function playClip(name, volume) {
    if (!sfxEnabled) return false;
    unlock();
    var p = loadClip(name);
    if (!p) return false;
    var a = p.list[0];
    try {
      a.volume = Math.min(1, volume || 0.85);
      a.currentTime = 0;
      a.play().catch(function () {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function playTone(freq, duration, type, volume, delay) {
    if (!sfxEnabled) return;
    var audio = getContext();
    if (!audio) return;
    unlock();
    var start = audio.currentTime + (delay || 0);
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    var vol = volume || 0.35;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function playNoise(duration, volume) {
    if (!sfxEnabled) return;
    var audio = getContext();
    if (!audio) return;
    unlock();
    var bufferSize = Math.floor(audio.sampleRate * duration);
    var buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var source = audio.createBufferSource();
    var gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume || 0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    source.connect(gain);
    gain.connect(audio.destination);
    source.start();
  }

  function loadSettings() {
    var sfx = localStorage.getItem(SFX_KEY);
    var music = localStorage.getItem(MUSIC_KEY);
    sfxEnabled = sfx !== "false";
    musicEnabled = music === "true";
  }

  function setSfxEnabled(value) {
    sfxEnabled = !!value;
    localStorage.setItem(SFX_KEY, sfxEnabled ? "true" : "false");
    if (sfxEnabled) unlock();
  }

  function setMusicEnabled(value) {
    musicEnabled = !!value;
    localStorage.setItem(MUSIC_KEY, musicEnabled ? "true" : "false");
    if (musicEnabled) {
      unlock();
      startMusic();
    } else {
      stopMusic();
    }
  }

  function isSfxEnabled() { return sfxEnabled; }
  function isMusicEnabled() { return musicEnabled; }

  /* backward compat */
  function setEnabled(value) { setSfxEnabled(value); }
  function isEnabled() { return sfxEnabled; }

  function bindUnlockEvents() {
    ["click", "keydown", "touchstart"].forEach(function (evt) {
      document.addEventListener(evt, function () {
        unlock();
        if (musicEnabled && !musicPlaying) startMusic();
      }, { passive: true });
    });
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  function startMusic() {
    if (!musicEnabled || musicPlaying) return;
    musicPlaying = true;
    var beat = [262, 330, 392, 494, 392, 330];
    var step = 0;

    function tick() {
      if (!musicPlaying || !musicEnabled) return;
      if (sfxEnabled) {
        playTone(beat[step % beat.length], 0.2, "triangle", 0.1);
        playTone(beat[step % beat.length] * 2, 0.15, "sine", 0.05, 0.02);
      }
      step++;
      musicTimer = setTimeout(tick, 380);
    }
    tick();
  }

  Object.keys(clips); // clip map kept for lazy loadClip()
  loadSettings();
  bindUnlockEvents();

  return {
    resume: unlock,
    unlock: unlock,
    setSfxEnabled: setSfxEnabled,
    setMusicEnabled: setMusicEnabled,
    isSfxEnabled: isSfxEnabled,
    isMusicEnabled: isMusicEnabled,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    showUnlockHint: function () {},

    move: function () {
      playClip("pop", 0.35) || playTone(180, 0.05, "triangle", 0.12);
    },

    spawn: function () {
      playClip("pop", 0.45) || playTone(720, 0.07, "sine", 0.18);
    },

    mergeByTier: function (value, combo) {
      var vol = value >= 128 ? 1 : value >= 32 ? 0.9 : 0.8;
      playClip("merge", vol);
      playClip("coin", vol * 0.7);
      if (value >= 64) playTone(600 + Math.log2(value) * 40, 0.15, "sine", 0.35, 0.05);
      if (combo >= 2) {
        playClip("coin", 0.95);
        playTone(900 + combo * 50, 0.12, "square", 0.4, 0.08);
      }
    },

    startMusic: startMusic,
    stopMusic: stopMusic,

    merge: function (value) { this.mergeByTier(value, 1); },

    combo: function (n) {
      playClip("coin", 0.95);
      playTone(700 + n * 60, 0.14, "square", 0.45);
    },

    tierUp: function () {
      playClip("merge", 1);
      playClip("coin", 1);
      [523, 659, 784, 988].forEach(function (f, i) {
        playTone(f, 0.2, "sine", 0.45, i * 0.08);
      });
    },

    party: function () {
      playClip("merge", 1);
      playClip("coin", 0.9);
      [523, 659, 784, 988, 1175].forEach(function (f, i) {
        playTone(f, 0.22, "sine", 0.5, i * 0.09);
      });
      playNoise(0.15, 0.2);
    },

    win: function () { this.party(); },

    lose: function () {
      playTone(220, 0.35, "sawtooth", 0.25);
      playTone(160, 0.4, "sine", 0.18, 0.15);
    },

    undo: function () { playTone(360, 0.1, "triangle", 0.22); },
    achievement: function () { playClip("coin", 0.9); },
    click: function () { playClip("pop", 0.3); },
    record: function () { playClip("coin", 0.85); },

    dangerPulse: function () {
      playTone(140, 0.18, "sawtooth", 0.2);
      playTone(110, 0.22, "sine", 0.15, 0.12);
    }
  };
})();
