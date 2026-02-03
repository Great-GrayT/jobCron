/**
 * Role Type Extractor
 * Fuzzy matches job titles and descriptions to role types from the dictionary
 */

import { roleTypes, RoleTypeDefinition, ROLE_CATEGORIES, RoleCategory } from './dictionaries/role-types';

export interface RoleTypeMatch {
  roleType: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  matchedOn: 'title' | 'keywords' | 'description';
  score: number;
}

export class RoleTypeExtractor {
  /**
   * Extract the best matching role type from job data
   */
  static extractRoleType(
    title: string,
    keywords: string[] = [],
    description: string = '',
    industry: string = ''
  ): RoleTypeMatch | null {
    const matches: RoleTypeMatch[] = [];

    // Normalize inputs
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());
    const normalizedDescription = description.toLowerCase();
    const normalizedIndustry = industry.toLowerCase().trim();

    for (const roleTypeDef of roleTypes) {
      let score = 0;
      let matchedOn: 'title' | 'keywords' | 'description' = 'description';
      let highestMatch = 0;

      // 1. Check title patterns (highest priority)
      for (const pattern of roleTypeDef.titlePatterns) {
        if (pattern.test(title)) {
          const patternScore = 100;
          if (patternScore > highestMatch) {
            highestMatch = patternScore;
            matchedOn = 'title';
          }
        }
      }

      // 2. Check for exact/partial keyword matches in title
      for (const keyword of roleTypeDef.keywords) {
        const keywordLower = keyword.toLowerCase();

        // Exact match in title
        if (normalizedTitle.includes(keywordLower)) {
          const titleScore = 90 + (keywordLower.length / normalizedTitle.length) * 10;
          if (titleScore > highestMatch) {
            highestMatch = titleScore;
            matchedOn = 'title';
          }
        }
      }

      // 3. Check job keywords array
      for (const keyword of roleTypeDef.keywords) {
        const keywordLower = keyword.toLowerCase();

        for (const jobKeyword of normalizedKeywords) {
          if (jobKeyword.includes(keywordLower) || keywordLower.includes(jobKeyword)) {
            const keywordScore = 70;
            if (keywordScore > highestMatch) {
              highestMatch = keywordScore;
              matchedOn = 'keywords';
            }
          }
        }
      }

      // 4. Check description (lower priority, but consider keyword density)
      if (normalizedDescription.length > 0 && highestMatch < 70) {
        let descriptionMatches = 0;
        for (const keyword of roleTypeDef.keywords) {
          const keywordLower = keyword.toLowerCase();
          const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = normalizedDescription.match(regex);
          if (matches) {
            descriptionMatches += matches.length;
          }
        }

        if (descriptionMatches > 0) {
          // Score based on keyword density in description
          const descriptionScore = Math.min(60, 30 + descriptionMatches * 5);
          if (descriptionScore > highestMatch) {
            highestMatch = descriptionScore;
            matchedOn = 'description';
          }
        }
      }

      // 5. Category/Industry boost
      if (highestMatch > 0 && normalizedIndustry) {
        const categoryLower = roleTypeDef.category.toLowerCase();
        if (categoryLower.includes(normalizedIndustry) || normalizedIndustry.includes(categoryLower.split(' ')[0])) {
          highestMatch += 5;
        }
      }

      score = highestMatch;

      if (score > 0) {
        matches.push({
          roleType: roleTypeDef.roleType,
          category: roleTypeDef.category,
          confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
          matchedOn,
          score,
        });
      }
    }

