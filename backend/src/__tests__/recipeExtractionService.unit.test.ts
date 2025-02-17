import { RecipeExtractionService, URLFetchError, RecipeExtractionError } from '../services/recipeExtractionService';
import { CreateRecipeDTO } from '../services/recipeService';
import axios from 'axios';
import { OpenAI } from 'openai';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('RecipeExtractionService Unit Tests', () => {
  const mockValidUrl = 'https://example.com/recipe';
  const mockHtmlContent = `
    <article>
      <h1>Chocolate Chip Cookies</h1>
      <p>Classic homemade cookies</p>
      <ul>
        <li>2 cups flour</li>
        <li>1 cup sugar</li>
      </ul>
      <div>
        Mix ingredients and bake at 350F
      </div>
    </article>
  `;

  const mockGptResponse = {
    title: 'Chocolate Chip Cookies',
    description: 'Classic homemade cookies',
    ingredients: ['2 cups flour', '1 cup sugar'],
    instructions: 'Mix ingredients and bake at 350F',
    servings: 12,
    prepTime: 15,
    cookTime: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  describe('extractRecipeFromUrl', () => {
    it('should successfully extract recipe from URL', async () => {
      // Mock axios response
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify(mockGptResponse)
          }
        }]
      };

      const openaiInstance = new OpenAI({ apiKey: 'test-key' });
      openaiInstance.chat.completions.create = jest.fn().mockResolvedValueOnce(mockOpenAIResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);

      expect(result).toEqual(mockGptResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(mockValidUrl);
      expect(openaiInstance.chat.completions.create).toHaveBeenCalled();
    });

    it('should throw URLFetchError for invalid URL', async () => {
      await expect(
        RecipeExtractionService.extractRecipeFromUrl('invalid-url')
      ).rejects.toThrow(URLFetchError);
    });

    it('should throw URLFetchError when webpage fetch fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(URLFetchError);
    });

    it('should throw RecipeExtractionError when GPT response is invalid', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockInvalidResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      const openaiInstance = new OpenAI({ apiKey: 'test-key' });
      openaiInstance.chat.completions.create = jest.fn().mockResolvedValueOnce(mockInvalidResponse);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(RecipeExtractionError);
    });

    it('should throw RecipeExtractionError when required fields are missing', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockIncompleteResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Chocolate Chip Cookies',
              // Missing ingredients and instructions
            })
          }
        }]
      };

      const openaiInstance = new OpenAI({ apiKey: 'test-key' });
      openaiInstance.chat.completions.create = jest.fn().mockResolvedValueOnce(mockIncompleteResponse);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(RecipeExtractionError);
    });

    it('should handle non-array ingredients field', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockResponseWithStringIngredients = {
        choices: [{
          message: {
            content: JSON.stringify({
              ...mockGptResponse,
              ingredients: '2 cups flour, 1 cup sugar' // String instead of array
            })
          }
        }]
      };

      const openaiInstance = new OpenAI({ apiKey: 'test-key' });
      openaiInstance.chat.completions.create = jest.fn().mockResolvedValueOnce(mockResponseWithStringIngredients);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);

      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(result.ingredients.length).toBeGreaterThan(0);
    });

    it('should throw error when OpenAI API key is not set', async () => {
      process.env.OPENAI_API_KEY = '';

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('OPENAI_API_KEY environment variable is not set');
    });
  });
});