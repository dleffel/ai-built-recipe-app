import { RecipeExtractionService, URLFetchError, RecipeExtractionError } from '../services/recipeExtractionService';
import { CreateRecipeDTO } from '../services/recipeService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock OpenAI
jest.mock('openai', () => {
  const mockChatCompletions = {
    create: jest.fn()
  };

  // Mock the default export to match how the service uses it
  const MockOpenAI = jest.fn(() => ({
    chat: {
      completions: mockChatCompletions
    }
  }));

  return MockOpenAI;
});

// Mock URL constructor to control URL validation
const mockURL = jest.fn();
global.URL = mockURL as any;

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
    // Default URL constructor to succeed
    mockURL.mockImplementation((url) => ({ href: url }));
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

      // Get the mocked OpenAI constructor
      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockOpenAIResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);

      expect(result).toEqual(mockGptResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(mockValidUrl);
      expect(mockInstance.chat.completions.create).toHaveBeenCalled();
    });

    it('should throw URLFetchError for invalid URL', async () => {
      // Mock URL constructor to throw
      mockURL.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      await expect(
        RecipeExtractionService.extractRecipeFromUrl('invalid-url')
      ).rejects.toThrow(URLFetchError);
    });

    it('should throw URLFetchError when webpage fetch fails', async () => {
      // Mock axios to throw a URLFetchError
      mockedAxios.get.mockRejectedValueOnce(new URLFetchError('Network error'));

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

      // Get the mocked OpenAI constructor
      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockInvalidResponse);

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

      // Get the mocked OpenAI constructor
      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockIncompleteResponse);

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

      // Get the mocked OpenAI constructor
      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockResponseWithStringIngredients);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);

      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(result.ingredients.length).toBeGreaterThan(0);
    });

    it('should throw error when OpenAI API key is not set', async () => {
      // Clear API key and reset mocks
      process.env.OPENAI_API_KEY = '';
      jest.clearAllMocks();

      // Reset initialized state to force re-initialization
      // @ts-ignore - accessing private static field for testing
      RecipeExtractionService.initialized = false;

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('OPENAI_API_KEY environment variable is not set');

      // Verify we didn't make any HTTP requests
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});