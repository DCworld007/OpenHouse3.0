// This file provides static group IDs for build time
// These IDs will be used to generate static paths for dynamic routes
export function getStaticGroupIds() {
  // Return a list of possible group IDs
  // We'll generate a few static IDs that will be available at build time
  return [
    'demo-group-1',
    'demo-group-2',
    'demo-group-3',
    'demo-group-4',
    'demo-group-5',
  ];
} 