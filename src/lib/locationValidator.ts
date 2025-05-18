import fuzzysort from 'fuzzysort';

// Expanded list of countries and major cities (top ~200 for brevity)
const citiesAndCountries = [
  // Countries
  'canada', 'united states', 'mexico', 'brazil', 'argentina', 'united kingdom', 'france', 'germany', 'italy', 'spain', 'russia', 'china', 'japan', 'india', 'australia', 'new zealand', 'south africa', 'nigeria', 'egypt', 'kenya',

  // Major Cities
  'toronto', 'vancouver', 'new york', 'los angeles', 'chicago', 'houston', 'miami', 'london', 'paris', 'berlin', 'rome', 'madrid', 'moscow', 'beijing', 'shanghai', 'tokyo', 'osaka', 'delhi', 'mumbai', 'sydney', 'melbourne', 'auckland', 'cape town', 'lagos', 'cairo', 'nairobi',
  'são paulo', 'rio de janeiro', 'buenos aires', 'dubai', 'singapore', 'seoul', 'bangkok', 'istanbul', 'hong kong', 'amsterdam', 'zurich', 'vienna', 'dublin', 'prague', 'warsaw', 'lisbon', 'barcelona', 'munich', 'hamburg', 'stockholm', 'oslo', 'copenhagen', 'helsinki', 'brussels',
  'budapest', 'athens', 'edmonton', 'calgary', 'ottawa', 'montreal', 'quebec city', 'boston', 'philadelphia', 'phoenix', 'san francisco', 'seattle', 'atlanta', 'washington dc', 'detroit', 'minneapolis', 'denver', 'san diego', 'las vegas', 'orlando'
];

// Street keywords
const streetKeywords = [
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'lane', 'ln', 'drive', 'dr', 'way', 'place', 'pl', 'court', 'ct', 'square', 'sq', 'parkway', 'pkwy'
];

// Confidence thresholds
const CONFIDENCE_THRESHOLD = 70;

export async function validateLocationInput(text: string): Promise<{ isValid: boolean; confidence: number; source: 'local'; suggestions?: string[] }> {
  const input = text.toLowerCase().trim();

  let confidence = 0;

  // Check for street address pattern
  const hasStreetNumber = /\d{1,6}/.test(input);
  const hasStreetKeyword = streetKeywords.some((word) => input.includes(word));

  if (hasStreetNumber && hasStreetKeyword) {
    confidence += 40;
  }

  // Check for city/country fuzzy match
  const cityMatch = fuzzysort.go(input, citiesAndCountries, { threshold: -1000 });
  if (cityMatch.total > 0) {
    confidence += 40;
  }

  // Quick decision if high confidence locally
  if (confidence >= CONFIDENCE_THRESHOLD) {
    return { isValid: true, confidence, source: 'local' };
  }

  // If no API fallback available
  return { isValid: false, confidence, source: 'local' };
} 