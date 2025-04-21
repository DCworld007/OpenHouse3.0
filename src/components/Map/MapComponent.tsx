import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, MapProps } from './index';

const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

// Initialize icons
const markerIcon = L.icon({
  iconUrl: '/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const currentLocationIcon = L.icon({
  iconUrl: '/current-location-marker.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const BoundsUpdater = ({ locations, currentLocation }: { locations: Location[], currentLocation?: Location }) => {
  const map = useMap();
  
  useEffect(() => {
    const mapInstance = map;
    if (!mapInstance) return;
    
    const points = [...locations];
    if (currentLocation) {
      points.push(currentLocation);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(loc => [loc.lat, loc.lng]));
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, locations, currentLocation]);

  return null;
};

const ClickHandler = ({ onMapClick, enableClickSelection }: { onMapClick?: (location: Location) => void, enableClickSelection?: boolean }) => {
  const map = useMap();

  useEffect(() => {
    if (!enableClickSelection || !onMapClick || !map) return;

    const handleClick = async (e: L.LeafletMouseEvent) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          onMapClick({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            address: data.display_name,
          });
        }
      } catch (error) {
        console.error('[ClickHandler] Error fetching location:', error);
      }
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, enableClickSelection, onMapClick]);

  return null;
};

const MapComponent = ({ locations = [], currentLocation, onMapClick, enableClickSelection = false }: MapProps) => {
  const center = currentLocation 
    ? [currentLocation.lat, currentLocation.lng] 
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center as [number, number]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((location, index) => (
          <Marker
            key={`${location.lat}-${location.lng}-${index}`}
            position={[location.lat, location.lng]}
            icon={markerIcon}
          >
            <Popup>{location.address}</Popup>
          </Marker>
        ))}
        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={currentLocationIcon}
          >
            <Popup>Current Location</Popup>
          </Marker>
        )}
        <BoundsUpdater locations={locations} currentLocation={currentLocation} />
        <ClickHandler onMapClick={onMapClick} enableClickSelection={enableClickSelection} />
      </MapContainer>
    </div>
  );
};

export default MapComponent; 