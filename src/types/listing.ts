export interface Listing {
  id: string;
  content: string;
  notes?: string;
  cardType: 'what' | 'where';
  userId: string;
  createdAt: string;
  updatedAt: string;
  lat?: number;
  lng?: number;
}

export interface ListingGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isArchived?: boolean;
}

export interface ImportedListingData {
  price?: number;
  content: string;
  imageUrl?: string;
  openHouse?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  notes?: string;
  cardType: 'where' | 'what';
} 