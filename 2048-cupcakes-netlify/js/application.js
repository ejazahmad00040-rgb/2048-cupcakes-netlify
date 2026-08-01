window.__bootGameExtras = function () {
  if (!window.game) return;
  try {
    if (window.GameEnhancements && !window.GameEnhancements.__booted) {
      GameEnhancements.init(window.game);
      window.GameEnhancements.__booted = true;
    }
  } catch (err) { console.warn(err); }
  try {
    if (window.PlayModes && !window.PlayModes.__booted) {
      PlayModes.init(window.game);
      window.PlayModes.__booted = true;
    }
  } catch (err) { console.warn(err); }
  try {
    if (window.FunLayer && !window.FunLayer.__booted) {
      FunLayer.init(window.game);
      window.FunLayer.__booted = true;
    }
  } catch (err) { console.warn(err); }
};

window.requestAnimationFrame(function () {
  try {
    window.game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  } catch (err) {
    console.error("Game boot failed:", err);
    return;
  }
  window.__bootGameExtras();
  setTimeout(window.__bootGameExtras, 400);
  setTimeout(window.__bootGameExtras, 1200);
});
