'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'lrm-mapbox';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Location } from './types';

const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

// Create a numbered marker icon
const createNumberedIcon = (number: number, isStart: boolean = false) => {
  const size = 30;
  const fontSize = 14;
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 1, 0, 2 * Math.PI);
  ctx.fillStyle = isStart ? '#4CAF50' : '#2196F3'; // Green for start, Blue for stops
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw number
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), size/2, size/2);

  const dataUrl = canvas.toDataURL();

  return L.icon({
    iconUrl: dataUrl,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
};

const calculateDistance = (point1: Location, point2: Location) => {
  const lat1 = point1.lat;
  const lon1 = point1.lng;
  const lat2 = point2.lat;
  const lon2 = point2.lng;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGN3b3JsZDAwNyIsImEiOiJjbHR0Z3k4Y2gwMDNqMnFxbDZ1NXJ2OWxtIn0.U_p0otbo2P7aTHBBxS_Law';

const calculateOptimalRoute = (start: Location, locations: Location[]): Location[] => {
  if (!start || locations.length === 0) return [];
  
  const unvisited = [...locations];
  const route: Location[] = [start];
  let currentPoint = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = calculateDistance(currentPoint, unvisited[0]);
    
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentPoint, unvisited[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIdx = i;
      }
    }

    currentPoint = unvisited[nearestIdx];
    route.push(currentPoint);
    unvisited.splice(nearestIdx, 1);
  }

  return route;
};

interface LeafletMapProps {
  locations: Location[];
  currentLocation?: Location;
}

const LeafletMap = ({ locations = [], currentLocation }: LeafletMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) {
        marker.remove();
      }
    });
    markersRef.current = [];
  }, []);

  const clearRoute = useCallback(() => {
    if (routingControlRef.current && mapRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      } catch (error) {
        console.warn('Error clearing route:', error);
      }
    }
  }, []);

  const updateRoute = useCallback((map: L.Map, start: Location | null) => {
    if (!map || !isMapReady || locations.length === 0) return;

    try {
      clearRoute();

      const startLocation = start || locations[0];
      const remainingLocations = start ? locations : locations.slice(1);
      const routeLocations = calculateOptimalRoute(startLocation, remainingLocations);

      if (routeLocations.length < 2) return;

      const waypoints = routeLocations.map(location => 
        L.latLng(location.lat, location.lng)
      );

      const control = (L.Routing as any).control({
        waypoints,
        router: L.Routing.mapbox(MAPBOX_ACCESS_TOKEN, {
          profile: 'mapbox/driving',
          language: 'en',
        }),
        plan: (L.Routing as any).plan(waypoints, {
          createMarker: () => null,
          draggableWaypoints: false,
          dragStyles: []
        }),
        lineOptions: {
          styles: [{ color: '#2196F3', weight: 4, opacity: 0.7 }],
          addWaypoints: false
        },
        show: false,
        routeWhileDragging: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        useZoomParameter: false,
        addButtonClassName: ''
      });

      control.addTo(map);
      routingControlRef.current = control;
    } catch (error) {
      console.error('Error updating route:', error);
    }
  }, [clearRoute, isMapReady, locations]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = currentLocation 
      ? [currentLocation.lat, currentLocation.lng]
      : locations.length > 0 
        ? [locations[0].lat, locations[0].lng]
        : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      zoomAnimation: true,
      center: center as L.LatLngExpression,
      zoom: 13
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.whenReady(() => {
      setIsMapReady(true);
    });

    return () => {
      clearRoute();
      clearMarkers();
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [clearMarkers, clearRoute]);

  // Update markers and route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    try {
      clearMarkers();

      // Add markers with numbers
      if (currentLocation) {
        const icon = createNumberedIcon(1, true);
        if (icon) {
          const marker = L.marker([currentLocation.lat, currentLocation.lng], { icon })
            .bindPopup('Current Location')
            .addTo(map);
          markersRef.current.push(marker);
        }
      }

      locations.forEach((location, index) => {
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return;

        const markerNumber = currentLocation ? index + 2 : index + 1;
        const icon = createNumberedIcon(markerNumber);
        if (icon) {
          const marker = L.marker([location.lat, location.lng], { icon })
            .bindPopup(`Stop #${markerNumber}: ${location.address}`)
            .addTo(map);
          markersRef.current.push(marker);
        }
      });

      // Update route
      if (locations.length > 0) {
        updateRoute(map, currentLocation || null);
      }

      // Fit bounds
      if (locations.length > 0 || currentLocation) {
        const points = [...locations];
        if (currentLocation) points.push(currentLocation);
        const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
        if (validPoints.length > 0) {
          const bounds = L.latLngBounds(validPoints.map(loc => [loc.lat, loc.lng]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error updating map:', error);
    }
  }, [locations, currentLocation, clearMarkers, updateRoute, isMapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default LeafletMap; 