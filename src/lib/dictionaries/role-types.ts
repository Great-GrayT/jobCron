/**
 * Comprehensive dictionary of job role types/functionalities
 * Organized by domain/industry for fuzzy matching
 */

export interface RoleTypeDefinition {
  roleType: string;
  category: string;
  keywords: string[];
  titlePatterns: RegExp[];
}

// Categories for grouping role types
export const ROLE_CATEGORIES = [
  "Finance & Investment",
  "Technology - Development",
  "Technology - Data & AI",
  "Technology - Infrastructure",
  "Technology - Security",
  "Research & Science",
  "Engineering",
  "Product & Design",
  "Marketing & Growth",
  "Sales & Business Development",
  "Operations & Supply Chain",
  "Human Resources",
  "Legal & Compliance",
  "Healthcare & Medical",
  "Education & Training",
  "Creative & Media",
  "Customer Service",
  "Consulting",
  "Executive & Leadership",
  "Administrative",
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const roleTypes: RoleTypeDefinition[] = [
  // =====================================================
  // FINANCE & INVESTMENT
  // =====================================================
  {
    roleType: "Equity Research",
    category: "Finance & Investment",
    keywords: [
      "equity research",
      "research analyst",
      "sell-side research",
      "buy-side research",
      "equity analyst",
      "stock research",
      "securities research",
    ],
    titlePatterns: [
      /equity\s*research/i,
      /research\s*analyst/i,
      /securities\s*analyst/i,
    ],
  },
  {
    roleType: "Quantitative Research",
    category: "Finance & Investment",
    keywords: [
      "quantitative research",
      "quant researcher",
      "quantitative analyst",
      "quant analyst",
      "strats",
      "quantitative strategist",
      "alpha research",
    ],
    titlePatterns: [
      /quant(?:itative)?\s*(?:research|analyst|strategist)/i,
      /\bstrats\b/i,
    ],
  },
  {
    roleType: "Quantitative Trading",
    category: "Finance & Investment",
    keywords: [
      "quantitative trading",
      "quant trader",
      "algorithmic trading",
      "algo trader",
      "systematic trading",
      "hft",
      "high frequency",
    ],
    titlePatterns: [
      /quant(?:itative)?\s*trad(?:er|ing)/i,
      /algo(?:rithmic)?\s*trad/i,
      /systematic\s*trad/i,
    ],
  },
  {
    roleType: "Investment Banking",
    category: "Finance & Investment",
    keywords: [
      "investment banking",
      "investment banker",
      "M&A",
      "mergers acquisitions",
      "capital markets",
      "DCM",
      "ECM",
      "leveraged finance",
    ],
    titlePatterns: [/investment\s*bank/i, /\bM&A\b/i, /capital\s*markets/i],
  },
  {
    roleType: "Portfolio Management",
    category: "Finance & Investment",
    keywords: [
      "portfolio manager",
      "fund manager",
      "asset manager",
      "investment manager",
      "portfolio management",
      "asset allocation",
    ],
    titlePatterns: [
      /portfolio\s*manag/i,
      /fund\s*manag/i,
      /asset\s*manag/i,
      /investment\s*manag/i,
    ],
  },
  {
    roleType: "Risk Management",
    category: "Finance & Investment",
    keywords: [
      "risk management",
      "risk analyst",
      "risk manager",
      "credit risk",
      "market risk",
      "operational risk",
      "risk officer",
    ],
    titlePatterns: [/risk\s*(?:manag|analyst|officer)/i, /\bcro\b/i],
  },
  {
    roleType: "Trading",
    category: "Finance & Investment",
    keywords: [
      "trader",
      "trading",
      "desk trader",
      "prop trading",
      "proprietary trading",
      "execution trader",
      "flow trader",
    ],
    titlePatterns: [/\btrad(?:er|ing)\b/i],
  },
  {
    roleType: "Private Equity",
    category: "Finance & Investment",
    keywords: [
      "private equity",
      "PE",
      "buyout",
      "LBO",
      "growth equity",
      "PE associate",
      "PE analyst",
    ],
    titlePatterns: [
      /private\s*equity/i,
      /\bPE\s*(?:analyst|associate)/i,
      /buyout/i,
    ],
  },
  {
    roleType: "Venture Capital",
    category: "Finance & Investment",
    keywords: [
      "venture capital",
      "VC",
      "startup investing",
      "venture partner",
      "VC analyst",
      "VC associate",
    ],
    titlePatterns: [/venture\s*capital/i, /\bVC\b/i],
  },
  {
    roleType: "Hedge Fund",
    category: "Finance & Investment",
    keywords: [
      "hedge fund",
      "fund management",
      "alternative investments",
      "hedge fund analyst",
    ],
    titlePatterns: [/hedge\s*fund/i],
  },
  {
    roleType: "Financial Analysis",
    category: "Finance & Investment",
    keywords: [
      "financial analyst",
      "FP&A",
      "financial planning",
      "financial analysis",
      "corporate finance analyst",
    ],
    titlePatterns: [
      /financial\s*analyst/i,
      /\bFP&A\b/i,
      /financial\s*planning/i,
    ],
  },
  {
    roleType: "Accounting",
    category: "Finance & Investment",
    keywords: [
      "accountant",
      "accounting",
      "auditor",
      "CPA",
      "ACA",
      "ACCA",
      "tax accountant",
      "staff accountant",
      "senior accountant",
      "controller",
    ],
    titlePatterns: [
      /account(?:ant|ing)/i,
      /\bauditor\b/i,
      /\bCPA\b/i,
      /controller/i,
    ],
  },
  {
    roleType: "Treasury",
    category: "Finance & Investment",
    keywords: [
      "treasury",
      "treasurer",
      "cash management",
      "liquidity management",
      "treasury analyst",
    ],
    titlePatterns: [/treasur(?:y|er)/i, /cash\s*manag/i],
  },
  {
    roleType: "Compliance",
    category: "Finance & Investment",
    keywords: [
      "compliance",
      "regulatory",
      "compliance officer",
      "AML",
      "KYC",
      "financial crimes",
    ],
    titlePatterns: [/compliance/i, /\bAML\b/i, /\bKYC\b/i],
  },
  {
    roleType: "Wealth Management",
    category: "Finance & Investment",
    keywords: [
      "wealth management",
      "financial advisor",
      "wealth advisor",
      "private banking",
      "client advisor",
    ],
    titlePatterns: [
      /wealth\s*(?:manag|advisor)/i,
      /financial\s*advisor/i,
      /private\s*bank/i,
    ],
  },
  {
    roleType: "Credit Analysis",
    category: "Finance & Investment",
    keywords: [
      "credit analyst",
      "credit analysis",
      "credit underwriting",
      "loan analyst",
      "credit risk",
    ],
    titlePatterns: [/credit\s*(?:analyst|underwriter)/i, /loan\s*analyst/i],
  },
  {
    roleType: "Actuarial",
    category: "Finance & Investment",
    keywords: [
      "actuary",
      "actuarial",
      "actuarial analyst",
      "insurance actuary",
      "pricing actuary",
    ],
    titlePatterns: [/actuar(?:y|ial)/i],
  },

  // =====================================================
  // TECHNOLOGY - DEVELOPMENT
  // =====================================================
  {
    roleType: "Software Engineering",
    category: "Technology - Development",
    keywords: [
      "software engineer",
      "software developer",
      "software development",
      "programmer",
      "coder",
      "SWE",
    ],
    titlePatterns: [
      /software\s*(?:engineer|developer)/i,
      /\bSWE\b/i,
      /\bprogrammer\b/i,
    ],
  },
  {
    roleType: "Full Stack Development",
    category: "Technology - Development",
    keywords: [
      "full stack",
      "fullstack",
      "full-stack developer",
      "full stack engineer",
    ],
    titlePatterns: [/full\s*stack/i],
  },
  {
    roleType: "Frontend Development",
    category: "Technology - Development",
    keywords: [
      "frontend",
      "front-end",
      "front end",
      "UI developer",
      "react developer",
      "vue developer",
      "angular developer",
      "web developer",
    ],
    titlePatterns: [
      /front\s*end/i,
      /frontend/i,
      /\bUI\s*developer/i,
      /react\s*dev/i,
      /vue\s*dev/i,
      /angular\s*dev/i,
    ],
  },
  {
    roleType: "Backend Development",
    category: "Technology - Development",
    keywords: [
      "backend",
      "back-end",
      "back end",
      "server-side",
      "API developer",
      "node developer",
      "python developer",
      "java developer",
    ],
    titlePatterns: [
      /back\s*end/i,
      /backend/i,
      /server\s*side/i,
      /\bAPI\s*developer/i,
    ],
  },
  {
    roleType: "Mobile Development",
    category: "Technology - Development",
    keywords: [
      "mobile developer",
      "iOS developer",
      "android developer",
      "mobile engineer",
      "react native",
      "flutter developer",
      "swift developer",
      "kotlin developer",
    ],
    titlePatterns: [
      /mobile\s*(?:developer|engineer)/i,
      /iOS\s*(?:developer|engineer)/i,
      /android\s*(?:developer|engineer)/i,
      /flutter/i,
      /react\s*native/i,
    ],
  },
  {
    roleType: "DevOps Engineering",
    category: "Technology - Development",
    keywords: [
      "devops",
      "devops engineer",
      "SRE",
      "site reliability",
      "platform engineer",
      "infrastructure engineer",
      "release engineer",
    ],
    titlePatterns: [
      /\bdevops\b/i,
      /\bSRE\b/i,
      /site\s*reliability/i,
      /platform\s*engineer/i,
      /infrastructure\s*engineer/i,
    ],
  },
  {
    roleType: "Cloud Engineering",
    category: "Technology - Development",
    keywords: [
      "cloud engineer",
      "AWS engineer",
      "azure engineer",
      "GCP engineer",
      "cloud architect",
      "cloud developer",
    ],
    titlePatterns: [
      /cloud\s*(?:engineer|architect|developer)/i,
      /\bAWS\s*(?:engineer|architect)/i,
      /azure\s*(?:engineer|architect)/i,
    ],
  },
  {
    roleType: "Software Architecture",
    category: "Technology - Development",
    keywords: [
      "software architect",
      "solutions architect",
      "technical architect",
      "enterprise architect",
      "system architect",
    ],
    titlePatterns: [
      /(?:software|solutions|technical|enterprise|system)\s*architect/i,
    ],
  },
  {
    roleType: "QA Engineering",
    category: "Technology - Development",
    keywords: [
      "QA engineer",
      "quality assurance",
      "test engineer",
      "SDET",
      "automation tester",
      "QA analyst",
      "test automation",
    ],
    titlePatterns: [
      /\bQA\s*(?:engineer|analyst)/i,
      /quality\s*assurance/i,
      /test\s*(?:engineer|automation)/i,
      /\bSDET\b/i,
    ],
  },
  {
    roleType: "Database Administration",
    category: "Technology - Development",
    keywords: [
      "DBA",
      "database administrator",
      "database engineer",
      "database developer",
      "SQL developer",
    ],
    titlePatterns: [
      /\bDBA\b/i,
      /database\s*(?:admin|engineer|developer)/i,
      /\bSQL\s*developer/i,
    ],
  },
  {
    roleType: "Embedded Systems",
    category: "Technology - Development",
    keywords: [
      "embedded systems",
      "firmware engineer",
      "embedded software",
      "embedded developer",
      "IoT developer",
      "hardware engineer",
    ],
    titlePatterns: [
      /embedded\s*(?:systems|software|engineer|developer)/i,
      /firmware/i,
      /\bIoT\s*(?:developer|engineer)/i,
    ],
  },
  {
    roleType: "Game Development",
    category: "Technology - Development",
    keywords: [
      "game developer",
      "game programmer",
      "unity developer",
      "unreal developer",
      "game engineer",
      "graphics programmer",
    ],
    titlePatterns: [
      /game\s*(?:developer|programmer|engineer)/i,
      /unity\s*developer/i,
      /unreal\s*developer/i,
    ],
  },
  {
    roleType: "Blockchain Development",
    category: "Technology - Development",
    keywords: [
      "blockchain developer",
      "smart contract",
      "solidity developer",
      "web3 developer",
      "crypto developer",
      "DeFi developer",
    ],
    titlePatterns: [
      /blockchain\s*(?:developer|engineer)/i,
      /smart\s*contract/i,
      /solidity/i,
      /web3/i,
      /\bDeFi\b/i,
    ],
  },

  // =====================================================
  // TECHNOLOGY - DATA & AI
  // =====================================================
  {
    roleType: "Data Science",
    category: "Technology - Data & AI",
    keywords: [
      "data scientist",
      "data science",
      "machine learning scientist",
      "ML scientist",
      "applied scientist",
    ],
    titlePatterns: [
      /data\s*scientist/i,
      /\bML\s*scientist/i,
      /applied\s*scientist/i,
    ],
  },
  {
    roleType: "Data Engineering",
    category: "Technology - Data & AI",
    keywords: [
      "data engineer",
      "data engineering",
      "ETL developer",
      "data pipeline",
      "big data engineer",
      "data platform engineer",
    ],
    titlePatterns: [
      /data\s*engineer/i,
      /\bETL\s*developer/i,
      /big\s*data\s*engineer/i,
    ],
  },
  {
    roleType: "Data Analysis",
    category: "Technology - Data & AI",
    keywords: [
      "data analyst",
      "business analyst",
      "analytics",
      "BI analyst",
      "reporting analyst",
      "insights analyst",
    ],
    titlePatterns: [
      /data\s*analyst/i,
      /business\s*analyst/i,
      /\bBI\s*analyst/i,
      /analytics\s*analyst/i,
    ],
  },
  {
    roleType: "Machine Learning Engineering",
    category: "Technology - Data & AI",
    keywords: [
      "machine learning engineer",
      "ML engineer",
      "AI engineer",
      "deep learning engineer",
      "MLOps engineer",
    ],
    titlePatterns: [
      /machine\s*learning\s*engineer/i,
      /\bML\s*engineer/i,
      /\bAI\s*engineer/i,
      /MLOps/i,
    ],
  },
  {
    roleType: "AI Research",
    category: "Technology - Data & AI",
    keywords: [
      "AI research",
      "research scientist",
      "deep learning researcher",
      "NLP researcher",
      "computer vision researcher",
      "AI researcher",
    ],
    titlePatterns: [
      /\bAI\s*research/i,
      /research\s*scientist/i,
      /deep\s*learning\s*research/i,
      /\bNLP\s*research/i,
    ],
  },
  {
    roleType: "Business Intelligence",
    category: "Technology - Data & AI",
    keywords: [
      "business intelligence",
      "BI developer",
      "BI analyst",
      "tableau developer",
      "power BI developer",
      "data visualization",
    ],
    titlePatterns: [
      /business\s*intelligence/i,
      /\bBI\s*(?:developer|analyst)/i,
      /tableau\s*developer/i,
      /power\s*BI/i,
    ],
  },
  {
    roleType: "NLP Engineering",
    category: "Technology - Data & AI",
    keywords: [
      "NLP engineer",
      "natural language processing",
      "computational linguist",
      "text mining",
      "conversational AI",
    ],
    titlePatterns: [
      /\bNLP\s*engineer/i,
      /natural\s*language/i,
      /computational\s*linguist/i,
    ],
  },
  {
    roleType: "Computer Vision",
    category: "Technology - Data & AI",
    keywords: [
      "computer vision",
      "vision engineer",
      "image processing",
      "video analytics",
      "CV engineer",
    ],
    titlePatterns: [
      /computer\s*vision/i,
      /vision\s*engineer/i,
      /image\s*process/i,
    ],
  },

  // =====================================================
  // TECHNOLOGY - INFRASTRUCTURE
  // =====================================================
  {
    roleType: "Network Engineering",
    category: "Technology - Infrastructure",
    keywords: [
      "network engineer",
      "network administrator",
      "network architect",
      "CCNA",
      "CCNP",
      "network operations",
    ],
    titlePatterns: [/network\s*(?:engineer|admin|architect)/i, /\bNOC\b/i],
  },
  {
    roleType: "Systems Administration",
    category: "Technology - Infrastructure",
    keywords: [
      "systems administrator",
      "sysadmin",
      "linux administrator",
      "windows administrator",
      "system admin",
      "IT administrator",
    ],
    titlePatterns: [
      /system(?:s)?\s*admin/i,
      /sysadmin/i,
      /linux\s*admin/i,
      /windows\s*admin/i,
    ],
  },
  {
    roleType: "IT Support",
    category: "Technology - Infrastructure",
    keywords: [
      "IT support",
      "help desk",
      "desktop support",
      "technical support",
      "IT technician",
      "support engineer",
    ],
    titlePatterns: [
      /\bIT\s*support/i,
      /help\s*desk/i,
      /desktop\s*support/i,
      /technical\s*support/i,
    ],
  },
  {
    roleType: "IT Management",
    category: "Technology - Infrastructure",
    keywords: [
      "IT manager",
      "technology manager",
      "infrastructure manager",
      "IT director",
      "CTO",
      "CIO",
    ],
    titlePatterns: [
      /\bIT\s*(?:manager|director)/i,
      /technology\s*manager/i,
      /\bCTO\b/i,
      /\bCIO\b/i,
    ],
  },

  // =====================================================
  // TECHNOLOGY - SECURITY
  // =====================================================
  {
    roleType: "Security Engineering",
    category: "Technology - Security",
    keywords: [
      "security engineer",
      "cybersecurity engineer",
      "infosec engineer",
      "application security",
      "product security",
    ],
    titlePatterns: [
      /security\s*engineer/i,
      /cybersecurity\s*engineer/i,
      /infosec/i,
      /appsec/i,
    ],
  },
  {
    roleType: "Penetration Testing",
    category: "Technology - Security",
    keywords: [
      "penetration tester",
      "ethical hacker",
      "security researcher",
      "red team",
      "offensive security",
      "pen tester",
    ],
    titlePatterns: [
      /penetration\s*test/i,
      /pen\s*test/i,
      /ethical\s*hacker/i,
      /red\s*team/i,
      /offensive\s*security/i,
    ],
  },
  {
    roleType: "Security Analysis",
    category: "Technology - Security",
    keywords: [
      "security analyst",
      "SOC analyst",
      "threat analyst",
      "vulnerability analyst",
      "blue team",
      "security operations",
    ],
    titlePatterns: [
      /security\s*analyst/i,
      /\bSOC\s*analyst/i,
      /threat\s*analyst/i,
      /blue\s*team/i,
    ],
  },
  {
    roleType: "Security Architecture",
    category: "Technology - Security",
    keywords: [
      "security architect",
      "cybersecurity architect",
      "enterprise security",
      "security design",
    ],
    titlePatterns: [/security\s*architect/i, /cybersecurity\s*architect/i],
  },

  // =====================================================
  // RESEARCH & SCIENCE
  // =====================================================
  {
    roleType: "Scientific Research",
    category: "Research & Science",
    keywords: [
      "research scientist",
      "scientist",
      "researcher",
      "principal scientist",
      "senior scientist",
      "staff scientist",
    ],
    titlePatterns: [
      /research\s*scientist/i,
      /(?:principal|senior|staff)\s*scientist/i,
    ],
  },
  {
    roleType: "Biology Research",
    category: "Research & Science",
    keywords: [
      "biologist",
      "biology researcher",
      "microbiologist",
      "molecular biologist",
      "cell biologist",
      "biochemist",
      "life sciences",
    ],
    titlePatterns: [
      /biolog(?:ist|y\s*research)/i,
      /microbiolog/i,
      /molecular\s*biolog/i,
      /biochemist/i,
    ],
  },
  {
    roleType: "Chemistry Research",
    category: "Research & Science",
    keywords: [
      "chemist",
      "chemistry researcher",
      "organic chemist",
      "analytical chemist",
      "medicinal chemist",
      "polymer chemist",
    ],
    titlePatterns: [/chemist/i, /chemistry\s*research/i],
  },
  {
    roleType: "Physics Research",
    category: "Research & Science",
    keywords: [
      "physicist",
      "physics researcher",
      "theoretical physicist",
      "experimental physicist",
      "applied physicist",
    ],
    titlePatterns: [/physicist/i, /physics\s*research/i],
  },
  {
    roleType: "Pharmaceutical Research",
    category: "Research & Science",
    keywords: [
      "pharmaceutical",
      "drug discovery",
      "pharmacology",
      "pharma research",
      "drug development",
      "clinical development",
    ],
    titlePatterns: [
      /pharmac(?:eutical|ology)/i,
      /drug\s*(?:discovery|development)/i,
    ],
  },
  {
    roleType: "Biotechnology",
    category: "Research & Science",
    keywords: [
      "biotechnology",
      "biotech",
      "genetic engineering",
      "genomics",
      "proteomics",
      "bioinformatics",
    ],
    titlePatterns: [
      /biotech/i,
      /biotechnology/i,
      /genomics/i,
      /bioinformatics/i,
    ],
  },
  {
    roleType: "Materials Science",
    category: "Research & Science",
    keywords: [
      "materials scientist",
      "materials engineer",
      "materials research",
      "nanotechnology",
      "polymer science",
    ],
    titlePatterns: [
      /materials?\s*(?:scientist|engineer|research)/i,
      /nanotechnology/i,
    ],
  },
  {
    roleType: "Environmental Science",
    category: "Research & Science",
    keywords: [
      "environmental scientist",
      "ecologist",
      "environmental research",
      "climate scientist",
      "sustainability researcher",
    ],
    titlePatterns: [
      /environmental\s*scientist/i,
      /ecologist/i,
      /climate\s*scientist/i,
    ],
  },
  {
    roleType: "Neuroscience",
    category: "Research & Science",
    keywords: [
      "neuroscientist",
      "neuroscience",
      "neurobiologist",
      "cognitive scientist",
      "brain research",
    ],
    titlePatterns: [
      /neuro(?:scientist|science|biolog)/i,
      /cognitive\s*scientist/i,
    ],
  },

  // =====================================================
  // ENGINEERING
  // =====================================================
  {
    roleType: "Mechanical Engineering",
    category: "Engineering",
    keywords: [
      "mechanical engineer",
      "mechanical design",
      "CAD engineer",
      "product engineer",
      "design engineer",
    ],
    titlePatterns: [
      /mechanical\s*engineer/i,
      /\bCAD\s*engineer/i,
      /design\s*engineer/i,
    ],
  },
  {
    roleType: "Electrical Engineering",
    category: "Engineering",
    keywords: [
      "electrical engineer",
      "electronics engineer",
      "power engineer",
      "circuit design",
      "PCB design",
    ],
    titlePatterns: [
      /electrical\s*engineer/i,
      /electronics\s*engineer/i,
      /power\s*engineer/i,
    ],
  },
  {
    roleType: "Civil Engineering",
    category: "Engineering",
    keywords: [
      "civil engineer",
      "structural engineer",
      "construction engineer",
      "geotechnical engineer",
      "transportation engineer",
    ],
    titlePatterns: [
      /civil\s*engineer/i,
      /structural\s*engineer/i,
      /construction\s*engineer/i,
    ],
  },
  {
    roleType: "Chemical Engineering",
    category: "Engineering",
    keywords: [
      "chemical engineer",
      "process engineer",
      "petrochemical engineer",
      "refinery engineer",
    ],
    titlePatterns: [
      /chemical\s*engineer/i,
      /process\s*engineer/i,
      /petrochemical/i,
    ],
  },
  {
    roleType: "Biomedical Engineering",
    category: "Engineering",
    keywords: [
      "biomedical engineer",
      "medical device engineer",
      "clinical engineer",
      "biomechanical engineer",
    ],
    titlePatterns: [
      /biomedical\s*engineer/i,
      /medical\s*device/i,
      /clinical\s*engineer/i,
    ],
  },
  {
    roleType: "Manufacturing Engineering",
    category: "Engineering",
    keywords: [
      "manufacturing engineer",
      "production engineer",
      "industrial engineer",
      "process improvement",
    ],
    titlePatterns: [
      /manufacturing\s*engineer/i,
      /production\s*engineer/i,
      /industrial\s*engineer/i,
    ],
  },
  {
    roleType: "Aerospace Engineering",
    category: "Engineering",
    keywords: [
      "aerospace engineer",
      "aeronautical engineer",
      "aircraft engineer",
      "propulsion engineer",
      "avionics engineer",
    ],
    titlePatterns: [
      /aerospace\s*engineer/i,
      /aeronautical/i,
      /aircraft\s*engineer/i,
      /avionics/i,
    ],
  },
  {
    roleType: "Robotics Engineering",
    category: "Engineering",
    keywords: [
      "robotics engineer",
      "automation engineer",
      "controls engineer",
      "robot programmer",
      "mechatronics",
    ],
    titlePatterns: [
      /robotics\s*engineer/i,
      /automation\s*engineer/i,
      /controls\s*engineer/i,
      /mechatronics/i,
    ],
  },
  {
    roleType: "Quality Engineering",
    category: "Engineering",
    keywords: [
      "quality engineer",
      "quality assurance engineer",
      "reliability engineer",
      "quality control",
      "six sigma",
    ],
    titlePatterns: [
      /quality\s*engineer/i,
      /reliability\s*engineer/i,
      /six\s*sigma/i,
    ],
  },

  // =====================================================
  // PRODUCT & DESIGN
  // =====================================================
  {
    roleType: "Product Management",
    category: "Product & Design",
    keywords: [
      "product manager",
      "product owner",
      "technical product manager",
      "product lead",
      "APM",
    ],
    titlePatterns: [
      /product\s*(?:manager|owner|lead)/i,
      /\bTPM\b/i,
      /\bAPM\b/i,
    ],
  },
  {
    roleType: "UX Design",
    category: "Product & Design",
    keywords: [
      "UX designer",
      "user experience",
      "UX researcher",
      "usability",
      "interaction designer",
      "UX lead",
    ],
    titlePatterns: [
      /\bUX\s*(?:designer|researcher|lead)/i,
      /user\s*experience/i,
      /usability/i,
    ],
  },
  {
    roleType: "UI Design",
    category: "Product & Design",
    keywords: [
      "UI designer",
      "user interface",
      "visual designer",
      "interface designer",
      "UI developer",
    ],
    titlePatterns: [
      /\bUI\s*designer/i,
      /user\s*interface/i,
      /visual\s*designer/i,
    ],
  },
  {
    roleType: "Product Design",
    category: "Product & Design",
    keywords: [
      "product designer",
      "UX/UI designer",
      "design lead",
      "staff designer",
    ],
    titlePatterns: [/product\s*designer/i, /UX\/UI/i, /design\s*lead/i],
  },
  {
    roleType: "Graphic Design",
    category: "Product & Design",
    keywords: [
      "graphic designer",
      "visual designer",
      "brand designer",
      "creative designer",
      "digital designer",
    ],
    titlePatterns: [
      /graphic\s*designer/i,
      /brand\s*designer/i,
      /creative\s*designer/i,
    ],
  },
  {
    roleType: "Motion Design",
    category: "Product & Design",
    keywords: [
      "motion designer",
      "motion graphics",
      "animator",
      "2D animator",
      "3D animator",
      "video editor",
    ],
    titlePatterns: [/motion\s*(?:designer|graphics)/i, /\banimator\b/i],
  },
  {
    roleType: "Industrial Design",
    category: "Product & Design",
    keywords: [
      "industrial designer",
      "product designer",
      "ID designer",
      "physical product design",
    ],
    titlePatterns: [/industrial\s*designer/i],
  },

  // =====================================================
  // MARKETING & GROWTH
  // =====================================================
  {
    roleType: "Digital Marketing",
    category: "Marketing & Growth",
    keywords: [
      "digital marketing",
      "online marketing",
      "performance marketing",
      "digital marketer",
      "marketing manager",
    ],
    titlePatterns: [
      /digital\s*market/i,
      /performance\s*market/i,
      /marketing\s*manager/i,
    ],
  },
  {
    roleType: "SEO Specialist",
    category: "Marketing & Growth",
    keywords: [
      "SEO",
      "search engine optimization",
      "SEO specialist",
      "SEO manager",
      "organic search",
    ],
    titlePatterns: [/\bSEO\b/i, /search\s*engine\s*optim/i],
  },
  {
    roleType: "Content Marketing",
    category: "Marketing & Growth",
    keywords: [
      "content marketing",
      "content strategist",
      "content manager",
      "content creator",
      "editorial",
    ],
    titlePatterns: [
      /content\s*(?:marketing|strategist|manager)/i,
      /editorial/i,
    ],
  },
  {
    roleType: "Social Media Marketing",
    category: "Marketing & Growth",
    keywords: [
      "social media",
      "community manager",
      "social media manager",
      "social media specialist",
    ],
    titlePatterns: [/social\s*media/i, /community\s*manager/i],
  },
  {
    roleType: "Growth Marketing",
    category: "Marketing & Growth",
    keywords: [
      "growth marketing",
      "growth manager",
      "growth hacker",
      "user acquisition",
      "growth lead",
    ],
    titlePatterns: [
      /growth\s*(?:marketing|manager|hacker|lead)/i,
      /user\s*acquisition/i,
    ],
  },
  {
    roleType: "Brand Management",
    category: "Marketing & Growth",
    keywords: [
      "brand manager",
      "brand marketing",
      "brand strategist",
      "brand director",
    ],
    titlePatterns: [/brand\s*(?:manager|marketing|strategist|director)/i],
  },
  {
    roleType: "Marketing Analytics",
    category: "Marketing & Growth",
    keywords: [
      "marketing analyst",
      "marketing analytics",
      "marketing data",
      "campaign analyst",
    ],
    titlePatterns: [
      /marketing\s*(?:analyst|analytics)/i,
      /campaign\s*analyst/i,
    ],
  },
  {
    roleType: "Product Marketing",
    category: "Marketing & Growth",
    keywords: [
      "product marketing",
      "PMM",
      "product marketing manager",
      "go-to-market",
    ],
    titlePatterns: [/product\s*marketing/i, /\bPMM\b/i],
  },
  {
    roleType: "Public Relations",
    category: "Marketing & Growth",
    keywords: [
      "public relations",
      "PR manager",
      "communications",
      "media relations",
      "PR specialist",
    ],
    titlePatterns: [
      /public\s*relations/i,
      /\bPR\s*(?:manager|specialist)/i,
      /communications\s*manager/i,
    ],
  },
  {
    roleType: "Email Marketing",
    category: "Marketing & Growth",
    keywords: [
      "email marketing",
      "email specialist",
      "CRM specialist",
      "lifecycle marketing",
      "retention marketing",
    ],
    titlePatterns: [
      /email\s*market/i,
      /\bCRM\s*specialist/i,
      /lifecycle\s*market/i,
    ],
  },

  // =====================================================
  // SALES & BUSINESS DEVELOPMENT
  // =====================================================
  {
    roleType: "Sales Representative",
    category: "Sales & Business Development",
    keywords: [
      "sales representative",
      "sales rep",
      "sales exec",
      "account executive",
      "AE",
      "sales associate",
    ],
    titlePatterns: [
      /sales\s*(?:rep|exec|associate)/i,
      /account\s*executive/i,
      /\bAE\b/i,
    ],
  },
  {
    roleType: "Business Development",
    category: "Sales & Business Development",
    keywords: [
      "business development",
      "BDR",
      "partnership manager",
      "BD manager",
      "strategic partnerships",
    ],
    titlePatterns: [/business\s*development/i, /\bBDR\b/i, /partnership/i],
  },
  {
    roleType: "Account Management",
    category: "Sales & Business Development",
    keywords: [
      "account manager",
      "client manager",
      "key account",
      "strategic account",
      "account director",
    ],
    titlePatterns: [
      /account\s*(?:manager|director)/i,
      /client\s*manager/i,
      /key\s*account/i,
    ],
  },
  {
    roleType: "Sales Engineering",
    category: "Sales & Business Development",
    keywords: [
      "sales engineer",
      "solutions engineer",
      "presales engineer",
      "technical sales",
      "SE",
    ],
    titlePatterns: [/sales\s*engineer/i, /solutions\s*engineer/i, /presales/i],
  },
  {
    roleType: "Inside Sales",
    category: "Sales & Business Development",
    keywords: [
      "inside sales",
      "SDR",
      "sales development representative",
      "inbound sales",
    ],
    titlePatterns: [/inside\s*sales/i, /\bSDR\b/i, /sales\s*development/i],
  },
  {
    roleType: "Customer Success",
    category: "Sales & Business Development",
    keywords: [
      "customer success",
      "CSM",
      "customer success manager",
      "client success",
      "customer experience",
    ],
    titlePatterns: [/customer\s*success/i, /\bCSM\b/i, /client\s*success/i],
  },
  {
    roleType: "Sales Management",
    category: "Sales & Business Development",
    keywords: [
      "sales manager",
      "sales director",
      "VP sales",
      "head of sales",
      "sales leader",
    ],
    titlePatterns: [
      /sales\s*(?:manager|director)/i,
      /\bVP\s*(?:of\s*)?sales/i,
      /head\s*of\s*sales/i,
    ],
  },

  // =====================================================
  // OPERATIONS & SUPPLY CHAIN
  // =====================================================
  {
    roleType: "Operations Management",
    category: "Operations & Supply Chain",
    keywords: [
      "operations manager",
      "operations director",
      "ops manager",
      "COO",
      "operations lead",
    ],
    titlePatterns: [
      /operations\s*(?:manager|director|lead)/i,
      /ops\s*manager/i,
      /\bCOO\b/i,
    ],
  },
  {
    roleType: "Supply Chain Management",
    category: "Operations & Supply Chain",
    keywords: [
      "supply chain",
      "logistics",
      "procurement",
      "sourcing",
      "supply chain manager",
    ],
    titlePatterns: [
      /supply\s*chain/i,
      /logistics/i,
      /procurement/i,
      /sourcing/i,
    ],
  },
  {
    roleType: "Project Management",
    category: "Operations & Supply Chain",
    keywords: [
      "project manager",
      "program manager",
      "delivery manager",
      "PMO",
      "PMP",
    ],
    titlePatterns: [
      /project\s*manager/i,
      /program\s*manager/i,
      /delivery\s*manager/i,
      /\bPMO\b/i,
    ],
  },
  {
    roleType: "Scrum Master",
    category: "Operations & Supply Chain",
    keywords: [
      "scrum master",
      "agile coach",
      "agile project manager",
      "agile lead",
    ],
    titlePatterns: [/scrum\s*master/i, /agile\s*(?:coach|lead)/i],
  },
  {
    roleType: "Business Operations",
    category: "Operations & Supply Chain",
    keywords: [
      "business operations",
      "operations analyst",
      "process analyst",
      "strategy operations",
    ],
    titlePatterns: [
      /business\s*operations/i,
      /operations\s*analyst/i,
      /process\s*analyst/i,
    ],
  },

  // =====================================================
  // HUMAN RESOURCES
  // =====================================================
  {
    roleType: "HR Management",
    category: "Human Resources",
    keywords: [
      "HR manager",
      "human resources manager",
      "people manager",
      "HR director",
      "CHRO",
    ],
    titlePatterns: [
      /\bHR\s*(?:manager|director)/i,
      /human\s*resources\s*manager/i,
      /people\s*(?:manager|director)/i,
      /\bCHRO\b/i,
    ],
  },
  {
    roleType: "Recruiting",
    category: "Human Resources",
    keywords: [
      "recruiter",
      "talent acquisition",
      "technical recruiter",
      "recruiting",
      "sourcer",
      "headhunter",
    ],
    titlePatterns: [/recruiter/i, /talent\s*acquisition/i, /sourcer/i],
  },
  {
    roleType: "HR Business Partner",
    category: "Human Resources",
    keywords: [
      "HR business partner",
      "HRBP",
      "HR consultant",
      "people partner",
    ],
    titlePatterns: [
      /\bHRBP\b/i,
      /\bHR\s*business\s*partner/i,
      /people\s*partner/i,
    ],
  },
  {
    roleType: "Compensation & Benefits",
    category: "Human Resources",
    keywords: [
      "compensation",
      "benefits",
      "total rewards",
      "comp and benefits",
      "compensation analyst",
    ],
    titlePatterns: [
      /compensation/i,
      /benefits\s*(?:manager|analyst)/i,
      /total\s*rewards/i,
    ],
  },
  {
    roleType: "Learning & Development",
    category: "Human Resources",
    keywords: [
      "learning development",
      "training",
      "L&D",
      "organizational development",
      "instructional designer",
    ],
    titlePatterns: [
      /learning\s*(?:and|&)?\s*development/i,
      /\bL&D\b/i,
      /training\s*manager/i,
      /instructional\s*design/i,
    ],
  },

  // =====================================================
  // LEGAL & COMPLIANCE
  // =====================================================
  {
    roleType: "Legal Counsel",
    category: "Legal & Compliance",
    keywords: [
      "attorney",
      "lawyer",
      "legal counsel",
      "in-house counsel",
      "corporate counsel",
      "general counsel",
    ],
    titlePatterns: [
      /attorney/i,
      /lawyer/i,
      /(?:legal|corporate|general)\s*counsel/i,
    ],
  },
  {
    roleType: "Paralegal",
    category: "Legal & Compliance",
    keywords: [
      "paralegal",
      "legal assistant",
      "litigation paralegal",
      "corporate paralegal",
    ],
    titlePatterns: [/paralegal/i, /legal\s*assistant/i],
  },
  {
    roleType: "Compliance Officer",
    category: "Legal & Compliance",
    keywords: [
      "compliance officer",
      "regulatory compliance",
      "compliance manager",
      "compliance analyst",
    ],
    titlePatterns: [
      /compliance\s*(?:officer|manager|analyst)/i,
      /regulatory\s*compliance/i,
    ],
  },
  {
    roleType: "Contract Management",
    category: "Legal & Compliance",
    keywords: [
      "contract manager",
      "contracts",
      "contract negotiation",
      "commercial contracts",
    ],
    titlePatterns: [/contract\s*(?:manager|specialist)/i],
  },

  // =====================================================
  // HEALTHCARE & MEDICAL
  // =====================================================
  {
    roleType: "Nursing",
    category: "Healthcare & Medical",
    keywords: [
      "registered nurse",
      "RN",
      "nurse",
      "staff nurse",
      "clinical nurse",
      "nurse practitioner",
      "NP",
    ],
    titlePatterns: [
      /registered\s*nurse/i,
      /\bRN\b/i,
      /nurse\s*practitioner/i,
      /\bNP\b/i,
      /\bnurse\b/i,
    ],
  },
  {
    roleType: "Physician",
    category: "Healthcare & Medical",
    keywords: [
      "physician",
      "doctor",
      "MD",
      "medical doctor",
      "attending physician",
      "hospitalist",
    ],
    titlePatterns: [/physician/i, /\bMD\b/i, /\bdoctor\b/i, /hospitalist/i],
  },
  {
    roleType: "Pharmacy",
    category: "Healthcare & Medical",
    keywords: [
      "pharmacist",
      "pharmacy",
      "clinical pharmacist",
      "PharmD",
      "pharmacy technician",
    ],
    titlePatterns: [/pharmacist/i, /pharmacy/i, /\bPharmD\b/i],
  },
  {
    roleType: "Clinical Research",
    category: "Healthcare & Medical",
    keywords: [
      "clinical research",
      "clinical trials",
      "CRA",
      "clinical research coordinator",
      "CRC",
    ],
    titlePatterns: [
      /clinical\s*research/i,
      /\bCRA\b/i,
      /\bCRC\b/i,
      /clinical\s*trials/i,
    ],
  },
  {
    roleType: "Healthcare Administration",
    category: "Healthcare & Medical",
    keywords: [
      "healthcare administrator",
      "hospital administrator",
      "medical office manager",
      "healthcare management",
    ],
    titlePatterns: [
      /healthcare\s*admin/i,
      /hospital\s*admin/i,
      /medical\s*office/i,
    ],
  },
  {
    roleType: "Medical Technology",
    category: "Healthcare & Medical",
    keywords: [
      "medical technologist",
      "lab technician",
      "clinical laboratory",
      "medical lab",
    ],
    titlePatterns: [
      /medical\s*technolog/i,
      /lab\s*technician/i,
      /clinical\s*lab/i,
    ],
  },

  // =====================================================
  // EDUCATION & TRAINING
  // =====================================================
  {
    roleType: "Teaching",
    category: "Education & Training",
    keywords: [
      "teacher",
      "educator",
      "instructor",
      "tutor",
      "classroom teacher",
    ],
    titlePatterns: [/\bteacher\b/i, /\beducator\b/i, /\binstructor\b/i],
  },
  {
    roleType: "Professor",
    category: "Education & Training",
    keywords: [
      "professor",
      "assistant professor",
      "associate professor",
      "lecturer",
      "faculty",
    ],
    titlePatterns: [/professor/i, /lecturer/i, /faculty/i],
  },
  {
    roleType: "Instructional Design",
    category: "Education & Training",
    keywords: [
      "instructional designer",
      "learning designer",
      "curriculum developer",
      "e-learning developer",
    ],
    titlePatterns: [
      /instructional\s*design/i,
      /learning\s*design/i,
      /curriculum/i,
      /e-learning/i,
    ],
  },
  {
    roleType: "Academic Administration",
    category: "Education & Training",
    keywords: [
      "academic administrator",
      "dean",
      "provost",
      "registrar",
      "academic affairs",
    ],
    titlePatterns: [/academic\s*admin/i, /\bdean\b/i, /provost/i, /registrar/i],
  },

  // =====================================================
  // CREATIVE & MEDIA
  // =====================================================
  {
    roleType: "Copywriting",
    category: "Creative & Media",
    keywords: [
      "copywriter",
      "content writer",
      "creative writer",
      "advertising copywriter",
      "copy editor",
    ],
    titlePatterns: [/copywriter/i, /content\s*writer/i, /creative\s*writer/i],
  },
  {
    roleType: "Video Production",
    category: "Creative & Media",
    keywords: [
      "video editor",
      "video producer",
      "videographer",
      "post-production",
      "video production",
    ],
    titlePatterns: [
      /video\s*(?:editor|producer|production)/i,
      /videographer/i,
      /post-production/i,
    ],
  },
  {
    roleType: "Photography",
    category: "Creative & Media",
    keywords: [
      "photographer",
      "photo editor",
      "commercial photographer",
      "photography",
    ],
    titlePatterns: [/photograph/i, /photo\s*editor/i],
  },
  {
    roleType: "Journalism",
    category: "Creative & Media",
    keywords: [
      "journalist",
      "reporter",
      "news writer",
      "editor",
      "correspondent",
    ],
    titlePatterns: [/journalist/i, /reporter/i, /correspondent/i],
  },
  {
    roleType: "Audio Production",
    category: "Creative & Media",
    keywords: [
      "audio engineer",
      "sound designer",
      "podcast producer",
      "music producer",
      "audio producer",
    ],
    titlePatterns: [
      /audio\s*(?:engineer|producer)/i,
      /sound\s*design/i,
      /podcast/i,
      /music\s*producer/i,
    ],
  },

  // =====================================================
  // CUSTOMER SERVICE
  // =====================================================
  {
    roleType: "Customer Service",
    category: "Customer Service",
    keywords: [
      "customer service",
      "customer support",
      "service representative",
      "call center",
      "contact center",
    ],
    titlePatterns: [
      /customer\s*(?:service|support)/i,
      /service\s*rep/i,
      /call\s*center/i,
    ],
  },
  {
    roleType: "Technical Support",
    category: "Customer Service",
    keywords: [
      "technical support",
      "tech support",
      "support engineer",
      "customer support engineer",
      "TSE",
    ],
    titlePatterns: [
      /technical\s*support/i,
      /tech\s*support/i,
      /support\s*engineer/i,
    ],
  },

  // =====================================================
  // CONSULTING
  // =====================================================
  {
    roleType: "Management Consulting",
    category: "Consulting",
    keywords: [
      "management consultant",
      "strategy consultant",
      "business consultant",
      "consulting analyst",
    ],
    titlePatterns: [
      /management\s*consultant/i,
      /strategy\s*consultant/i,
      /business\s*consultant/i,
      /consulting\s*analyst/i,
    ],
  },
  {
    roleType: "IT Consulting",
    category: "Consulting",
    keywords: [
      "IT consultant",
      "technology consultant",
      "digital consultant",
      "technical consultant",
    ],
    titlePatterns: [
      /\bIT\s*consultant/i,
      /technology\s*consultant/i,
      /digital\s*consultant/i,
    ],
  },
  {
    roleType: "Financial Consulting",
    category: "Consulting",
    keywords: [
      "financial consultant",
      "finance consultant",
      "advisory",
      "financial advisory",
    ],
    titlePatterns: [
      /financial\s*(?:consultant|advisory)/i,
      /finance\s*consultant/i,
    ],
  },

  // =====================================================
  // EXECUTIVE & LEADERSHIP
  // =====================================================
  {
    roleType: "Executive Leadership",
    category: "Executive & Leadership",
    keywords: [
      "CEO",
      "chief executive",
      "president",
      "managing director",
      "executive director",
    ],
    titlePatterns: [
      /\bCEO\b/i,
      /chief\s*executive/i,
      /\bpresident\b/i,
      /managing\s*director/i,
    ],
  },
  {
    roleType: "Chief Technology Officer",
    category: "Executive & Leadership",
    keywords: [
      "CTO",
      "chief technology officer",
      "VP engineering",
      "head of engineering",
    ],
    titlePatterns: [
      /\bCTO\b/i,
      /chief\s*technology/i,
      /\bVP\s*(?:of\s*)?engineering/i,
      /head\s*of\s*engineering/i,
    ],
  },
  {
    roleType: "Chief Financial Officer",
    category: "Executive & Leadership",
    keywords: [
      "CFO",
      "chief financial officer",
      "VP finance",
      "head of finance",
    ],
    titlePatterns: [
      /\bCFO\b/i,
      /chief\s*financial/i,
      /\bVP\s*(?:of\s*)?finance/i,
    ],
  },
  {
    roleType: "Chief Operating Officer",
    category: "Executive & Leadership",
    keywords: [
      "COO",
      "chief operating officer",
      "VP operations",
      "head of operations",
    ],
    titlePatterns: [/\bCOO\b/i, /chief\s*operating/i],
  },
  {
    roleType: "Chief Marketing Officer",
    category: "Executive & Leadership",
    keywords: [
      "CMO",
      "chief marketing officer",
      "VP marketing",
      "head of marketing",
    ],
    titlePatterns: [
      /\bCMO\b/i,
      /chief\s*marketing/i,
      /\bVP\s*(?:of\s*)?marketing/i,
    ],
  },
  {
    roleType: "Chief Product Officer",
    category: "Executive & Leadership",
    keywords: ["CPO", "chief product officer", "VP product", "head of product"],
    titlePatterns: [
      /\bCPO\b/i,
      /chief\s*product/i,
      /\bVP\s*(?:of\s*)?product/i,
      /head\s*of\s*product/i,
    ],
  },

  // =====================================================
  // ADMINISTRATIVE
  // =====================================================
  {
    roleType: "Executive Assistant",
    category: "Administrative",
    keywords: [
      "executive assistant",
      "EA",
      "executive admin",
      "chief of staff",
    ],
    titlePatterns: [/executive\s*assistant/i, /\bEA\b/i, /chief\s*of\s*staff/i],
  },
  {
    roleType: "Administrative Assistant",
    category: "Administrative",
    keywords: [
      "administrative assistant",
      "admin assistant",
      "office administrator",
      "receptionist",
    ],
    titlePatterns: [
      /admin(?:istrative)?\s*assistant/i,
      /office\s*admin/i,
      /receptionist/i,
    ],
  },
  {
    roleType: "Office Management",
    category: "Administrative",
    keywords: [
      "office manager",
      "facilities manager",
      "workplace manager",
      "office operations",
    ],
    titlePatterns: [
      /office\s*manager/i,
      /facilities\s*manager/i,
      /workplace\s*manager/i,
    ],
  },
];

// Create a map for quick lookup by role type name
export const roleTypeMap = new Map<string, RoleTypeDefinition>(
  roleTypes.map((rt) => [rt.roleType.toLowerCase(), rt]),
);

// Get all unique role type names
export const allRoleTypeNames = roleTypes.map((rt) => rt.roleType);

// Get role types by category
export function getRoleTypesByCategory(
  category: RoleCategory,
): RoleTypeDefinition[] {
  return roleTypes.filter((rt) => rt.category === category);
}
