/* =========================================================
   Bayansell — store (localStorage layer)
   Exposes global: Store
   ========================================================= */

var Store = (function () {
  var LISTINGS_KEY = "bayansell:listings:v1";
  var FAVORITES_KEY = "bayansell:favorites:v1";
  var USER_KEY = "bayansell:user:v1";
  var INQUIRIES_KEY = "bayansell:inquiries:v1";

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
    var listings = read(LISTINGS_KEY, []);
    // Ensure all listings have mock engagement fields
    var updated = false;
    listings.forEach(function(l) {
      if (l.views === undefined) {
        l.views = Math.floor(Math.random() * 150) + 10;
        l.inquiries = Math.floor(l.views * (Math.random() * 0.15));
        updated = true;
      }
    });
    if (updated) write(LISTINGS_KEY, listings);
    return listings;
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
      views: 0,
      inquiries: 0
    };
    var listings = read(LISTINGS_KEY, []);
    listings.unshift(listing);
    var ok = write(LISTINGS_KEY, listings);
    if (!ok) {
      throw new Error(
        "Storage is full — try removing an image or posting fewer photos."
      );
    }
    return listing;
  }

  function updateListing(id, data) {
    var listings = read(LISTINGS_KEY, []);
    var idx = -1;
    for (var i = 0; i < listings.length; i++) {
      if (listings[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return null;
    
    var original = listings[idx];
    listings[idx] = {
      ...original,
      title: data.title,
      category: data.category,
      price: Number(data.price),
      condition: data.condition,
      location: data.location,
      description: data.description,
      images: data.images && data.images.length ? data.images : original.images
    };
    
    write(LISTINGS_KEY, listings);
    return listings[idx];
  }

  function deleteListing(id) {
    var listings = read(LISTINGS_KEY, []).filter(function (l) {
      return l.id !== id;
    });
    write(LISTINGS_KEY, listings);
    // also drop it from favorites if present
    var favs = getFavorites().filter(function (f) {
      return f !== id;
    });
    write(FAVORITES_KEY, favs);
    
    // Also clean up inquiries
    var inqs = read(INQUIRIES_KEY, []);
    var filteredInqs = inqs.filter(function(i) { return i.listingId !== id; });
    write(INQUIRIES_KEY, filteredInqs);
  }

  /* ---------- Inquiries / Messaging ---------- */

  var MOCK_QUESTIONS = [
    "Hi, is this still available?",
    "Can we meet at Newport City?",
    "Is the price negotiable?",
    "I'm interested. What's the last price?",
    "Does it come with the box?",
    "When can I pick this up?",
    "Is there any defect?",
    "Still available?"
  ];
  
  var MOCK_NAMES = ["Juan", "Maria", "Jerome", "Alyssa", "Kevin", "Patricia", "Mark"];

  function getInquiries() {
    var inqs = read(INQUIRIES_KEY, []);
    var listings = getUserListings();
    
    // If we have listings but no inquiries, generate some mock ones
    if (listings.length > 0 && inqs.length === 0) {
      listings.forEach(function(l) {
        var count = Math.floor(Math.random() * 3) + 1;
        for (var i = 0; i < count; i++) {
          var id = "inq-" + Math.random().toString(36).slice(2, 9);
          var name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
          inqs.push({
            id: id,
            listingId: l.id,
            listingTitle: l.title,
            buyerName: name,
            messages: [
              { sender: "buyer", text: MOCK_QUESTIONS[Math.floor(Math.random() * MOCK_QUESTIONS.length)], time: new Date(Date.now() - Math.random() * 86400000).toISOString() }
            ]
          });
        }
      });
      write(INQUIRIES_KEY, inqs);
    }
    
    // Sort inquiries by latest message time
    inqs.sort(function(a, b) {
      var timeA = new Date(a.messages[a.messages.length - 1].time);
      var timeB = new Date(b.messages[b.messages.length - 1].time);
      return timeB - timeA;
    });
    
    return inqs;
  }

  function sendMessage(inquiryId, text) {
    var inqs = read(INQUIRIES_KEY, []);
    var idx = -1;
    for (var i = 0; i < inqs.length; i++) {
      if (inqs[i].id === inquiryId) { idx = i; break; }
    }
    if (idx === -1) return;

    inqs[idx].messages.push({
      sender: "seller",
      text: text,
      time: new Date().toISOString()
    });
    write(INQUIRIES_KEY, inqs);

    // Auto-reply
    var replies = ["Alright sweet!", "Got it, thanks!", "Sure, deal", "Sounds good.", "Okay, see you then!", "Thanks for the info."];
    setTimeout(function() {
      var freshInqs = read(INQUIRIES_KEY, []);
      var freshIdx = -1;
      for (var j = 0; j < freshInqs.length; j++) {
        if (freshInqs[j].id === inquiryId) { freshIdx = j; break; }
      }
      if (freshIdx !== -1) {
        freshInqs[freshIdx].messages.push({
          sender: "buyer",
          text: replies[Math.floor(Math.random() * replies.length)],
          time: new Date().toISOString()
        });
        write(INQUIRIES_KEY, freshInqs);
        // Dispatch event for UI update if on dashboard
        window.dispatchEvent(new CustomEvent('bayansell:new-message', { detail: { inquiryId: inquiryId } }));
      }
    }, 2500);
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
    updateListing: updateListing,
    deleteListing: deleteListing,
    getInquiries: getInquiries,
    sendMessage: sendMessage,
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
