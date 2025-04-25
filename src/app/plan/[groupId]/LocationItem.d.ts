import { Location } from '@/components/Map/types';

interface LocationItemProps {
  location: Location;
  index: number;
  onAddStop?: () => void;
}

declare function LocationItem(props: LocationItemProps): JSX.Element;

export default LocationItem; 