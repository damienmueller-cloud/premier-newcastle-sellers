(function () {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Capture UTM + page context into hidden fields
  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }
  document.querySelectorAll("form.lead-form").forEach(function (form) {
    const map = {
      utm_source: param("utm_source"),
      utm_medium: param("utm_medium"),
      utm_campaign: param("utm_campaign"),
      utm_content: param("utm_content"),
      utm_term: param("utm_term"),
      source: param("utm_source") || "website",
      page: window.location.pathname,
      user_agent: navigator.userAgent.slice(0, 240),
    };
    Object.keys(map).forEach(function (key) {
      let el = form.querySelector('[name="' + key + '"]');
      if (!el) {
        el = document.createElement("input");
        el.type = "hidden";
        el.name = key;
        form.appendChild(el);
      }
      if (map[key]) el.value = map[key];
    });
  });
})();
