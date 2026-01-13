import { logger } from './logger';

export interface LocationData {
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | null;
}

// Comprehensive location dictionary for Europe, Americas, and Middle East
const LOCATION_DICTIONARY = {
  // Europe
  Europe: {
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Cambridge', 'Oxford', 'Brighton', 'Nottingham', 'Sheffield', 'Newcastle', 'Belfast'],
    'Germany': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bonn'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Grenoble', 'Dijon'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen', 'Enschede', 'Apeldoorn', 'Haarlem', 'Arnhem', 'Zaanstad'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón'],
    'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste'],
    'Poland': ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice', 'Białystok', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Gävle', 'Borås', 'Eskilstuna'],
    'Austria': ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'St. Pölten', 'Dornbirn', 'Wiener Neustadt', 'Steyr', 'Feldkirch', 'Bregenz'],
    'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen', 'La Louvière', 'Kortrijk', 'Hasselt', 'Ostend'],
    'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel/Bienne', 'Thun', 'Köniz', 'La Chaux-de-Fonds', 'Schaffhausen', 'Fribourg'],
    'Denmark': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Herning', 'Silkeborg', 'Næstved', 'Fredericia', 'Viborg'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromsø', 'Sarpsborg', 'Skien', 'Ålesund', 'Sandefjord', 'Haugesund', 'Tønsberg'],
    'Finland': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori', 'Joensuu', 'Lappeenranta', 'Hämeenlinna', 'Vaasa', 'Seinäjoki'],
    'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Navan', 'Ennis', 'Tralee', 'Kilkenny', 'Carlow', 'Naas', 'Sligo'],
    'Portugal': ['Lisbon', 'Porto', 'Amadora', 'Braga', 'Setúbal', 'Coimbra', 'Queluz', 'Funchal', 'Cacém', 'Vila Nova de Gaia', 'Algueirão', 'Loures', 'Évora', 'Rio de Mouro', 'Odivelas'],
    'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Ústí nad Labem', 'Pardubice', 'Zlín', 'Havířov', 'Kladno', 'Most', 'Karviná'],
    'Greece': ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina', 'Chania', 'Chalcis', 'Agrinio', 'Katerini', 'Kalamata', 'Kavala', 'Lamia'],
    'Hungary': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Szombathely', 'Sopron', 'Tatabánya', 'Kaposvár', 'Érd', 'Veszprém'],
    'Romania': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești', 'Oradea', 'Brăila', 'Arad', 'Pitești', 'Sibiu', 'Bacău'],
    'Slovakia': ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Banská Bystrica', 'Trnava', 'Martin', 'Trenčín', 'Poprad', 'Prievidza', 'Zvolen', 'Považská Bystrica', 'Nové Zámky', 'Michalovce'],
    'Croatia': ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Slavonski Brod', 'Pula', 'Sesvete', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik', 'Bjelovar', 'Velika Gorica'],
    'Bulgaria': ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven', 'Sliven', 'Dobrich', 'Shumen', 'Pernik', 'Haskovo', 'Yambol', 'Pazardzhik', 'Blagoevgrad'],
  },

  // Americas (North, Central, South America)
  America: {
    'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Indianapolis', 'Charlotte', 'San Francisco', 'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Miami', 'Atlanta', 'Minneapolis', 'Raleigh', 'Orlando', 'Tampa', 'Pittsburgh', 'Sacramento', 'Cincinnati', 'Kansas City', 'Cleveland', 'Salt Lake City', 'St. Louis', 'Baltimore', 'Milwaukee'],
    'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'Sherbrooke', 'St. Catharines', 'Kelowna', 'Barrie', 'Guelph', 'Kingston', 'Thunder Bay'],
    'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Mérida', 'San Luis Potosí', 'Querétaro', 'Mexicali', 'Aguascalientes', 'Hermosillo', 'Saltillo', 'Culiacán', 'Cancún', 'Veracruz', 'Acapulco', 'Chihuahua'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís', 'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Teresina'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'San Miguel de Tucumán', 'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Corrientes', 'Posadas', 'Neuquén', 'Bahía Blanca', 'Santiago del Estero', 'Paraná', 'Formosa', 'San Fernando del Valle de Catamarca'],
    'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Pasto', 'Manizales', 'Neiva', 'Villavicencio', 'Armenia', 'Valledupar', 'Montería', 'Sincelejo', 'Popayán'],
    'Chile': ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Chillán', 'Iquique', 'Los Ángeles', 'Puerto Montt', 'Coquimbo', 'Osorno', 'Valdivia', 'Punta Arenas', 'Quilpué', 'Talcahuano'],
    'Peru': ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos', 'Cusco', 'Huancayo', 'Chimbote', 'Pucallpa', 'Tacna', 'Ica', 'Juliaca', 'Sullana', 'Ayacucho', 'Cajamarca', 'Puno', 'Huánuco', 'Chincha Alta'],
    'Venezuela': ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'Barcelona', 'Maturín', 'Puerto La Cruz', 'Petare', 'Turmero', 'Ciudad Bolívar', 'Mérida', 'San Cristóbal', 'Cabimas', 'Punto Fijo', 'Los Teques', 'Guanare', 'Barinas'],
    'Costa Rica': ['San José', 'Limón', 'Alajuela', 'Heredia', 'Cartago', 'Puntarenas', 'Liberia', 'Desamparados', 'Paraíso', 'San Vicente', 'Goicoechea', 'Curridabat', 'San Isidro', 'Quesada', 'Pérez Zeledón'],
    'Panama': ['Panama City', 'San Miguelito', 'Tocumen', 'David', 'Arraiján', 'Colón', 'La Chorrera', 'Pacora', 'Santiago', 'Chitré', 'Las Cumbres', 'Changuinola', 'Vista Alegre', 'Pedregal', 'Alcalde Díaz'],
    'Ecuador': ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Durán', 'Portoviejo', 'Manta', 'Loja', 'Ambato', 'Esmeraldas', 'Quevedo', 'Riobamba', 'Milagro', 'Ibarra'],
    'Uruguay': ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes', 'Artigas', 'Minas', 'San José de Mayo', 'Durazno', 'Florida', 'Treinta y Tres'],
    'Bolivia': ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro', 'Tarija', 'Potosí', 'Sacaba', 'Montero', 'Trinidad', 'Yacuiba', 'Riberalta', 'Warnes', 'Cobija', 'Villamontes'],
    'Paraguay': ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Limpio', 'Ñemby', 'Encarnación', 'Mariano Roque Alonso', 'Pedro Juan Caballero', 'Presidente Franco', 'Itauguá', 'Villa Elisa'],
  },

  // Middle East
  'Middle East': {
    'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Khor Fakkan', 'Dibba Al-Fujairah', 'Kalba', 'Jebel Ali', 'Dhaid', 'Ruwais', 'Liwa Oasis'],
    'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk', 'Buraidah', 'Khamis Mushait', 'Hofuf', 'Taif', 'Najran', 'Jubail', 'Hail', 'Yanbu', 'Abha', 'Dhahran', 'Al-Qatif', 'Arar', 'Sakakah'],
    'Qatar': ['Doha', 'Al Rayyan', 'Umm Salal', 'Al Wakrah', 'Al Khor', 'Mesaieed', 'Dukhan', 'Al Shamal', 'Al Ruwais', 'Madinat ash Shamal', 'Al Wukayr', 'Al Ghuwariyah', 'Al Jumayliyah', 'Fuwayrit', 'Simaisma'],
    'Kuwait': ['Kuwait City', 'Hawalli', 'Farwaniya', 'Salmiya', 'Jahra', 'Ahmadi', 'Sabah Al Salem', 'Fahaheel', 'Mangaf', 'Jleeb Al-Shuyoukh', 'Fintas', 'Mahboula', 'Abu Halifa', 'Khaitan', 'Sulaibikhat'],
    'Bahrain': ['Manama', 'Muharraq', 'Riffa', 'Hamad Town', 'Isa Town', 'Sitra', 'Budaiya', 'Jidhafs', 'Al-Malikiyah', 'Aali', 'Adliya', 'Sanabis', 'Tubli', 'Sanad', 'Duraz'],
    'Oman': ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Ibri', 'Barka', 'Rustaq', 'Buraimi', 'Saham', 'Khasab', 'Shinas', 'Bahla', 'Adam', 'Al Suwayq'],
    'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa', 'Rishon LeZion', 'Petah Tikva', 'Ashdod', 'Netanya', 'Beersheba', 'Holon', 'Bnei Brak', 'Ramat Gan', 'Rehovot', 'Ashkelon', 'Bat Yam', 'Herzliya', 'Kfar Saba', 'Hadera', 'Modi\'in', 'Nazareth', 'Lod'],
    'Jordan': ['Amman', 'Zarqa', 'Irbid', 'Russeifa', 'Wadi as-Ser', 'Aqaba', 'Mafraq', 'Sahab', 'Madaba', 'Jerash', 'Salt', 'Ajloun', 'Karak', 'Ma\'an', 'Tafilah'],
    'Lebanon': ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Nabatieh', 'Jounieh', 'Zahle', 'Baalbek', 'Byblos', 'Aley', 'Batroun', 'Bint Jbeil', 'Halba', 'Marjayoun', 'Jezzine'],
    'Iraq': ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Sulaymaniyah', 'Najaf', 'Karbala', 'Kirkuk', 'Nasiriyah', 'Amarah', 'Diwaniyah', 'Hilla', 'Kut', 'Ramadi', 'Samarra', 'Duhok', 'Fallujah', 'Tikrit', 'Baqubah', 'Kufa'],
    'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Adana', 'Gaziantep', 'Konya', 'Antalya', 'Kayseri', 'Mersin', 'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa', 'Adapazarı', 'Malatya', 'Kahramanmaraş', 'Erzurum', 'Van'],
    'Iran': ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Shiraz', 'Tabriz', 'Qom', 'Ahvaz', 'Kermanshah', 'Urmia', 'Rasht', 'Kerman', 'Hamadan', 'Yazd', 'Ardabil', 'Bandar Abbas', 'Arak', 'Eslamshahr', 'Zanjan', 'Sanandaj'],
    'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Luxor', 'Mansoura', 'Tanta', 'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Damietta', 'Aswan', 'Minya', 'Damanhur', 'Beni Suef', 'Hurghada', 'Qena'],
    'Yemen': ['Sanaa', 'Aden', 'Taiz', 'Hodeidah', 'Ibb', 'Dhamar', 'Mukalla', 'Zinjibar', 'Saada', 'Sayyan', 'Lahij', 'Marib', 'Hajjah', 'Amran', 'Bayda', 'Seiyun', 'Shabwah', 'Ataq', 'Rida', 'Zabid'],
    'Syria': ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama', 'Deir ez-Zor', 'Raqqa', 'Idlib', 'Douma', 'As-Suwayda', 'Daraa', 'Tartus', 'Al-Hasakah', 'Qamishli', 'Manbij', 'Palmyra', 'Afrin', 'Jaramana', 'Zabadani', 'Baniyas'],
  },
};

