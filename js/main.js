(function () {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function ensureHidden(form, name, value) {
    let el = form.querySelector('[name="' + name + '"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      form.appendChild(el);
    }
    if (value !== undefined && value !== null && value !== "") el.value = value;
    return el;
  }

  document.querySelectorAll("form.lead-form").forEach(function (form) {
    // Hard attribution — we are the lead source
    ensureHidden(form, "lead_source", "Premier Estate Agents — Newcastle seller site");
    ensureHidden(
      form,
      "attribution",
      "Lead originated from damienmueller-cloud.github.io/premier-newcastle-sellers (NOT premierestateagents.com.au organic)"
    );
    ensureHidden(form, "referred_by", "Premier Estate Agents Newcastle seller site");
    ensureHidden(form, "_cc", "rodney@premierestateagents.com.au");
    ensureHidden(
      form,
      "_subject",
      "Seller lead via Premier Estate Agents seller site (Newcastle)"
    );

    const map = {
      utm_source: param("utm_source"),
      utm_medium: param("utm_medium"),
      utm_campaign: param("utm_campaign"),
      utm_content: param("utm_content"),
      utm_term: param("utm_term"),
      source: param("utm_source") || "premier-newcastle-sellers",
      page: window.location.href,
      user_agent: navigator.userAgent.slice(0, 240),
    };
    Object.keys(map).forEach(function (key) {
      ensureHidden(form, key, map[key] || (key === "source" ? "premier-newcastle-sellers" : ""));
    });

    // Best-effort local vault mirror (only works if webhook is reachable; ignore errors)
    form.addEventListener("submit", function () {
      try {
        const data = {};
        new FormData(form).forEach(function (v, k) {
          data[k] = v;
        });
        data.timestamp = new Date().toISOString();
        data.vault_note = "browser mirror attempt — authoritative copy also FormSubmit email";
        // localStorage backup for Mia daily report
        const key = "fp_leads_mirror";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        prev.push(data);
        localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
      } catch (e) {}
    });
  });
})();
