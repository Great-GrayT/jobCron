import { logger } from './logger';

export interface LocationData {
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania' | null;
}

// Comprehensive worldwide country list (all recognized countries)
const WORLDWIDE_COUNTRIES: Record<string, 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania'> = {
  // Europe
  'United Kingdom': 'Europe', 'Germany': 'Europe', 'France': 'Europe', 'Italy': 'Europe',
  'Spain': 'Europe', 'Poland': 'Europe', 'Romania': 'Europe', 'Netherlands': 'Europe',
  'Belgium': 'Europe', 'Czech Republic': 'Europe', 'Greece': 'Europe', 'Portugal': 'Europe',
  'Sweden': 'Europe', 'Hungary': 'Europe', 'Austria': 'Europe', 'Serbia': 'Europe',
  'Switzerland': 'Europe', 'Bulgaria': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
  'Slovakia': 'Europe', 'Norway': 'Europe', 'Ireland': 'Europe', 'Croatia': 'Europe',
  'Bosnia and Herzegovina': 'Europe', 'Albania': 'Europe', 'Lithuania': 'Europe',
  'Slovenia': 'Europe', 'Latvia': 'Europe', 'North Macedonia': 'Europe', 'Estonia': 'Europe',
  'Luxembourg': 'Europe', 'Malta': 'Europe', 'Iceland': 'Europe', 'Montenegro': 'Europe',
  'Liechtenstein': 'Europe', 'Monaco': 'Europe', 'San Marino': 'Europe', 'Vatican City': 'Europe',
  'Andorra': 'Europe', 'Moldova': 'Europe', 'Belarus': 'Europe', 'Russia': 'Europe',
  'Ukraine': 'Europe', 'Cyprus': 'Europe',

  // Americas
  'United States': 'America', 'Canada': 'America', 'Mexico': 'America', 'Brazil': 'America',
  'Argentina': 'America', 'Colombia': 'America', 'Peru': 'America', 'Venezuela': 'America',
  'Chile': 'America', 'Ecuador': 'America', 'Guatemala': 'America', 'Cuba': 'America',
  'Bolivia': 'America', 'Haiti': 'America', 'Dominican Republic': 'America',
  'Honduras': 'America', 'Paraguay': 'America', 'Nicaragua': 'America', 'El Salvador': 'America',
  'Costa Rica': 'America', 'Panama': 'America', 'Uruguay': 'America', 'Jamaica': 'America',
  'Trinidad and Tobago': 'America', 'Guyana': 'America', 'Suriname': 'America',
  'Belize': 'America', 'Bahamas': 'America', 'Barbados': 'America', 'Saint Lucia': 'America',
  'Grenada': 'America', 'Saint Vincent and the Grenadines': 'America',
  'Antigua and Barbuda': 'America', 'Dominica': 'America', 'Saint Kitts and Nevis': 'America',

  // Asia
  'China': 'Asia', 'India': 'Asia', 'Indonesia': 'Asia', 'Pakistan': 'Asia',
  'Bangladesh': 'Asia', 'Japan': 'Asia', 'Philippines': 'Asia', 'Vietnam': 'Asia',
  'Thailand': 'Asia', 'Myanmar': 'Asia', 'South Korea': 'Asia', 'Afghanistan': 'Asia',
  'Nepal': 'Asia', 'Sri Lanka': 'Asia', 'Cambodia': 'Asia', 'Malaysia': 'Asia',
  'Uzbekistan': 'Asia', 'Singapore': 'Asia', 'Kazakhstan': 'Asia', 'Tajikistan': 'Asia',
  'Hong Kong': 'Asia', 'Laos': 'Asia', 'Kyrgyzstan': 'Asia', 'Turkmenistan': 'Asia',
  'Mongolia': 'Asia', 'Taiwan': 'Asia', 'North Korea': 'Asia', 'Brunei': 'Asia',
  'Bhutan': 'Asia', 'Maldives': 'Asia', 'Macau': 'Asia', 'Timor-Leste': 'Asia',

  // Middle East
  'Turkey': 'Middle East', 'Iran': 'Middle East', 'Iraq': 'Middle East', 'Saudi Arabia': 'Middle East',
  'Yemen': 'Middle East', 'Syria': 'Middle East', 'United Arab Emirates': 'Middle East',
  'Israel': 'Middle East', 'Jordan': 'Middle East', 'Palestine': 'Middle East',
  'Lebanon': 'Middle East', 'Oman': 'Middle East', 'Kuwait': 'Middle East',
  'Georgia': 'Middle East', 'Armenia': 'Middle East', 'Qatar': 'Middle East',
  'Bahrain': 'Middle East', 'Azerbaijan': 'Middle East',

  // Africa
  'Nigeria': 'Africa', 'Ethiopia': 'Africa', 'Egypt': 'Africa', 'Democratic Republic of the Congo': 'Africa',
  'Tanzania': 'Africa', 'South Africa': 'Africa', 'Kenya': 'Africa', 'Sudan': 'Africa',
  'Algeria': 'Africa', 'Uganda': 'Africa', 'Morocco': 'Africa', 'Angola': 'Africa',
  'Ghana': 'Africa', 'Mozambique': 'Africa', 'Madagascar': 'Africa', 'Cameroon': 'Africa',
  'Ivory Coast': 'Africa', 'Niger': 'Africa', 'Burkina Faso': 'Africa', 'Mali': 'Africa',
  'Malawi': 'Africa', 'Zambia': 'Africa', 'Somalia': 'Africa', 'Senegal': 'Africa',
  'Chad': 'Africa', 'Zimbabwe': 'Africa', 'Guinea': 'Africa', 'Rwanda': 'Africa',
  'Benin': 'Africa', 'Tunisia': 'Africa', 'Burundi': 'Africa', 'South Sudan': 'Africa',
  'Togo': 'Africa', 'Sierra Leone': 'Africa', 'Libya': 'Africa', 'Liberia': 'Africa',
  'Mauritania': 'Africa', 'Central African Republic': 'Africa', 'Eritrea': 'Africa',
  'Gambia': 'Africa', 'Botswana': 'Africa', 'Namibia': 'Africa', 'Gabon': 'Africa',
  'Lesotho': 'Africa', 'Guinea-Bissau': 'Africa', 'Equatorial Guinea': 'Africa',
  'Mauritius': 'Africa', 'Eswatini': 'Africa', 'Djibouti': 'Africa', 'Comoros': 'Africa',
  'Cape Verde': 'Africa', 'Sao Tome and Principe': 'Africa', 'Seychelles': 'Africa',

  // Oceania
  'Australia': 'Oceania', 'Papua New Guinea': 'Oceania', 'New Zealand': 'Oceania',
  'Fiji': 'Oceania', 'Solomon Islands': 'Oceania', 'Vanuatu': 'Oceania',
  'New Caledonia': 'Oceania', 'French Polynesia': 'Oceania', 'Samoa': 'Oceania',
  'Kiribati': 'Oceania', 'Micronesia': 'Oceania', 'Tonga': 'Oceania',
  'Palau': 'Oceania', 'Cook Islands': 'Oceania', 'Nauru': 'Oceania',
  'Tuvalu': 'Oceania', 'Marshall Islands': 'Oceania',
};