// Invalid location indicators
const INVALID_LOCATION_PATTERNS = [
  /^null$/i,
  /^unknown$/i,
  /^n\/a$/i,
  /^na$/i,
  /^not specified$/i,
  /^various$/i,
  /^remote$/i,
  /^anywhere$/i,
  /^global$/i,
  /^worldwide$/i,
  /^\s*$/,
];

// Common location separators in text
const LOCATION_SEPARATORS = [',', '|', '-', '–', '—', '/', '\\', ';'];

/**
 * Location Extractor
 * Extracts country and city from location strings or job descriptions
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
   */
  private static parseLocationString(locationStr: string): LocationData {
    const result: LocationData = {
      country: null,
      city: null,
      region: null,
    };

    // Clean up the location string
    const cleanLocation = locationStr.trim();

    // Try to match countries and cities
    for (const [region, countries] of Object.entries(LOCATION_DICTIONARY)) {
      for (const [country, cities] of Object.entries(countries)) {
        // Check if country is mentioned
        const countryRegex = new RegExp(`\\b${this.escapeRegex(country)}\\b`, 'i');
        if (countryRegex.test(cleanLocation)) {
          result.country = country;
          result.region = region as 'Europe' | 'America' | 'Middle East';
        }

        // Check if any city is mentioned
        for (const city of cities) {
          const cityRegex = new RegExp(`\\b${this.escapeRegex(city)}\\b`, 'i');
          if (cityRegex.test(cleanLocation)) {
            result.city = city;
            if (!result.country) {
              result.country = country;
              result.region = region as 'Europe' | 'America' | 'Middle East';
            }
            break;
          }
        }

        // If we found both country and city, return early
        if (result.country && result.city) {
          return result;
        }
      }
    }

    return result;
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
   * Get all countries in dictionary
   */
  static getAllCountries(): string[] {
    const countries: string[] = [];
    for (const region of Object.values(LOCATION_DICTIONARY)) {
      countries.push(...Object.keys(region));
    }
    return countries;
  }

  /**
   * Get all cities for a specific country
   */
  static getCitiesForCountry(country: string): string[] {
    for (const region of Object.values(LOCATION_DICTIONARY)) {
      const countries = region as Record<string, string[]>;
      if (countries[country]) {
        return countries[country];
      }
    }
    return [];
  }

  /**
   * Get region for a country
   */
  static getRegionForCountry(country: string): 'Europe' | 'America' | 'Middle East' | null {
    for (const [region, countries] of Object.entries(LOCATION_DICTIONARY)) {
      if (country in countries) {
        return region as 'Europe' | 'America' | 'Middle East';
      }
    }
    return null;
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
