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

  // Contact form — submits to FormSubmit.co, which emails the inbox configured in the form's action
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

      // Honeypot: if a bot filled this hidden field, silently drop the submission
      if (form._honey && form._honey.value) return;

      var submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;
      formNote.textContent = "Sending...";
      formNote.style.color = "#3c5a5e";

      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 15000);

      fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
        signal: controller.signal,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Request failed");
          formNote.textContent = "Thanks! Your message has been sent — we'll be in touch within one business day.";
          formNote.style.color = "#1c7c82";
          if (typeof gtag === "function") {
            gtag("event", "generate_lead", { form_id: "contactForm" });
          }
          form.reset();
        })
        .catch(function () {
          formNote.textContent = "Something went wrong sending your message. Please email us directly at lakeshoreventures1@gmail.com.";
          formNote.style.color = "#e8734a";
        })
        .finally(function () {
          clearTimeout(timeoutId);
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
