/**
 * 2048 Cupcakes — Content UI (vanilla)
 * Reveal, SVG rings, tabs, accordion, carousel, reading progress
 */
(function () {
  "use strict";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;

    if (prefersReducedMotion()) {
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.add("active");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    for (var j = 0; j < nodes.length; j++) {
      observer.observe(nodes[j]);
    }
  }

  function initBenefitRings() {
    var cards = document.querySelectorAll(".benefit-card");
    if (!cards.length) return;

    function activate(card) {
      var ring = card.querySelector(".benefit-ring__progress");
      if (ring) {
        ring.style.strokeDashoffset = "100";
        // Force reflow then animate to 0
        void ring.getBoundingClientRect();
        ring.style.strokeDashoffset = "0";
      }
      card.classList.add("is-animated");
    }

    if (prefersReducedMotion()) {
      for (var i = 0; i < cards.length; i++) {
        activate(cards[i]);
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          activate(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );

    for (var j = 0; j < cards.length; j++) {
      var progress = cards[j].querySelector(".benefit-ring__progress");
      if (progress) {
        progress.style.strokeDasharray = "100";
        progress.style.strokeDashoffset = "100";
      }
      observer.observe(cards[j]);
    }
  }

  function initTabs() {
    var roots = document.querySelectorAll("[data-tabs]");
    for (var r = 0; r < roots.length; r++) {
      (function (root) {
        var tabs = root.querySelectorAll('[role="tab"]');
        var panels = root.querySelectorAll('[role="tabpanel"]');

        function activate(tab) {
          var id = tab.getAttribute("aria-controls");
          for (var i = 0; i < tabs.length; i++) {
            var selected = tabs[i] === tab;
            tabs[i].setAttribute("aria-selected", selected ? "true" : "false");
            tabs[i].tabIndex = selected ? 0 : -1;
          }
          for (var j = 0; j < panels.length; j++) {
            var match = panels[j].id === id;
            panels[j].classList.toggle("is-active", match);
            panels[j].setAttribute("aria-hidden", match ? "false" : "true");
          }
        }

        for (var t = 0; t < tabs.length; t++) {
          tabs[t].addEventListener("click", function (e) {
            activate(e.currentTarget);
          });
          tabs[t].addEventListener("keydown", function (e) {
            var key = e.key;
            if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") {
              return;
            }
            e.preventDefault();
            var list = Array.prototype.slice.call(tabs);
            var idx = list.indexOf(e.currentTarget);
            var next = idx;
            if (key === "ArrowRight") next = (idx + 1) % list.length;
            if (key === "ArrowLeft") next = (idx - 1 + list.length) % list.length;
            if (key === "Home") next = 0;
            if (key === "End") next = list.length - 1;
            list[next].focus();
            activate(list[next]);
          });
        }

        var initial = root.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
        if (initial) activate(initial);
      })(roots[r]);
    }
  }

  function initAccordions() {
    var triggers = document.querySelectorAll(".accordion-trigger");
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener("click", function (e) {
        var btn = e.currentTarget;
        var panelId = btn.getAttribute("aria-controls");
        var panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;

        var expanded = btn.getAttribute("aria-expanded") === "true";
        var next = !expanded;
        btn.setAttribute("aria-expanded", next ? "true" : "false");

        if (next) {
          panel.style.maxHeight = panel.scrollHeight + "px";
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
          void panel.offsetHeight;
          panel.style.maxHeight = "0px";
        }
      });
    }

    window.addEventListener("resize", function () {
      var open = document.querySelectorAll('.accordion-trigger[aria-expanded="true"]');
      for (var j = 0; j < open.length; j++) {
        var id = open[j].getAttribute("aria-controls");
        var p = id ? document.getElementById(id) : null;
        if (p) p.style.maxHeight = p.scrollHeight + "px";
      }
    });
  }

  function initCarousel() {
    var carousels = document.querySelectorAll("[data-carousel]");
    for (var i = 0; i < carousels.length; i++) {
      (function (root) {
        var track = root.querySelector(".carousel__track");
        var prev = root.querySelector("[data-carousel-prev]");
        var next = root.querySelector("[data-carousel-next]");
        var dotsWrap = root.querySelector("[data-carousel-dots]");
        var slides = track ? track.querySelectorAll(".carousel__slide") : [];
        if (!track) return;

        function scrollByPage(dir) {
          var amount = Math.max(track.clientWidth * 0.7, 240) * (dir < 0 ? -1 : 1);
          track.scrollBy({ left: amount, behavior: "smooth" });
        }

        function updateCenter() {
          if (!slides.length) return;
          var mid = track.scrollLeft + track.clientWidth / 2;
          var best = 0;
          var bestDist = Infinity;
          for (var s = 0; s < slides.length; s++) {
            var center = slides[s].offsetLeft + slides[s].offsetWidth / 2;
            var dist = Math.abs(center - mid);
            if (dist < bestDist) {
              bestDist = dist;
              best = s;
            }
            slides[s].classList.remove("is-center");
          }
          slides[best].classList.add("is-center");
          if (dotsWrap) {
            var dots = dotsWrap.querySelectorAll("button");
            for (var d = 0; d < dots.length; d++) {
              dots[d].classList.toggle("is-active", d === best);
            }
          }
        }

        if (dotsWrap && slides.length) {
          dotsWrap.innerHTML = "";
          for (var di = 0; di < slides.length; di++) {
            (function (index) {
              var btn = document.createElement("button");
              btn.type = "button";
              btn.setAttribute("aria-label", "Go to slide " + (index + 1));
              btn.addEventListener("click", function () {
                slides[index].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              });
              dotsWrap.appendChild(btn);
            })(di);
          }
        }

        if (prev) {
          prev.addEventListener("click", function () {
            scrollByPage(-1);
          });
        }
        if (next) {
          next.addEventListener("click", function () {
            scrollByPage(1);
          });
        }

        track.addEventListener("scroll", function () {
          window.requestAnimationFrame(updateCenter);
        }, { passive: true });

        updateCenter();
      })(carousels[i]);
    }
  }

  function initOfflineToggle() {
    var roots = document.querySelectorAll("[data-offline-toggle]");
    for (var i = 0; i < roots.length; i++) {
      (function (root) {
        var btn = root.querySelector("[data-offline-switch]");
        var online = root.querySelector('[data-offline-card="online"]');
        var offline = root.querySelector('[data-offline-card="offline"]');
        if (!btn || !online || !offline) return;
        btn.addEventListener("click", function () {
          var offlineOn = !root.classList.contains("is-offline");
          root.classList.toggle("is-offline", offlineOn);
          btn.setAttribute("aria-pressed", offlineOn ? "true" : "false");
          online.classList.toggle("is-active", !offlineOn);
          offline.classList.toggle("is-active", offlineOn);
        });
      })(roots[i]);
    }
  }

  function initFaqSearch() {
    var input = document.getElementById("faq-search-input");
    var root = document.querySelector("[data-faq-filter]");
    if (!input || !root) return;
    var items = root.querySelectorAll("[data-faq-item]");
    input.addEventListener("input", function () {
      var q = (input.value || "").toLowerCase().trim();
      for (var i = 0; i < items.length; i++) {
        var text = items[i].textContent.toLowerCase();
        items[i].hidden = q ? text.indexOf(q) === -1 : false;
      }
    });
  }

  function initReadingProgress() {
    var bar = document.getElementById("reading-progress");
    if (!bar) return;

    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      var ratio = height > 0 ? scrollTop / height : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      bar.style.transform = "scaleX(" + ratio + ")";
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    update();
  }

  function initCupcakeOrbit() {
    var roots = document.querySelectorAll("[data-cupcake-orbit]");
    for (var r = 0; r < roots.length; r++) {
      (function (root) {
        var orbit = root.querySelector(".what-are-orbit");
        var prev = root.querySelector("[data-orbit-prev]");
        var next = root.querySelector("[data-orbit-next]");
        var dots = root.querySelectorAll("[data-orbit-dots] span");
        var index = 0;
        var total = dots.length || 4;

        function setDot(i) {
          index = ((i % total) + total) % total;
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle("is-active", d === index);
          }
        }

        function nudge(dir) {
          if (!orbit) return;
          if (prefersReducedMotion()) {
            setDot(index + dir);
            return;
          }
          orbit.classList.add("is-paused");
          var current = getComputedStyle(orbit).transform;
          orbit.style.transform = current === "none" ? "rotate(0deg)" : current;
          // force reflow then rotate by step
          void orbit.offsetWidth;
          var step = dir > 0 ? 51.4 : -51.4;
          orbit.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
          orbit.style.transform = "rotate(" + step * (index + 1) + "deg)";
          setDot(index + dir);
          window.setTimeout(function () {
            orbit.style.transition = "";
            orbit.classList.remove("is-paused");
          }, 650);
        }

        if (prev) prev.addEventListener("click", function () { nudge(-1); });
        if (next) next.addEventListener("click", function () { nudge(1); });
      })(roots[r]);
    }
  }

  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;

    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > 480) btn.removeAttribute("hidden");
      else btn.setAttribute("hidden", "");
    }

    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initGuideToc() {
    var panel = document.getElementById("guide-toc-panel");
    if (!panel) return;

    panel.addEventListener("click", function (e) {
      var link = e.target.closest("a[href^='#']");
      if (!link || !panel.contains(link)) return;
      // After jump, collapse so the section isn't buried under the open menu
      window.setTimeout(function () {
        panel.open = false;
      }, 80);
    });
  }

  function bootContentUi() {
    initReadingProgress();
    initReveal();
    initBenefitRings();
    initTabs();
    initAccordions();
    initCarousel();
    initCupcakeOrbit();
    initOfflineToggle();
    initFaqSearch();
    initBackToTop();
    initGuideToc();
  }

  // Guide HTML is injected after first paint — DOMContentLoaded already fired by then.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootContentUi);
  } else {
    bootContentUi();
  }
})();