// US State codes and full names mapping
const US_STATES: Record<string, string> = {
  // State codes
  'AL': 'United States', 'AK': 'United States', 'AZ': 'United States', 'AR': 'United States',
  'CA': 'United States', 'CO': 'United States', 'CT': 'United States', 'DE': 'United States',
  'FL': 'United States', 'GA': 'United States', 'HI': 'United States', 'ID': 'United States',
  'IL': 'United States', 'IN': 'United States', 'IA': 'United States', 'KS': 'United States',
  'KY': 'United States', 'LA': 'United States', 'ME': 'United States', 'MD': 'United States',
  'MA': 'United States', 'MI': 'United States', 'MN': 'United States', 'MS': 'United States',
  'MO': 'United States', 'MT': 'United States', 'NE': 'United States', 'NV': 'United States',
  'NH': 'United States', 'NJ': 'United States', 'NM': 'United States', 'NY': 'United States',
  'NC': 'United States', 'ND': 'United States', 'OH': 'United States', 'OK': 'United States',
  'OR': 'United States', 'PA': 'United States', 'RI': 'United States', 'SC': 'United States',
  'SD': 'United States', 'TN': 'United States', 'TX': 'United States', 'UT': 'United States',
  'VT': 'United States', 'VA': 'United States', 'WA': 'United States', 'WV': 'United States',
  'WI': 'United States', 'WY': 'United States', 'DC': 'United States',

  // Full state names
  'Alabama': 'United States', 'Alaska': 'United States', 'Arizona': 'United States',
  'Arkansas': 'United States', 'California': 'United States', 'Colorado': 'United States',
  'Connecticut': 'United States', 'Delaware': 'United States', 'Florida': 'United States',
  'Georgia': 'United States', 'Hawaii': 'United States', 'Idaho': 'United States',
  'Illinois': 'United States', 'Indiana': 'United States', 'Iowa': 'United States',
  'Kansas': 'United States', 'Kentucky': 'United States', 'Louisiana': 'United States',
  'Maine': 'United States', 'Maryland': 'United States', 'Massachusetts': 'United States',
  'Michigan': 'United States', 'Minnesota': 'United States', 'Mississippi': 'United States',
  'Missouri': 'United States', 'Montana': 'United States', 'Nebraska': 'United States',
  'Nevada': 'United States', 'New Hampshire': 'United States', 'New Jersey': 'United States',
  'New Mexico': 'United States', 'New York': 'United States', 'North Carolina': 'United States',
  'North Dakota': 'United States', 'Ohio': 'United States', 'Oklahoma': 'United States',
  'Oregon': 'United States', 'Pennsylvania': 'United States', 'Rhode Island': 'United States',
  'South Carolina': 'United States', 'South Dakota': 'United States', 'Tennessee': 'United States',
  'Texas': 'United States', 'Utah': 'United States', 'Vermont': 'United States',
  'Virginia': 'United States', 'Washington': 'United States', 'West Virginia': 'United States',
  'Wisconsin': 'United States', 'Wyoming': 'United States', 'District of Columbia': 'United States',
};

