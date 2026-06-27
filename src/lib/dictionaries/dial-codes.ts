// Country dialing codes for the phone/mobile selectors.
export interface DialCode {
  country: string;
  iso: string;
  dial: string; // e.g. "+44"
}

export const DIAL_CODES: DialCode[] = [
  { country: "United States", iso: "US", dial: "+1" },
  { country: "Canada", iso: "CA", dial: "+1" },
  { country: "United Kingdom", iso: "GB", dial: "+44" },
  { country: "Ireland", iso: "IE", dial: "+353" },
  { country: "United Arab Emirates", iso: "AE", dial: "+971" },
  { country: "Saudi Arabia", iso: "SA", dial: "+966" },
  { country: "Qatar", iso: "QA", dial: "+974" },
  { country: "Kuwait", iso: "KW", dial: "+965" },
  { country: "Bahrain", iso: "BH", dial: "+973" },
  { country: "Oman", iso: "OM", dial: "+968" },
  { country: "Iran", iso: "IR", dial: "+98" },
  { country: "Turkey", iso: "TR", dial: "+90" },
  { country: "Germany", iso: "DE", dial: "+49" },
  { country: "France", iso: "FR", dial: "+33" },
  { country: "Spain", iso: "ES", dial: "+34" },
  { country: "Portugal", iso: "PT", dial: "+351" },
  { country: "Italy", iso: "IT", dial: "+39" },
  { country: "Netherlands", iso: "NL", dial: "+31" },
  { country: "Belgium", iso: "BE", dial: "+32" },
  { country: "Switzerland", iso: "CH", dial: "+41" },
  { country: "Austria", iso: "AT", dial: "+43" },
  { country: "Sweden", iso: "SE", dial: "+46" },
  { country: "Norway", iso: "NO", dial: "+47" },
  { country: "Denmark", iso: "DK", dial: "+45" },
  { country: "Finland", iso: "FI", dial: "+358" },
  { country: "Poland", iso: "PL", dial: "+48" },
  { country: "Czech Republic", iso: "CZ", dial: "+420" },
  { country: "Greece", iso: "GR", dial: "+30" },
  { country: "Russia", iso: "RU", dial: "+7" },
  { country: "Ukraine", iso: "UA", dial: "+380" },
  { country: "India", iso: "IN", dial: "+91" },
  { country: "Pakistan", iso: "PK", dial: "+92" },
  { country: "Bangladesh", iso: "BD", dial: "+880" },
  { country: "China", iso: "CN", dial: "+86" },
  { country: "Hong Kong", iso: "HK", dial: "+852" },
  { country: "Singapore", iso: "SG", dial: "+65" },
  { country: "Japan", iso: "JP", dial: "+81" },
  { country: "South Korea", iso: "KR", dial: "+82" },
  { country: "Malaysia", iso: "MY", dial: "+60" },
  { country: "Indonesia", iso: "ID", dial: "+62" },
  { country: "Philippines", iso: "PH", dial: "+63" },
  { country: "Thailand", iso: "TH", dial: "+66" },
  { country: "Vietnam", iso: "VN", dial: "+84" },
  { country: "Australia", iso: "AU", dial: "+61" },
  { country: "New Zealand", iso: "NZ", dial: "+64" },
  { country: "South Africa", iso: "ZA", dial: "+27" },
  { country: "Nigeria", iso: "NG", dial: "+234" },
  { country: "Egypt", iso: "EG", dial: "+20" },
  { country: "Kenya", iso: "KE", dial: "+254" },
  { country: "Morocco", iso: "MA", dial: "+212" },
  { country: "Brazil", iso: "BR", dial: "+55" },
  { country: "Mexico", iso: "MX", dial: "+52" },
  { country: "Argentina", iso: "AR", dial: "+54" },
  { country: "Chile", iso: "CL", dial: "+56" },
  { country: "Colombia", iso: "CO", dial: "+57" },
];

// Unique dial codes for a compact selector (sorted by numeric code).
export const UNIQUE_DIAL_CODES: string[] = Array.from(new Set(DIAL_CODES.map((d) => d.dial))).sort(
  (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
);
