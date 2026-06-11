/* =========================================================
   Bayansell — app (router, views, interactions)
   Refactored for Asynchronous Supabase Store
   ========================================================= */

window.FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' +
      '<rect width="800" height="800" fill="#ececec"/>' +
      '<g fill="#bdbdbd"><circle cx="295" cy="300" r="55"/>' +
      '<path d="M170 560l140-170 95 110 80-90 145 150z"/></g>' +
      '<text x="400" y="650" font-family="sans-serif" font-size="34" fill="#9e9e9e" text-anchor="middle">No photo</text>' +
      "</svg>"
  );

(function () {
  "use strict";

  var app = document.getElementById("app");

  var state = {
    search: "",
    category: "All",
    sort: "newest",
    dashTab: "listings",
    activeInquiryId: null
  };

  var pendingImages = [];

  /* ----------------------------- Utils ----------------------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatPrice(n) { return "₱" + Number(n).toLocaleString("en-US"); }

  function formatDateAbs(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatDateRel(iso) {
    var then = new Date(iso);
    var diff = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (isNaN(diff)) return "";
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 30) return diff + " days ago";
    return "on " + formatDateAbs(iso);
  }

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var s = parts[0][0] + (parts[1] ? parts[1][0] : "");
    return s.toUpperCase();
  }

  function toast(msg) {
    var t = document.querySelector(".toast") || document.createElement("div");
    if (!t.parentNode) { t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ----------------------- Shared fragments ------------------------ */

  var HEART_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28c7-4.7 12-9.1 12-15 0-3.3-2.7-6-6-6-2.4 0-4.6 1.4-6 3.6C14.6 8.4 12.4 7 10 7c-3.3 0-6 2.7-6 6 0 5.9 5 10.3 12 15z"/></svg>';
  var BACK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>';

  var CATEGORY_ICONS = {
    "All": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "Electronics": '<rect x="2.5" y="4.5" width="19" height="12" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
    "Mobile Phones": '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    "Fashion": '<path d="M10 4a2 2 0 1 0 4 0"/><path d="M12 6v2L4.6 13.2A1.4 1.4 0 0 0 5.4 16h13.2a1.4 1.4 0 0 0 .8-2.8L12 8"/>',
    "Home & Living": '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    "Furniture": '<path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11"/><path d="M3.5 11h17a1.5 1.5 0 0 1 1.5 1.5V17h-2v-2H5v2H3v-4.5A1.5 1.5 0 0 1 4.5 11"/><path d="M5 19v-2M19 19v-2"/>',
    "Appliances": '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="13" r="4.2"/><path d="M8.5 6h.01M11 6h.01"/>',
    "Vehicles": '<path d="M3 13.5 5 8.2A2.5 2.5 0 0 1 7.3 6.5h9.4A2.5 2.5 0 0 1 19 8.2l2 5.3V18h-3v-1.8H6V18H3z"/><circle cx="7.2" cy="15.2" r="1.4"/><circle cx="16.8" cy="15.2" r="1.4"/>',
    "Hobbies & Games": '<path d="M7.5 7.5h9A3.5 3.5 0 0 1 20 11l-1 5.2a2.4 2.4 0 0 1-4.3 1L13 15h-2l-1.7 2.2a2.4 2.4 0 0 1-4.3-1L4 11a3.5 3.5 0 0 1 3.5-3.5z"/><path d="M7.5 11.5h3M9 10v3"/>',
    "Sports": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4"/>',
    "Books": '<path d="M12 6.5C10 5 6.5 5 4.5 6v12c2-1 5.5-1 7.5.5 2-1.5 5.5-1.5 7.5-.5V6c-2-1-5.5-1-7.5.5z"/><path d="M12 6.5v12"/>'
  };

  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (CATEGORY_ICONS[name] || CATEGORY_ICONS["All"]) + "</svg>";
  }

  function imgTag(src, alt, cls) {
    return '<img ' + (cls ? 'class="' + cls + '" ' : "") + 'src="' + esc(src || window.FALLBACK_IMG) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG">';
  }

  async function cardHTML(l) {
    var isFav = await Store.isFavorite(l.id);
    var fav = isFav ? " is-fav" : "";
    var cover = l.images && l.images[0] ? l.images[0] : window.FALLBACK_IMG;
    return (
      '<a class="card" href="#/item/' + esc(l.id) + '">' +
      '<div class="card-media">' +
      '<button class="fav-btn' + fav + '" type="button" data-fav="' + esc(l.id) + '" aria-label="Save to favorites">' + HEART_SVG + "</button>" +
      imgTag(cover, l.title) +
      "</div>" +
      '<div class="card-body">' +
      '<div class="card-title-row"><span class="card-title">' + esc(l.title) + "</span><span class="card-condition">' + esc(l.condition) + "</span></div>" +
      '<div class="card-location">' + esc(l.location) + "</div>" +
      '<div class="card-price"><b>' + formatPrice(l.price) + "</b></div>" +
      "</div></a>"
    );
  }

  async function gridHTML(list) {
    const cards = await Promise.all(list.map(cardHTML));
    return '<div class="grid">' + cards.join("") + "</div>";
  }

  /* ----------------------------- Browse ---------------------------- */

  async function getFilteredListings() {
    var all = await Store.getAllListings();
    var q = state.search.trim().toLowerCase();
    var cat = state.category;

    var list = all.filter(function (l) {
      var matchCat = cat === "All" || l.category === cat;
      var hay = (l.title + " " + l.description + " " + l.location + " " + l.category).toLowerCase();
      var matchQ = !q || hay.indexOf(q) !== -1;
      return matchCat && matchQ;
    });

    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    return list;
  }

  function categoryRowHTML() {
    var cats = ["All"].concat(CATEGORIES);
    return '<div class="filters"><div class="category-tabs">' + cats.map(c => '<button type="button" class="cat-tab' + (state.category === c ? " active" : "") + '" data-cat="' + esc(c) + '">' + iconSvg(c) + "<span>" + esc(c) + "</span></button>").join("") + "</div></div>";
  }

  function toolbarHTML(count) {
    var label = count === 1 ? "1 item" : count.toLocaleString("en-US") + " items";
    function opt(v, t) { return '<option value="' + v + '"' + (state.sort === v ? " selected" : "") + ">" + t + "</option>"; }
    return '<div class="toolbar"><div class="results-count">' + label + (state.category !== "All" ? " in " + esc(state.category) : "") + (state.search ? ' for “' + esc(state.search) + "”" : "") + '</div><div class="sort-control"><label for="sort-select">Sort by</label><select class="sort-select" id="sort-select">' + opt("newest", "Newest") + opt("price-asc", "Price: low to high") + opt("price-desc", "Price: high to low") + "</select></div></div>";
  }

  async function renderBrowse() {
    app.innerHTML = '<div class="loading-state">Finding deals...</div>';
    var list = await getFilteredListings();
    var hero = '<section class="hero"><h1>Find your next great deal</h1><p>Buy and sell preloved and brand-new items with people across the Philippines.</p></section>';
    var body = list.length === 0 ? '<div class="empty"><div class="emoji">🔍</div><h2>No items found</h2><p>Try a different keyword or category.</p><button class="btn btn-secondary" data-action="clear">Clear filters</button></div>' : toolbarHTML(list.length) + await gridHTML(list);
    app.innerHTML = hero + categoryRowHTML() + body;
  }

  /* ----------------------------- Detail ---------------------------- */

  async function renderDetail(id) {
    app.innerHTML = '<div class="loading-state">Loading item...</div>';
    var l = await Store.getById(id);
    if (!l) { app.innerHTML = '<div class="empty"><h2>Listing not found</h2><a class="btn btn-primary" href="#/">Back to browse</a></div>'; return; }
    
    var isFav = await Store.isFavorite(id);
    var favCls = isFav ? " is-fav" : "";
    var sellerMeta = l.isMine ? "This is your listing" : "Member · Bayansell";

    var primaryAction = l.isMine ? '<button class="btn btn-primary btn-block" type="button" data-action="edit" data-id="' + esc(l.id) + '">Edit listing</button>' : '<button class="btn btn-primary btn-block" type="button" data-action="contact" data-id="' + esc(l.id) + '">Message seller</button>';
    var actionsHTML = primaryAction + (l.isMine ? '<button class="btn btn-secondary btn-block" type="button" data-delete="' + esc(l.id) + '">Delete listing</button>' : '') + '<button class="btn btn-secondary btn-block" type="button" data-fav="' + esc(l.id) + '">' + (isFav ? "♥ Saved" : "♡ Save item") + "</button>";

    app.innerHTML = '<div class="detail"><button class="back-link" type="button" data-action="back">' + BACK_SVG + " Back</button><div class=\"detail-head\"><div><h1>" + esc(l.title) + "</h1><div class=\"detail-sub\">" + esc(l.category) + " · " + esc(l.location) + "</div></div><button class=\"detail-save" + favCls + "\" data-fav=\"" + esc(l.id) + "\">" + HEART_SVG + "<span>" + (isFav ? "Saved" : "Save") + "</span></button></div>" +
      "<div class=\"gallery single\"><div class=\"gallery-main\">" + imgTag(l.images[0], "") + "</div></div>" +
      "<div class=\"detail-grid\"><div class=\"detail-left\"><section class=\"detail-section\"><h2>Description</h2><div>" + esc(l.description) + "</div></section></div>" +
      "<aside class=\"detail-right\"><div class=\"price-card\">" + formatPrice(l.price) + "<div style=\"margin-top:18px\">" + actionsHTML + "</div></div></aside></div></div>";
  }

  /* ------------------------------ Post & Edit ----------------------------- */

  async function renderPost(editId) {
    var user = await Store.getUser();
    if (!user) { app.innerHTML = '<div class="empty"><h2>Log in to start selling</h2><button class="btn btn-primary" data-action="login-inline">Log in</button></div>'; return; }

    var l = editId ? await Store.getById(editId) : null;
    pendingImages = l ? l.images.slice() : [];
    
    app.innerHTML = '<div class="form-page"><h1>' + (l ? "Edit" : "Sell") + '</h1><form id="post-form" data-edit-id="' + (editId || "") + '">' +
      '<div class="field"><label>Title</label><input class="input" id="pf-title" value="' + esc(l ? l.title : "") + '" /></div>' +
      '<div class="field"><label>Price</label><input class="input" id="pf-price" type="number" value="' + (l ? l.price : "") + '" /></div>' +
      '<button class="btn btn-primary" type="submit">Post Item</button></form></div>';
  }

  async function submitPost(form) {
    var editId = form.getAttribute("data-edit-id");
    var data = {
      title: document.getElementById("pf-title").value.trim(),
      price: document.getElementById("pf-price").value,
      images: pendingImages
    };
    
    try {
      if (editId) { await Store.updateListing(editId, data); toast("Saved!"); location.hash = "#/dashboard"; }
      else { var l = await Store.addListing(data); toast("Live!"); location.hash = "#/item/" + l.id; }
    } catch (e) { toast("Error saving"); }
  }

  /* ---------------------------- Favorites -------------------------- */

  async function renderFavorites() {
    app.innerHTML = '<div class="loading-state">Loading favorites...</div>';
    var list = await Store.getFavoriteListings();
    if (list.length === 0) { app.innerHTML = '<div class="empty"><h2>No saved items</h2></div>'; return; }
    app.innerHTML = '<section class="hero"><h1>Saved items</h1></section>' + await gridHTML(list);
  }

  /* ------------------------ Auth (mock login) ---------------------- */

  function openAuthModal(afterAuth) {
    // For demo, we still use mock UI but could link to Supabase Auth
    var name = prompt("Enter your name (Mock Login)");
    if (name) {
       // In real refactor, use window.supabaseClient.auth.signIn...
       alert("Logged in as " + name);
       if (afterAuth) afterAuth();
    }
  }

  /* ----------------------------- Router ---------------------------- */

  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    if (h.indexOf("/item/") === 0) return { name: "item", id: h.slice(6) };
    if (h === "/post") return { name: "post" };
    if (h.indexOf("/edit/") === 0) return { name: "post", editId: h.slice(6) };
    if (h === "/favorites") return { name: "favorites" };
    if (h === "/dashboard") return { name: "dashboard" };
    return { name: "browse" };
  }

  async function updateSavedBadge() {
    var badge = document.getElementById("saved-count");
    if (!badge) return;
    var n = await Store.favoriteCount();
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  async function render(opts) {
    opts = opts || {};
    var route = parseHash();
    if (route.name === "item") await renderDetail(route.id);
    else if (route.name === "post") await renderPost(route.editId);
    else if (route.name === "favorites") await renderFavorites();
    else await renderBrowse();

    updateSavedBadge();
    if (opts.scroll) window.scrollTo(0, 0);
  }

  /* --------------------------- Interactions ------------------------ */

  async function handleFav(id) {
    try {
      await Store.toggleFavorite(id);
      updateSavedBadge();
      render();
      toast("Updated favorites");
    } catch (e) { toast("Log in to save"); }
  }

  function bindEvents() {
    app.addEventListener("click", async function (e) {
      var favBtn = e.target.closest("[data-fav]");
      if (favBtn) { e.preventDefault(); await handleFav(favBtn.getAttribute("data-fav")); return; }
      
      var back = e.target.closest('[data-action="back"]');
      if (back) { e.preventDefault(); history.back(); return; }
      
      var loginInline = e.target.closest('[data-action="login-inline"]');
      if (loginInline) { e.preventDefault(); openAuthModal(() => render()); return; }
    });

    app.addEventListener("submit", async function (e) {
      if (e.target.id === "post-form") { e.preventDefault(); await submitPost(e.target); }
    });

    window.addEventListener("hashchange", () => render({ scroll: true }));
  }

  async function init() {
    bindEvents();
    await render({ scroll: false });
  }

  init();
})();
