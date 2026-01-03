import { JobAnalysis, JobDetails } from "@/types/job";

/**
 * Extracts company, position, and location from job title
 */
export function extractJobDetails(title: string): JobDetails {
  const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  const hiringMatch = cleanTitle.match(/(.+?)\s+hiring\s+(.+?)\s+(?:at|in)\s+(.+)/i);

  if (hiringMatch) {
    return {
      company: hiringMatch[1].trim(),
      position: hiringMatch[2].trim(),
      location: hiringMatch[3].trim(),
      fullTitle: cleanTitle,
    };
  }

  return {
    company: "N/A",
    position: cleanTitle,
    location: "N/A",
    fullTitle: cleanTitle,
  };
}

/**
 * Analyzes job description to extract relevant information
 */
export function analyzeJobDescription(description: string): JobAnalysis {
  const cleanText = description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerText = cleanText.toLowerCase();

  return {
    certifications: extractCertifications(cleanText),
    yearsExperience: extractYearsExperience(cleanText),
    expertise: extractExpertise(cleanText),
    jobType: identifyJobType(lowerText),
    companyType: identifyCompanyType(lowerText),
    keywords: extractKeywords(lowerText),
    academicDegrees: extractAcademicDegrees(cleanText),
    majors: extractMajors(cleanText),
    software: extractSoftware(cleanText),
    programmingSkills: extractProgrammingSkills(cleanText),
  };
}

function extractCertifications(text: string): string[] {
  const certifications: string[] = [];
  const certPatterns = [
    /\bCFA\s*(?:Level\s*([I1-3]|One|Two|Three|I{1,3}))?\b/gi,
    /\bACCA\b/gi,
    /\bACA\b/gi,
    /\bCIMA\b/gi,
    /\bFRM\b/gi,
    /\bMBA\b/gi,
    /\bCPA\b/gi,
  ];

  for (const pattern of certPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      certifications.push(...matches.map(m => m.trim()));
    }
  }

  return [...new Set(certifications)];
}

function extractYearsExperience(text: string): string {
  const expPatterns = [
    /(\d+)\+?\s*(?:to|\-|–)\s*(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?/i,
    /minimum\s*(?:of\s*)?(\d+)\s*years?/i,
    /at\s*least\s*(\d+)\s*years?/i,
  ];

  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[2] ? `${match[1]}-${match[2]} years` : `${match[1]}+ years`;
    }
  }

  return "";
}

function extractExpertise(text: string): string[] {
  const expertise: string[] = [];
  const expertiseKeywords: Record<string, RegExp> = {
    'Financial Modeling': /financial\s*model(?:l?ing)?/gi,
    'Valuation': /\bvaluation/gi,
    'M&A': /\bM&A\b|mergers?\s*(?:and|&)\s*acquisitions?/gi,
    'Portfolio Management': /portfolio\s*manag(?:ement|er)/gi,
    'Risk Management': /risk\s*manag(?:ement|er)/gi,
    'Equity Research': /equity\s*research/gi,
    'Fixed Income': /fixed\s*income/gi,
    'Derivatives': /derivatives?/gi,
    'Quantitative Analysis': /quant(?:itative)?(?:\s*analy(?:sis|st))?/gi,
    'Bloomberg Terminal': /bloomberg(?:\s*terminal)?/gi,
    'Python': /\bpython\b/gi,
    'SQL': /\bSQL\b/gi,
    'Excel': /\bexcel\b/gi,
    'VBA': /\bVBA\b/gi,
  };

  for (const [skill, pattern] of Object.entries(expertiseKeywords)) {
    if (pattern.test(text)) {
      expertise.push(skill);
    }
  }

  return [...new Set(expertise)].slice(0, 6);
}

