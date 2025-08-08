/**
 * Utility functions for location management and suggestions
 */

export interface LocationData {
  location: string;
  source: 'inventory' | 'pending' | 'batch';
}

/**
 * Parse a location string to extract components (e.g., "H4-122" -> {prefix: "H4", number: 122})
 */
export function parseLocation(location: string): { prefix: string; number: number } | null {
  const match = location.match(/^([A-Z]+\d*)-(\d+)$/i);
  if (!match) return null;
  
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2], 10)
  };
}

/**
 * Find the highest numbered location for a given prefix
 */
export function findHighestLocation(locations: LocationData[], prefix: string): number {
  let highest = 0;
  
  for (const locationData of locations) {
    const parsed = parseLocation(locationData.location);
    if (parsed && parsed.prefix === prefix.toUpperCase()) {
      highest = Math.max(highest, parsed.number);
    }
  }
  
  return highest;
}

/**
 * Suggest the next logical location based on existing locations
 */
export function suggestNextLocation(locations: LocationData[]): string | null {
  if (locations.length === 0) return null;
  
  // Group locations by prefix and find the most recent/highest for each
  const prefixMap = new Map<string, number>();
  
  for (const locationData of locations) {
    const parsed = parseLocation(locationData.location);
    if (parsed) {
      const currentHighest = prefixMap.get(parsed.prefix) || 0;
      prefixMap.set(parsed.prefix, Math.max(currentHighest, parsed.number));
    }
  }
  
  if (prefixMap.size === 0) return null;
  
  // Find the prefix with the highest number (most recently used)
  let mostRecentPrefix = '';
  let highestNumber = 0;
  
  for (const [prefix, number] of prefixMap.entries()) {
    if (number > highestNumber) {
      highestNumber = number;
      mostRecentPrefix = prefix;
    }
  }
  
  // Suggest the next number in sequence
  return `${mostRecentPrefix}-${String(highestNumber + 1).padStart(3, '0')}`;
}
