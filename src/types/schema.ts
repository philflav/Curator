export type Category = 
  | 'Furniture'
  | 'Ceramics & Porcelain' 
  | 'Fine Art' 
  | 'Glass' 
  | 'Clocks & Watches' 
  | 'Metalware' 
  | 'Other';

export const CATEGORIES: Category[] = [
  'Furniture',
  'Ceramics & Porcelain',
  'Fine Art',
  'Glass',
  'Clocks & Watches',
  'Metalware',
  'Other',
];

export const DEFAULT_SUBCATEGORIES: Record<Category, string[]> = {
  'Ceramics & Porcelain': [
    'Chinese',
    'Doulton Lambeth',
    'Japanese',
    'Moorcroft',
    'Oriental',
  ],
  'Furniture': ['Cabinets & Bookcases', 'Chests', 'Clocks & Mirrors', 'Seating', 'Tables'],
  'Glass': ['Art Glass', 'Carnival Glass', 'Cut Crystal', 'Stained Glass'],
  'Clocks & Watches': ['Bracket Clocks', 'Carriage Clocks', 'Longcase / Grandfather', 'Pocket Watches', 'Wristwatches'],
  'Fine Art': ['Oil Paintings', 'Prints & Lithographs', 'Sculpture', 'Watercolors'],
  'Metalware': ['Bronze & Brass', 'Cast Iron', 'Pewter', 'Silver & Silverplate'],
  'Other': ['Books & Ephemera', 'Collectibles', 'Jewelry', 'Textiles'],
};

export type Condition = 'Mint' | 'Excellent' | 'Good' | 'Fair' | 'Restored' | 'Damaged';

export const CONDITIONS: Condition[] = [
  'Mint',
  'Excellent',
  'Good',
  'Fair',
  'Restored',
  'Damaged',
];

export interface ItemImageSummary {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'overview' | 'maker_mark' | 'signature' | 'damage_detail' | 'certificate';
  description?: string;
  createdAt: number;
}

export interface Item {
  id: string; // UUID v4
  title: string;
  category: Category;
  subcategory?: string; // e.g. "Japanese", "Moorcroft", "Doulton Lambeth"
  maker?: string; // e.g. "Royal Doulton", "Moorcroft"
  modelOrPattern?: string; // e.g. "HN 2106", "Blue Fluted"
  periodOrYear?: string; // e.g. "c. 1930", "1954"
  condition: Condition;
  conditionNotes?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    unit: 'cm' | 'in';
  };
  acquisitionDate?: string;
  acquisitionCost?: number;
  acquisitionLocation?: string; // e.g. "Portobello Road Market, London"
  currency: 'GBP' | 'USD' | 'EUR';
  estimatedValue?: number;
  description?: string; // Freeform comprehensive item description
  notes?: string;
  primaryImageUrl?: string;
  images?: ItemImageSummary[];
  createdAt: number;
  updatedAt: number;
}
