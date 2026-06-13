/* =========================================================
   Bayansell — store (Supabase Cloud Layer)
   ========================================================= */

var Store = (function () {
  
  // Internal helper to get current session user
  async function getSessionUser() {
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;
      
      // Get profile role
      const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
        
      return {
        id: user.id,
        email: user.email,
        name: (profile && profile.full_name) ||
              (user.user_metadata && user.user_metadata.full_name) ||
              (user.email ? user.email.split('@')[0] : 'User'),
        role: (profile && profile.role) || 'buyer'
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- Listings ---------- */

  async function getAllListings() {
    try {
      const { data, error } = await window.supabaseClient
        .from('listings')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Supabase error:", error);
        return window.SEED_LISTINGS || []; 
      }
      
      const dbListings = (data || []).map(l => ({
        id: l.id,
        title: l.title,
        category: l.category,
        price: Number(l.price),
        condition: l.condition,
        location: l.location,
        description: l.description,
        images: l.images || [],
        seller: { name: l.profiles?.full_name || 'Anonymous' },
        postedAt: l.created_at,
        views: l.views || 0,
        inquiries: l.inquiries_count || 0,
        isMine: false
      }));

      return dbListings.concat(window.SEED_LISTINGS || []);
    } catch (e) {
      console.error("Critical error in getAllListings:", e);
      return window.SEED_LISTINGS || [];
    }
  }

  async function getUserListings() {
    const user = await getSessionUser();
    if (!user) return [];

    try {
      const { data, error } = await window.supabaseClient
        .from('listings')
        .select('*, profiles(full_name)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map(l => ({
        id: l.id,
        title: l.title,
        category: l.category,
        price: Number(l.price),
        condition: l.condition,
        location: l.location,
        description: l.description,
        images: l.images || [],
        seller: { name: user.name },
        postedAt: l.created_at,
        views: l.views || 0,
        inquiries: l.inquiries_count || 0,
        isMine: true
      }));
    } catch (e) {
      return [];
    }
  }

  async function getById(id) {
    if (String(id).startsWith('seed-')) {
      return (window.SEED_LISTINGS || []).find(l => l.id === id) || null;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('listings')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single();
      
      if (error) return null;
      const user = await getSessionUser();

      return {
        id: data.id,
        title: data.title,
        category: data.category,
        price: Number(data.price),
        condition: data.condition,
        location: data.location,
        description: data.description,
        images: data.images || [],
        seller: { name: data.profiles?.full_name || 'Anonymous' },
        sellerId: data.seller_id,
        postedAt: data.created_at,
        views: data.views || 0,
        inquiries: data.inquiries_count || 0,
        isMine: user ? data.seller_id === user.id : false
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- Image uploads (Supabase Storage) ---------- */

  // Uploads a compressed image blob to the listing-images bucket under the
  // current user's folder and returns its public URL.
  async function uploadImage(blob) {
    const user = await getSessionUser();
    if (!user) throw new Error("Log in to upload photos.");

    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 9) + '.' + ext;

    const { error } = await window.supabaseClient.storage
      .from('listing-images')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '3600', upsert: false });
    if (error) throw error;

    const { data } = window.supabaseClient.storage.from('listing-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function addListing(data) {
    const user = await getSessionUser();
    if (!user) throw new Error("Log in to post.");

    const { data: listing, error } = await window.supabaseClient
      .from('listings')
      .insert([{
        seller_id: user.id,
        title: data.title,
        category: data.category,
        price: Number(data.price),
        condition: data.condition,
        location: data.location,
        description: data.description,
        images: data.images
      }])
      .select()
      .single();

    if (error) throw error;
    return listing;
  }

  async function updateListing(id, data) {
    const { error } = await window.supabaseClient
      .from('listings')
      .update({
        title: data.title,
        category: data.category,
        price: Number(data.price),
        condition: data.condition,
        location: data.location,
        description: data.description,
        images: data.images
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async function deleteListing(id) {
    const { error } = await window.supabaseClient
      .from('listings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  /* ---------- Auth ---------- */

  async function login(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  // Returns { user, needsConfirmation } — needsConfirmation is true when the
  // project requires email verification before the first login.
  async function signup(name, email, password, role) {
    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: role } },
    });
    if (error) throw error;
    return { user: data.user, needsConfirmation: !data.session };
  }

  async function logout() {
    await window.supabaseClient.auth.signOut();
  }

  async function switchRole(role) {
    const user = await getSessionUser();
    if (!user) return;
    const { error } = await window.supabaseClient
      .from('profiles')
      .upsert({ id: user.id, full_name: user.name, role: role });
    if (error) throw error;
  }

  /* ---------- Favorites ---------- */
  // Seed (demo) listings aren't rows in the database — their ids are not
  // UUIDs — so favorites for them live in localStorage. Real listings are
  // saved in the favorites table.

  var SEED_FAVS_KEY = "bayansell:seedfavs:v1";

  function isSeedId(id) {
    return String(id).indexOf("seed-") === 0;
  }

  function getSeedFavs() {
    try {
      return JSON.parse(localStorage.getItem(SEED_FAVS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function setSeedFavs(favs) {
    try {
      localStorage.setItem(SEED_FAVS_KEY, JSON.stringify(favs));
    } catch (e) { /* ignore */ }
  }

  async function getFavorites() {
    const seedFavs = getSeedFavs();
    const user = await getSessionUser();
    if (!user) return seedFavs;
    try {
      const { data } = await window.supabaseClient
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);
      return seedFavs.concat((data || []).map(f => f.listing_id));
    } catch (e) {
      return seedFavs;
    }
  }

  async function isFavorite(id) {
    if (isSeedId(id)) return getSeedFavs().indexOf(id) !== -1;
    const user = await getSessionUser();
    if (!user) return false;
    try {
      const { data } = await window.supabaseClient
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single();
      return !!data;
    } catch (e) {
      return false;
    }
  }

  async function toggleFavorite(id) {
    if (isSeedId(id)) {
      const favs = getSeedFavs();
      const idx = favs.indexOf(id);
      if (idx === -1) favs.push(id);
      else favs.splice(idx, 1);
      setSeedFavs(favs);
      return idx === -1;
    }

    const user = await getSessionUser();
    if (!user) throw new Error("Log in to save items.");

    const favExists = await isFavorite(id);
    if (favExists) {
      await window.supabaseClient.from('favorites').delete().eq('user_id', user.id).eq('listing_id', id);
      return false;
    } else {
      await window.supabaseClient.from('favorites').insert([{ user_id: user.id, listing_id: id }]);
      return true;
    }
  }

  async function favoriteCount() {
    const favs = await getFavorites();
    return favs.length;
  }

  async function getFavoriteListings() {
    const seeds = (window.SEED_LISTINGS || []).filter(l => getSeedFavs().indexOf(l.id) !== -1);
    const user = await getSessionUser();
    if (!user) return seeds;

    try {
      const { data } = await window.supabaseClient
        .from('favorites')
        .select('listings(*, profiles(full_name))')
        .eq('user_id', user.id);

      const dbFavs = (data || []).map(f => {
        const l = f.listings;
        if (!l) return null;
        return {
          ...l,
          seller: { name: l.profiles?.full_name || 'Anonymous' },
          postedAt: l.created_at
        };
      }).filter(Boolean);

      return dbFavs.concat(seeds);
    } catch (e) {
      return seeds;
    }
  }

  /* ---------- Messaging ---------- */
  
  async function getInquiries() {
    const user = await getSessionUser();
    if (!user) return [];

    try {
      const { data } = await window.supabaseClient
        .from('inquiries')
        .select('*, listings(title), messages(*), buyer:profiles!inquiries_buyer_id_fkey(full_name)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .order('created_at', { referencedTable: 'messages', ascending: true });

      return (data || []).map(i => ({
        id: i.id,
        listingId: i.listing_id,
        listingTitle: i.listings?.title || 'Unknown Item',
        buyerName: i.buyer?.full_name || 'Buyer',
        messages: (i.messages || []).map(m => ({
          sender: m.sender_id === user.id ? 'me' : 'them',
          text: m.content,
          time: m.created_at
        }))
      }));
    } catch (e) {
      return [];
    }
  }

  // Starts a conversation about a listing with its first message.
  async function createInquiry(listingId, sellerId, text) {
    const user = await getSessionUser();
    if (!user) throw new Error("Log in to message sellers.");

    const { data: inquiry, error } = await window.supabaseClient
      .from('inquiries')
      .insert([{ listing_id: listingId, buyer_id: user.id, seller_id: sellerId }])
      .select()
      .single();
    if (error) throw error;

    await sendMessage(inquiry.id, text);
    return inquiry;
  }

  async function sendMessage(inquiryId, text) {
     const user = await getSessionUser();
     if (!user) return;
     await window.supabaseClient.from('messages').insert([{
       inquiry_id: inquiryId,
       sender_id: user.id,
       content: text
     }]);
  }

  return {
    getUserListings,
    getAllListings,
    getById,
    uploadImage,
    addListing,
    updateListing,
    deleteListing,
    getInquiries,
    createInquiry,
    sendMessage,
    getUser: getSessionUser,
    login,
    signup,
    logout,
    switchRole,
    getFavorites,
    isFavorite,
    toggleFavorite,
    favoriteCount,
    getFavoriteListings,
  };
})();
