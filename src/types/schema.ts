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
    'Japanese',
    'Chinese',
    'Oriental',
    'Doulton Lambeth',
    'Moorcroft',
  ],
  'Furniture': ['Seating', 'Tables', 'Cabinets & Bookcases', 'Chests', 'Clocks & Mirrors'],
  'Glass': ['Art Glass', 'Cut Crystal', 'Stained Glass', 'Carnival Glass'],
  'Clocks & Watches': ['Bracket Clocks', 'Longcase / Grandfather', 'Carriage Clocks', 'Pocket Watches', 'Wristwatches'],
  'Fine Art': ['Oil Paintings', 'Watercolors', 'Prints & Lithographs', 'Sculpture'],
  'Metalware': ['Silver & Silverplate', 'Bronze & Brass', 'Pewter', 'Cast Iron'],
  'Other': ['Textiles', 'Books & Ephemera', 'Jewelry', 'Collectibles'],
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
