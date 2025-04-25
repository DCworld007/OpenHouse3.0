export interface Location {
  lat: number;
  lng: number;
  address: string;
  notes?: string;
}

export interface MapProps {
  locations?: Location[];
  currentLocation?: Location;
  onLocationChange?: (location: Location) => void;
  onMapClick?: (location: Location) => void;
  enableClickSelection?: boolean;
  useCurrentLocation?: boolean;
} 