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
        name: profile ? profile.full_name : user.user_metadata.full_name || 'User',
        role: profile ? profile.role : 'buyer'
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- Listings ---------- */

  async function getAllListings() {
    // We include seed data for now if DB is empty, or merge them.
    // In a real migration, we'd seed the DB once.
    const { data, error } = await window.supabaseClient
      .from('listings')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Supabase error:", error);
      return SEED_LISTINGS; 
    }
    
    const dbListings = data.map(l => ({
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
      isMine: false // Will be updated in UI if matches current user
    }));

    return dbListings.concat(SEED_LISTINGS);
  }

  async function getUserListings() {
    const user = await getSessionUser();
    if (!user) return [];

    const { data, error } = await window.supabaseClient
      .from('listings')
      .select('*, profiles(full_name)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(l => ({
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
  }

  async function getById(id) {
    if (String(id).startsWith('seed-')) {
      return SEED_LISTINGS.find(l => l.id === id) || null;
    }

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
      postedAt: data.created_at,
      views: data.views || 0,
      inquiries: data.inquiries_count || 0,
      isMine: user ? data.seller_id === user.id : false
    };
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
    // Simplification: In a real app, use Supabase Auth UI or proper fields
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async function logout() {
    await window.supabaseClient.auth.signOut();
  }

  async function switchRole(role) {
    const user = await getSessionUser();
    if (!user) return;
    await window.supabaseClient
      .from('profiles')
      .update({ role: role })
      .eq('id', user.id);
  }

  /* ---------- Favorites ---------- */

  async function getFavorites() {
    const user = await getSessionUser();
    if (!user) return [];
    const { data } = await window.supabaseClient
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id);
    return (data || []).map(f => f.listing_id);
  }

  async function isFavorite(id) {
    const user = await getSessionUser();
    if (!user) return false;
    const { data } = await window.supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single();
    return !!data;
  }

  async function toggleFavorite(id) {
    const user = await getSessionUser();
    if (!user) throw new Error("Log in to save items.");
    
    const favId = await isFavorite(id);
    if (favId) {
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
    const user = await getSessionUser();
    if (!user) return [];
    
    const { data } = await window.supabaseClient
      .from('favorites')
      .select('listings(*, profiles(full_name))')
      .eq('user_id', user.id);
      
    return (data || []).map(f => {
      const l = f.listings;
      return {
        ...l,
        seller: { name: l.profiles?.full_name || 'Anonymous' },
        postedAt: l.created_at
      };
    });
  }

  /* ---------- Messaging ---------- */
  
  async function getInquiries() {
    const user = await getSessionUser();
    if (!user) return [];
    
    const { data } = await window.supabaseClient
      .from('inquiries')
      .select('*, listings(title), messages(*)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });
      
    return (data || []).map(i => ({
      id: i.id,
      listingId: i.listing_id,
      listingTitle: i.listings?.title || 'Unknown Item',
      buyerName: 'Buyer', // In real app, fetch profile
      messages: i.messages.map(m => ({
        sender: m.sender_id === user.id ? 'me' : 'them',
        text: m.content,
        time: m.created_at
      }))
    }));
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
    addListing,
    updateListing,
    deleteListing,
    getInquiries,
    sendMessage,
    getUser: getSessionUser,
    logout,
    switchRole,
    getFavorites,
    isFavorite,
    toggleFavorite,
    favoriteCount,
    getFavoriteListings,
  };
})();
