'use client';

import L from 'leaflet';

// Create a numbered marker icon
export const createNumberedIcon = (number: number, isStart: boolean = false) => {
  if (typeof document === 'undefined') return null;

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