// Canadian provinces and territories
const CANADIAN_PROVINCES: Record<string, string> = {
  // Province codes
  'AB': 'Canada', 'BC': 'Canada', 'MB': 'Canada', 'NB': 'Canada', 'NL': 'Canada',
  'NT': 'Canada', 'NS': 'Canada', 'NU': 'Canada', 'ON': 'Canada', 'PE': 'Canada',
  'QC': 'Canada', 'SK': 'Canada', 'YT': 'Canada',

  // Full province names
  'Alberta': 'Canada', 'British Columbia': 'Canada', 'Manitoba': 'Canada',
  'New Brunswick': 'Canada', 'Newfoundland and Labrador': 'Canada', 'Newfoundland': 'Canada',
  'Northwest Territories': 'Canada', 'Nova Scotia': 'Canada', 'Nunavut': 'Canada',
  'Ontario': 'Canada', 'Prince Edward Island': 'Canada', 'Quebec': 'Canada',
  'Saskatchewan': 'Canada', 'Yukon': 'Canada',
};

// Thai provinces/regions (common patterns like "Bangkok, Bangkok City, Thailand")
const THAI_REGIONS: Record<string, string> = {
  'Bangkok': 'Thailand', 'Bangkok City': 'Thailand', 'Chiang Mai': 'Thailand',
  'Phuket': 'Thailand', 'Pattaya': 'Thailand', 'Krabi': 'Thailand',
  'Chonburi': 'Thailand', 'Nonthaburi': 'Thailand', 'Samut Prakan': 'Thailand',
};

// Australian states
const AUSTRALIAN_STATES: Record<string, string> = {
  'NSW': 'Australia', 'VIC': 'Australia', 'QLD': 'Australia', 'WA': 'Australia',
  'SA': 'Australia', 'TAS': 'Australia', 'ACT': 'Australia', 'NT': 'Australia',
  'New South Wales': 'Australia', 'Victoria': 'Australia', 'Queensland': 'Australia',
  'Western Australia': 'Australia', 'South Australia': 'Australia', 'Tasmania': 'Australia',
  'Australian Capital Territory': 'Australia', 'Northern Territory': 'Australia',
};

// Indian states (common ones)
const INDIAN_STATES: Record<string, string> = {
  'Maharashtra': 'India', 'Karnataka': 'India', 'Tamil Nadu': 'India', 'Gujarat': 'India',
  'Delhi': 'India', 'Uttar Pradesh': 'India', 'West Bengal': 'India', 'Telangana': 'India',
  'Rajasthan': 'India', 'Kerala': 'India', 'Punjab': 'India', 'Haryana': 'India',
  'Madhya Pradesh': 'India', 'Bihar': 'India', 'Andhra Pradesh': 'India',
};

