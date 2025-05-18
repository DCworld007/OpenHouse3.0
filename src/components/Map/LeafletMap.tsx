'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { Location } from './types';

declare module 'leaflet' {
  namespace Routing {
    function control(options: any): any;
    function plan(waypoints: any, options: any): any;
    function osrmv1(options: any): any;
  }
}

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
  const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRouteUpdateRef = useRef<number>(0);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) {
        marker.remove();
      }
    });
    markersRef.current = [];
  }, []);

  const clearRoute = useCallback(() => {
    if (routingControlRef.current) {
      try {
        // First, check if we can safely remove the control
        const map = mapRef.current;
        const control = routingControlRef.current;

        // Check for fallback polyline first
        if (control._fallbackPolyline) {
          try {
            if (map && map.hasLayer && map.hasLayer(control._fallbackPolyline)) {
              map.removeLayer(control._fallbackPolyline);
            }
            control._fallbackPolyline = null;
          } catch (e) {
            console.warn('[Map] Error clearing fallback polyline:', e);
          }
        }

        // Perform additional null checks before clearing lines
        if (control._clearLines && typeof control._clearLines === 'function') {
          try {
            // Safely handle _line property which might be null
            if (control._line) {
              // Check if clearLayers is available first
              if (control._line.clearLayers && typeof control._line.clearLayers === 'function') {
                control._line.clearLayers();
              } 
              // If not, check each layer individually
              else if (control._line._layers) {
                // Handle each layer safely
                Object.keys(control._line._layers).forEach(key => {
                  const layer = control._line._layers[key];
                  if (layer && map && map.hasLayer && map.hasLayer(layer)) {
                    map.removeLayer(layer);
                  }
                });
              }
            }
            
            // Safely handle alternatives
            if (control._alternatives && Array.isArray(control._alternatives)) {
              control._alternatives.forEach((alt: any) => {
                if (alt) {
                  if (alt.clearLayers && typeof alt.clearLayers === 'function') {
                    alt.clearLayers();
                  } else if (alt._layers) {
                    Object.keys(alt._layers || {}).forEach(key => {
                      const layer = alt._layers[key];
                      if (layer && map && map.hasLayer && map.hasLayer(layer)) {
                        map.removeLayer(layer);
                      }
                    });
                  }
                }
              });
            }
          } catch (innerError) {
            console.warn('[Map] Inner clearLines error (non-fatal):', innerError);
            // Force-reset the references to avoid reusing problematic objects
            if (control._line) control._line = null;
            if (control._alternatives) control._alternatives = [];
            if (control._routes) control._routes = [];
          }
        }

        // Now try to remove the control from the map
        if (map && control._container) {
          if (typeof map.hasLayer === 'function' && map.hasLayer(control)) {
            map.removeControl(control);
          } else if (control.remove && typeof control.remove === 'function') {
            control.remove();
          } else if (control._container.parentNode) {
            // Fallback: manually remove the container
            control._container.parentNode.removeChild(control._container);
          }
        }
      } catch (error) {
        console.warn('[Map] Error clearing route (non-fatal):', error);
      } finally {
        // Always null out the reference to prevent further issues
        routingControlRef.current = null;
      }
    }
  }, []);

  // Fallback route drawing function - draws straight lines between points
  const drawFallbackRoute = useCallback((map: L.Map, locations: Location[]) => {
    if (locations.length < 2) return;
    
    try {
      // Create polyline points from locations
      const points = locations.map(loc => [loc.lat, loc.lng] as L.LatLngExpression);
      
      // Create a polyline with dashed style to indicate it's a fallback
      const polyline = L.polyline(points, {
        color: '#FF5722', // Different color to indicate fallback
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 10', // Dashed line
      }).addTo(map);
      
      // Store in ref for cleanup
      if (!routingControlRef.current) {
        routingControlRef.current = { 
          _fallbackPolyline: polyline,
          remove: () => {
            if (polyline) map.removeLayer(polyline);
          }
        };
      } else {
        routingControlRef.current._fallbackPolyline = polyline;
      }
    } catch (error) {
      console.error('[Map] Error drawing fallback route:', error);
    }
  }, []);

  // Check if any two points are too far apart (likely intercontinental)
  const hasIntercontinentalDistances = useCallback((locations: Location[]): boolean => {
    const MAX_REASONABLE_DISTANCE_KM = 3000; // ~1864 miles - rough max drivable distance
    
    // Check each pair of points
    for (let i = 0; i < locations.length - 1; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const distance = calculateDistance(locations[i], locations[j]);
        if (distance > MAX_REASONABLE_DISTANCE_KM) {
          console.log(`[Map] Found intercontinental distance: ${distance.toFixed(0)}km between ${locations[i].address || 'point'} and ${locations[j].address || 'point'}`);
          return true;
        }
      }
    }
    return false;
  }, []);

  const updateRoute = useCallback((map: L.Map, start: Location | null) => {
    if (!map || !isMapReady) return;

    try {
      // First clear any existing route
      clearRoute();

      // Validate we have enough valid locations for a route
      if (locations.length === 0) return;
      
      // If we have only a start location but no destinations, don't draw a route
      if (start && locations.length === 0) return;
      
      // If we just have one location and no start, don't draw a route
      if (!start && locations.length < 2) return;

      // Validate start location has valid coordinates
      const startLocation = start || locations[0];
      if (!startLocation || typeof startLocation.lat !== 'number' || typeof startLocation.lng !== 'number') {
        console.warn('[Map] Invalid start location:', startLocation);
        return;
      }
      
      // Filter to ensure we only have valid locations
      const validLocations = start 
        ? locations.filter(loc => typeof loc.lat === 'number' && typeof loc.lng === 'number')
        : locations.slice(1).filter(loc => typeof loc.lat === 'number' && typeof loc.lng === 'number');
      
      // Need at least one valid destination
      if (validLocations.length === 0) return;

      // Calculate route locations
      const allRoutePoints = start ? [start, ...validLocations] : validLocations;
      
      // Check if any distances are too large (intercontinental)
      if (hasIntercontinentalDistances(allRoutePoints)) {
        console.log('[Map] Detected intercontinental distances, using fallback straight lines');
        // Skip OSRM routing for intercontinental routes - use straight lines instead
        drawFallbackRoute(map, allRoutePoints);
        return;
      }

      // Calculate optimal route for non-intercontinental distances
      const routeLocations = calculateOptimalRoute(startLocation, validLocations);

      // Need at least two points for a route (origin and destination)
      if (routeLocations.length < 2) return;

      const waypoints = routeLocations.map(location => 
        L.latLng(location.lat, location.lng)
      );

      // Set up a timeout to switch to fallback if OSRM takes too long
      const timeoutId = setTimeout(() => {
        // If the routingControlRef is still not set after our timeout, use fallback
        if (!routingControlRef.current || !routingControlRef.current._routes) {
          console.warn('[Map] Routing service timeout - using fallback straight lines');
          // Clear any existing partial routing
          clearRoute();
          // Draw fallback straight lines
          drawFallbackRoute(map, routeLocations);
        }
      }, 8000); // 8 second timeout, just below the OSRM timeout

      // Create a new routing control with better error handling
      const control = (L.Routing as any).control({
        waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          timeout: 10000,  // 10 second timeout for OSRM requests
          suppressDemoServerWarning: true,
          profile: 'driving', // Force driving profile
          showAlternatives: false
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
        addButtonClassName: '',
        // Custom error handler for routing errors
        routingErrorCallback: (error: any) => {
          console.warn('[Map] Routing error:', error);
          // Draw straight lines between points as fallback
          drawFallbackRoute(map, routeLocations);
        }
      });

      // Register event handlers for error handling
      control.on('routingerror', (e: any) => {
        console.warn('[Map] Routing error event:', e.error);
        // If we get a routing error, use the fallback
        drawFallbackRoute(map, routeLocations);
      });

      // Clear timeout when routes are successfully calculated
      control.on('routesfound', () => {
        clearTimeout(timeoutId);
      });

      control.addTo(map);
      routingControlRef.current = control;
    } catch (error) {
      console.error('[Map] Error updating route:', error);
      // Make sure we don't leave a broken reference
      routingControlRef.current = null;
      
      // Try to draw fallback route if we have an error
      if (mapRef.current) {
        const routeLocations = start
          ? [start, ...locations.filter(loc => typeof loc.lat === 'number' && typeof loc.lng === 'number')]
          : locations.filter(loc => typeof loc.lat === 'number' && typeof loc.lng === 'number');
          
        if (routeLocations.length >= 2) {
          drawFallbackRoute(mapRef.current, routeLocations);
        }
      }
    }
  }, [clearRoute, isMapReady, locations, drawFallbackRoute, hasIntercontinentalDistances]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cleanupCalled = false; // Flag to track cleanup status

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
      // Prevent cleanup from running multiple times
      if (cleanupCalled) return;
      cleanupCalled = true;
      
      // Save a reference to the map instance and routing control for cleanup
      const mapInstance = mapRef.current;
      const routingControl = routingControlRef.current;
      
      // First, set the refs to null to prevent any new operations
      mapRef.current = null;
      routingControlRef.current = null;
      
      // Defensive cleanup: first clear route and markers
      try {
        // Defensively handle routing control cleanup
        if (routingControl) {
          // Nullify internal Leaflet routing machine references
          ['_line', '_alternatives', '_routes', '_currentRoute', '_plan', '_router'].forEach(propName => {
            try {
              if (routingControl[propName]) {
                if (routingControl[propName].clearLayers) {
                  routingControl[propName].clearLayers();
                }
                routingControl[propName] = null;
              }
            } catch (e) {
              // Ignore errors in property cleanup
            }
          });
          
          // Try to remove the control from map
          if (mapInstance && typeof mapInstance.removeControl === 'function') {
            try {
              mapInstance.removeControl(routingControl);
            } catch (e) {
              // Ignore if can't remove
            }
          }
          
          // Try control's native remove method
          if (typeof routingControl.remove === 'function') {
            try {
              routingControl.remove();
            } catch (e) {
              // Ignore if can't remove
            }
          }
          
          // If control has a container, try to remove from DOM
          if (routingControl._container && routingControl._container.parentNode) {
            try {
              routingControl._container.parentNode.removeChild(routingControl._container);
            } catch (e) {
              // Ignore if can't remove
            }
          }
        }
      } catch (e) {
        console.warn("[Map] Error cleaning up routing control:", e);
      }
      
      try {
        // Clear all markers
        markersRef.current.forEach(marker => {
          try {
            if (marker) {
              if (mapInstance && mapInstance.hasLayer(marker)) {
                mapInstance.removeLayer(marker);
              }
              if (marker.remove) {
                marker.remove();
              }
            }
          } catch (e) {
            // Ignore individual marker cleanup errors
          }
        });
        markersRef.current = [];
      } catch (e) {
        console.warn("[Map] Error clearing markers:", e);
      }
      
      // Finally, remove the map
      if (mapInstance) {
        try {
          const mapContainer = mapInstance.getContainer();
          // Try to explicitly remove all layers
          mapInstance.eachLayer(layer => {
            try {
              if (layer) mapInstance.removeLayer(layer);
            } catch (e) {
              // Ignore layer removal errors
            }
          });
          
          // Now remove the map completely
          mapInstance.remove();
          
          // Ensure the DOM is cleaned up
          if (mapContainer && mapContainer.parentNode) {
            while (mapContainer.firstChild) {
              mapContainer.removeChild(mapContainer.firstChild);
            }
          }
        } catch (e) {
          console.warn("[Map] Error removing map:", e);
        }
      }
      
      setIsMapReady(false);
    };
  }, [clearMarkers, clearRoute, currentLocation, locations]);

  // Update markers and route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    try {
      // Clear any timeout from previous route updates
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
        routeTimeoutRef.current = null;
      }
      
      // Throttle route updates to prevent too many requests in quick succession
      const now = Date.now();
      const minUpdateInterval = 1000; // 1 second minimum between updates
      
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

      // Update route with throttling
      if (locations.length > 0) {
        if (now - lastRouteUpdateRef.current < minUpdateInterval) {
          // Schedule update after delay if we're updating too frequently
          routeTimeoutRef.current = setTimeout(() => {
            if (mapRef.current) {
              updateRoute(mapRef.current, currentLocation || null);
              lastRouteUpdateRef.current = Date.now();
            }
          }, minUpdateInterval);
        } else {
          // Update immediately if we haven't updated recently
        updateRoute(map, currentLocation || null);
          lastRouteUpdateRef.current = now;
        }
      }

      // Fit bounds
      if (locations.length > 0 || currentLocation) {
        const points = [...locations];
        if (currentLocation) points.push(currentLocation);
        const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
        
        if (validPoints.length > 0) {
          // Create a bounds object
          const bounds = L.latLngBounds(validPoints.map(loc => [loc.lat, loc.lng]));
          
          // Check if we have a global-scale map (very large bounds)
          const isGlobalScale = hasIntercontinentalDistances(validPoints);
          
          // Add padding and zoom constraints for global maps
          const fitBoundsOptions: L.FitBoundsOptions = {
            padding: isGlobalScale ? [30, 30] : [50, 50],
            maxZoom: isGlobalScale ? 3 : 12, // Limit zoom for global views
            animate: !isGlobalScale, // Disable animation for global views
          };
          
          // Apply bounds
          map.fitBounds(bounds, fitBoundsOptions);
          
          // For global views, ensure we're not too zoomed in
          if (isGlobalScale && map.getZoom() > 3) {
            map.setZoom(3);
          }
        }
      }
    } catch (error) {
      console.error('Error updating map:', error);
    }
  }, [locations, currentLocation, clearMarkers, updateRoute, isMapReady, hasIntercontinentalDistances]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
    };
  }, []);

  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
};

export default LeafletMap; 