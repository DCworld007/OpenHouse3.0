'use client';

import dynamic from 'next/dynamic';

const MapWithNoSSR = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded-lg">
      <p className="text-gray-600">Loading map...</p>
    </div>
  )
});

export default MapWithNoSSR; 