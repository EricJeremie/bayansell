/* =========================================================
   GoNegosyo — app (router, views, interactions)
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
    location: "",
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
    var s = parts[0] ? parts[0][0] : "?";
    if (parts[1] && parts[1][0]) s += parts[1][0];
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
    "Books": '<path d="M12 6.5C10 5 6.5 5 4.5 6v12c2-1 5.5-1 7.5.5 2-1.5 5.5-1.5 7.5-.5V6c-2-1-5.5-1-7.5.5z"/><path d="M12 6.5v12"/>',
    "Food": '<path d="M6 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3"/><path d="M8 11v10"/><path d="M16 3c-1.6 0-2.8 1.9-2.8 4.5S14.4 12 16 12"/><path d="M16 3v18"/>'
  };

  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (CATEGORY_ICONS[name] || CATEGORY_ICONS["All"]) + "</svg>";
  }

  function imgTag(src, alt, cls) {
    return '<img ' + (cls ? 'class="' + cls + '" ' : "") + 'src="' + esc(src || window.FALLBACK_IMG) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG">';
  }

  async function cardHTML(l) {
    var isFav = false;
    try { isFav = await Store.isFavorite(l.id); } catch(e) {}
    var fav = isFav ? " is-fav" : "";
    var cover = l.images && l.images[0] ? l.images[0] : window.FALLBACK_IMG;
    return (
      '<a class="card" href="#/item/' + esc(l.id) + '">' +
      '<div class="card-media">' +
      '<button class="fav-btn' + fav + '" type="button" data-fav="' + esc(l.id) + '" aria-label="Save to favorites">' + HEART_SVG + "</button>" +
      imgTag(cover, l.title) +
      "</div>" +
      '<div class="card-body">' +
      '<div class="card-title-row"><span class="card-title">' + esc(l.title) + "</span><span class=\"card-condition\">" + esc(l.condition) + "</span></div>" +
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
    var all = [];
    try { 
      all = await Store.getAllListings(); 
    } catch(e) { 
      console.error("Store error:", e); 
      all = window.SEED_LISTINGS || []; 
    }
    var q = state.search.trim().toLowerCase();
    var cat = state.category;
    var loc = state.location;

    var list = all.filter(function (l) {
      var matchCat = cat === "All" || l.category === cat;
      var matchLoc = !loc || l.location === loc;
      var hay = (l.title + " " + (l.description||"") + " " + (l.location || "") + " " + (l.category || "")).toLowerCase();
      var matchQ = !q || hay.indexOf(q) !== -1;
      return matchCat && matchLoc && matchQ;
    });

    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    return list;
  }

  function categoryRowHTML() {
    var cats = ["All"].concat(window.CATEGORIES || []);
    return '<div class="filters"><div class="category-tabs">' + cats.map(c => '<button type="button" class="cat-tab' + (state.category === c ? " active" : "") + '" data-cat="' + esc(c) + '">' + iconSvg(c) + "<span>" + esc(c) + "</span></button>").join("") + "</div></div>";
  }

  // Quick location pills for the Newport City, Pasay audience.
  function areaRowHTML() {
    var areas = window.NEWPORT_LOCATIONS || [];
    if (!areas.length) return "";
    var pinSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>';
    var pills = [{ label: "All areas", value: "" }].concat(areas.map(function (a) { return { label: a, value: a }; }));
    return '<div class="area-filter"><div class="area-filter-label">' + pinSvg + '<span>' + esc(window.NEWPORT_AREA || "Newport City, Pasay") + '</span></div>' +
      '<div class="area-pills">' + pills.map(function (p) {
        return '<button type="button" class="area-pill' + (state.location === p.value ? " active" : "") + '" data-area="' + esc(p.value) + '">' + esc(p.label) + "</button>";
      }).join("") + "</div></div>";
  }

  function toolbarHTML(count) {
    var label = count === 1 ? "1 item" : count.toLocaleString("en-US") + " items";
    function opt(v, t) { return '<option value="' + v + '"' + (state.sort === v ? " selected" : "") + ">" + t + "</option>"; }
    return '<div class="toolbar"><div class="results-count">' + label + (state.category !== "All" ? " in " + esc(state.category) : "") + (state.location ? " · " + esc(state.location) : "") + (state.search ? ' for “' + esc(state.search) + "”" : "") + '</div><div class="sort-control"><label for="sort-select">Sort by</label><select class="sort-select" id="sort-select">' + opt("newest", "Newest") + opt("price-asc", "Price: low to high") + opt("price-desc", "Price: high to low") + "</select></div></div>";
  }

  async function renderBrowse() {
    app.innerHTML = '<div class="loading-state">Finding deals...</div>';
    var list = await getFilteredListings();
    var hero = '<section class="hero"><h1>Find your next great deal</h1><p>Buy and sell preloved and brand-new items with people across the Philippines.</p></section>';
    var emptyMsg = state.location
      ? '<div class="empty"><div class="emoji">📍</div><h2>Nothing in ' + esc(state.location) + ' yet</h2><p>Be the first to list an item here, or browse all areas.</p><button class="btn btn-secondary" data-action="clear">Show all areas</button></div>'
      : '<div class="empty"><div class="emoji">🔍</div><h2>No items found</h2><p>Try a different keyword or category.</p><button class="btn btn-secondary" data-action="clear">Clear filters</button></div>';
    var body = list.length === 0 ? emptyMsg : toolbarHTML(list.length) + await gridHTML(list);
    app.innerHTML = hero + categoryRowHTML() + areaRowHTML() + body;
  }

  /* ----------------------------- Detail ---------------------------- */

  function galleryHTML(images) {
    var imgs = images && images.length ? images : [window.FALLBACK_IMG];
    if (imgs.length === 1) {
      return '<div class="gallery single"><div class="gallery-main">' + imgTag(imgs[0], "") + "</div></div>";
    }
    var side = imgs.slice(1, 3).map(function (src) { return '<div class="gallery-cell">' + imgTag(src, "") + "</div>"; }).join("");
    return '<div class="gallery"><div class="gallery-main">' + imgTag(imgs[0], "") + '</div><div class="gallery-side">' + side + "</div></div>";
  }

  function specHTML(label, value) {
    return '<div class="spec"><span class="spec-label">' + esc(label) + '</span><span class="spec-value">' + esc(value) + "</span></div>";
  }

  async function renderDetail(id) {
    app.innerHTML = '<div class="loading-state">Loading item...</div>';
    var l = null;
    try { l = await Store.getById(id); } catch(e) {}
    if (!l) { app.innerHTML = '<div class="empty"><h2>Listing not found</h2><a class="btn btn-primary" href="#/">Back to browse</a></div>'; return; }
    
    var isFav = false;
    try { isFav = await Store.isFavorite(id); } catch(e) {}
    var favCls = isFav ? " is-fav" : "";
    var sellerMeta = l.isMine ? "This is your listing" : "Member · GoNegosyo";

    var primaryAction = l.isMine ? '<button class="btn btn-primary btn-block" type="button" data-action="edit" data-id="' + esc(l.id) + '">Edit listing</button>' : '<button class="btn btn-primary btn-block" type="button" data-action="contact" data-id="' + esc(l.id) + '">Message seller</button>';
    var actionsHTML = primaryAction + (l.isMine ? '<button class="btn btn-secondary btn-block" type="button" data-delete="' + esc(l.id) + '">Delete listing</button>' : '') + '<button class="btn btn-secondary btn-block' + favCls + '" type="button" data-fav="' + esc(l.id) + '">' + HEART_SVG + "<span>" + (isFav ? "Saved" : "Save item") + "</span></button>" + '<button class="btn btn-secondary btn-block" type="button" data-action="share" data-id="' + esc(l.id) + '">Share</button>';

    app.innerHTML = '<div class="detail"><button class="back-link" type="button" data-action="back">' + BACK_SVG + " Back</button><div class=\"detail-head\"><div><h1 class=\"detail-title\">" + esc(l.title) + "</h1><div class=\"detail-sub\">" + esc(l.category) + " · " + esc(l.location) + " · Posted " + formatDateRel(l.postedAt) + "</div></div><button class=\"detail-save" + favCls + "\" type=\"button\" data-fav=\"" + esc(l.id) + "\">" + HEART_SVG + "<span>" + (isFav ? "Saved" : "Save") + "</span></button></div>" +
      galleryHTML(l.images) +
      '<div class="detail-grid"><div class="detail-left">' +
      '<section class="detail-section"><h2>Description</h2><div class="detail-desc">' + esc(l.description || "") + '</div></section>' +
      '<section class="detail-section"><h2>Item details</h2><div class="spec-list">' + specHTML("Condition", l.condition) + specHTML("Category", l.category) + specHTML("Location", l.location) + specHTML("Posted", formatDateAbs(l.postedAt)) + "</div></section>" +
      '<section class="detail-section"><h2>Seller</h2><div class="seller-row"><div class="seller-avatar">' + esc(initials(l.seller ? l.seller.name : "?")) + '</div><div><div class="seller-name">' + esc(l.seller ? l.seller.name : "Anonymous") + '</div><div class="seller-meta">' + esc(sellerMeta) + '</div></div></div></section></div>' +
      '<aside class="detail-right"><div class="price-card"><div class="price">' + formatPrice(l.price) + ' <small>· ' + esc(l.condition) + '</small></div><span class="condition-tag">' + esc(l.condition) + '</span><div class="price-meta">📍 ' + esc(l.location) + " · Posted " + formatDateRel(l.postedAt) + '</div><div style="margin-top:18px;display:flex;flex-direction:column;gap:10px">' + actionsHTML + "</div></div></aside></div></div>";
  }

  /* ------------------------------ Post & Edit ----------------------------- */

  function selectOptions(arr, placeholder, selected) {
    return '<option value="" disabled' + (!selected ? " selected" : "") + ">" + esc(placeholder) + "</option>" + arr.map(function (v) { return '<option value="' + esc(v) + '"' + (v === selected ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("");
  }

  // Location select with Newport City, Pasay grouped above the other cities.
  function locationSelectOptions(selected) {
    function optsFor(arr) {
      return arr.map(function (v) { return '<option value="' + esc(v) + '"' + (v === selected ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("");
    }
    var newport = window.NEWPORT_LOCATIONS || [];
    var cities = window.PH_CITIES || [];
    return '<option value="" disabled' + (!selected ? " selected" : "") + ">Select a location</option>" +
      (newport.length ? '<optgroup label="' + esc(window.NEWPORT_AREA || "Newport City, Pasay") + '">' + optsFor(newport) + "</optgroup>" : "") +
      '<optgroup label="Other cities">' + optsFor(cities) + "</optgroup>";
  }

  async function renderPost(editId) {
    var user = null;
    try { user = await Store.getUser(); } catch(e) {}
    if (!user) { app.innerHTML = '<div class="empty"><div class="emoji">🔐</div><h2>Log in to start selling</h2><p>Create an account or log in to post your item on GoNegosyo.</p><button class="btn btn-primary" type="button" data-action="login-inline">Log in or sign up</button></div>'; return; }
    if (user.role !== "seller") { app.innerHTML = '<div class="empty"><div class="emoji">💼</div><h2>Want to sell on GoNegosyo?</h2><p>You are currently browsing as a buyer. Upgrade to a seller account to post listings.</p><button class="btn btn-primary" type="button" data-action="upgrade-seller">Become a Seller</button></div>'; return; }

    var l = null;
    if (editId) { try { l = await Store.getById(editId); } catch(e) {} }
    if (editId && (!l || !l.isMine)) { location.hash = "#/"; return; }
    
    pendingImages = l ? l.images.map(function (u) { return { previewUrl: "", url: u, status: "done" }; }) : [];
    var title = l ? "Edit your listing" : "Sell your item";
    var btnText = l ? "Save changes" : "Post item";

    app.innerHTML = '<div class="form-page"><h1>' + title + '</h1><p class="lead">List your item in a couple of minutes. Add clear photos and an honest description to sell faster.</p><form id="post-form" novalidate data-edit-id="' + (editId || "") + '">' +
      '<div class="field"><label for="pf-title">Title</label><input class="input" id="pf-title" type="text" maxlength="80" value="' + esc(l ? l.title : "") + '" placeholder="e.g. iPhone 14 Pro 256GB - Deep Purple" /><div class="error-text" data-err="title" hidden></div></div>' +
      '<div class="field-row"><div class="field"><label for="pf-category">Category</label><select class="select" id="pf-category">' + selectOptions(window.CATEGORIES || [], "Select a category", l ? l.category : null) + '</select><div class="error-text" data-err="category" hidden></div></div><div class="field"><label for="pf-condition">Condition</label><select class="select" id="pf-condition">' + selectOptions(window.CONDITIONS || [], "Select condition", l ? l.condition : null) + '</select><div class="error-text" data-err="condition" hidden></div></div></div>' +
      '<div class="field-row"><div class="field"><label for="pf-price">Price</label><div class="price-input"><span class="peso">₱</span><input class="input" id="pf-price" type="number" min="1" step="1" value="' + (l ? l.price : "") + '" placeholder="0" /></div><div class="error-text" data-err="price" hidden></div></div><div class="field"><label for="pf-location">Location</label><select class="select" id="pf-location">' + locationSelectOptions(l ? l.location : null) + '</select><div class="error-text" data-err="location" hidden></div></div></div>' +
      '<div class="field"><label for="pf-description">Description</label><textarea class="textarea" id="pf-description" maxlength="1200" placeholder="Describe your item...">' + esc(l ? l.description : "") + '</textarea><div class="error-text" data-err="description" hidden></div></div>' +
      '<div class="field"><label>Photos <span class="hint">(up to 5 — optional but recommended)</span></label><label class="dropzone" for="image-input"><svg viewBox="0 0 24 24"><path d="M19 13v6H5v-6H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2zM12 2 7 7h3v7h4V7h3l-5-5z"/></svg><div><strong>Click to upload</strong> or drag and drop</div><input id="image-input" type="file" accept="image/*" multiple hidden /></label><div class="image-preview" id="image-preview"></div></div>' +
      '<div class="form-actions"><button class="btn btn-secondary" type="button" data-action="back">Cancel</button><button class="btn btn-primary" type="submit">' + btnText + "</button></div></form></div>";
      
    renderPreviews();
  }

  // pendingImages holds objects: { previewUrl, url, status }
  //   previewUrl — local data URL shown instantly while uploading
  //   url        — the Supabase Storage public URL once uploaded
  //   status     — "uploading" | "done" | "error"
  function renderPreviews() {
    var box = document.getElementById("image-preview");
    if (!box) return;
    box.innerHTML = pendingImages.map(function (img, i) {
      var src = img.previewUrl || img.url || window.FALLBACK_IMG;
      var stateCls = img.status === "uploading" ? " is-uploading" : img.status === "error" ? " is-error" : "";
      var overlay = img.status === "uploading"
        ? '<span class="thumb-status"><span class="thumb-spinner" aria-hidden="true"></span></span>'
        : img.status === "error"
        ? '<span class="thumb-status thumb-status-error">Upload failed</span>'
        : "";
      return '<div class="thumb' + stateCls + '">' + imgTag(src, "Photo " + (i + 1)) + overlay + '<button type="button" data-remove-img="' + i + '" aria-label="Remove photo">✕</button></div>';
    }).join("");
  }

  // Reads a file, resizes/compresses it on a canvas, and returns both a
  // data URL (for instant preview) and a JPEG Blob (for upload).
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var max = 1000; var w = image.width; var h = image.height;
          if (w > h && w > max) { h = Math.round((h * max) / w); w = max; } else if (h >= w && h > max) { w = Math.round((w * max) / h); h = max; }
          var canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(image, 0, 0, w, h);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error("Could not process image")); return; }
            resolve({ dataUrl: dataUrl, blob: blob });
          }, "image/jpeg", 0.82);
        };
        image.onerror = reject; image.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var room = 5 - pendingImages.length;
    if (room <= 0) { toast("You can add up to 5 photos."); return; }
    files = files.slice(0, room);
    files.forEach(function (file) {
      var entry = { previewUrl: "", url: "", status: "uploading" };
      pendingImages.push(entry);
      renderPreviews();
      resizeImage(file).then(function (out) {
        entry.previewUrl = out.dataUrl;     // instant preview
        renderPreviews();
        return Store.uploadImage(out.blob); // upload in the background
      }).then(function (publicUrl) {
        entry.url = publicUrl;
        entry.status = "done";
        renderPreviews();
      }).catch(function (e) {
        entry.status = "error";
        renderPreviews();
        toast((e && e.message) || "Sorry, that photo couldn’t be uploaded.");
      });
    });
  }

  function removeImage(index) { pendingImages.splice(index, 1); renderPreviews(); }

  function setError(name, msg) {
    var box = document.querySelector('[data-err="' + name + '"]');
    var input = document.getElementById("pf-" + name);
    if (box) { box.textContent = msg || ""; box.hidden = !msg; }
    if (input) input.classList.toggle("input-error", !!msg);
  }

  async function submitPost(form) {
    var editId = form.getAttribute("data-edit-id");

    if (pendingImages.some(function (p) { return p.status === "uploading"; })) {
      toast("Hang on — your photos are still uploading.");
      return;
    }
    var images = pendingImages
      .filter(function (p) { return p.status === "done" && p.url; })
      .map(function (p) { return p.url; });

    var data = {
      title: document.getElementById("pf-title").value.trim(),
      category: document.getElementById("pf-category").value,
      price: document.getElementById("pf-price").value,
      condition: document.getElementById("pf-condition").value,
      location: document.getElementById("pf-location").value,
      description: document.getElementById("pf-description").value.trim(),
      images: images
    };

    var ok = true;
    setError("title", data.title ? "" : "Please add a title."); if (!data.title) ok = false;
    setError("category", data.category ? "" : "Please choose a category."); if (!data.category) ok = false;
    var priceNum = Number(data.price);
    var priceMsg = !data.price ? "Please set a price." : priceNum <= 0 ? "Price must be greater than 0." : "";
    setError("price", priceMsg); if (priceMsg) ok = false;
    setError("condition", data.condition ? "" : "Please choose a condition."); if (!data.condition) ok = false;
    setError("location", data.location ? "" : "Please choose a location."); if (!data.location) ok = false;
    setError("description", data.description ? "" : "Please add a short description."); if (!data.description) ok = false;

    if (!ok) { var firstErr = form.querySelector(".input-error"); if (firstErr) firstErr.focus(); toast("Please fix the highlighted fields."); return; }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = editId ? "Saving..." : "Posting..."; }

    try {
      if (editId) { await Store.updateListing(editId, data); toast("Changes saved! ✨"); location.hash = "#/dashboard"; }
      else { var listing = await Store.addListing(data); toast("Your item is now live! 🎉"); location.hash = "#/item/" + listing.id; }
    } catch (e) { 
      toast(e.message || "Could not save your item."); 
      if (btn) { btn.disabled = false; btn.textContent = editId ? "Save changes" : "Post item"; }
    }
  }

  /* ---------------------------- Favorites -------------------------- */

  async function renderFavorites() {
    app.innerHTML = '<div class="loading-state">Loading favorites...</div>';
    var list = [];
    try { list = await Store.getFavoriteListings(); } catch(e) {}
    if (list.length === 0) {
      app.innerHTML = '<section class="hero"><h1>Your saved items</h1></section><div class="empty"><div class="emoji">❤️</div><h2>No saved items yet</h2><p>Tap the heart on any listing to save it here for later.</p><a class="btn btn-primary" href="#/">Start browsing</a></div>';
      return;
    }
    app.innerHTML = '<section class="hero"><h1>Your saved items</h1><p>' + (list.length === 1 ? "1 item" : list.length + " items") + " you’ve saved for later.</p></section>" + await gridHTML(list);
  }

  /* ----------------------------- Modal ----------------------------- */

  function openModal(title, bodyHTML) {
    closeModal();
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay"; overlay.id = "modal-overlay";
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-header"><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">✕</button><h3>' + esc(title) + '</h3></div><div class="modal-body">' + bodyHTML + "</div></div>";
    document.body.appendChild(overlay); document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { overlay.classList.add("show"); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay || e.target.closest('[data-action="close-modal"]')) { closeModal(); } });
    return overlay;
  }

  function closeModal() { var overlay = document.getElementById("modal-overlay"); if (overlay) overlay.remove(); document.body.style.overflow = ""; }

  function setFieldError(id, msg) {
    var box = document.querySelector('[data-err="' + id + '"]');
    var input = document.getElementById(id);
    if (box) { box.textContent = msg || ""; box.hidden = !msg; }
    if (input) input.classList.toggle("input-error", !!msg);
  }

  /* ------------------------ Auth (Supabase) ------------------------ */

  function showAuthError(msg) {
    var box = document.querySelector('[data-err="auth-form"]');
    if (box) { box.textContent = msg || ""; box.hidden = !msg; }
  }

  function openAuthModal(afterAuth, mode) {
    mode = mode || "login";
    var isLogin = mode === "login";

    var fields =
      (isLogin ? "" : '<div class="field"><label for="auth-name">Name</label><input class="input" id="auth-name" type="text" placeholder="e.g. Juan dela Cruz" /><div class="error-text" data-err="auth-name" hidden></div></div>') +
      '<div class="field"><label for="auth-email">Email</label><input class="input" id="auth-email" type="email" placeholder="you@email.com" autocomplete="email" /><div class="error-text" data-err="auth-email" hidden></div></div>' +
      '<div class="field"><label for="auth-password">Password</label><input class="input" id="auth-password" type="password" placeholder="' + (isLogin ? "Your password" : "At least 6 characters") + '" autocomplete="' + (isLogin ? "current-password" : "new-password") + '" /><div class="error-text" data-err="auth-password" hidden></div></div>' +
      (isLogin ? "" : '<div class="field"><label for="auth-role">I want to...</label><select class="select" id="auth-role"><option value="buyer">Buy and browse</option><option value="seller">Sell items</option></select></div>');

    var overlay = openModal(isLogin ? "Log in" : "Sign up",
      "<h2>Welcome to GoNegosyo</h2><p class=\"modal-sub\">" + (isLogin ? "Log in to sell your items and message sellers." : "Create an account to sell your items and message sellers.") + "</p>" +
      '<form id="auth-form" novalidate>' + fields +
      '<div class="error-text" data-err="auth-form" hidden style="margin-bottom:12px"></div>' +
      '<button class="btn btn-primary btn-block" type="submit" id="auth-submit">' + (isLogin ? "Log in" : "Create account") + '</button></form>' +
      '<p class="modal-sub" style="margin-top:14px;text-align:center">' + (isLogin ? 'New to GoNegosyo? <button type="button" class="link-btn" data-auth-switch="signup">Sign up</button>' : 'Already have an account? <button type="button" class="link-btn" data-auth-switch="login">Log in</button>') + "</p>");

    overlay.querySelector("[data-auth-switch]").addEventListener("click", function () {
      openAuthModal(afterAuth, this.getAttribute("data-auth-switch"));
    });

    overlay.querySelector("#auth-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      showAuthError("");
      var email = document.getElementById("auth-email").value.trim();
      var password = document.getElementById("auth-password").value;
      var nameEl = document.getElementById("auth-name");
      var name = nameEl ? nameEl.value.trim() : "";
      var roleEl = document.getElementById("auth-role");
      var role = roleEl ? roleEl.value : "buyer";

      var ok = true;
      if (!isLogin) { setFieldError("auth-name", name ? "" : "Please enter your name."); if (!name) ok = false; }
      var emailOk = /.+@.+\..+/.test(email);
      setFieldError("auth-email", emailOk ? "" : "Please enter a valid email."); if (!emailOk) ok = false;
      var passMsg = !password ? "Please enter a password." : (!isLogin && password.length < 6) ? "Password must be at least 6 characters." : "";
      setFieldError("auth-password", passMsg); if (passMsg) ok = false;
      if (!ok) return;

      var btn = document.getElementById("auth-submit");
      if (btn) { btn.disabled = true; btn.textContent = isLogin ? "Logging in..." : "Creating account..."; }

      try {
        if (isLogin) {
          await Store.login(email, password);
          closeModal();
          await updateAuthUI();
          await render();
          var u = null; try { u = await Store.getUser(); } catch (err) {}
          toast("Welcome back" + (u && u.name ? ", " + u.name.split(" ")[0] : "") + "! 👋");
          if (typeof afterAuth === "function") afterAuth();
        } else {
          var res = await Store.signup(name, email, password, role);
          if (res.needsConfirmation) {
            overlay.querySelector(".modal-body").innerHTML =
              "<h2>Check your email 📬</h2><p class=\"modal-sub\">We sent a confirmation link to <strong>" + esc(email) + "</strong>. Open it to verify your account, then come back and log in.</p>" +
              '<button class="btn btn-primary btn-block" type="button" id="auth-goto-login">Go to log in</button>';
            overlay.querySelector("#auth-goto-login").addEventListener("click", function () {
              openAuthModal(afterAuth, "login");
            });
          } else {
            closeModal();
            await updateAuthUI();
            await render();
            toast("Welcome, " + name.split(" ")[0] + "! 👋");
            if (typeof afterAuth === "function") afterAuth();
          }
        }
      } catch (err) {
        var msg = (err && err.message) || "Something went wrong. Please try again.";
        if (/invalid login credentials/i.test(msg)) msg = "Wrong email or password.";
        else if (/email not confirmed/i.test(msg)) msg = "Please confirm your email first — check your inbox for the link we sent you.";
        else if (/already registered/i.test(msg)) msg = "That email is already registered. Try logging in instead.";
        showAuthError(msg);
        if (btn) { btn.disabled = false; btn.textContent = isLogin ? "Log in" : "Create account"; }
      }
    });

    setTimeout(function () {
      var first = document.getElementById(isLogin ? "auth-email" : "auth-name");
      if (first) first.focus();
    }, 60);
  }

  /* ----------------------- Account dropdown ------------------------ */

  async function accountMenuHTML() {
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    var favCount = 0; try { favCount = await Store.favoriteCount(); } catch(e) {}
    var savedItem = '<button class="menu-item" data-nav="#/favorites">Saved' + (favCount ? '<span class="menu-badge">' + favCount + "</span>" : "") + "</button>";
    if (user) {
      var roleText = user.role === "seller" ? "Seller account" : "Buyer account";
      var roleAction = user.role === "seller" ? "Switch to Buyer" : "Switch to Seller";
      var nextRole = user.role === "seller" ? "buyer" : "seller";
      var dashboardLink = user.role === "seller" ? '<button class="menu-item bold" data-nav="#/dashboard">Dashboard</button>' : '';
      return '<div class="menu-greeting"><strong>Hi, ' + esc((user.name || "User").split(" ")[0]) + "</strong><span>" + esc(user.email || "") + '</span><span style="font-size:11px;color:var(--rausch);font-weight:700;margin-top:4px;display:block">' + roleText + '</span></div><div class="menu-sep"></div><button class="menu-item" data-action="toggle-role" data-role="' + nextRole + '">' + roleAction + '</button><div class="menu-sep"></div>' + dashboardLink + '<button class="menu-item" data-nav="#/my-listings">My listings</button>' + savedItem + '<button class="menu-item" data-nav="#/post">Sell your item</button><div class="menu-sep"></div><button class="menu-item" data-action="logout">Log out</button>';
    }
    return '<button class="menu-item bold" data-action="login">Log in</button><button class="menu-item" data-action="login">Sign up</button><div class="menu-sep"></div><button class="menu-item" data-nav="#/post">Sell your item</button>' + savedItem;
  }

  async function toggleAccountMenu(force) {
    var menu = document.getElementById("account-menu");
    var btn = document.getElementById("account-btn");
    if (!menu) return;
    var willOpen = force !== undefined ? force : menu.hidden;
    if (willOpen) { menu.innerHTML = await accountMenuHTML(); menu.hidden = false; if (btn) btn.setAttribute("aria-expanded", "true"); }
    else { menu.hidden = true; if (btn) btn.setAttribute("aria-expanded", "false"); }
  }

  async function updateAuthUI() {
    try {
      var user = await Store.getUser();
      var avatar = document.getElementById("account-avatar");
      if (!avatar) return;
      if (user) { avatar.classList.add("has-user"); avatar.textContent = initials(user.name); }
      else { avatar.classList.remove("has-user"); avatar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-7 2.2-7 5v1h14v-1c0-2.8-3-5-7-5z"/></svg>'; }
    } catch(e) {}
  }

  /* ------------------------- Dashboard --------------------------- */

  async function renderDashboard() {
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    if (!user || user.role !== "seller") { location.hash = "#/"; return; }
    var listings = []; try { listings = await Store.getUserListings(); } catch(e) {}
    var revenue = listings.reduce(function(sum, l) { return sum + (l.price||0); }, 0);
    var views = listings.reduce(function(sum, l) { return sum + (l.views || 0); }, 0);
    var inquiries = []; try { inquiries = await Store.getInquiries(); } catch(e) {}
    var totalInqCount = listings.reduce(function(sum, l) { return sum + (l.inquiries || 0); }, 0);
    var tab = state.dashTab;
    var contentHTML = "";
    if (tab === "listings") {
      var tableRows = listings.map(function(l) { return '<tr><td><div class="dash-item-cell">' + imgTag(l.images[0], "", "dash-thumb") + '<span>' + esc(l.title) + '</span></div></td><td>' + formatPrice(l.price) + '</td><td>' + formatDateAbs(l.postedAt) + '</td><td>' + (l.views || 0) + '</td><td><span class="status-badge">Active</span></td><td><div class="dash-actions"><button class="icon-btn" title="Edit" data-action="edit" data-id="' + esc(l.id) + '">✎</button><button class="icon-btn danger" title="Delete" data-delete="' + esc(l.id) + '">✕</button></div></td></tr>'; }).join("");
      contentHTML = '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Price</th><th>Posted</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No listings yet. <a href="#/post" style="color:var(--rausch);text-decoration:underline">Post your first item</a></td></tr>') + '</tbody></table></div>';
    } else if (tab === "messages") {
      var activeInq = inquiries.find(function(i) { return i.id === state.activeInquiryId; }) || inquiries[0];
      if (activeInq && !state.activeInquiryId) state.activeInquiryId = activeInq.id;
      var sidebarItems = inquiries.map(function(i) { var lastMsg = i.messages[i.messages.length - 1]; return '<div class="msg-sidebar-item' + (state.activeInquiryId === i.id ? ' active' : '') + '" data-inquiry-id="' + i.id + '"><div class="msg-sidebar-name">' + esc(i.buyerName) + '</div><div class="msg-sidebar-listing">' + esc(i.listingTitle) + '</div><div class="msg-sidebar-preview">' + esc(lastMsg ? lastMsg.text : "") + '</div></div>'; }).join("");
      var chatMessages = ""; if (activeInq) { chatMessages = activeInq.messages.map(function(m) { return '<div class="chat-msg ' + m.sender + '"><div class="chat-msg-bubble">' + esc(m.text) + '</div><div class="chat-msg-time">' + formatDateRel(m.time) + '</div></div>'; }).join(""); }
      contentHTML = '<div class="messaging-pane">' + (inquiries.length ? '<div class="msg-sidebar">' + sidebarItems + '</div><div class="msg-chat-wrap">' + (activeInq ? '<div class="msg-chat-header"><div><div class="msg-chat-buyer">' + esc(activeInq.buyerName) + '</div><div class="msg-chat-meta">Interested in ' + esc(activeInq.listingTitle) + '</div></div><a class="btn btn-secondary" href="#/item/' + activeInq.listingId + '" style="padding:8px 12px;font-size:13px">View Item</a></div><div class="msg-chat-body" id="chat-body">' + chatMessages + '</div><form class="msg-chat-input" id="chat-form"><input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off"><button type="submit" class="btn btn-primary">Send</button></form>' : '<div class="msg-chat-empty">Select a conversation</div>') + '</div>' : '<div class="msg-empty-state"><h3>No messages yet</h3><p>Your buyer inquiries will show up here.</p></div>') + '</div>';
    }
    app.innerHTML = '<div class="dashboard-page"><header class="dash-header"><div><h1>Seller Dashboard</h1><p>Performance overview for ' + esc(user.name) + '</p></div><a class="btn btn-primary" href="#/post">Add Product</a></header><div class="stats-grid"><div class="stat-card"><div class="stat-label">Active Listings</div><div class="stat-value">' + listings.length + '</div></div><div class="stat-card"><div class="stat-label">Potential Revenue</div><div class="stat-value">' + formatPrice(revenue) + '</div></div><div class="stat-card"><div class="stat-label">Total Views</div><div class="stat-value">' + views.toLocaleString() + '</div></div><div class="stat-card"><div class="stat-label">Total Inquiries</div><div class="stat-value">' + totalInqCount.toLocaleString() + '</div></div></div><div class="dash-tabs"><button class="dash-tab-btn' + (tab === 'listings' ? ' active' : '') + '" data-tab="listings">Manage Listings</button><button class="dash-tab-btn' + (tab === 'messages' ? ' active' : '') + '" data-tab="messages">Messages' + (inquiries.length ? '<span class="menu-badge">' + inquiries.length + '</span>' : '') + '</button></div><section class="dash-content">' + contentHTML + '</section></div>';
    if (tab === 'messages') { var body = document.getElementById('chat-body'); if (body) body.scrollTop = body.scrollHeight; var input = document.getElementById('chat-input'); if (input) input.focus(); }
  }

  async function confirmDelete(id) {
    var l = null; try { l = await Store.getById(id); } catch(e) {}
    var overlay = openModal("Delete listing", '<h2>Delete this listing?</h2><p class="modal-sub">“' + esc(l ? l.title : "") + '” will be permanently removed. This can’t be undone.</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="button" id="confirm-delete">Delete</button></div>');
    overlay.querySelector("#confirm-delete").addEventListener("click", async function () { try { await Store.deleteListing(id); } catch(e) {} closeModal(); toast("Listing deleted"); if (parseHash().name === "item") location.hash = "#/"; else { await render(); } });
  }

  async function openContactModal(id) {
    var l = null; try { l = await Store.getById(id); } catch(e) {} if (!l) return;
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    var isDemoListing = String(l.id).indexOf("seed-") === 0 || !l.sellerId;
    var cover = (l.images && l.images[0]) || window.FALLBACK_IMG;
    var sellerName = l.seller ? l.seller.name : "Anonymous";
    var sub = isDemoListing ? "Ask about this item. This is a sample listing — nothing is actually sent." : "Ask about this item. The seller will see your message in their dashboard.";
    var overlay = openModal("Contact seller", "<h2>Message " + esc(sellerName) + '</h2><p class="modal-sub">' + sub + '</p><div class="modal-summary"><img src="' + esc(cover) + '" onerror="this.onerror=null;this.src=FALLBACK_IMG" alt=""><div class=\"ms-title\">' + esc(l.title) + '</div><div class="ms-price">' + formatPrice(l.price) + " · " + esc(l.location) + '</div></div><form id="contact-form" novalidate><div class="field"><label for="c-name">Your name</label><input class="input" id="c-name" type="text" value="' + esc(user ? user.name : "") + '" placeholder="Your name" /><div class="error-text" data-err="c-name" hidden></div></div><div class="field"><label for="c-message">Message</label><textarea class="textarea" id="c-message" placeholder="Hi! Is this still available?">Hi! Is this still available?</textarea><div class="error-text" data-err="c-message" hidden></div></div><button class="btn btn-primary btn-block" type="submit">Send message</button></form>');
    overlay.querySelector("#contact-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var msgEl = document.getElementById("c-message");
      var text = msgEl ? msgEl.value.trim() : "";
      setFieldError("c-message", text ? "" : "Please write a message."); if (!text) return;
      if (isDemoListing) { closeModal(); toast("Message sent to " + sellerName.split(" ")[0] + "! ✉️"); return; }
      if (!user) { closeModal(); openAuthModal(function () { openContactModal(id); }); return; }
      try {
        await Store.createInquiry(l.id, l.sellerId, text);
        closeModal();
        toast("Message sent to " + sellerName.split(" ")[0] + "! ✉️");
      } catch (err) {
        toast((err && err.message) || "Could not send your message.");
      }
    });
  }

  /* -------------------------- Static pages ------------------------- */
  // Content pages linked from the footer. Each entry is { title, build }
  // where build() returns the inner HTML for the page body.

  function pageHeroHTML(eyebrow, title, sub) {
    return '<header class="page-hero">' +
      (eyebrow ? '<span class="page-eyebrow">' + esc(eyebrow) + '</span>' : '') +
      '<h1>' + esc(title) + '</h1>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      '</header>';
  }

  function pageCtaHTML(title, sub, btnText, href) {
    return '<section class="page-cta"><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p><a class="btn btn-primary" href="' + href + '">' + esc(btnText) + '</a></section>';
  }

  var ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H8l-4 4V5z"/></svg>';
  var ICON_CASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>';
  var ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  var ICON_FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>';
  var ICON_HEART2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/></svg>';
  var ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>';
  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>';

  function featureGridHTML(items) {
    return '<div class="feature-grid">' + items.map(function (it) {
      return '<div class="feature-card"><div class="feature-icon">' + it.icon + '</div><h3>' + esc(it.title) + '</h3><p>' + esc(it.body) + '</p></div>';
    }).join("") + '</div>';
  }

  function stepsHTML(steps) {
    return '<ol class="steps-grid">' + steps.map(function (s, i) {
      return '<li class="step-card"><span class="step-num">' + (i + 1) + '</span><div><h3>' + esc(s.title) + '</h3><p>' + esc(s.body) + '</p></div></li>';
    }).join("") + '</ol>';
  }

  function faqHTML(items) {
    return '<div class="faq-list">' + items.map(function (q) {
      return '<details class="faq-item"><summary>' + esc(q.q) + '<span class="faq-chevron" aria-hidden="true"></span></summary><div class="faq-answer">' + esc(q.a) + '</div></details>';
    }).join("") + '</div>';
  }

  var STATIC_PAGES = {
    "how-it-works": {
      title: "How it works",
      build: function () {
        return pageHeroHTML("Getting started", "How GoNegosyo works", "Buy and sell preloved and brand-new items with people across the Philippines — in just a few taps.") +
          '<section class="page-section"><h2>For buyers</h2>' +
          stepsHTML([
            { title: "Browse and search", body: "Explore thousands of listings by category, location, or keyword. Tap the heart to save items you like for later." },
            { title: "Message the seller", body: "Found something? Send the seller a message to ask questions, check availability, or agree on a meet-up." },
            { title: "Meet up and pay", body: "Inspect the item in person at a safe public place. Pay only once you're happy — cash or your preferred method." },
          ]) + '</section>' +
          '<section class="page-section"><h2>For sellers</h2>' +
          stepsHTML([
            { title: "Create your account", body: "Sign up in seconds and switch to a seller account from your profile menu — it's free to list." },
            { title: "Post your item", body: "Add clear photos, an honest description, a fair price, and your location. Good listings sell faster." },
            { title: "Reply and close the deal", body: "Respond to buyer inquiries from your dashboard, arrange a safe meet-up, and mark it sold." },
          ]) + '</section>' +
          '<section class="page-section"><h2>Why GoNegosyo</h2>' +
          featureGridHTML([
            { icon: ICON_CASH, title: "No listing fees", body: "Post as many items as you like for free. Keep 100% of what you earn." },
            { icon: ICON_PIN, title: "Local first", body: "Find deals near you across Manila, Cebu, Davao, and the rest of the Philippines." },
            { icon: ICON_HEART2, title: "Built for community", body: "Give preloved items a second life and shop more sustainably." },
          ]) + '</section>' +
          pageCtaHTML("Ready to find your next deal?", "Start browsing or list your first item today.", "Browse items", "#/");
      },
    },

    "safety": {
      title: "Safety tips",
      build: function () {
        return pageHeroHTML("Trust & safety", "Stay safe on GoNegosyo", "A few simple habits keep buying and selling smooth and worry-free. Please read these before your first meet-up.") +
          '<section class="page-section">' +
          featureGridHTML([
            { icon: ICON_PIN, title: "Meet in public", body: "Always meet in a busy public place — a mall, coffee shop, or official MRT/LRT meet-up point. Bring a friend if you can." },
            { icon: ICON_EYE, title: "Inspect before you pay", body: "Check the item carefully and test that it works. Only hand over payment once you're fully satisfied." },
            { icon: ICON_CASH, title: "Be careful with payments", body: "Prefer cash on meet-up. Avoid sending deposits or GCash to people you haven't met. Never share OTPs or card details." },
            { icon: ICON_CHAT, title: "Keep chats on GoNegosyo", body: "Message through the app so there's a record. Be wary of anyone rushing you to move off-platform." },
            { icon: ICON_FLAG, title: "Spot the red flags", body: "Prices that seem too good to be true, requests for upfront fees, or sob stories are classic scam signs. Trust your gut." },
            { icon: ICON_SHIELD, title: "Report problems", body: "If something feels off, stop the deal and report the user. Helping us flag bad actors keeps the community safe." },
          ]) + '</section>' +
          '<section class="page-section page-callout"><h2>If a deal feels wrong, walk away</h2><p>No item is worth your safety. It is always okay to cancel, leave, or say no — a real seller or buyer will understand.</p></section>' +
          pageCtaHTML("Questions about safety?", "Our team is here to help you buy and sell with confidence.", "Visit the Help center", "#/help");
      },
    },

    "help": {
      title: "Help center",
      build: function () {
        return pageHeroHTML("Support", "Help center", "Answers to the questions we hear most. Can't find what you need? Contact us any time.") +
          '<section class="page-section"><h2>Buying</h2>' +
          faqHTML([
            { q: "How do I contact a seller?", a: "Open any listing and tap “Message seller.” You'll need to be logged in. Your conversation appears in the seller's dashboard and they can reply right there." },
            { q: "How do I save items for later?", a: "Tap the heart icon on any listing to add it to your Saved items. You can find everything you've saved from the Saved link in the header." },
            { q: "Is there buyer protection?", a: "GoNegosyo is a community marketplace for in-person deals, so we don't process payments. Follow our safety tips: meet in public, inspect the item, and pay only when you're happy." },
          ]) + '</section>' +
          '<section class="page-section"><h2>Selling</h2>' +
          faqHTML([
            { q: "How do I start selling?", a: "Log in, open the profile menu, and choose “Become a Seller” (or switch to a seller account). Then tap “Sell your item” to post your first listing." },
            { q: "How much does it cost to list?", a: "Listing on GoNegosyo is completely free. There are no listing fees and no commissions — you keep everything you earn." },
            { q: "How many photos can I add?", a: "You can add up to 5 photos per listing. Clear, well-lit photos from multiple angles help your item sell much faster." },
            { q: "How do I edit or delete a listing?", a: "Go to your seller dashboard, find the item under “Manage Listings,” and use the edit or delete buttons. You can also edit from the listing page itself." },
          ]) + '</section>' +
          '<section class="page-section"><h2>Account</h2>' +
          faqHTML([
            { q: "Do I need an account to browse?", a: "No — anyone can browse and search listings. You only need an account to save items, message sellers, or post your own listings." },
            { q: "I didn't get my confirmation email.", a: "Check your spam folder first. The link can take a few minutes to arrive. If it still doesn't show up, try signing up again or contact support." },
            { q: "How do I switch between buying and selling?", a: "Open the profile menu in the top-right and use “Switch to Seller” or “Switch to Buyer” any time. Sellers get access to the dashboard." },
          ]) + '</section>' +
          pageCtaHTML("Still need a hand?", "Reach out and we'll get back to you as soon as we can.", "Contact us", "#/contact");
      },
    },

    "about": {
      title: "Our story",
      build: function () {
        return pageHeroHTML("About us", "Our story", "GoNegosyo started with a simple idea: make it easy for Filipinos to buy and sell with the people around them.") +
          '<section class="page-section page-prose"><p>The name <strong>GoNegosyo</strong> comes from <em>negosyo</em> — the Filipino word for business or enterprise. That\'s the heart of what we do: helping Filipinos turn what they have into income, find great deals nearby, and grow a little hustle of their own.</p>' +
          '<p>Too often, good stuff ends up forgotten in closets or thrown away while someone nearby is looking for exactly that. We built GoNegosyo to close that gap — a friendly, local-first marketplace where a fair deal is only a few taps away, from Baguio to Davao.</p></section>' +
          '<section class="page-section"><div class="story-stats"><div class="story-stat"><span class="story-num">10</span><span class="story-label">cities and growing</span></div><div class="story-stat"><span class="story-num">₱0</span><span class="story-label">listing fees, always</span></div><div class="story-stat"><span class="story-num">100%</span><span class="story-label">made in the Philippines</span></div></div></section>' +
          '<section class="page-section"><h2>What we believe</h2>' +
          featureGridHTML([
            { icon: ICON_HEART2, title: "Community first", body: "Real people, real neighborhoods. We design for trust between buyers and sellers." },
            { icon: ICON_GLOBE, title: "Better for the planet", body: "Every preloved item that finds a new home is one less thing in a landfill." },
            { icon: ICON_SPARK, title: "Simple and fair", body: "No clutter, no hidden fees. Just a clean, fast way to buy and sell." },
          ]) + '</section>' +
          pageCtaHTML("Join the community", "Whether you're clearing out or hunting for a deal, there's a place for you here.", "Get started", "#/");
      },
    },

    "careers": {
      title: "Careers",
      build: function () {
        var jobs = [
          { role: "Senior Frontend Engineer", team: "Engineering", type: "Full-time", place: "Remote (PH)" },
          { role: "Product Designer", team: "Design", type: "Full-time", place: "Makati / Hybrid" },
          { role: "Community & Trust Lead", team: "Operations", type: "Full-time", place: "Remote (PH)" },
          { role: "Customer Support Specialist", team: "Support", type: "Full-time", place: "Cebu / Hybrid" },
        ];
        return pageHeroHTML("Careers", "Build GoNegosyo with us", "We're a small, ambitious team on a mission to help every Filipino buy and sell with their community. Come help us grow.") +
          '<section class="page-section"><h2>Why work here</h2>' +
          featureGridHTML([
            { icon: ICON_GLOBE, title: "Remote-friendly", body: "Work from anywhere in the Philippines, with hybrid options in Metro Manila and Cebu." },
            { icon: ICON_SPARK, title: "Real impact", body: "Small team, big ownership. Your work ships to real people every week." },
            { icon: ICON_HEART2, title: "People-first culture", body: "Generous leave, learning budget, and a team that genuinely has your back." },
          ]) + '</section>' +
          '<section class="page-section"><h2>Open roles</h2><div class="jobs-list">' +
          jobs.map(function (j) {
            return '<div class="job-card"><div class="job-info"><h3>' + esc(j.role) + '</h3><div class="job-meta"><span>' + esc(j.team) + '</span><span>•</span><span>' + esc(j.type) + '</span><span>•</span><span>' + esc(j.place) + '</span></div></div><button class="btn btn-secondary" type="button" data-action="apply-job" data-role="' + esc(j.role) + '">Apply</button></div>';
          }).join("") + '</div></section>' +
          '<section class="page-section page-callout"><h2>Don\'t see your role?</h2><p>We\'re always glad to meet good people. Tell us how you\'d help and we\'ll keep you in mind.</p></section>' +
          pageCtaHTML("Want to chat?", "Send us a note and our team will be in touch.", "Get in touch", "#/contact");
      },
    },

    "contact": {
      title: "Contact",
      build: function () {
        return pageHeroHTML("Contact us", "Get in touch", "Questions, feedback, or a partnership idea? We'd love to hear from you.") +
          '<section class="page-section"><div class="contact-grid">' +
          '<aside class="contact-methods">' +
          '<div class="contact-method"><div class="feature-icon">' + ICON_MAIL + '</div><div><h3>Email</h3><p>support@gonegosyo.ph</p></div></div>' +
          '<div class="contact-method"><div class="feature-icon">' + ICON_CHAT + '</div><div><h3>Help center</h3><p><a href="#/help" class="inline-link">Browse common questions</a></p></div></div>' +
          '<div class="contact-method"><div class="feature-icon">' + ICON_PIN + '</div><div><h3>Office</h3><p>Makati City, Metro Manila</p></div></div>' +
          '<div class="contact-method"><div class="feature-icon">' + ICON_SHIELD + '</div><div><h3>Safety concern?</h3><p><a href="#/safety" class="inline-link">Read our safety tips</a></p></div></div>' +
          '</aside>' +
          '<form id="contact-page-form" class="contact-form" novalidate>' +
          '<div class="field"><label for="ct-name">Your name</label><input class="input" id="ct-name" type="text" placeholder="Juan dela Cruz" /><div class="error-text" data-err="ct-name" hidden></div></div>' +
          '<div class="field"><label for="ct-email">Email</label><input class="input" id="ct-email" type="email" placeholder="you@email.com" /><div class="error-text" data-err="ct-email" hidden></div></div>' +
          '<div class="field"><label for="ct-subject">Subject</label><input class="input" id="ct-subject" type="text" placeholder="How can we help?" /><div class="error-text" data-err="ct-subject" hidden></div></div>' +
          '<div class="field"><label for="ct-message">Message</label><textarea class="textarea" id="ct-message" placeholder="Tell us a bit more..."></textarea><div class="error-text" data-err="ct-message" hidden></div></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Send message</button></form>' +
          '</div></section>';
      },
    },
  };

  function renderStaticPage(slug) {
    var page = STATIC_PAGES[slug];
    if (!page) { renderBrowse(); return; }
    app.innerHTML = '<div class="content-page">' + page.build() + '</div>';
  }

  function submitContactPage(form) {
    var name = document.getElementById("ct-name").value.trim();
    var email = document.getElementById("ct-email").value.trim();
    var subject = document.getElementById("ct-subject").value.trim();
    var message = document.getElementById("ct-message").value.trim();
    var ok = true;
    setFieldError("ct-name", name ? "" : "Please enter your name."); if (!name) ok = false;
    var emailOk = /.+@.+\..+/.test(email);
    setFieldError("ct-email", emailOk ? "" : "Please enter a valid email."); if (!emailOk) ok = false;
    setFieldError("ct-subject", subject ? "" : "Please add a subject."); if (!subject) ok = false;
    setFieldError("ct-message", message ? "" : "Please write a message."); if (!message) ok = false;
    if (!ok) { var firstErr = form.querySelector(".input-error"); if (firstErr) firstErr.focus(); return; }
    form.reset();
    toast("Thanks, " + name.split(" ")[0] + "! Your message has been sent. ✉️");
  }

  /* ----------------------------- Router ---------------------------- */

  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    if (h.indexOf("/item/") === 0) return { name: "item", id: h.slice(6) };
    if (h === "/post") return { name: "post" };
    if (h.indexOf("/edit/") === 0) return { name: "post", editId: h.slice(6) };
    if (h === "/favorites") return { name: "favorites" };
    if (h === "/dashboard") return { name: "dashboard" };
    if (h === "/my-listings") return { name: "dashboard" };
    var slug = h.replace(/^\//, "");
    if (STATIC_PAGES[slug]) return { name: "page", slug: slug };
    return { name: "browse" };
  }

  async function updateSavedBadge() {
    try {
      var badge = document.getElementById("saved-count");
      if (!badge) return;
      var n = await Store.favoriteCount();
      badge.textContent = n;
      badge.hidden = n === 0;
    } catch(e) {}
  }

  async function render(opts) {
    opts = opts || {};
    var route = parseHash();
    if (route.name === "item") await renderDetail(route.id);
    else if (route.name === "post") await renderPost(route.editId);
    else if (route.name === "favorites") await renderFavorites();
    else if (route.name === "dashboard") await renderDashboard();
    else if (route.name === "page") renderStaticPage(route.slug);
    else await renderBrowse();
    await updateSavedBadge();
    await updateAuthUI();
    if (opts.scroll) window.scrollTo(0, 0);
  }

  /* --------------------------- Interactions ------------------------ */

  async function handleFav(id) {
    try {
      var y = window.scrollY;
      var nowFav = await Store.toggleFavorite(id);
      await updateSavedBadge();
      await render();
      window.scrollTo(0, y);
      toast(nowFav ? "Saved to your favorites ♥" : "Removed from favorites");
    } catch (e) { toast((e && e.message) || "Log in to save items."); }
  }

  function shareListing(id) {
    var url = location.origin + location.pathname + "#/item/" + id;
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { toast("Link copied to clipboard 🔗"); }, function () { toast("Copy this link: " + url); }); }
    else { toast("Copy this link: " + url); }
  }

  function clearFilters() {
    state.search = ""; state.category = "All"; state.location = ""; state.sort = "newest";
    var input = document.getElementById("search-input"); if (input) input.value = "";
    render();
  }

  function toggleTheme() {
    var html = document.documentElement; var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next); localStorage.setItem('bayansell:theme:v1', next);
  }

  function bindEvents() {
    app.addEventListener("click", async function (e) {
      var favBtn = e.target.closest("[data-fav]");
      if (favBtn) { e.preventDefault(); await handleFav(favBtn.getAttribute("data-fav")); return; }
      var back = e.target.closest('[data-action="back"]');
      if (back) { e.preventDefault(); history.back(); return; }
      var share = e.target.closest('[data-action="share"]');
      if (share) { e.preventDefault(); shareListing(share.getAttribute("data-id")); return; }
      var clear = e.target.closest('[data-action="clear"]');
      if (clear) { e.preventDefault(); clearFilters(); return; }
      var rm = e.target.closest("[data-remove-img]");
      if (rm) { e.preventDefault(); removeImage(Number(rm.getAttribute("data-remove-img"))); return; }
      var contact = e.target.closest('[data-action="contact"]');
      if (contact) { e.preventDefault(); await openContactModal(contact.getAttribute("data-id")); return; }
      var del = e.target.closest("[data-delete]");
      if (del) { e.preventDefault(); await confirmDelete(del.getAttribute("data-delete")); return; }
      var loginInline = e.target.closest('[data-action="login-inline"]');
      if (loginInline) { e.preventDefault(); openAuthModal(function () { render(); }); return; }
      var upgrade = e.target.closest('[data-action="upgrade-seller"]');
      if (upgrade) { e.preventDefault(); try { await Store.switchRole("seller"); } catch(e) {} toast("You are now a Seller! 💼"); await render(); return; }
      var edit = e.target.closest('[data-action="edit"]');
      if (edit) { e.preventDefault(); location.hash = "#/edit/" + edit.getAttribute("data-id"); return; }
      var dashTab = e.target.closest("[data-tab]");
      if (dashTab) { e.preventDefault(); state.dashTab = dashTab.getAttribute("data-tab"); await render(); return; }
      var sideItem = e.target.closest("[data-inquiry-id]");
      if (sideItem) { e.preventDefault(); state.activeInquiryId = sideItem.getAttribute("data-inquiry-id"); await render(); return; }
      var tab = e.target.closest(".cat-tab");
      if (tab) { e.preventDefault(); state.category = tab.getAttribute("data-cat"); await render(); return; }
      var areaPill = e.target.closest(".area-pill");
      if (areaPill) { e.preventDefault(); state.location = areaPill.getAttribute("data-area"); await render({ scroll: false }); return; }
      var applyJob = e.target.closest('[data-action="apply-job"]');
      if (applyJob) { e.preventDefault(); toast("Thanks for your interest! Email your CV to careers@gonegosyo.ph 📨"); return; }
    });

    app.addEventListener("change", function (e) {
      if (e.target.id === "sort-select") { state.sort = e.target.value; render(); }
      else if (e.target.id === "image-input") { handleFiles(e.target.files); e.target.value = ""; }
    });

    app.addEventListener("submit", async function (e) {
      if (e.target.id === "post-form") { e.preventDefault(); await submitPost(e.target); }
      else if (e.target.id === "chat-form") { e.preventDefault(); var inqId = state.activeInquiryId; var input = document.getElementById('chat-input'); var text = input ? input.value.trim() : ""; if (!text || !inqId) return; try { await Store.sendMessage(inqId, text); } catch(e) {} await render(); }
      else if (e.target.id === "contact-page-form") { e.preventDefault(); submitContactPage(e.target); }
    });

    app.addEventListener("dragover", function (e) { if (e.target.closest(".dropzone")) { e.preventDefault(); var dz = e.target.closest(".dropzone"); dz.style.borderColor = "var(--text)"; } });
    app.addEventListener("dragleave", function (e) { var dz = e.target.closest(".dropzone"); if (dz) dz.style.borderColor = ""; });
    app.addEventListener("drop", function (e) { var dz = e.target.closest(".dropzone"); if (dz) { e.preventDefault(); dz.style.borderColor = ""; if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); } });

    var searchInput = document.getElementById("search-input");
    var searchForm = document.getElementById("searchbar");
    if (searchInput) { searchInput.addEventListener("input", function () { state.search = searchInput.value; if (parseHash().name !== "browse") location.hash = "#/"; else render(); }); }
    if (searchForm) { searchForm.addEventListener("submit", function (e) { e.preventDefault(); state.search = searchInput ? searchInput.value : ""; if (parseHash().name !== "browse") location.hash = "#/"; else render(); window.scrollTo(0, 0); }); }

    var themeBtn = document.getElementById("theme-toggle"); if (themeBtn) { themeBtn.addEventListener("click", toggleTheme); }
    var accountBtn = document.getElementById("account-btn"); if (accountBtn) { accountBtn.addEventListener("click", function (e) { e.stopPropagation(); toggleAccountMenu(); }); }
    var accountMenu = document.getElementById("account-menu");
    if (accountMenu) {
      accountMenu.addEventListener("click", async function (e) {
        var nav = e.target.closest("[data-nav]"); if (nav) { await toggleAccountMenu(false); location.hash = nav.getAttribute("data-nav"); return; }
        var act = e.target.closest("[data-action]");
        if (act) {
          var a = act.getAttribute("data-action");
          if (a === "login") { await toggleAccountMenu(false); openAuthModal(); }
          else if (a === "logout") { await toggleAccountMenu(false); try { await Store.logout(); } catch(e) {} await updateAuthUI(); toast("You’ve been logged out"); if (parseHash().name === "dashboard") location.hash = "#/"; else await render(); }
          else if (a === "toggle-role") { var next = act.getAttribute("data-role"); try { await Store.switchRole(next); } catch(e) {} await toggleAccountMenu(false); toast("Account switched to " + (next === "seller" ? "Seller" : "Buyer")); if (next === "buyer" && parseHash().name === "dashboard") location.hash = "#/"; else await render(); }
        }
      });
    }
    document.addEventListener("click", function (e) { if (document.getElementById("account-menu") && !document.getElementById("account-menu").hidden && !e.target.closest(".account-wrap")) toggleAccountMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(); toggleAccountMenu(false); } });
    window.addEventListener("hashchange", () => render({ scroll: true }));
  }

  async function init() {
    bindEvents();
    await render({ scroll: false });
  }

  init();
})();
