export interface JobItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export interface JobDetails {
  company: string;
  position: string;
  location: string;
  fullTitle: string;
}

export interface JobAnalysis {
  certifications: string[];
  yearsExperience: string;
  expertise: string[];
  jobType: string;
  companyType: string;
  keywords: string[];
  academicDegrees: string[];
  majors: string[];
  software: string[];
  programmingSkills: string[];
}

export interface CronJobResult {
  total: number;
  sent: number;
  failed: number;
}