// Combine all state/province mappings
const STATE_TO_COUNTRY: Record<string, string> = {
  ...US_STATES,
  ...CANADIAN_PROVINCES,
  ...THAI_REGIONS,
  ...AUSTRALIAN_STATES,
  ...INDIAN_STATES,
};

// Major cities mapping to countries (for city-based lookup)
const CITY_TO_COUNTRY: Record<string, string> = {
  // Asia
  'Bangkok': 'Thailand', 'Tokyo': 'Japan', 'Delhi': 'India', 'Mumbai': 'India', 'Beijing': 'China',
  'Shanghai': 'China', 'Seoul': 'South Korea', 'Manila': 'Philippines', 'Jakarta': 'Indonesia',
  'Singapore': 'Singapore', 'Hong Kong': 'Hong Kong', 'Bangalore': 'India', 'Hyderabad': 'India',
  'Chennai': 'India', 'Pune': 'India', 'Kolkata': 'India', 'Ahmedabad': 'India',
  'Hanoi': 'Vietnam', 'Ho Chi Minh City': 'Vietnam', 'Kuala Lumpur': 'Malaysia',
  'Taipei': 'Taiwan', 'Shenzhen': 'China', 'Guangzhou': 'China', 'Chengdu': 'China',
  'Wuhan': 'China', 'Osaka': 'Japan', 'Kyoto': 'Japan', 'Busan': 'South Korea',
  'Karachi': 'Pakistan', 'Lahore': 'Pakistan', 'Islamabad': 'Pakistan', 'Dhaka': 'Bangladesh',

  // Middle East
  'Dubai': 'United Arab Emirates', 'Abu Dhabi': 'United Arab Emirates', 'Riyadh': 'Saudi Arabia',
  'Jeddah': 'Saudi Arabia', 'Tel Aviv': 'Israel', 'Jerusalem': 'Israel', 'Doha': 'Qatar',
  'Kuwait City': 'Kuwait', 'Manama': 'Bahrain', 'Muscat': 'Oman', 'Beirut': 'Lebanon',
  'Amman': 'Jordan', 'Damascus': 'Syria', 'Baghdad': 'Iraq', 'Tehran': 'Iran',
  'Istanbul': 'Turkey', 'Ankara': 'Turkey', 'Cairo': 'Egypt', 'Alexandria': 'Egypt',

  // Europe
  'London': 'United Kingdom', 'Manchester': 'United Kingdom', 'Birmingham': 'United Kingdom',
  'Paris': 'France', 'Berlin': 'Germany', 'Munich': 'Germany', 'Frankfurt': 'Germany',
  'Amsterdam': 'Netherlands', 'Rotterdam': 'Netherlands', 'Brussels': 'Belgium',
  'Madrid': 'Spain', 'Barcelona': 'Spain', 'Rome': 'Italy', 'Milan': 'Italy',
  'Vienna': 'Austria', 'Zurich': 'Switzerland', 'Geneva': 'Switzerland',
  'Stockholm': 'Sweden', 'Copenhagen': 'Denmark', 'Oslo': 'Norway', 'Helsinki': 'Finland',
  'Dublin': 'Ireland', 'Lisbon': 'Portugal', 'Prague': 'Czech Republic', 'Budapest': 'Hungary',
  'Warsaw': 'Poland', 'Athens': 'Greece', 'Moscow': 'Russia', 'Saint Petersburg': 'Russia',

  // Americas
  'New York': 'United States', 'Los Angeles': 'United States', 'Chicago': 'United States',
  'Houston': 'United States', 'Phoenix': 'United States', 'San Francisco': 'United States',
  'Seattle': 'United States', 'Boston': 'United States', 'Miami': 'United States',
  'Dallas': 'United States', 'Atlanta': 'United States', 'Washington': 'United States',
  'Toronto': 'Canada', 'Montreal': 'Canada', 'Vancouver': 'Canada', 'Calgary': 'Canada',
  'Mexico City': 'Mexico', 'Guadalajara': 'Mexico', 'Monterrey': 'Mexico',
  'São Paulo': 'Brazil', 'Rio de Janeiro': 'Brazil', 'Brasília': 'Brazil',
  'Buenos Aires': 'Argentina', 'Bogotá': 'Colombia', 'Lima': 'Peru', 'Santiago': 'Chile',

  // Africa
  'Lagos': 'Nigeria', 'Nairobi': 'Kenya', 'Johannesburg': 'South Africa', 'Cape Town': 'South Africa',
  'Casablanca': 'Morocco', 'Accra': 'Ghana', 'Addis Ababa': 'Ethiopia', 'Algiers': 'Algeria',

  // Oceania
  'Sydney': 'Australia', 'Melbourne': 'Australia', 'Brisbane': 'Australia', 'Perth': 'Australia',
  'Auckland': 'New Zealand', 'Wellington': 'New Zealand', 'Christchurch': 'New Zealand',
};

