(function () {
  "use strict";

  var currentPage = document.body.getAttribute("data-page") || "";
  var homeUrl =
    (window.SiteConfig && typeof SiteConfig.absolute === "function"
      ? SiteConfig.absolute("/")
      : "") || ((typeof location !== "undefined" && location.origin) ? (location.origin + (location.pathname.replace(/\/[^/]*$/, "/").replace(/\/?$/, "/") || "/")) : "./");
  if (homeUrl.slice(-1) !== "/") homeUrl += "/";

  var navItems = [
    { href: homeUrl, label: "Home", id: "home" },
    { href: "how-to-play.html", label: "How to Play", id: "how-to-play" },
    { href: "about.html", label: "About", id: "about" },
    { href: "contact.html", label: "Contact", id: "contact" }
  ];

  function buildNav() {
    return navItems.map(function (item) {
      var active = item.id === currentPage ? " is-active" : "";
      return '<li><a href="' + item.href + '" class="' + active.trim() + '">' + item.label + "</a></li>";
    }).join("");
  }

  /** Same logo mark + text in header and footer */
  function buildLogo() {
    return (
      '<a href="' + homeUrl + '" class="site-logo">' +
        '<span class="site-logo__icon" aria-hidden="true">' +
          '<img src="style/img/bg.webp" alt="" width="48" height="48" decoding="async">' +
        "</span>" +
        '<span class="site-logo__text">2048 Cupcakes<small>Free Online Puzzle</small></span>' +
      "</a>"
    );
  }

  function buildHeader() {
    return (
      '<div class="site-header__inner">' +
        buildLogo() +
        '<button class="site-nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">☰</button>' +
        '<div class="site-nav-backdrop" id="site-nav-backdrop" hidden></div>' +
        '<ul class="site-nav" id="site-nav">' + buildNav() +
          '<li><a href="' + homeUrl + '#game" class="site-nav__cta">▶ Play Now</a></li>' +
        "</ul>" +
      "</div>"
    );
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    return (
      '<div class="site-footer__top">' +
        '<div class="site-footer__inner">' +
          '<div class="site-footer__brand">' +
            buildLogo() +
            '<p class="site-footer__tagline">The most feature-rich 2048 Cupcakes game online — undo, achievements, sound effects, and mobile swipe support.</p>' +
            '<a href="' + homeUrl + '#game" class="site-footer__play-btn">▶ Play Now</a>' +
          "</div>" +
          '<div class="site-footer__cols">' +
            '<div class="site-footer__col">' +
              '<p class="site-footer__col-title">Game</p>' +
              "<ul>" +
                '<li><a href="' + homeUrl + '#game">Play 2048 Cupcakes</a></li>' +
                '<li><a href="how-to-play.html">How to Play</a></li>' +
                '<li><a href="' + homeUrl + '#strategies">Winning Strategy</a></li>' +
                '<li><a href="' + homeUrl + '#cupcake-levels-table">All Cupcake Flavors</a></li>' +
                '<li><a href="' + homeUrl + '#faq">FAQ</a></li>' +
              "</ul>" +
            "</div>" +
            '<div class="site-footer__col">' +
              '<p class="site-footer__col-title">About</p>' +
              "<ul>" +
                '<li><a href="about.html">About Us</a></li>' +
                '<li><a href="contact.html">Contact</a></li>' +
                '<li><a href="how-to-play.html">How to Play</a></li>' +
              "</ul>" +
            "</div>" +
            '<div class="site-footer__col">' +
              '<p class="site-footer__col-title">Legal</p>' +
              "<ul>" +
                '<li><a href="privacy-policy.html">Privacy Policy</a></li>' +
                '<li><a href="terms.html">Terms of Use</a></li>' +
              "</ul>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="site-footer__bottom">' +
        '<div class="site-footer__inner site-footer__inner--bottom">' +
          '<p class="site-footer__credits">Inspired by <a href="https://play2048.co/" target="_blank" rel="noopener noreferrer">2048</a> by Gabriele Cirulli (MIT License). Free fan-made cupcake puzzle — not affiliated with any bakery.' +
          "</p>" +
          '<p class="site-footer__copy">&copy; ' + year + " 2048 Cupcakes. Made for fun — play free online.</p>" +
        "</div>" +
      "</div>"
    );
  }

  function initNav() {
    var toggle = document.querySelector(".site-nav-toggle");
    var nav = document.getElementById("site-nav");
    var backdrop = document.getElementById("site-nav-backdrop");
    if (!toggle || !nav) return;

    function closeNav() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      if (backdrop) backdrop.hidden = true;
    }

    function openNav() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
      if (backdrop) backdrop.hidden = false;
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (nav.classList.contains("is-open")) closeNav();
      else openNav();
    });

    if (backdrop) {
      backdrop.addEventListener("click", closeNav);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) closeNav();
    });
  }

  function inject() {
    var h = document.getElementById("site-header");
    var f = document.getElementById("site-footer");
    if (h) { h.className = "site-header"; h.innerHTML = buildHeader(); }
    if (f) { f.className = "site-footer"; f.innerHTML = buildFooter(); }
    initNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
