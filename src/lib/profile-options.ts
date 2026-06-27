// Option lists for the profile selectors, derived from the existing dictionaries.
import { COUNTRIES } from "@/lib/dictionaries/locations/countries";
import { companyTypes } from "@/lib/dictionaries/company-types";
import { DIAL_CODES, UNIQUE_DIAL_CODES } from "@/lib/dictionaries/dial-codes";

export { DIAL_CODES, UNIQUE_DIAL_CODES };

// Country names (canonical) for the country selector.
export const COUNTRY_NAMES: string[] = COUNTRIES.map((c) => c.canonical).sort((a, b) =>
  a.localeCompare(b),
);

// Speciality suggestions = our industry dictionary (company-type sectors).
export const SPECIALITIES: string[] = Array.from(new Set(companyTypes.map((c) => c.type))).sort(
  (a, b) => a.localeCompare(b),
);
