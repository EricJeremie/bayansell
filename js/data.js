/* =========================================================
   Bayansell — seed data
   Exposes globals: CATEGORIES, PH_CITIES, CONDITIONS, SEED_LISTINGS
   ========================================================= */

var CATEGORIES = [
  "Electronics",
  "Mobile Phones",
  "Fashion",
  "Home & Living",
  "Furniture",
  "Appliances",
  "Vehicles",
  "Hobbies & Games",
  "Sports",
  "Books",
];

var PH_CITIES = [
  "Manila",
  "Quezon City",
  "Makati",
  "Taguig",
  "Pasig",
  "Cebu City",
  "Davao City",
  "Iloilo City",
  "Baguio City",
  "Cagayan de Oro",
];

var CONDITIONS = ["Brand new", "Like new", "Used"];

// Helper to build an Unsplash URL at a given width.
function img(id, w) {
  return (
    "https://images.unsplash.com/photo-" +
    id +
    "?auto=format&fit=crop&w=" +
    (w || 800) +
    "&q=80"
  );
}

var SEED_LISTINGS = [
  {
    id: "seed-1",
    title: "iPhone 14 Pro 256GB — Deep Purple",
    category: "Mobile Phones",
    price: 48500,
    condition: "Like new",
    location: "Makati",
    description:
      "Selling my iPhone 14 Pro, 256GB in Deep Purple. Battery health at 94%. Comes with original box, cable, and a clear case. No scratches, screen protector on since day one. Smoke-free home. Meet-up at any mall in Makati or BGC.",
    images: [img("1678685888221-cda773a3dcdb"), img("1632661674596-df8be070a5c5"), img("1591337676887-a217a6970a8a")],
    seller: { name: "Andrea Reyes" },
    postedAt: "2026-06-09T10:20:00+08:00",
  },
  {
    id: "seed-2",
    title: "MacBook Air M2 — 8GB / 256GB",
    category: "Electronics",
    price: 52000,
    condition: "Like new",
    location: "Quezon City",
    description:
      "Midnight MacBook Air M2. Only 38 charge cycles. Perfect for students and work-from-home. Includes original 30W charger and a snap-on case. Meet-up near Trinoma or Gateway.",
    images: [img("1611186871348-b1ce696e52c9"), img("1517336714731-489689fd1ca8")],
    seller: { name: "Paolo Garcia" },
    postedAt: "2026-06-08T15:00:00+08:00",
  },
  {
    id: "seed-3",
    title: "Nike Air Jordan 1 Retro High — US 9",
    category: "Fashion",
    price: 7800,
    condition: "Used",
    location: "Cebu City",
    description:
      "Authentic AJ1 in Chicago colorway, US size 9. Worn a handful of times, 8/10 condition. Light creasing on the toe box. No box. Legit-checked. COD around Cebu City or ship nationwide via LBC.",
    images: [img("1542291026-7eec264c27ff"), img("1600269452121-4f2416e55c28")],
    seller: { name: "Mark Villanueva" },
    postedAt: "2026-06-09T08:45:00+08:00",
  },
  {
    id: "seed-4",
    title: "Sony A6400 Mirrorless + 16-50mm Kit",
    category: "Electronics",
    price: 34000,
    condition: "Used",
    location: "Pasig",
    description:
      "Sony A6400 with kit lens. Great for vlogging and travel. Shutter count under 6k. Includes 2 batteries, 64GB SD card, and camera bag. Meet-up at Ortigas or Eastwood.",
    images: [img("1502920917128-1aa500764cbd"), img("1516035069371-29a1b244cc32"), img("1519183071298-a2962feb14f4")],
    seller: { name: "Liza Mendoza" },
    postedAt: "2026-06-07T19:30:00+08:00",
  },
  {
    id: "seed-5",
    title: "3-Seater Fabric Sofa — Light Grey",
    category: "Furniture",
    price: 9500,
    condition: "Used",
    location: "Taguig",
    description:
      "Comfortable 3-seater sofa, light grey fabric. Minor wear but very sturdy frame. Moving out sale, need it gone this week. Buyer arranges pickup/lalamove from BGC.",
    images: [img("1555041469-a586c61ea9bc"), img("1567538096630-e0c55bd6374c")],
    seller: { name: "Carlo Aquino" },
    postedAt: "2026-06-06T12:10:00+08:00",
  },
  {
    id: "seed-6",
    title: "Trek Marlin 7 Mountain Bike — 29er",
    category: "Sports",
    price: 21000,
    condition: "Like new",
    location: "Baguio City",
    description:
      "Trek Marlin 7, size M, 29-inch wheels. Hydraulic disc brakes, upgraded saddle and pedals. Perfect for Baguio trails and city commutes. Barely used, kept indoors.",
    images: [img("1485965120184-e220f721d03e"), img("1532298229144-0ec0c57515c7")],
    seller: { name: "Miguel Cruz" },
    postedAt: "2026-06-08T07:15:00+08:00",
  },
  {
    id: "seed-7",
    title: "PlayStation 5 Slim Disc Edition",
    category: "Hobbies & Games",
    price: 27500,
    condition: "Brand new",
    location: "Manila",
    description:
      "Brand new, sealed PS5 Slim Disc Edition. Bought from an official store, with warranty and receipt. Includes 1 DualSense controller. Selling because I received a duplicate gift. Meet-up at SM Manila or ship.",
    images: [img("1606813907291-d86efa9b94db"), img("1607853202273-797f1c22a38e")],
    seller: { name: "Kim Bautista" },
    postedAt: "2026-06-09T13:40:00+08:00",
  },
  {
    id: "seed-8",
    title: "Acoustic Guitar — Fender CD-60S",
    category: "Hobbies & Games",
    price: 6200,
    condition: "Used",
    location: "Davao City",
    description:
      "Fender CD-60S dreadnought acoustic. Warm tone, solid spruce top. Comes with gig bag, capo, and extra strings. Small scratch on the back, plays perfectly. Meet-up around Davao City.",
    images: [img("1510915361894-db8b60106cb1"), img("1550985616-10810253b84d")],
    seller: { name: "Jasmine Lim" },
    postedAt: "2026-06-05T16:50:00+08:00",
  },
  {
    id: "seed-9",
    title: "Dyson V11 Cordless Vacuum",
    category: "Appliances",
    price: 18500,
    condition: "Like new",
    location: "Makati",
    description:
      "Dyson V11 with all original attachments and wall dock. Strong suction, battery still excellent. Great for condos with pets. Lightly used, complete set with box.",
    images: [img("1558317374-067fb5f30001"), img("1585515320310-259814833e62")],
    seller: { name: "Rina Tan" },
    postedAt: "2026-06-07T09:05:00+08:00",
  },
  {
    id: "seed-10",
    title: "Toyota Vios 1.3 XLE 2020 (CVT)",
    category: "Vehicles",
    price: 615000,
    condition: "Used",
    location: "Cagayan de Oro",
    description:
      "2020 Toyota Vios 1.3 XLE, automatic. 42,000 km, casa-maintained with complete records. Fresh registration, all-power, dual airbags. First owner, no accident history. Serious buyers only.",
    images: [img("1503376780353-7e6692767b70"), img("1549399542-7e3f8b79c341")],
    seller: { name: "Juan dela Cruz" },
    postedAt: "2026-06-04T11:25:00+08:00",
  },
  {
    id: "seed-11",
    title: "Uniqlo & Zara Bundle — Women's M",
    category: "Fashion",
    price: 1800,
    condition: "Like new",
    location: "Iloilo City",
    description:
      "Preloved bundle of 8 pieces (Uniqlo, Zara, H&M), size M. Tops, a blazer, and 2 dresses. All clean and in great shape. Take all for ₱1,800. Ship nationwide.",
    images: [img("1483985988355-763728e1935b"), img("1490481651871-ab68de25d43d")],
    seller: { name: "Bea Ramos" },
    postedAt: "2026-06-08T18:20:00+08:00",
  },
  {
    id: "seed-12",
    title: "Monstera Deliciosa in Ceramic Pot",
    category: "Home & Living",
    price: 950,
    condition: "Brand new",
    location: "Quezon City",
    description:
      "Healthy, well-established Monstera Deliciosa with big fenestrated leaves, in a matte white ceramic pot. Adds instant life to any space. Pickup in QC or same-day delivery via Grab.",
    images: [img("1485955900006-10f4d324d411"), img("1463320726281-696a485928c7")],
    seller: { name: "Maria Santos" },
    postedAt: "2026-06-09T07:30:00+08:00",
  },
  {
    id: "seed-13",
    title: "Apple Watch Series 8 GPS 45mm",
    category: "Electronics",
    price: 14500,
    condition: "Like new",
    location: "Pasig",
    description:
      "Apple Watch Series 8, 45mm Midnight aluminum. Battery health 96%. Comes with 2 extra straps and original box. Always used with a screen protector. Meet-up Ortigas area.",
    images: [img("1523275335684-37898b6baf30"), img("1546868871-7041f2a55e12")],
    seller: { name: "Andrea Reyes" },
    postedAt: "2026-06-06T20:00:00+08:00",
  },
  {
    id: "seed-14",
    title: "Ergonomic Office Chair — Mesh Back",
    category: "Furniture",
    price: 4200,
    condition: "Used",
    location: "Cebu City",
    description:
      "Mesh-back ergonomic office chair with adjustable lumbar support, armrests, and tilt lock. Very comfortable for long WFH hours. Smooth casters. Pickup in Cebu City.",
    images: [img("1580480055273-228ff5388ef8"), img("1598300042247-d088f8ab3a91")],
    seller: { name: "Carlo Aquino" },
    postedAt: "2026-06-05T14:15:00+08:00",
  },
  {
    id: "seed-15",
    title: "Harry Potter Complete Box Set (7 Books)",
    category: "Books",
    price: 2500,
    condition: "Like new",
    location: "Manila",
    description:
      "Complete Harry Potter paperback box set, all 7 books. Read once, kept in a smoke-free, dust-free shelf. Box has minor shelf wear. Great gift. Ship nationwide or meet-up in Manila.",
    images: [img("1512820790803-83ca734da794"), img("1495446815901-a7297e633e8d")],
    seller: { name: "Jasmine Lim" },
    postedAt: "2026-06-07T17:45:00+08:00",
  },
  {
    id: "seed-16",
    title: "Samsung 43\" Crystal UHD 4K Smart TV",
    category: "Appliances",
    price: 16800,
    condition: "Brand new",
    location: "Davao City",
    description:
      "Brand new, still in box. Samsung 43-inch Crystal UHD 4K Smart TV with HDR and built-in apps. Won it in a raffle, no use for a second TV. With official warranty. Meet-up or deliver around Davao.",
    images: [img("1593359677879-a4bb92f829d1"), img("1461151304267-38535e780c79")],
    seller: { name: "Kim Bautista" },
    postedAt: "2026-06-08T10:55:00+08:00",
  },
];