    // Sort by score and return the best match
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0 && matches[0].score >= 30) {
      return matches[0];
    }

    // Try fallback matching based on common title patterns
    const fallbackMatch = this.fallbackMatch(normalizedTitle, normalizedIndustry);
    if (fallbackMatch) {
      return fallbackMatch;
    }

    return null;
  }

  /**
   * Fallback matching for common patterns not in the dictionary
   */
  private static fallbackMatch(title: string, industry: string): RoleTypeMatch | null {
    // Common patterns
    const patterns: Array<{ pattern: RegExp; roleType: string; category: string }> = [
      { pattern: /\bengineer\b/i, roleType: 'Software Engineering', category: 'Technology - Development' },
      { pattern: /\bdeveloper\b/i, roleType: 'Software Engineering', category: 'Technology - Development' },
      { pattern: /\banalyst\b/i, roleType: 'Data Analysis', category: 'Technology - Data & AI' },
      { pattern: /\bmanager\b/i, roleType: 'Operations Management', category: 'Operations & Supply Chain' },
      { pattern: /\bdirector\b/i, roleType: 'Executive Leadership', category: 'Executive & Leadership' },
      { pattern: /\bconsultant\b/i, roleType: 'Management Consulting', category: 'Consulting' },
      { pattern: /\bdesigner\b/i, roleType: 'Product Design', category: 'Product & Design' },
      { pattern: /\bresearch/i, roleType: 'Scientific Research', category: 'Research & Science' },
      { pattern: /\bscientist\b/i, roleType: 'Scientific Research', category: 'Research & Science' },
      { pattern: /\bsales\b/i, roleType: 'Sales Representative', category: 'Sales & Business Development' },
      { pattern: /\bmarketing\b/i, roleType: 'Digital Marketing', category: 'Marketing & Growth' },
      { pattern: /\bfinance\b/i, roleType: 'Financial Analysis', category: 'Finance & Investment' },
      { pattern: /\baccountant\b/i, roleType: 'Accounting', category: 'Finance & Investment' },
      { pattern: /\bnurse\b/i, roleType: 'Nursing', category: 'Healthcare & Medical' },
      { pattern: /\bteacher\b/i, roleType: 'Teaching', category: 'Education & Training' },
      { pattern: /\blawyer\b|\battorney\b/i, roleType: 'Legal Counsel', category: 'Legal & Compliance' },
      { pattern: /\bHR\b|\bhuman resources\b/i, roleType: 'HR Management', category: 'Human Resources' },
      { pattern: /\brecruiter\b/i, roleType: 'Recruiting', category: 'Human Resources' },
      { pattern: /\bwriter\b/i, roleType: 'Copywriting', category: 'Creative & Media' },
      { pattern: /\beditor\b/i, roleType: 'Video Production', category: 'Creative & Media' },
      { pattern: /\bsupport\b/i, roleType: 'Customer Service', category: 'Customer Service' },
    ];

    // Adjust based on industry context
    for (const { pattern, roleType, category } of patterns) {
      if (pattern.test(title)) {
        // Adjust roleType based on industry if applicable
        let adjustedRoleType = roleType;
        let adjustedCategory = category;

        if (industry) {
          // Finance context
          if (industry.includes('finance') || industry.includes('banking') || industry.includes('investment')) {
            if (/analyst/i.test(title)) {
              adjustedRoleType = 'Financial Analysis';
              adjustedCategory = 'Finance & Investment';
            }
            if (/engineer/i.test(title)) {
              adjustedRoleType = 'Quantitative Research';
              adjustedCategory = 'Finance & Investment';
            }
          }
          // Technology context
          if (industry.includes('technology') || industry.includes('software') || industry.includes('tech')) {
            if (/analyst/i.test(title)) {
              adjustedRoleType = 'Data Analysis';
              adjustedCategory = 'Technology - Data & AI';
            }
          }
          // Healthcare context
          if (industry.includes('healthcare') || industry.includes('medical') || industry.includes('health')) {
            if (/analyst/i.test(title)) {
              adjustedRoleType = 'Healthcare Administration';
              adjustedCategory = 'Healthcare & Medical';
            }
            if (/research/i.test(title)) {
              adjustedRoleType = 'Clinical Research';
              adjustedCategory = 'Healthcare & Medical';
            }
          }
        }

        return {
          roleType: adjustedRoleType,
          category: adjustedCategory,
          confidence: 'low',
          matchedOn: 'title',
          score: 35,
        };
      }
    }

    return null;
  }

  /**
   * Get all available role types
   */
  static getAllRoleTypes(): string[] {
    return roleTypes.map(rt => rt.roleType);
  }

  /**
   * Get all categories
   */
  static getAllCategories(): readonly string[] {
    return ROLE_CATEGORIES;
  }

  /**
   * Get role types by category
   */
  static getRoleTypesByCategory(category: RoleCategory): RoleTypeDefinition[] {
    return roleTypes.filter(rt => rt.category === category);
  }

  /**
   * Validate if a role type exists
   */
  static isValidRoleType(roleType: string): boolean {
    return roleTypes.some(rt => rt.roleType.toLowerCase() === roleType.toLowerCase());
  }

  /**
   * Get the category for a role type
   */
  static getCategoryForRoleType(roleType: string): string | null {
    const rt = roleTypes.find(r => r.roleType.toLowerCase() === roleType.toLowerCase());
    return rt ? rt.category : null;
  }
}