// Invalid location indicators
const INVALID_LOCATION_PATTERNS = [
  /^null$/i, /^unknown$/i, /^n\/a$/i, /^na$/i, /^not specified$/i,
  /^various$/i, /^remote$/i, /^anywhere$/i, /^global$/i, /^worldwide$/i, /^\s*$/,
];

/**
 * Location Extractor
 * Extracts country and city from location strings using comprehensive worldwide dictionary
 */
export class LocationExtractor {
  /**
   * Extract location from title, link, RSS location field, or description (in that order)
   */
  static extractLocation(
    title: string,
    link: string,
    location: string | undefined | null,
    description: string
  ): LocationData {
    // 1. Try to extract from title first
    if (title) {
      const extracted = this.parseLocationString(title);
      if (extracted.country || extracted.city) {
        return extracted;
      }
    }

    // 2. Try to extract from link (LinkedIn URLs often have location)
    if (link) {
      const extracted = this.extractFromLink(link);
      if (extracted.country || extracted.city) {
        return extracted;
      }
    }

    // 3. Try to extract from location field
    if (location && this.isValidLocation(location)) {
      const extracted = this.parseLocationString(location);
      if (extracted.country || extracted.city) {
        return extracted;
      }
    }

    // 4. If all else fails, try description
    return this.extractFromDescription(description);
  }

