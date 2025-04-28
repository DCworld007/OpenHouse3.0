export interface Listing {
  id: string;
  price: number;
  address: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  openHouse?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  visitDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  order: number;
  cardType: 'where' | 'what';
  reactions?: Array<{
    type: 'thumbsUp' | 'thumbsDown';
    userId: string;
  }>;
  lat?: number;
  lng?: number;
}

export interface ListingGroup {
  id: string;
  name: string;
  type: 'date' | 'custom';
  date: string;
  order: number;
  listings: Listing[];
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