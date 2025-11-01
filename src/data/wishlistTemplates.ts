// Pre-made wishlist templates for different event types

export interface TemplateItem {
  name: string;
  description: string;
  price_min?: number;
  price_max?: number;
  category: string;
  priority: number;
}

export interface WishlistTemplate {
  id: string;
  name: string;
  event_type: string;
  description: string;
  items: TemplateItem[];
}

export const wishlistTemplates: WishlistTemplate[] = [
  {
    id: "wedding-registry",
    name: "Wedding Registry",
    event_type: "wedding",
    description: "Complete wedding registry with essentials for your new home together",
    items: [
      { name: "Wedding Dress", description: "Dream wedding gown", price_min: 200000, price_max: 1000000, category: "Attire", priority: 3 },
      { name: "Wedding Rings", description: "Matching wedding bands", price_min: 100000, price_max: 500000, category: "Jewelry", priority: 3 },
      { name: "Honeymoon Fund", description: "Help us create memories on our honeymoon", price_min: 10000, price_max: 500000, category: "Cash Fund", priority: 3 },
      { name: "Kitchen Aid Mixer", description: "Professional stand mixer", price_min: 80000, price_max: 150000, category: "Kitchen", priority: 2 },
      { name: "Bedding Set (Queen)", description: "Luxury bed sheets and comforter", price_min: 30000, price_max: 80000, category: "Bedroom", priority: 2 },
      { name: "Cookware Set", description: "Complete non-stick cookware", price_min: 40000, price_max: 100000, category: "Kitchen", priority: 2 },
      { name: "Dining Table Set", description: "6-seater dining table with chairs", price_min: 100000, price_max: 300000, category: "Furniture", priority: 2 },
      { name: "Coffee Maker", description: "Automatic coffee machine", price_min: 20000, price_max: 60000, category: "Kitchen", priority: 1 },
      { name: "Blender", description: "High-speed blender", price_min: 15000, price_max: 40000, category: "Kitchen", priority: 1 },
      { name: "Towel Set", description: "Bath towels and hand towels", price_min: 10000, price_max: 25000, category: "Bathroom", priority: 1 },
    ],
  },
  {
    id: "baby-shower",
    name: "Baby Shower Essentials",
    event_type: "baby_shower",
    description: "Everything you need to welcome your new bundle of joy",
    items: [
      { name: "Baby Crib", description: "Convertible crib with mattress", price_min: 80000, price_max: 200000, category: "Nursery", priority: 3 },
      { name: "Stroller", description: "All-terrain stroller", price_min: 50000, price_max: 150000, category: "Transport", priority: 3 },
      { name: "Car Seat", description: "Infant car seat", price_min: 40000, price_max: 100000, category: "Transport", priority: 3 },
      { name: "Baby Monitor", description: "Video baby monitor with night vision", price_min: 25000, price_max: 60000, category: "Safety", priority: 2 },
      { name: "Diaper Bag", description: "Large capacity diaper backpack", price_min: 15000, price_max: 35000, category: "Accessories", priority: 2 },
      { name: "Baby Clothes Set", description: "Onesies, sleepers, and outfits (0-12 months)", price_min: 20000, price_max: 50000, category: "Clothing", priority: 2 },
      { name: "Bottles & Sterilizer Set", description: "Baby bottles with electric sterilizer", price_min: 15000, price_max: 35000, category: "Feeding", priority: 2 },
      { name: "Baby Swing", description: "Automatic baby swing with music", price_min: 20000, price_max: 50000, category: "Nursery", priority: 1 },
      { name: "Changing Table", description: "Changing table with storage", price_min: 30000, price_max: 70000, category: "Nursery", priority: 1 },
      { name: "Baby Bathtub", description: "Infant bathtub with support", price_min: 5000, price_max: 15000, category: "Bath", priority: 1 },
    ],
  },
  {
    id: "birthday-milestone",
    name: "Milestone Birthday",
    event_type: "birthday",
    description: "Celebrate a special birthday with meaningful gifts",
    items: [
      { name: "Laptop/Tablet", description: "For work or entertainment", price_min: 100000, price_max: 500000, category: "Electronics", priority: 3 },
      { name: "Smartwatch", description: "Fitness tracking smartwatch", price_min: 50000, price_max: 150000, category: "Electronics", priority: 3 },
      { name: "Designer Bag", description: "Luxury handbag or backpack", price_min: 80000, price_max: 300000, category: "Fashion", priority: 2 },
      { name: "Wireless Headphones", description: "Noise-cancelling headphones", price_min: 30000, price_max: 80000, category: "Electronics", priority: 2 },
      { name: "Perfume/Cologne", description: "Signature fragrance", price_min: 20000, price_max: 60000, category: "Beauty", priority: 2 },
      { name: "Watch", description: "Classic wristwatch", price_min: 50000, price_max: 200000, category: "Accessories", priority: 2 },
      { name: "Books Set", description: "Collection of favorite books", price_min: 10000, price_max: 30000, category: "Entertainment", priority: 1 },
      { name: "Spa Day Voucher", description: "Full spa treatment package", price_min: 20000, price_max: 50000, category: "Experience", priority: 1 },
      { name: "Gym Membership", description: "Annual gym membership", price_min: 30000, price_max: 100000, category: "Health", priority: 1 },
      { name: "Concert/Event Tickets", description: "Tickets to favorite artist or event", price_min: 15000, price_max: 50000, category: "Experience", priority: 1 },
    ],
  },
  {
    id: "housewarming",
    name: "Housewarming Party",
    event_type: "other",
    description: "Help furnish and decorate a new home",
    items: [
      { name: "Sofa Set", description: "3-seater sofa with accent chair", price_min: 150000, price_max: 500000, category: "Furniture", priority: 3 },
      { name: "Refrigerator", description: "Double-door refrigerator", price_min: 150000, price_max: 400000, category: "Appliances", priority: 3 },
      { name: "Washing Machine", description: "Front-load washing machine", price_min: 100000, price_max: 300000, category: "Appliances", priority: 3 },
      { name: "TV", description: "Smart TV 55 inches or larger", price_min: 150000, price_max: 500000, category: "Electronics", priority: 2 },
      { name: "Dining Table", description: "Dining table with 6 chairs", price_min: 80000, price_max: 200000, category: "Furniture", priority: 2 },
      { name: "Microwave Oven", description: "Countertop microwave", price_min: 25000, price_max: 60000, category: "Appliances", priority: 2 },
      { name: "Vacuum Cleaner", description: "Cordless vacuum cleaner", price_min: 30000, price_max: 80000, category: "Appliances", priority: 2 },
      { name: "Wall Art Set", description: "Canvas prints or framed art", price_min: 20000, price_max: 50000, category: "Decor", priority: 1 },
      { name: "Plants", description: "Indoor plants with pots", price_min: 5000, price_max: 20000, category: "Decor", priority: 1 },
      { name: "Kitchen Utensils Set", description: "Complete cooking utensils", price_min: 10000, price_max: 30000, category: "Kitchen", priority: 1 },
    ],
  },
  {
    id: "graduation",
    name: "Graduation Celebration",
    event_type: "graduation",
    description: "Gifts to start the next chapter of life",
    items: [
      { name: "Laptop", description: "For work or further studies", price_min: 150000, price_max: 500000, category: "Electronics", priority: 3 },
      { name: "Professional Attire", description: "Business suits or work clothes", price_min: 50000, price_max: 150000, category: "Fashion", priority: 3 },
      { name: "Career Fund", description: "Help with job search or starting career", price_min: 10000, price_max: 200000, category: "Cash Fund", priority: 3 },
      { name: "Briefcase/Professional Bag", description: "Leather briefcase or laptop bag", price_min: 20000, price_max: 60000, category: "Accessories", priority: 2 },
      { name: "Smartphone", description: "Latest smartphone", price_min: 100000, price_max: 300000, category: "Electronics", priority: 2 },
      { name: "Professional Photo Session", description: "Headshots for LinkedIn/CV", price_min: 15000, price_max: 40000, category: "Service", priority: 2 },
      { name: "Books (Career Development)", description: "Professional development books", price_min: 10000, price_max: 30000, category: "Books", priority: 1 },
      { name: "Watch", description: "Professional wristwatch", price_min: 30000, price_max: 100000, category: "Accessories", priority: 1 },
      { name: "Wallet/Card Holder", description: "Leather wallet or card holder", price_min: 10000, price_max: 30000, category: "Accessories", priority: 1 },
      { name: "Travel Fund", description: "Celebration trip after graduation", price_min: 20000, price_max: 200000, category: "Cash Fund", priority: 1 },
    ],
  },
];

export const getTemplateById = (id: string): WishlistTemplate | undefined => {
  return wishlistTemplates.find((template) => template.id === id);
};

export const getTemplatesByEventType = (eventType: string): WishlistTemplate[] => {
  return wishlistTemplates.filter((template) => template.event_type === eventType);
};

