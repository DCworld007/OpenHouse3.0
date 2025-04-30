'use client';

import { useEffect, useRef } from 'react';
import { Location } from './types';

interface SimpleMapProps {
  locations: Location[];
  currentLocation?: Location;
}

export default function SimpleMap({ locations = [], currentLocation }: SimpleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create a simple map using a static image
    const center = currentLocation 
      ? [currentLocation.lat, currentLocation.lng]
      : locations.length > 0 
        ? [locations[0].lat, locations[0].lng]
        : [37.7749, -122.4194];

    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-l+2196F3(${center[1]},${center[0]})/${center[1]},${center[0]},12,0/600x400@2x?access_token=pk.eyJ1IjoiZGN3b3JsZDAwNyIsImEiOiJjbHR0Z3k4Y2gwMDNqMnFxbDZ1NXJ2OWxtIn0.U_p0otbo2P7aTHBBxS_Law`;

    const img = document.createElement('img');
    img.src = mapUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '0.5rem';

    mapContainerRef.current.innerHTML = '';
    mapContainerRef.current.appendChild(img);
  }, [locations, currentLocation]);

  return (
    <div ref={mapContainerRef} className="w-full h-full bg-gray-100 rounded-lg" />
  );
} 