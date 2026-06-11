/* =========================================================
   Bayansell — store (localStorage layer)
   Exposes global: Store
   ========================================================= */

var Store = (function () {
  var LISTINGS_KEY = "bayansell:listings:v1";
  var FAVORITES_KEY = "bayansell:favorites:v1";
  var USER_KEY = "bayansell:user:v1";

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Bayansell: could not read", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Bayansell: could not write", key, e);
      return false;
    }
  }

  /* ---------- Listings ---------- */

  // User-posted listings (most recent first).
  function getUserListings() {
    return read(LISTINGS_KEY, []);
  }

  // All listings: user posts first, then seed data.
  function getAllListings() {
    return getUserListings().concat(SEED_LISTINGS);
  }

  function getById(id) {
    var all = getAllListings();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function addListing(data) {
    var listing = {
      id: "user-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      title: data.title,
      category: data.category,
      price: Number(data.price),
      condition: data.condition,
      location: data.location,
      description: data.description,
      images: data.images && data.images.length ? data.images : [],
      seller: { name: (getUser() && getUser().name) || "You" },
      isMine: true,
      postedAt: new Date().toISOString(),
    };
    var listings = getUserListings();
    listings.unshift(listing);
    var ok = write(LISTINGS_KEY, listings);
    if (!ok) {
      throw new Error(
        "Storage is full — try removing an image or posting fewer photos."
      );
    }
    return listing;
  }

  function deleteListing(id) {
    var listings = getUserListings().filter(function (l) {
      return l.id !== id;
    });
    write(LISTINGS_KEY, listings);
    // also drop it from favorites if present
    var favs = getFavorites().filter(function (f) {
      return f !== id;
    });
    write(FAVORITES_KEY, favs);
  }

  /* ---------- Auth (mock) ---------- */

  function getUser() {
    var user = read(USER_KEY, null);
    if (user && !user.role) {
      user.role = "buyer";
    }
    return user;
  }

  function setUser(user) {
    if (user && !user.role) {
      user.role = "buyer";
    }
    write(USER_KEY, user);
    return user;
  }

  function logout() {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function switchRole(role) {
    var user = getUser();
    if (user) {
      user.role = role;
      setUser(user);
      return true;
    }
    return false;
  }

  /* ---------- Favorites ---------- */

  function getFavorites() {
    return read(FAVORITES_KEY, []);
  }

  function isFavorite(id) {
    return getFavorites().indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    var favs = getFavorites();
    var idx = favs.indexOf(id);
    var nowFav;
    if (idx === -1) {
      favs.push(id);
      nowFav = true;
    } else {
      favs.splice(idx, 1);
      nowFav = false;
    }
    write(FAVORITES_KEY, favs);
    return nowFav;
  }

  function favoriteCount() {
    return getFavorites().length;
  }

  // Favorite listings, in the order they were saved (newest first).
  function getFavoriteListings() {
    var favs = getFavorites();
    var out = [];
    for (var i = favs.length - 1; i >= 0; i--) {
      var l = getById(favs[i]);
      if (l) out.push(l);
    }
    return out;
  }

  return {
    getUserListings: getUserListings,
    getAllListings: getAllListings,
    getById: getById,
    addListing: addListing,
    deleteListing: deleteListing,
    getUser: getUser,
    setUser: setUser,
    logout: logout,
    switchRole: switchRole,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    favoriteCount: favoriteCount,
    getFavoriteListings: getFavoriteListings,
  };
})();