function identifyJobType(lowerText: string): string {
  const jobTypes = [
    { type: 'Investment Banking', keywords: ['investment bank', 'M&A', 'corporate finance'] },
    { type: 'Portfolio Management', keywords: ['portfolio manager', 'fund manager'] },
    { type: 'Financial Analysis', keywords: ['financial analyst', 'FP&A'] },
    { type: 'Equity Research', keywords: ['equity research', 'research analyst'] },
    { type: 'Risk Management', keywords: ['risk manager', 'risk analyst'] },
    { type: 'Quantitative Finance', keywords: ['quant', 'quantitative'] },
    { type: 'Trading', keywords: ['trader', 'trading'] },
  ];

  for (const { type, keywords } of jobTypes) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return type;
    }
  }

  return "General Finance";
}

function identifyCompanyType(lowerText: string): string {
  const companyTypes = [
    { type: 'Investment Bank', keywords: ['goldman sachs', 'morgan stanley', 'jp morgan', 'barclays', 'citi', 'ubs'] },
    { type: 'Asset Manager', keywords: ['blackrock', 'vanguard', 'fidelity', 'asset manag'] },
    { type: 'Hedge Fund', keywords: ['hedge fund', 'citadel', 'two sigma'] },
    { type: 'Private Equity', keywords: ['private equity', 'KKR', 'blackstone'] },
    { type: 'Consulting Firm', keywords: ['mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg'] },
    { type: 'Fintech', keywords: ['fintech', 'revolut', 'stripe'] },
  ];

  for (const { type, keywords } of companyTypes) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return type;
    }
  }

  return "Unknown";
}

function extractKeywords(lowerText: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'you', 'will', 'are', 'this',
    'from', 'that', 'have', 'been', 'our', 'your'
  ]);

  const words = lowerText.match(/\b[a-z]{3,}\b/g) || [];
  const wordFreq = words.reduce((acc, word) => {
    if (!stopWords.has(word)) {
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}

function extractAcademicDegrees(text: string): string[] {
  const degrees: string[] = [];

  if (/\bPh\.?D\.?\b|\bDoctorate\b/gi.test(text)) degrees.push('PhD');
  if (/\bMBA\b/gi.test(text)) degrees.push('MBA');
  if (/\bMaster'?s?\b|\bM\.?S\.?c\.?\b/gi.test(text)) degrees.push("Master's");
  if (/\bBachelor'?s?\b|\bB\.?S\.?c?.?\b/gi.test(text)) degrees.push("Bachelor's");

  return [...new Set(degrees)];
}

function extractMajors(text: string): string[] {
  const majors: string[] = [];
  const majorKeywords: Record<string, RegExp> = {
    'Finance': /\bfinance\b/gi,
    'Accounting': /\baccounting\b/gi,
    'Economics': /\beconomics\b/gi,
    'Mathematics': /\bmathematics\b|\bmath\b/gi,
    'Computer Science': /computer\s*science/gi,
    'Statistics': /\bstatistics\b/gi,
  };

  for (const [major, pattern] of Object.entries(majorKeywords)) {
    if (pattern.test(text)) {
      majors.push(major);
    }
  }

  return [...new Set(majors)];
}

function extractSoftware(text: string): string[] {
  const software: string[] = [];
  const softwareKeywords: Record<string, RegExp> = {
    'Excel': /\bexcel\b/gi,
    'Bloomberg': /\bbloomberg\b/gi,
    'Power BI': /power\s*bi/gi,
    'Tableau': /\btableau\b/gi,
    'SAP': /\bSAP\b/gi,
    'Oracle': /\boracle\b/gi,
  };

  for (const [soft, pattern] of Object.entries(softwareKeywords)) {
    if (pattern.test(text)) {
      software.push(soft);
    }
  }

  return [...new Set(software)];
}

function extractProgrammingSkills(text: string): string[] {
  const skills: string[] = [];
  const progKeywords: Record<string, RegExp> = {
    'Python': /\bpython\b/gi,
    'R': /\bR\b(?:\s+programming)?/g,
    'SQL': /\bSQL\b/gi,
    'VBA': /\bVBA\b/gi,
    'JavaScript': /javascript/gi,
    'MATLAB': /\bMATLAB\b/gi,
  };

  for (const [skill, pattern] of Object.entries(progKeywords)) {
    if (pattern.test(text)) {
      skills.push(skill);
    }
  }

  return [...new Set(skills)];
}
