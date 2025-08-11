// Test the location suggestion logic
const { suggestNextLocation, parseLocation } = require('./lib/location-utils.ts');

// Test data matching your example
const testLocations = [
  { location: 'H4-122', source: 'inventory' },
  { location: 'H4-123', source: 'pending' },
  { location: 'H4-124', source: 'batch' }
];

console.log('Test locations:', testLocations);
console.log('Suggested next location:', suggestNextLocation(testLocations));

// Test parsing
console.log('Parse H4-122:', parseLocation('H4-122'));
console.log('Parse H4-123:', parseLocation('H4-123'));
console.log('Parse H4-124:', parseLocation('H4-124'));
