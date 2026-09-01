(function () {
  "use strict";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu toggle
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("main-nav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("open");
      menuToggle.classList.toggle("open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
        menuToggle.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Back to top button
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("visible", window.scrollY > 500);
    });
  }

  // Contact form (client-side only demo handling)
  var form = document.getElementById("contactForm");
  var formNote = document.getElementById("formNote");

  if (form && formNote) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        formNote.textContent = "Please fill in all required fields with a valid email.";
        formNote.style.color = "#e8734a";
        form.reportValidity();
        return;
      }

      formNote.textContent = "Thanks! Your message has been received — we'll be in touch within one business day.";
      formNote.style.color = "#1c7c82";
      form.reset();
    });
  }
})();
