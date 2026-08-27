(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];

  function track(name, params) {
    window.dataLayer.push(Object.assign({ event: name, page_type: "trackless_pivot_authority" }, params || {}));
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("[data-track]");
    if (!link) return;
    track(link.getAttribute("data-track"), { link_text: (link.textContent || "").trim(), link_url: link.href || "" });
  });

  var form = document.querySelector("form[data-estimate-upload]");
  if (form) {
    form.addEventListener("submit", function () {
      var role = form.querySelector("[name=role]");
      track("form_submit", { role: role ? role.value : "" });
    });
  }

  if ("IntersectionObserver" in window) {
    document.querySelectorAll("[data-scroll-track]").forEach(function (section) {
      var observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        track("technical_section_view", { section: section.getAttribute("data-scroll-track") });
        observer.disconnect();
      }, { threshold: 0.45 });
      observer.observe(section);
    });
  }
})();
