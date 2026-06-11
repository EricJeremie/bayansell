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
  \"use strict\";

  var app = document.getElementById(\"app\");

  var state = {
    search: \"\",
    category: \"All\",
    sort: \"newest\",
    dashTab: \"listings\",
    activeInquiryId: null
  };

  var pendingImages = [];

  /* ----------------------------- Utils ----------------------------- */

  function esc(s) {
    return String(s == null ? \"\" : s).replace(/[&<>\"']/g, function (c) {
      return { \"&\": \"&amp;\", \"<\": \"&lt;\", \">\": \"&gt;\", '\"': \"&quot;\", \"'\": \"&#39;\" }[c];
    });
  }

  function formatPrice(n) { return \"₱\" + Number(n).toLocaleString(\"en-US\"); }

  function formatDateAbs(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return \"\";
    return d.toLocaleDateString(\"en-US\", { year: \"numeric\", month: \"short\", day: \"numeric\" });
  }

  function formatDateRel(iso) {
    var then = new Date(iso);
    var diff = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (isNaN(diff)) return \"\";
    if (diff <= 0) return \"today\";
    if (diff === 1) return \"yesterday\";
    if (diff < 30) return diff + \" days ago\";
    return \"on \" + formatDateAbs(iso);
  }

  function initials(name) {
    var parts = String(name || \"?\").trim().split(/\\s+/);
    var s = parts[0][0] + (parts[1] ? parts[1][0] : \"\");
    return s.toUpperCase();
  }

  function toast(msg) {
    var t = document.querySelector(\".toast\") || document.createElement(\"div\");
    if (!t.parentNode) { t.className = \"toast\"; document.body.appendChild(t); }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add(\"show\");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () { t.classList.remove(\"show\"); }, 2400);
  }

  /* ----------------------- Shared fragments ------------------------ */

  var HEART_SVG = '<svg viewBox=\"0 0 32 32\" aria-hidden=\"true\"><path d=\"M16 28c7-4.7 12-9.1 12-15 0-3.3-2.7-6-6-6-2.4 0-4.6 1.4-6 3.6C14.6 8.4 12.4 7 10 7c-3.3 0-6 2.7-6 6 0 5.9 5 10.3 12 15z\"/></svg>';
  var BACK_SVG = '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z\"/></svg>';

  var CATEGORY_ICONS = {
    \"All\": '<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/>',
    \"Electronics\": '<rect x=\"2.5\" y=\"4.5\" width=\"19\" height=\"12\" rx=\"2\"/><path d=\"M8.5 20.5h7M12 16.5v4\"/>',
    \"Mobile Phones\": '<rect x=\"7\" y=\"2.5\" width=\"10\" height=\"19\" rx=\"2.5\"/><path d=\"M10.5 18.5h3\"/>',
    \"Fashion\": '<path d=\"M10 4a2 2 0 1 0 4 0\"/><path d=\"M12 6v2L4.6 13.2A1.4 1.4 0 0 0 5.4 16h13.2a1.4 1.4 0 0 0 .8-2.8L12 8\"/>',
    \"Home & Living\": '<path d=\"M3.5 11 12 4l8.5 7\"/><path d=\"M6 9.5V20h12V9.5\"/><path d=\"M10 20v-5h4v5\"/>',
    \"Furniture\": '<path d=\"M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11\"/><path d=\"M3.5 11h17a1.5 1.5 0 0 1 1.5 1.5V17h-2v-2H5v2H3v-4.5A1.5 1.5 0 0 1 4.5 11\"/><path d=\"M5 19v-2M19 19v-2\"/>',
    \"Appliances\": '<rect x=\"5\" y=\"2.5\" width=\"14\" height=\"19\" rx=\"2\"/><circle cx=\"12\" cy=\"13\" r=\"4.2\"/><path d=\"M8.5 6h.01M11 6h.01\"/>',
    \"Vehicles\": '<path d=\"M3 13.5 5 8.2A2.5 2.5 0 0 1 7.3 6.5h9.4A2.5 2.5 0 0 1 19 8.2l2 5.3V18h-3v-1.8H6V18H3z\"/><circle cx=\"7.2\" cy=\"15.2\" r=\"1.4\"/><circle cx=\"16.8\" cy=\"15.2\" r=\"1.4\"/>',
    \"Hobbies & Games\": '<path d=\"M7.5 7.5h9A3.5 3.5 0 0 1 20 11l-1 5.2a2.4 2.4 0 0 1-4.3 1L13 15h-2l-1.7 2.2a2.4 2.4 0 0 1-4.3-1L4 11a3.5 3.5 0 0 1 3.5-3.5z\"/><path d=\"M7.5 11.5h3M9 10v3\"/>',
    \"Sports\": '<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3v18M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4\"/>',
    \"Books\": '<path d=\"M12 6.5C10 5 6.5 5 4.5 6v12c2-1 5.5-1 7.5.5 2-1.5 5.5-1.5 7.5-.5V6c-2-1-5.5-1-7.5.5z\"/><path d=\"M12 6.5v12\"/>'
  };

  function iconSvg(name) {
    return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">' + (CATEGORY_ICONS[name] || CATEGORY_ICONS[\"All\"]) + \"</svg>\";
  }

  function imgTag(src, alt, cls) {
    return '<img ' + (cls ? 'class=\"' + cls + '\" ' : \"\") + 'src=\"' + esc(src || window.FALLBACK_IMG) + '\" alt=\"' + esc(alt) + '\" loading=\"lazy\" onerror=\"this.onerror=null;this.src=FALLBACK_IMG\">';
  }

  async function cardHTML(l) {
    var isFav = false;
    try { isFav = await Store.isFavorite(l.id); } catch(e) {}
    var fav = isFav ? \" is-fav\" : \"\";
    var cover = l.images && l.images[0] ? l.images[0] : window.FALLBACK_IMG;
    return (
      '<a class=\"card\" href=\"#/item/' + esc(l.id) + '\">' +
      '<div class=\"card-media\">' +
      '<button class=\"fav-btn' + fav + '\" type=\"button\" data-fav=\"' + esc(l.id) + '\" aria-label=\"Save to favorites\">' + HEART_SVG + \"</button>\" +
      imgTag(cover, l.title) +
      \"</div>\" +
      '<div class=\"card-body\">' +
      '<div class=\"card-title-row\"><span class=\"card-title\">' + esc(l.title) + \"</span><span class=\"card-condition\">\" + esc(l.condition) + \"</span></div>\" +
      '<div class=\"card-location\">' + esc(l.location) + \"</div>\" +
      '<div class=\"card-price\"><b>' + formatPrice(l.price) + \"</b></div>\" +
      \"</div></a>\"
    );
  }

  async function gridHTML(list) {
    const cards = await Promise.all(list.map(cardHTML));
    return '<div class=\"grid\">' + cards.join(\"\") + \"</div>\";
  }

  /* ----------------------------- Browse ---------------------------- */

  async function getFilteredListings() {
    var all = [];
    try { all = await Store.getAllListings(); } catch(e) { console.error(\"Store error:\", e); all = window.SEED_LISTINGS || []; }
    var q = state.search.trim().toLowerCase();
    var cat = state.category;

    var list = all.filter(function (l) {
      var matchCat = cat === \"All\" || l.category === cat;
      var hay = (l.title + \" \" + (l.description||\"\") + \" \" + (l.location || \"\") + \" \" + (l.category || \"\")).toLowerCase();
      var matchQ = !q || hay.indexOf(q) !== -1;
      return matchCat && matchQ;
    });

    if (state.sort === \"price-asc\") list.sort((a, b) => a.price - b.price);
    else if (state.sort === \"price-desc\") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    
    return list;
  }

  function categoryRowHTML() {
    var cats = [\"All\"].concat(window.CATEGORIES || []);
    return '<div class=\"filters\"><div class=\"category-tabs\">' + cats.map(c => '<button type=\"button\" class=\"cat-tab' + (state.category === c ? \" active\" : \"\") + '\" data-cat=\"' + esc(c) + '\">' + iconSvg(c) + \"<span>\" + esc(c) + \"</span></button>\").join(\"\") + \"</div></div>\";
  }

  function toolbarHTML(count) {
    var label = count === 1 ? \"1 item\" : count.toLocaleString(\"en-US\") + \" items\";
    function opt(v, t) { return '<option value=\"' + v + '\"' + (state.sort === v ? \" selected\" : \"\") + \">\" + t + \"</option>\"; }
    return '<div class=\"toolbar\"><div class=\"results-count\">' + label + (state.category !== \"All\" ? \" in \" + esc(state.category) : \"\") + (state.search ? ' for “' + esc(state.search) + \"”\" : \"\") + '</div><div class=\"sort-control\"><label for=\"sort-select\">Sort by</label><select class=\"sort-select\" id=\"sort-select\">' + opt(\"newest\", \"Newest\") + opt(\"price-asc\", \"Price: low to high\") + opt(\"price-desc\", \"Price: high to low\") + \"</select></div></div>\";
  }

  async function renderBrowse() {
    app.innerHTML = '<div class=\"loading-state\">Finding deals...</div>';
    var list = await getFilteredListings();
    var hero = '<section class=\"hero\"><h1>Find your next great deal</h1><p>Buy and sell preloved and brand-new items with people across the Philippines.</p></section>';
    var body = list.length === 0 ? '<div class=\"empty\"><div class=\"emoji\">🔍</div><h2>No items found</h2><p>Try a different keyword or category.</p><button class=\"btn btn-secondary\" data-action=\"clear\">Clear filters</button></div>' : toolbarHTML(list.length) + await gridHTML(list);
    app.innerHTML = hero + categoryRowHTML() + body;
  }

  /* ----------------------------- Detail ---------------------------- */

  function galleryHTML(images) {
    var imgs = images && images.length ? images : [window.FALLBACK_IMG];
    if (imgs.length === 1) {
      return '<div class=\"gallery single\"><div class=\"gallery-main\">' + imgTag(imgs[0], \"\") + \"</div></div>\";
    }
    var side = imgs.slice(1, 3).map(function (src) { return '<div class=\"gallery-cell\">' + imgTag(src, \"\") + \"</div>\"; }).join(\"\");
    return '<div class=\"gallery\"><div class=\"gallery-main\">' + imgTag(imgs[0], \"\") + '</div><div class=\"gallery-side\">' + side + \"</div></div>\";
  }

  function specHTML(label, value) {
    return '<div class=\"spec\"><span class=\"spec-label\">' + esc(label) + '</span><span class=\"spec-value\">' + esc(value) + \"</span></div>\";
  }

  async function renderDetail(id) {
    app.innerHTML = '<div class=\"loading-state\">Loading item...</div>';
    var l = null;
    try { l = await Store.getById(id); } catch(e) {}
    if (!l) { app.innerHTML = '<div class=\"empty\"><h2>Listing not found</h2><a class=\"btn btn-primary\" href=\"#/\">Back to browse</a></div>'; return; }
    
    var isFav = false;
    try { isFav = await Store.isFavorite(id); } catch(e) {}
    var favCls = isFav ? \" is-fav\" : \"\";
    var sellerMeta = l.isMine ? \"This is your listing\" : \"Member · Bayansell\";

    var primaryAction = l.isMine ? '<button class=\"btn btn-primary btn-block\" type=\"button\" data-action=\"edit\" data-id=\"' + esc(l.id) + '\">Edit listing</button>' : '<button class=\"btn btn-primary btn-block\" type=\"button\" data-action=\"contact\" data-id=\"' + esc(l.id) + '\">Message seller</button>';
    var actionsHTML = primaryAction + (l.isMine ? '<button class=\"btn btn-secondary btn-block\" type=\"button\" data-delete=\"' + esc(l.id) + '\">Delete listing</button>' : '') + '<button class=\"btn btn-secondary btn-block\" type=\"button\" data-fav=\"' + esc(l.id) + '\">' + (isFav ? \"♥ Saved\" : \"♡ Save item\") + \"</button>\" + '<button class=\"btn btn-secondary btn-block\" type=\"button\" data-action=\"share\" data-id=\"' + esc(l.id) + '\">Share</button>';

    app.innerHTML = '<div class=\"detail\"><button class=\"back-link\" type=\"button\" data-action=\"back\">' + BACK_SVG + \" Back</button><div class=\\\"detail-head\\\"><div><h1 class=\\\"detail-title\\\">\" + esc(l.title) + \"</h1><div class=\\\"detail-sub\\\">\" + esc(l.category) + \" · \" + esc(l.location) + \" · Posted \" + formatDateRel(l.postedAt) + \"</div></div><button class=\\\"detail-save\" + favCls + \"\\\" type=\\\"button\\\" data-fav=\\\"\" + esc(l.id) + \"\\\">\" + HEART_SVG + \"<span>\" + (isFav ? \"Saved\" : \"Save\") + \"</span></button></div>\" +
      galleryHTML(l.images) +
      '<div class=\"detail-grid\"><div class=\"detail-left\">' +
      '<section class=\"detail-section\"><h2>Description</h2><div class=\"detail-desc\">' + esc(l.description) + '</div></section>' +
      '<section class=\"detail-section\"><h2>Item details</h2><div class=\"spec-list\">' + specHTML(\"Condition\", l.condition) + specHTML(\"Category\", l.category) + specHTML(\"Location\", l.location) + specHTML(\"Posted\", formatDateAbs(l.postedAt)) + \"</div></section>\" +
      '<section class=\"detail-section\"><h2>Seller</h2><div class=\"seller-row\"><div class=\"seller-avatar\">' + esc(initials(l.seller.name)) + '</div><div><div class=\"seller-name\">' + esc(l.seller.name) + '</div><div class=\"seller-meta\">' + esc(sellerMeta) + '</div></div></div></section></div>' +
      '<aside class=\"detail-right\"><div class=\"price-card\"><div class=\"price\">' + formatPrice(l.price) + ' <small>· ' + esc(l.condition) + '</small></div><span class=\"condition-tag\">' + esc(l.condition) + '</span><div class=\"price-meta\">📍 ' + esc(l.location) + \" · Posted \" + formatDateRel(l.postedAt) + '</div><div style=\"margin-top:18px;display:flex;flex-direction:column;gap:10px\">' + actionsHTML + \"</div></div></aside></div></div>\";
  }

  /* ------------------------------ Post & Edit ----------------------------- */

  function selectOptions(arr, placeholder, selected) {
    return '<option value=\"\" disabled' + (!selected ? \" selected\" : \"\") + \">\" + esc(placeholder) + \"</option>\" + arr.map(function (v) { return '<option value=\"' + esc(v) + '\"' + (v === selected ? \" selected\" : \"\") + \">\" + esc(v) + \"</option>\"; }).join(\"\");
  }

  async function renderPost(editId) {
    var user = null;
    try { user = await Store.getUser(); } catch(e) {}
    if (!user) { app.innerHTML = '<div class=\"empty\"><div class=\"emoji\">🔐</div><h2>Log in to start selling</h2><p>Create an account or log in to post your item on Bayansell.</p><button class=\"btn btn-primary\" type=\"button\" data-action=\"login-inline\">Log in or sign up</button></div>'; return; }
    if (user.role !== \"seller\") { app.innerHTML = '<div class=\"empty\"><div class=\"emoji\">💼</div><h2>Want to sell on Bayansell?</h2><p>You are currently browsing as a buyer. Upgrade to a seller account to post listings.</p><button class=\"btn btn-primary\" type=\"button\" data-action=\"upgrade-seller\">Become a Seller</button></div>'; return; }

    var l = null;
    if (editId) { try { l = await Store.getById(editId); } catch(e) {} }
    if (editId && (!l || !l.isMine)) { location.hash = \"#/\"; return; }
    
    pendingImages = l ? l.images.slice() : [];
    var title = l ? \"Edit your listing\" : \"Sell your item\";
    var btnText = l ? \"Save changes\" : \"Post item\";

    app.innerHTML = '<div class=\"form-page\"><h1>' + title + '</h1><p class=\"lead\">List your item in a couple of minutes. Add clear photos and an honest description to sell faster.</p><form id=\"post-form\" novalidate data-edit-id=\"' + (editId || \"\") + '\">' +
      '<div class=\"field\"><label for=\"pf-title\">Title</label><input class=\"input\" id=\"pf-title\" type=\"text\" maxlength=\"80\" value=\"' + esc(l ? l.title : \"\") + '\" placeholder=\"e.g. iPhone 14 Pro 256GB - Deep Purple\" /><div class=\"error-text\" data-err=\"title\" hidden></div></div>' +
      '<div class=\"field-row\"><div class=\"field\"><label for=\"pf-category\">Category</label><select class=\"select\" id=\"pf-category\">' + selectOptions(window.CATEGORIES || [], \"Select a category\", l ? l.category : null) + '</select><div class=\"error-text\" data-err=\"category\" hidden></div></div><div class=\"field\"><label for=\"pf-condition\">Condition</label><select class=\"select\" id=\"pf-condition\">' + selectOptions(window.CONDITIONS || [], \"Select condition\", l ? l.condition : null) + '</select><div class=\"error-text\" data-err=\"condition\" hidden></div></div></div>' +
      '<div class=\"field-row\"><div class=\"field\"><label for=\"pf-price\">Price</label><div class=\"price-input\"><span class=\"peso\">₱</span><input class=\"input\" id=\"pf-price\" type=\"number\" min=\"1\" step=\"1\" value=\"' + (l ? l.price : \"\") + '\" placeholder=\"0\" /></div><div class=\"error-text\" data-err=\"price\" hidden></div></div><div class=\"field\"><label for=\"pf-location\">Location</label><select class=\"select\" id=\"pf-location\">' + selectOptions(window.PH_CITIES || [], \"Select a city\", l ? l.location : null) + '</select><div class=\"error-text\" data-err=\"location\" hidden></div></div></div>' +
      '<div class=\"field\"><label for=\"pf-description\">Description</label><textarea class=\"textarea\" id=\"pf-description\" maxlength=\"1200\" placeholder=\"Describe your item...\">' + esc(l ? l.description : \"\") + '</textarea><div class=\"error-text\" data-err=\"description\" hidden></div></div>' +
      '<div class=\"field\"><label>Photos <span class=\"hint\">(up to 5 — optional but recommended)</span></label><label class=\"dropzone\" for=\"image-input\"><svg viewBox=\"0 0 24 24\"><path d=\"M19 13v6H5v-6H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2zM12 2 7 7h3v7h4V7h3l-5-5z\"/></svg><div><strong>Click to upload</strong> or drag and drop</div><input id=\"image-input\" type=\"file\" accept=\"image/*\" multiple hidden /></label><div class=\"image-preview\" id=\"image-preview\"></div></div>' +
      '<div class=\"form-actions\"><button class=\"btn btn-secondary\" type=\"button\" data-action=\"back\">Cancel</button><button class=\"btn btn-primary\" type=\"submit\">' + btnText + \"</button></div></form></div>\";
      
    renderPreviews();
  }

  function renderPreviews() {
    var box = document.getElementById(\"image-preview\");
    if (!box) return;
    box.innerHTML = pendingImages.map(function (src, i) { return '<div class=\"thumb\">' + imgTag(src, \"Photo \" + (i + 1)) + '<button type=\"button\" data-remove-img=\"' + i + '\" aria-label=\"Remove photo\">✕</button></div>'; }).join(\"\");
  }

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var max = 1000; var w = image.width; var h = image.height;
          if (w > h && w > max) { h = Math.round((h * max) / w); w = max; } else if (h >= w && h > max) { w = Math.round((w * max) / h); h = max; }
          var canvas = document.createElement(\"canvas\"); canvas.width = w; canvas.height = h;
          canvas.getContext(\"2d\").drawImage(image, 0, 0, w, h);
          resolve(canvas.toDataURL(\"image/jpeg\", 0.82));
        };
        image.onerror = reject; image.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return /^image\\//.test(f.type); });
    if (!files.length) return;
    var room = 5 - pendingImages.length;
    if (room <= 0) { toast(\"You can add up to 5 photos.\"); return; }
    files = files.slice(0, room);
    Promise.all(files.map(resizeImage)).then(function (urls) { pendingImages = pendingImages.concat(urls); renderPreviews(); }).catch(function () { toast(\"Sorry, one of those images couldn’t be read.\"); });
  }

  function removeImage(index) { pendingImages.splice(index, 1); renderPreviews(); }

  function setError(name, msg) {
    var box = document.querySelector('[data-err=\"' + name + '\"]');
    var input = document.getElementById(\"pf-\" + name);
    if (box) { box.textContent = msg || \"\"; box.hidden = !msg; }
    if (input) input.classList.toggle(\"input-error\", !!msg);
  }

  async function submitPost(form) {
    var editId = form.getAttribute(\"data-edit-id\");
    var data = {
      title: document.getElementById(\"pf-title\").value.trim(),
      category: document.getElementById(\"pf-category\").value,
      price: document.getElementById(\"pf-price\").value,
      condition: document.getElementById(\"pf-condition\").value,
      location: document.getElementById(\"pf-location\").value,
      description: document.getElementById(\"pf-description\").value.trim(),
      images: pendingImages.slice()
    };

    var ok = true;
    setError(\"title\", data.title ? \"\" : \"Please add a title.\"); if (!data.title) ok = false;
    setError(\"category\", data.category ? \"\" : \"Please choose a category.\"); if (!data.category) ok = false;
    var priceNum = Number(data.price);
    var priceMsg = !data.price ? \"Please set a price.\" : priceNum <= 0 ? \"Price must be greater than 0.\" : \"\";
    setError(\"price\", priceMsg); if (priceMsg) ok = false;
    setError(\"condition\", data.condition ? \"\" : \"Please choose a condition.\"); if (!data.condition) ok = false;
    setError(\"location\", data.location ? \"\" : \"Please choose a location.\"); if (!data.location) ok = false;
    setError(\"description\", data.description ? \"\" : \"Please add a short description.\"); if (!data.description) ok = false;

    if (!ok) { var firstErr = form.querySelector(\".input-error\"); if (firstErr) firstErr.focus(); toast(\"Please fix the highlighted fields.\"); return; }

    try {
      if (editId) { await Store.updateListing(editId, data); toast(\"Changes saved! ✨\"); location.hash = \"#/dashboard\"; }
      else { var listing = await Store.addListing(data); toast(\"Your item is now live! 🎉\"); location.hash = \"#/item/\" + listing.id; }
    } catch (e) { toast(e.message || \"Could not save your item.\"); }
  }

  /* ---------------------------- Favorites -------------------------- */

  async function renderFavorites() {
    app.innerHTML = '<div class=\"loading-state\">Loading favorites...</div>';
    var list = [];
    try { list = await Store.getFavoriteListings(); } catch(e) {}
    if (list.length === 0) {
      app.innerHTML = '<section class=\"hero\"><h1>Your saved items</h1></section><div class=\"empty\"><div class=\"emoji\">❤️</div><h2>No saved items yet</h2><p>Tap the heart on any listing to save it here for later.</p><a class=\"btn btn-primary\" href=\"#/\">Start browsing</a></div>';
      return;
    }
    app.innerHTML = '<section class=\"hero\"><h1>Your saved items</h1><p>' + (list.length === 1 ? \"1 item\" : list.length + \" items\") + \" you’ve saved for later.</p></section>\" + await gridHTML(list);
  }

  /* ----------------------------- Modal ----------------------------- */

  function openModal(title, bodyHTML) {
    closeModal();
    var overlay = document.createElement(\"div\");
    overlay.className = \"modal-overlay\"; overlay.id = \"modal-overlay\";
    overlay.innerHTML = '<div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-label=\"' + esc(title) + '\"><div class=\"modal-header\"><button class=\"modal-close\" type=\"button\" data-action=\"close-modal\" aria-label=\"Close\">✕</button><h3>' + esc(title) + '</h3></div><div class=\"modal-body\">' + bodyHTML + \"</div></div>\";
    document.body.appendChild(overlay); document.body.style.overflow = \"hidden\";
    requestAnimationFrame(function () { overlay.classList.add(\"show\"); });
    overlay.addEventListener(\"click\", function (e) { if (e.target === overlay || e.target.closest('[data-action=\"close-modal\"]')) { closeModal(); } });
    return overlay;
  }

  function closeModal() { var overlay = document.getElementById(\"modal-overlay\"); if (overlay) overlay.remove(); document.body.style.overflow = \"\"; }

  function setFieldError(id, msg) {
    var box = document.querySelector('[data-err=\"' + id + '\"]');
    var input = document.getElementById(id);
    if (box) { box.textContent = msg || \"\"; box.hidden = !msg; }
    if (input) input.classList.toggle(\"input-error\", !!msg);
  }

  /* ------------------------ Auth (mock login) ---------------------- */

  function openAuthModal(afterAuth) {
    var overlay = openModal(\"Log in or sign up\", \"<h2>Welcome to Bayansell</h2><p class=\\\"modal-sub\\\">Log in or sign up to sell your items and message sellers.</p><form id=\\\"auth-form\\\" novalidate><div class=\\\"field\\\"><label for=\\\"auth-name\\\">Name</label><input class=\\\"input\\\" id=\\\"auth-name\\\" type=\\\"text\\\" placeholder=\\\"e.g. Juan dela Cruz\\\" /><div class=\\\"error-text\\\" data-err=\\\"auth-name\\\" hidden></div></div><div class=\\\"field\\\"><label for=\\\"auth-email\\\">Email</label><input class=\\\"input\\\" id=\\\"auth-email\\\" type=\\\"email\\\" placeholder=\\\"you@email.com\\\" /><div class=\\\"error-text\\\" data-err=\\\"auth-email\\\" hidden></div></div><div class=\\\"field\\\"><label for=\\\"auth-role\\\">I want to...</label><select class=\\\"select\\\" id=\\\"auth-role\\\"><option value=\\\"buyer\\\">Buy and browse</option><option value=\\\"seller\\\">Sell items</option></select></div><button class=\\\"btn btn-primary btn-block\\\" type=\\\"submit\\\">Continue</button></form>\");
    overlay.querySelector(\"#auth-form\").addEventListener(\"submit\", async function (e) {
      e.preventDefault();
      var name = document.getElementById(\"auth-name\").value.trim();
      var email = document.getElementById(\"auth-email\").value.trim();
      var role = document.getElementById(\"auth-role\").value;
      var ok = true;
      setFieldError(\"auth-name\", name ? \"\" : \"Please enter your name.\"); if (!name) ok = false;
      var emailOk = /.+@.+\\..+/.test(email);
      setFieldError(\"auth-email\", emailOk ? \"\" : \"Please enter a valid email.\"); if (!emailOk) ok = false;
      if (!ok) return;
      // Store.setUser({ name: name, email: email, role: role }); // If we had a setUser
      closeModal();
      await updateAuthUI();
      await render();
      toast(\"Welcome, \" + name.split(\" \")[0] + \"! 👋\");
      if (typeof afterAuth === \"function\") afterAuth();
    });
    setTimeout(function () { var n = document.getElementById(\"auth-name\"); if (n) n.focus(); }, 60);
  }

  /* ----------------------- Account dropdown ------------------------ */

  async function accountMenuHTML() {
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    var favCount = 0; try { favCount = await Store.favoriteCount(); } catch(e) {}
    var savedItem = '<button class=\"menu-item\" data-nav=\"#/favorites\">Saved' + (favCount ? '<span class=\"menu-badge\">' + favCount + \"</span>\" : \"\") + \"</button>\";
    if (user) {
      var roleText = user.role === \"seller\" ? \"Seller account\" : \"Buyer account\";
      var roleAction = user.role === \"seller\" ? \"Switch to Buyer\" : \"Switch to Seller\";
      var nextRole = user.role === \"seller\" ? \"buyer\" : \"seller\";
      var dashboardLink = user.role === \"seller\" ? '<button class=\"menu-item bold\" data-nav=\"#/dashboard\">Dashboard</button>' : '';
      return '<div class=\"menu-greeting\"><strong>Hi, ' + esc(user.name.split(\" \")[0]) + \"</strong><span>\" + esc(user.email || \"\") + '</span><span style=\"font-size:11px;color:var(--rausch);font-weight:700;margin-top:4px;display:block\">' + roleText + '</span></div><div class=\"menu-sep\"></div><button class=\"menu-item\" data-action=\"toggle-role\" data-role=\"' + nextRole + '\">' + roleAction + '</button><div class=\"menu-sep\"></div>' + dashboardLink + '<button class=\"menu-item\" data-nav=\"#/my-listings\">My listings</button>' + savedItem + '<button class=\"menu-item\" data-nav=\"#/post\">Sell your item</button><div class=\"menu-sep\"></div><button class=\"menu-item\" data-action=\"logout\">Log out</button>';
    }
    return '<button class=\"menu-item bold\" data-action=\"login\">Log in</button><button class=\"menu-item\" data-action=\"login\">Sign up</button><div class=\"menu-sep\"></div><button class=\"menu-item\" data-nav=\"#/post\">Sell your item</button>' + savedItem;
  }

  async function toggleAccountMenu(force) {
    var menu = document.getElementById(\"account-menu\");
    var btn = document.getElementById(\"account-btn\");
    if (!menu) return;
    var willOpen = force !== undefined ? force : menu.hidden;
    if (willOpen) { menu.innerHTML = await accountMenuHTML(); menu.hidden = false; if (btn) btn.setAttribute(\"aria-expanded\", \"true\"); }
    else { menu.hidden = true; if (btn) btn.setAttribute(\"aria-expanded\", \"false\"); }
  }

  async function updateAuthUI() {
    try {
      var user = await Store.getUser();
      var avatar = document.getElementById(\"account-avatar\");
      if (!avatar) return;
      if (user) { avatar.classList.add(\"has-user\"); avatar.textContent = initials(user.name); }
      else { avatar.classList.remove(\"has-user\"); avatar.innerHTML = '<svg viewBox=\"0 0 24 24\"><path d=\"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-7 2.2-7 5v1h14v-1c0-2.8-3-5-7-5z\"/></svg>'; }
    } catch(e) {}
  }

  /* ------------------------- Dashboard --------------------------- */

  async function renderDashboard() {
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    if (!user || user.role !== \"seller\") { location.hash = \"#/\"; return; }
    var listings = []; try { listings = await Store.getUserListings(); } catch(e) {}
    var revenue = listings.reduce(function(sum, l) { return sum + (l.price||0); }, 0);
    var views = listings.reduce(function(sum, l) { return sum + (l.views || 0); }, 0);
    var inquiries = []; try { inquiries = await Store.getInquiries(); } catch(e) {}
    var totalInqCount = listings.reduce(function(sum, l) { return sum + (l.inquiries || 0); }, 0);
    var tab = state.dashTab;
    var contentHTML = \"\";
    if (tab === \"listings\") {
      var tableRows = listings.map(function(l) { return '<tr><td><div class=\"dash-item-cell\">' + imgTag(l.images[0], \"\", \"dash-thumb\") + '<span>' + esc(l.title) + '</span></div></td><td>' + formatPrice(l.price) + '</td><td>' + formatDateAbs(l.postedAt) + '</td><td>' + (l.views || 0) + '</td><td><span class=\"status-badge\">Active</span></td><td><div class=\"dash-actions\"><button class=\"icon-btn\" title=\"Edit\" data-action=\"edit\" data-id=\"' + esc(l.id) + '\">✎</button><button class=\"icon-btn danger\" title=\"Delete\" data-delete=\"' + esc(l.id) + '\">✕</button></div></td></tr>'; }).join(\"\");
      contentHTML = '<div class=\"table-wrap\"><table><thead><tr><th>Item</th><th>Price</th><th>Posted</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan=\"6\" style=\"text-align:center;padding:40px;color:var(--muted)\">No listings yet. <a href=\"#/post\" style=\"color:var(--rausch);text-decoration:underline\">Post your first item</a></td></tr>') + '</tbody></table></div>';
    } else if (tab === \"messages\") {
      var activeInq = inquiries.find(function(i) { return i.id === state.activeInquiryId; }) || inquiries[0];
      if (activeInq && !state.activeInquiryId) state.activeInquiryId = activeInq.id;
      var sidebarItems = inquiries.map(function(i) { var lastMsg = i.messages[i.messages.length - 1]; return '<div class=\"msg-sidebar-item' + (state.activeInquiryId === i.id ? ' active' : '') + '\" data-inquiry-id=\"' + i.id + '\"><div class=\"msg-sidebar-name\">' + esc(i.buyerName) + '</div><div class=\"msg-sidebar-listing\">' + esc(i.listingTitle) + '</div><div class=\"msg-sidebar-preview\">' + esc(lastMsg ? lastMsg.text : \"\") + '</div></div>'; }).join(\"\");
      var chatMessages = \"\"; if (activeInq) { chatMessages = activeInq.messages.map(function(m) { return '<div class=\"chat-msg ' + m.sender + '\"><div class=\"chat-msg-bubble\">' + esc(m.text) + '</div><div class=\"chat-msg-time\">' + formatDateRel(m.time) + '</div></div>'; }).join(\"\"); }
      contentHTML = '<div class=\"messaging-pane\">' + (inquiries.length ? '<div class=\"msg-sidebar\">' + sidebarItems + '</div><div class=\"msg-chat-wrap\">' + (activeInq ? '<div class=\"msg-chat-header\"><div><div class=\"msg-chat-buyer\">' + esc(activeInq.buyerName) + '</div><div class=\"msg-chat-meta\">Interested in ' + esc(activeInq.listingTitle) + '</div></div><a class=\"btn btn-secondary\" href=\"#/item/' + activeInq.listingId + '\" style=\"padding:8px 12px;font-size:13px\">View Item</a></div><div class=\"msg-chat-body\" id=\"chat-body\">' + chatMessages + '</div><form class=\"msg-chat-input\" id=\"chat-form\"><input type=\"text\" id=\"chat-input\" placeholder=\"Type a message...\" autocomplete=\"off\"><button type=\"submit\" class=\"btn btn-primary\">Send</button></form>' : '<div class=\"msg-chat-empty\">Select a conversation</div>') + '</div>' : '<div class=\"msg-empty-state\"><h3>No messages yet</h3><p>Your buyer inquiries will show up here.</p></div>') + '</div>';
    }
    app.innerHTML = '<div class=\"dashboard-page\"><header class=\"dash-header\"><div><h1>Seller Dashboard</h1><p>Performance overview for ' + esc(user.name) + '</p></div><a class=\"btn btn-primary\" href=\"#/post\">Add Product</a></header><div class=\"stats-grid\"><div class=\"stat-card\"><div class=\"stat-label\">Active Listings</div><div class=\"stat-value\">' + listings.length + '</div></div><div class=\"stat-card\"><div class=\"stat-label\">Potential Revenue</div><div class=\"stat-value\">' + formatPrice(revenue) + '</div></div><div class=\"stat-card\"><div class=\"stat-label\">Total Views</div><div class=\"stat-value\">' + views.toLocaleString() + '</div></div><div class=\"stat-card\"><div class=\"stat-label\">Total Inquiries</div><div class=\"stat-value\">' + totalInqCount.toLocaleString() + '</div></div></div><div class=\"dash-tabs\"><button class=\"dash-tab-btn' + (tab === 'listings' ? ' active' : '') + '\" data-tab=\"listings\">Manage Listings</button><button class=\"dash-tab-btn' + (tab === 'messages' ? ' active' : '') + '\" data-tab=\"messages\">Messages' + (inquiries.length ? '<span class=\"menu-badge\">' + inquiries.length + '</span>' : '') + '</button></div><section class=\"dash-content\">' + contentHTML + '</section></div>';
    if (tab === 'messages') { var body = document.getElementById('chat-body'); if (body) body.scrollTop = body.scrollHeight; var input = document.getElementById('chat-input'); if (input) input.focus(); }
  }

  async function confirmDelete(id) {
    var l = null; try { l = await Store.getById(id); } catch(e) {}
    var overlay = openModal(\"Delete listing\", '<h2>Delete this listing?</h2><p class=\"modal-sub\">“' + esc(l ? l.title : \"\") + '” will be permanently removed. This can’t be undone.</p><div style=\"display:flex;gap:10px;justify-content:flex-end\"><button class=\"btn btn-secondary\" type=\"button\" data-action=\"close-modal\">Cancel</button><button class=\"btn btn-primary\" type=\"button\" id=\"confirm-delete\">Delete</button></div>');
    overlay.querySelector(\"#confirm-delete\").addEventListener(\"click\", async function () { try { await Store.deleteListing(id); } catch(e) {} closeModal(); toast(\"Listing deleted\"); if (parseHash().name === \"item\") location.hash = \"#/\"; else { await render(); } });
  }

  async function openContactModal(id) {
    var l = null; try { l = await Store.getById(id); } catch(e) {} if (!l) return;
    var user = null; try { user = await Store.getUser(); } catch(e) {}
    var cover = (l.images && l.images[0]) || window.FALLBACK_IMG;
    var overlay = openModal(\"Contact seller\", \"<h2>Message \" + esc(l.seller.name) + '</h2><p class=\"modal-sub\">Ask about this item. This is a demo — nothing is actually sent.</p><div class=\"modal-summary\"><img src=\"' + esc(cover) + '\" onerror=\"this.onerror=null;this.src=FALLBACK_IMG\" alt=\"\"><div class=\\\"ms-title\\\">' + esc(l.title) + '</div><div class=\"ms-price\">' + formatPrice(l.price) + \" · \" + esc(l.location) + '</div></div><form id=\"contact-form\" novalidate><div class=\"field\"><label for=\"c-name\">Your name</label><input class=\"input\" id=\"c-name\" type=\"text\" value=\"' + esc(user ? user.name : \"\") + '\" placeholder=\"Your name\" /><div class=\"error-text\" data-err=\"c-name\" hidden></div></div><div class=\"field\"><label for=\"c-message\">Message</label><textarea class=\"textarea\" id=\"c-message\" placeholder=\"Hi! Is this still available?\">Hi! Is this still available?</textarea><div class=\"error-text\" data-err=\"c-message\" hidden></div></div><button class=\"btn btn-primary btn-block\" type=\"submit\">Send message</button></form>');
    overlay.querySelector(\"#contact-form\").addEventListener(\"submit\", function (e) { e.preventDefault(); closeModal(); toast(\"Message sent to \" + l.seller.name.split(\" \")[0] + \"! ✉️\"); });
  }

  /* ----------------------------- Router ---------------------------- */

  function parseHash() {
    var h = location.hash.replace(/^#/, \"\");
    if (h.indexOf(\"/item/\") === 0) return { name: \"item\", id: h.slice(6) };
    if (h === \"/post\") return { name: \"post\" };
    if (h.indexOf(\"/edit/\") === 0) return { name: \"post\", editId: h.slice(6) };
    if (h === \"/favorites\") return { name: \"favorites\" };
    if (h === \"/dashboard\") return { name: \"dashboard\" };
    if (h === \"/my-listings\") return { name: \"dashboard\" };
    return { name: \"browse\" };
  }

  async function updateSavedBadge() {
    try {
      var badge = document.getElementById(\"saved-count\");
      if (!badge) return;
      var n = await Store.favoriteCount();
      badge.textContent = n;
      badge.hidden = n === 0;
    } catch(e) {}
  }

  async function render(opts) {
    opts = opts || {};
    var route = parseHash();
    if (route.name === \"item\") await renderDetail(route.id);
    else if (route.name === \"post\") await renderPost(route.editId);
    else if (route.name === \"favorites\") await renderFavorites();
    else if (route.name === \"dashboard\") await renderDashboard();
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
      toast(nowFav ? \"Saved to your favorites ♥\" : \"Removed from favorites\");
    } catch (e) { toast(\"Log in to save\"); }
  }

  function shareListing(id) {
    var url = location.origin + location.pathname + \"#/item/\" + id;
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { toast(\"Link copied to clipboard 🔗\"); }, function () { toast(\"Copy this link: \" + url); }); }
    else { toast(\"Copy this link: \" + url); }
  }

  function clearFilters() {
    state.search = \"\"; state.category = \"All\"; state.sort = \"newest\";
    var input = document.getElementById(\"search-input\"); if (input) input.value = \"\";
    render();
  }

  function toggleTheme() {
    var html = document.documentElement; var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next); localStorage.setItem('bayansell:theme:v1', next);
  }

  function bindEvents() {
    app.addEventListener(\"click\", async function (e) {
      var favBtn = e.target.closest(\"[data-fav]\");
      if (favBtn) { e.preventDefault(); await handleFav(favBtn.getAttribute(\"data-fav\")); return; }
      var back = e.target.closest('[data-action=\"back\"]');
      if (back) { e.preventDefault(); history.back(); return; }
      var share = e.target.closest('[data-action=\"share\"]');
      if (share) { e.preventDefault(); shareListing(share.getAttribute(\"data-id\")); return; }
      var clear = e.target.closest('[data-action=\"clear\"]');
      if (clear) { e.preventDefault(); clearFilters(); return; }
      var rm = e.target.closest(\"[data-remove-img]\");
      if (rm) { e.preventDefault(); removeImage(Number(rm.getAttribute(\"data-remove-img\"))); return; }
      var contact = e.target.closest('[data-action=\"contact\"]');
      if (contact) { e.preventDefault(); await openContactModal(contact.getAttribute(\"data-id\")); return; }
      var del = e.target.closest(\"[data-delete]\");
      if (del) { e.preventDefault(); await confirmDelete(del.getAttribute(\"data-delete\")); return; }
      var loginInline = e.target.closest('[data-action=\"login-inline\"]');
      if (loginInline) { e.preventDefault(); openAuthModal(function () { render(); }); return; }
      var upgrade = e.target.closest('[data-action=\"upgrade-seller\"]');
      if (upgrade) { e.preventDefault(); try { await Store.switchRole(\"seller\"); } catch(e) {} toast(\"You are now a Seller! 💼\"); await render(); return; }
      var edit = e.target.closest('[data-action=\"edit\"]');
      if (edit) { e.preventDefault(); location.hash = \"#/edit/\" + edit.getAttribute(\"data-id\"); return; }
      var dashTab = e.target.closest(\"[data-tab]\");
      if (dashTab) { e.preventDefault(); state.dashTab = dashTab.getAttribute(\"data-tab\"); await render(); return; }
      var sideItem = e.target.closest(\"[data-inquiry-id]\");
      if (sideItem) { e.preventDefault(); state.activeInquiryId = sideItem.getAttribute(\"data-inquiry-id\"); await render(); return; }
      var tab = e.target.closest(\".cat-tab\");
      if (tab) { e.preventDefault(); state.category = tab.getAttribute(\"data-cat\"); await render(); return; }
    });

    app.addEventListener(\"change\", function (e) {
      if (e.target.id === \"sort-select\") { state.sort = e.target.value; render(); }
      else if (e.target.id === \"image-input\") { handleFiles(e.target.files); e.target.value = \"\"; }
    });

    app.addEventListener(\"submit\", async function (e) {
      if (e.target.id === \"post-form\") { e.preventDefault(); await submitPost(e.target); }
      else if (e.target.id === \"chat-form\") { e.preventDefault(); var inqId = state.activeInquiryId; var input = document.getElementById('chat-input'); var text = input ? input.value.trim() : \"\"; if (!text || !inqId) return; try { await Store.sendMessage(inqId, text); } catch(e) {} await render(); }
    });

    app.addEventListener(\"dragover\", function (e) { if (e.target.closest(\".dropzone\")) { e.preventDefault(); var dz = e.target.closest(\".dropzone\"); dz.style.borderColor = \"var(--text)\"; } });
    app.addEventListener(\"dragleave\", function (e) { var dz = e.target.closest(\".dropzone\"); if (dz) dz.style.borderColor = \"\"; });
    app.addEventListener(\"drop\", function (e) { var dz = e.target.closest(\".dropzone\"); if (dz) { e.preventDefault(); dz.style.borderColor = \"\"; if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); } });

    var searchInput = document.getElementById(\"search-input\");
    var searchForm = document.getElementById(\"searchbar\");
    if (searchInput) { searchInput.addEventListener(\"input\", function () { state.search = searchInput.value; if (parseHash().name !== \"browse\") location.hash = \"#/\"; else render(); }); }
    if (searchForm) { searchForm.addEventListener(\"submit\", function (e) { e.preventDefault(); state.search = searchInput ? searchInput.value : \"\"; if (parseHash().name !== \"browse\") location.hash = \"#/\"; else render(); window.scrollTo(0, 0); }); }

    var themeBtn = document.getElementById(\"theme-toggle\"); if (themeBtn) { themeBtn.addEventListener(\"click\", toggleTheme); }
    var accountBtn = document.getElementById(\"account-btn\"); if (accountBtn) { accountBtn.addEventListener(\"click\", function (e) { e.stopPropagation(); toggleAccountMenu(); }); }
    var accountMenu = document.getElementById(\"account-menu\");
    if (accountMenu) {
      accountMenu.addEventListener(\"click\", async function (e) {
        var nav = e.target.closest(\"[data-nav]\"); if (nav) { await toggleAccountMenu(false); location.hash = nav.getAttribute(\"data-nav\"); return; }
        var act = e.target.closest(\"[data-action]\");
        if (act) {
          var a = act.getAttribute(\"data-action\");
          if (a === \"login\") { await toggleAccountMenu(false); openAuthModal(); }
          else if (a === \"logout\") { await toggleAccountMenu(false); try { await Store.logout(); } catch(e) {} await updateAuthUI(); toast(\"You’ve been logged out\"); if (parseHash().name === \"dashboard\") location.hash = \"#/\"; else await render(); }
          else if (a === \"toggle-role\") { var next = act.getAttribute(\"data-role\"); try { await Store.switchRole(next); } catch(e) {} await toggleAccountMenu(false); toast(\"Account switched to \" + (next === \"seller\" ? \"Seller\" : \"Buyer\")); if (next === \"buyer\" && parseHash().name === \"dashboard\") location.hash = \"#/\"; else await render(); }
        }
      });
    }
    document.addEventListener(\"click\", function (e) { if (document.getElementById(\"account-menu\") && !document.getElementById(\"account-menu\").hidden && !e.target.closest(\".account-wrap\")) toggleAccountMenu(false); });
    document.addEventListener(\"keydown\", function (e) { if (e.key === \"Escape\") { closeModal(); toggleAccountMenu(false); } });
    window.addEventListener(\"hashchange\", () => render({ scroll: true }));
  }

  async function init() {
    bindEvents();
    await render({ scroll: false });
  }

  init();
})();