  /**
   * Check if location string is valid (not null, unknown, etc.)
   */
  private static isValidLocation(location: string): boolean {
    const trimmed = location.trim();

    // Check against invalid patterns
    for (const pattern of INVALID_LOCATION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    return trimmed.length > 0;
  }

  /**
   * Parse a location string to extract country and city
   * Implements the comprehensive logic you specified
   */
  private static parseLocationString(locationStr: string): LocationData {
    const result: LocationData = {
      country: null,
      city: null,
      region: null,
    };

    // Clean up the location string
    const cleanLocation = locationStr.trim();

    // Check if location contains comma
    if (cleanLocation.includes(',')) {
      return this.parseLocationWithComma(cleanLocation);
    } else {
      return this.parseLocationWithoutComma(cleanLocation);
    }
  }

  /**
   * Parse location string WITH comma (e.g., "Bangkok, Bangkok City, Thailand" or "Dallas, TX")
   */
  private static parseLocationWithComma(locationStr: string): LocationData {
    const result: LocationData = {
      country: null,
      city: null,
      region: null,
    };

    // Split by comma
    const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length === 0) {
      return result;
    }

    // Get the last part (potential country or state)
    const lastPart = parts[parts.length - 1];

    // STEP 1: Try to find country from the last part using country dictionary
    for (const [country, region] of Object.entries(WORLDWIDE_COUNTRIES)) {
      if (country.toLowerCase() === lastPart.toLowerCase()) {
        result.country = country;
        result.region = region;

        // The first part before comma is the city
        if (parts.length > 0) {
          result.city = parts[0];
        }

        return result;
      }
    }

    // STEP 2: If country not found in dictionary, try state/province mapping
    // Try exact uppercase match first (for codes like TX, CA, ON)
    if (STATE_TO_COUNTRY[lastPart.toUpperCase()]) {
      result.country = STATE_TO_COUNTRY[lastPart.toUpperCase()];
      result.region = this.getRegionForCountry(result.country);
      result.city = parts[0]; // First part is city
      return result;
    }

    // Try case-insensitive match for full state names
    for (const [stateName, country] of Object.entries(STATE_TO_COUNTRY)) {
      if (stateName.toLowerCase() === lastPart.toLowerCase()) {
        result.country = country;
        result.region = this.getRegionForCountry(result.country);
        result.city = parts[0]; // First part is city
        return result;
      }
    }

    // STEP 3: If still not found, try city mapping for the last part
    for (const [cityName, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (cityName.toLowerCase() === lastPart.toLowerCase()) {
        result.country = country;
        result.region = this.getRegionForCountry(result.country);
        result.city = parts[0]; // First part is the actual city
        return result;
      }
    }

    // STEP 4: If nothing found, return unknown
    return { country: null, city: null, region: null };
  }

  /**
   * Parse location string WITHOUT comma (e.g., "Thailand" or "Bangkok")
   */
  private static parseLocationWithoutComma(locationStr: string): LocationData {
    const result: LocationData = {
      country: null,
      city: null,
      region: null,
    };

    // STEP 1: Try to match with country dictionary
    for (const [country, region] of Object.entries(WORLDWIDE_COUNTRIES)) {
      if (country.toLowerCase() === locationStr.toLowerCase()) {
        result.country = country;
        result.region = region;
        result.city = null; // No city specified
        return result;
      }
    }

    // STEP 2: Try city mapping
    for (const [cityName, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (cityName.toLowerCase() === locationStr.toLowerCase()) {
        result.city = cityName;
        result.country = country;
        result.region = this.getRegionForCountry(result.country);
        return result;
      }
    }

    // STEP 3: Try state/province mapping
    // Try exact uppercase match first
    if (STATE_TO_COUNTRY[locationStr.toUpperCase()]) {
      result.country = STATE_TO_COUNTRY[locationStr.toUpperCase()];
      result.region = this.getRegionForCountry(result.country);
      result.city = null;
      return result;
    }

    // Try case-insensitive match
    for (const [stateName, country] of Object.entries(STATE_TO_COUNTRY)) {
      if (stateName.toLowerCase() === locationStr.toLowerCase()) {
        result.country = country;
        result.region = this.getRegionForCountry(result.country);
        result.city = null;
        return result;
      }
    }

    // STEP 4: If nothing found, return unknown
    return { country: null, city: null, region: null };
  }

  /**
   * Extract location from LinkedIn URL
   * Pattern: /-in-{location}-{numbers}
   */
  private static extractFromLink(link: string): LocationData {
    const inIndex = link.indexOf('-in-');
    if (inIndex === -1) {
      return { country: null, city: null, region: null };
    }

    const afterIn = link.substring(inIndex + 4); // Skip '-in-'

    // Find end of location: first digit
    const digitMatch = afterIn.match(/\-\d/);
    if (!digitMatch || digitMatch.index === undefined) {
      return { country: null, city: null, region: null };
    }

    const locationPart = afterIn.substring(0, digitMatch.index);

    // Convert kebab-case to normal text
    const locationStr = locationPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();

    // Parse the extracted location string
    return this.parseLocationString(locationStr);
  }

  /**
   * Extract location from job description text
   */
  private static extractFromDescription(description: string): LocationData {
    if (!description || description.trim().length === 0) {
      return { country: null, city: null, region: null };
    }

    // Clean HTML tags if present
    const cleanDesc = description.replace(/<[^>]*>/g, ' ');

    // Common patterns for location in descriptions
    const locationPatterns = [
      /location[:\s]+([^.\n]+)/gi,
      /based in[:\s]+([^.\n]+)/gi,
      /office in[:\s]+([^.\n]+)/gi,
      /situated in[:\s]+([^.\n]+)/gi,
      /working from[:\s]+([^.\n]+)/gi,
      /position in[:\s]+([^.\n]+)/gi,
      /opportunity in[:\s]+([^.\n]+)/gi,
    ];

    // Try each pattern
    for (const pattern of locationPatterns) {
      const matches = [...cleanDesc.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const extracted = this.parseLocationString(match[1]);
          if (extracted.country || extracted.city) {
            return extracted;
          }
        }
      }
    }

    // If no pattern matched, search the entire description
    return this.parseLocationString(cleanDesc);
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get region for a country
   */
  static getRegionForCountry(country: string): 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania' | null {
    return WORLDWIDE_COUNTRIES[country] || null;
  }

  /**
   * Format location for display
   */
  static formatLocation(locationData: LocationData): string {
    if (locationData.city && locationData.country) {
      return `${locationData.city}, ${locationData.country}`;
    } else if (locationData.city) {
      return locationData.city;
    } else if (locationData.country) {
      return locationData.country;
    }
    return 'Unknown Location';
  }
}
