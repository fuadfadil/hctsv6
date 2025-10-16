import { z } from 'zod';

// ICD-11 API response schemas
export const ICD11CategorySchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const ICD11SearchResultSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ICD11Category = z.infer<typeof ICD11CategorySchema>;
export type ICD11SearchResult = z.infer<typeof ICD11SearchResultSchema>;

// ICD-11 API client
export class ICD11API {
  private static readonly BASE_URL = 'https://id.who.int/icd/entity';
  private static readonly SEARCH_URL = 'https://id.who.int/icd/entity/search';

  /**
   * Search for ICD-11 codes
   */
  static async searchCodes(query: string, limit: number = 20): Promise<ICD11SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        useFlexisearch: 'true',
        flatResults: 'true',
      });

      const response = await fetch(`${this.SEARCH_URL}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'API-Version': 'v2',
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        throw new Error(`ICD-11 API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform WHO API response to our schema
      return data.destinationEntities?.map((entity: any) => ({
        id: entity.id,
        code: entity.code,
        title: entity.title,
        description: entity.definition?.[0]?.['@value'] || '',
        parentId: entity.parent?.[0],
        isActive: entity.active || true,
      })) || [];
    } catch (error) {
      console.error('Error searching ICD-11 codes:', error);
      throw new Error('Failed to search ICD-11 codes');
    }
  }

  /**
   * Get ICD-11 category details by code
   */
  static async getCategoryByCode(code: string): Promise<ICD11Category | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/${code}`, {
        headers: {
          'Accept': 'application/json',
          'API-Version': 'v2',
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`ICD-11 API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        code: data.code,
        title: data.title,
        description: data.definition?.[0]?.['@value'] || '',
        parentId: data.parent?.[0],
        isActive: data.active || true,
      };
    } catch (error) {
      console.error('Error fetching ICD-11 category:', error);
      throw new Error('Failed to fetch ICD-11 category');
    }
  }

  /**
   * Validate ICD-11 code
   */
  static async validateCode(code: string): Promise<boolean> {
    try {
      const category = await this.getCategoryByCode(code);
      return category !== null && category.isActive;
    } catch (error) {
      console.error('Error validating ICD-11 code:', error);
      return false;
    }
  }

  /**
   * Get complexity score based on ICD-11 category
   * Higher complexity codes typically have longer codes or are in certain chapters
   */
  static getComplexityScore(code: string): number {
    // Simple heuristic: longer codes tend to be more specific/complex
    const length = code.length;
    if (length <= 3) return 1.0; // Chapter level
    if (length <= 5) return 2.0; // Block level
    if (length <= 7) return 3.0; // Category level
    return 4.0; // Subcategory level - highest complexity
  }

  /**
   * Get service category from ICD-11 code
   */
  static getServiceCategory(code: string): string {
    const firstChar = code.charAt(0);
    const chapterMap: Record<string, string> = {
      'A': 'Infectious diseases',
      'B': 'Infectious diseases',
      'C': 'Neoplasms',
      'D': 'Blood disorders',
      'E': 'Endocrine disorders',
      'F': 'Mental disorders',
      'G': 'Nervous system',
      'H': 'Eye and ear',
      'I': 'Circulatory system',
      'J': 'Respiratory system',
      'K': 'Digestive system',
      'L': 'Skin disorders',
      'M': 'Musculoskeletal',
      'N': 'Genitourinary',
      'O': 'Pregnancy/Childbirth',
      'P': 'Perinatal conditions',
      'Q': 'Congenital anomalies',
      'R': 'Symptoms/Signs',
      'S': 'Injury/Poisoning',
      'T': 'External causes',
      'U': 'Special purposes',
      'V': 'Health status',
      'W': 'Health services',
      'X': 'Extension codes',
      'Y': 'Extension codes',
      'Z': 'Extension codes',
    };

    return chapterMap[firstChar] || 'General healthcare';
  }
}

// Local ICD-11 data cache for common codes
export const COMMON_ICD11_CODES: Record<string, ICD11Category> = {
  'CA00': {
    id: 'CA00',
    code: 'CA00',
    title: 'Malignant neoplasms',
    description: 'Neoplasms of uncertain or unknown behaviour',
    isActive: true,
  },
  'BA00': {
    id: 'BA00',
    code: 'BA00',
    title: 'Acute nasopharyngitis',
    description: 'Common cold',
    isActive: true,
  },
  'DA00': {
    id: 'DA00',
    code: 'DA00',
    title: 'Iron deficiency anaemia',
    description: 'Anaemia due to iron deficiency',
    isActive: true,
  },
  // Add more common codes as needed
};