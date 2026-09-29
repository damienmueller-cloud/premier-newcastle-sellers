/* Premier Estate Agents: recent-sales guide + appraisal request.
 * Shows homes Premier has already sold. Not a price guide and not a valuation.
 * Data: data/premier_sales.json (Premier's own published results).
 * Fields used: address, suburb, beds, baths, car, price_aud, results_order, source.
 */
(function () {
  "use strict";

  var DISCLAIMER =
    "These are past sales by Premier Estate Agents, shown as a guide only. They are not an appraisal or valuation. Rodney will prepare a proper appraisal for your home.";
  var DATA_URL = "data/premier_sales.json";
  var MAX_RESULTS = 6;
  var LEAD_SUBJECT = "Home value request \u2013 Premier Estate Agents (Newcastle)";

  var ADJACENT = {
    "lambton": ["new lambton", "north lambton", "jesmond", "waratah", "broadmeadow", "waratah west"],
    "new lambton": ["lambton", "kotara", "adamstown", "broadmeadow", "new lambton heights", "jesmond"],
    "north lambton": ["lambton", "jesmond", "waratah west", "birmingham gardens", "wallsend"],
    "jesmond": ["lambton", "north lambton", "new lambton", "wallsend", "birmingham gardens", "rankin park"],
    "kotara": ["new lambton", "adamstown", "adamstown heights", "kotara south", "charlestown", "rankin park"],
    "waratah": ["lambton", "mayfield", "georgetown", "waratah west", "hamilton north", "north lambton"],
    "mayfield": ["waratah", "georgetown", "tighes hill", "islington", "mayfield west", "mayfield east", "warabrook"],
    "hamilton": ["broadmeadow", "hamilton south", "hamilton north", "hamilton east", "islington", "merewether", "cooks hill"],
    "broadmeadow": ["hamilton", "lambton", "new lambton", "adamstown", "hamilton north", "hamilton south", "georgetown"],
    "adamstown": ["new lambton", "kotara", "merewether", "hamilton south", "broadmeadow", "adamstown heights"],
    "merewether": ["adamstown", "hamilton south", "the junction", "bar beach", "merewether heights", "hamilton"],
    "new lambton heights": ["new lambton", "rankin park", "kotara", "lambton"],
    "waratah west": ["waratah", "north lambton", "lambton", "mayfield west"],
    "georgetown": ["waratah", "hamilton north", "broadmeadow", "mayfield"],
    "hamilton north": ["hamilton", "broadmeadow", "georgetown", "waratah"],
    "adamstown heights": ["adamstown", "kotara", "merewether heights", "new lambton"],
    "rankin park": ["new lambton heights", "jesmond", "elermore vale", "kotara"],
    "elermore vale": ["rankin park", "wallsend", "jesmond"],
    "wallsend": ["jesmond", "elermore vale", "birmingham gardens", "north lambton"]
  };

  var root = typeof window !== "undefined" ? window : {};
  root.dataLayer = root.dataLayer || [];
  function track(event, params) {
    var payload = { event: event };
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) payload[k] = params[k];
    if (typeof root.gtag === "function") root.gtag("event", event, params || {});
    else root.dataLayer.push(payload);
  }
  root.premierTrack = track;

  function normSuburb(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\bnsw\b/g, " ")
      .replace(/\b\d{4}\b/g, " ")
      .replace(/[^a-z' -]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function titleCase(s) {
    return String(s || "").replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  /* Unit only when the address starts like "5/12" or "404/9". Every slash
   * address in the current file matches this; nothing else is treated as a unit. */
  function isUnitAddress(address) {
    return /^\s*\d+\s*\/\s*\d+/.test(String(address || ""));
  }
  function listingUrl(s) {
    try {
      var u = new URL(String(s || ""));
      if (u.protocol !== "https:" && u.protocol !== "http:") return "";
      if (!/(^|\.)premierestateagents\.com\.au$/i.test(u.hostname)) return "";
      return u.href;
    } catch (e) {
      return "";
    }
  }
  function priceLabel(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return "Price withheld";
    return "$" + Math.round(n).toLocaleString("en-AU");
  }
  function bedsMatch(rowBeds, want) {
    if (rowBeds == null || rowBeds === "") return false;
    var n = Number(rowBeds);
    if (!isFinite(n)) return false;
    if (Number(want) >= 5) return n >= 5;
    return n === Number(want);
  }
  function byOrder(a, b) { return Number(a.results_order) - Number(b.results_order); }

  function selectSales(rows, q) {
    var suburb = normSuburb(q.suburb);
    var local = rows.filter(function (r) { return normSuburb(r.suburb) === suburb; }).sort(byOrder);
    var nb = ADJACENT[suburb] || [];
    var near = rows.filter(function (r) { return nb.indexOf(normSuburb(r.suburb)) !== -1; }).sort(byOrder);
    var pool = local.concat(near);
    if (!pool.length) {
      return { status: "none", shown: [], widened: false, bedsFallback: false, typeFallback: false, suburb: suburb };
    }
    var list = pool;
    var typeFallback = false;
    if (q.type === "house" || q.type === "unit") {
      var typed = list.filter(function (r) { return (isUnitAddress(r.address) ? "unit" : "house") === q.type; });
      if (typed.length) list = typed;
      else typeFallback = true;
    }
    var bedsFallback = false;
    if (q.beds) {
      var matched = list.filter(function (r) { return bedsMatch(r.beds, q.beds); });
      if (matched.length) list = matched;
      else bedsFallback = true;
    }
    var shown = list.slice(0, MAX_RESULTS);
    var widened = shown.some(function (r) { return normSuburb(r.suburb) !== suburb; });
    return { status: "results", shown: shown, widened: widened, bedsFallback: bedsFallback, typeFallback: typeFallback, suburb: suburb, localCount: local.length };
  }

  var api = { selectSales: selectSales, normSuburb: normSuburb, isUnitAddress: isUnitAddress, priceLabel: priceLabel, listingUrl: listingUrl, ADJACENT: ADJACENT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var $ = function (id) { return document.getElementById(id); };
  var form = $("value-form"), result = $("value-result"), leadWrap = $("value-lead"), leadForm = $("value-lead-form");
  if (!form || !result) return;

  document.querySelectorAll("[data-disclaimer]").forEach(function (el) { el.textContent = DISCLAIMER; });

  var dataState = { status: "loading", rows: [] };
  var dataPromise = fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (json) {
      var rows = Array.isArray(json) ? json : [];
      dataState = { status: rows.length ? "ok" : "empty", rows: rows };
      return dataState;
    })
    .catch(function () {
      dataState = { status: "missing", rows: [] };
      return dataState;
    });

  track("value_tool_view", { page_path: window.location.pathname });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function specLine(r) {
    var bits = [];
    if (r.beds != null && r.beds !== "") bits.push(r.beds + " bed");
    if (r.baths != null && r.baths !== "") bits.push(r.baths + " bath");
    if (r.car != null && r.car !== "") bits.push(r.car + " car");
    return bits.join(" \u00b7 ");
  }

  function render(q, picked, dataStatus) {
    result.innerHTML = "";
    var card = el("div", "form-card value-card");
    var h = el("h2", null, null);
    h.id = "value-result-heading";
    h.tabIndex = -1;
    card.appendChild(h);
    var sub = titleCase(picked ? picked.suburb : normSuburb(q.suburb));

    if (picked && picked.status === "results") {
      h.textContent = "Recently sold by Premier Estate Agents";
      var where = picked.widened ? sub + " and nearby suburbs" : sub;
      card.appendChild(el("p", "value-basis", "Homes Premier has sold in " + where + "."));
      if (picked.typeFallback) card.appendChild(el("p", "value-note", "House and unit aren\u2019t listed separately for these, so both are shown."));
      if (picked.bedsFallback) card.appendChild(el("p", "value-note", "None of these match that bedroom count, so other bedroom counts are shown."));
      var list = el("ul", "sold-list");
      picked.shown.forEach(function (r) {
        var li = el("li", "sold-card");
        li.appendChild(el("p", "sold-address", String(r.address || "Address on the listing")));
        var place = titleCase(normSuburb(r.suburb));
        if (place && place.toLowerCase() !== sub.toLowerCase()) li.appendChild(el("p", "sold-suburb", place));
        var spec = specLine(r);
        if (spec) li.appendChild(el("p", "sold-spec", spec));
        li.appendChild(el("p", "sold-price", priceLabel(r.price_aud)));
        var href = listingUrl(r.source);
        if (href) {
          var a = el("a", "sold-link", "View listing");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener";
          li.appendChild(a);
        }
        list.appendChild(li);
      });
      card.appendChild(list);
    } else {
      h.textContent = "Let\u2019s get you a proper appraisal";
      var msg = dataStatus === "ok"
        ? "Premier hasn\u2019t published recent sales in " + sub + " or the suburbs next to it. Rodney can still appraise your home."
        : "Recent sales can\u2019t be shown right now. Rodney can still appraise your home.";
      card.appendChild(el("p", "value-basis", msg));
    }
    card.appendChild(el("p", "value-disclaimer", DISCLAIMER));
    result.appendChild(card);
    result.hidden = false;
    h.focus({ preventScroll: true });
    if (result.scrollIntoView) result.scrollIntoView({ block: "start" });
  }

  function fillLead(q, picked) {
    if (!leadForm) return;
    var set = function (name, v) {
      var f = leadForm.querySelector('[name="' + name + '"]');
      if (f && (f.type === "hidden" || !f.value || name === "suburb" || name === "property_type" || name === "beds" || name === "sales_shown" || name === "_subject")) f.value = v == null ? "" : v;
    };
    set("suburb", q.suburb);
    set("property_type", q.type);
    set("beds", q.beds);
    set("_subject", LEAD_SUBJECT);
    var shown = (picked && picked.shown || []).map(function (r) {
      return [r.address, r.suburb, priceLabel(r.price_aud)].filter(Boolean).join(", ");
    }).join(" | ");
    set("sales_shown", shown);
    var summary = $("lead-summary");
    if (summary) {
      var bits = [q.suburb];
      if (q.type) bits.push(q.type);
      if (q.beds) bits.push(q.beds + (Number(q.beds) >= 5 ? "+ bed" : " bed"));
      summary.textContent = bits.join(" \u00b7 ");
    }
    leadWrap.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var q = {
      suburb: String(fd.get("suburb") || "").trim(),
      type: fd.get("property_type") === "unit" ? "unit" : (fd.get("property_type") === "house" ? "house" : ""),
      beds: String(fd.get("beds") || "")
    };
    var btn = form.querySelector("button[type=submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Looking up sales\u2026"; }
    dataPromise.then(function (ds) {
      var picked = ds.status === "ok" ? selectSales(ds.rows, q) : { status: "none", shown: [], widened: false, suburb: normSuburb(q.suburb) };
      render(q, picked, ds.status);
      fillLead(q, picked);
      if (btn) { btn.disabled = false; btn.textContent = "Update sales"; }
      var params = {
        suburb: titleCase(normSuburb(q.suburb)),
        type: q.type || "any",
        beds: q.beds || "any",
        results_count: picked.shown ? picked.shown.length : 0,
        widened: !!picked.widened
      };
      if (picked.status === "results") track("value_tool_results", params);
      else {
        track("value_tool_results", params);
        track("value_tool_no_results", params);
      }
    });
  });

  if (leadForm) {
    var subj = leadForm.querySelector('[name="_subject"]');
    if (subj) subj.value = LEAD_SUBJECT;
    leadForm.addEventListener("submit", function () {
      if (subj) subj.value = LEAD_SUBJECT;
      var p = {
        form_id: "value_tool_lead",
        suburb: leadForm.querySelector('[name="suburb"]') ? leadForm.querySelector('[name="suburb"]').value : "",
        type: leadForm.querySelector('[name="property_type"]') ? leadForm.querySelector('[name="property_type"]').value : "",
        beds: leadForm.querySelector('[name="beds"]') ? leadForm.querySelector('[name="beds"]').value : ""
      };
      track("generate_lead", p);
      track("value_tool_lead_submit", p);
    });
  }
})();
