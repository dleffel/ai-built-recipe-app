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
    instructions: [
      'Preheat oven to 350F',
      'Mix dry ingredients',
      'Mix wet ingredients',
      'Combine and form cookies',
      'Bake for 10 minutes'
    ],
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

      // Remove sourceUrl and imageUrl from result for comparison
      const { sourceUrl, imageUrl, ...resultWithoutUrls } = result;
      expect(resultWithoutUrls).toEqual(mockGptResponse);
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

    it('should throw URLFetchError when webpage fetch fails with Axios error', async () => {
      const axiosError = new Error('Network error');
      (axiosError as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(axiosError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(URLFetchError);
    });

    it('should throw original error when webpage fetch fails with non-Axios error', async () => {
      const customError = new Error('Custom error');
      mockedAxios.get.mockRejectedValueOnce(customError);
      mockedAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('Custom error');

      expect(mockedAxios.isAxiosError).toHaveBeenCalledWith(customError);
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

    it('should handle non-array ingredients and instructions fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockResponseWithStringIngredients = {
        choices: [{
          message: {
            content: JSON.stringify({
              ...mockGptResponse,
              ingredients: '2 cups flour, 1 cup sugar', // String instead of array
              instructions: 'Mix ingredients and bake at 350F' // String instead of array
            })
          }
        }]
      };

      // Get the mocked OpenAI constructor
      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockResponseWithStringIngredients);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);

      // Verify ingredients are converted to array
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(result.ingredients.length).toBeGreaterThan(0);

      // Verify instructions are converted to array
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(result.instructions.length).toBeGreaterThan(0);
    });

    it('should throw error when OpenAI API key is not set', async () => {
      const oldKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = '';
      
      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('OPENAI_API_KEY environment variable is not set');
      
      // Restore the API key
      process.env.OPENAI_API_KEY = oldKey;
    });

    it('should handle HTML without main content container', async () => {
      const htmlWithoutArticle = '<body><p>Some text</p></body>';
      mockedAxios.get.mockResolvedValueOnce({ data: htmlWithoutArticle });

      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify(mockGptResponse)
          }
        }]
      };

      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockOpenAIResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      const { sourceUrl, imageUrl, ...resultWithoutUrls } = result;
      expect(resultWithoutUrls).toEqual(mockGptResponse);
    });

    it('should throw RecipeExtractionError when GPT returns no response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockEmptyResponse = {
        choices: [{ message: { content: null } }]
      };

      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockEmptyResponse);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(new RecipeExtractionError('No response from GPT'));
    });

    it('should throw RecipeExtractionError when ingredients are empty after cleaning', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const mockResponseWithEmptyIngredients = {
        choices: [{
          message: {
            content: JSON.stringify({
              ...mockGptResponse,
              ingredients: ['', '  ', '\n'] // Only empty or whitespace ingredients
            })
          }
        }]
      };

      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockResponseWithEmptyIngredients);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow(new RecipeExtractionError('No valid ingredients found'));
    });

    it('should handle unknown error types in GPT extraction', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

      const MockOpenAI = require('openai');
      const mockInstance = MockOpenAI();
      const unknownError = new Error('Unknown error');
      mockInstance.chat.completions.create.mockRejectedValueOnce(unknownError);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('Unknown error');
    });

    // New tests for HTML cleaning and content selection
    describe('HTML cleaning and content selection', () => {
      it('should extract recipe-specific content when available', async () => {
        const htmlWithRecipeContent = `
          <div>Header content</div>
          <div class="recipe-container">
            <h1>Recipe Title</h1>
            <div class="ingredients">Ingredient list</div>
            <div class="instructions">Recipe steps</div>
          </div>
          <div>Footer content</div>
        `;
        
        mockedAxios.get.mockResolvedValueOnce({ data: htmlWithRecipeContent });
        
        const mockOpenAIResponse = {
          choices: [{
            message: {
              content: JSON.stringify(mockGptResponse)
            }
          }]
        };

        const MockOpenAI = require('openai');
        const mockInstance = MockOpenAI();
        mockInstance.chat.completions.create.mockResolvedValueOnce(mockOpenAIResponse);

        const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
        expect(result).toBeDefined();
        expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining('Recipe Title')
              })
            ])
          })
        );
      });

      it('should handle HTML with comments and script tags', async () => {
        const htmlWithComments = `
          <!-- Header comment -->
          <script>var x = 1;</script>
          <style>.recipe { color: red; }</style>
          <div class="recipe">
            <h1>Recipe Title</h1>
            <!-- Ingredient section -->
            <ul>
              <li>Ingredient 1</li>
              <li>Ingredient 2</li>
            </ul>
          </div>
          <!-- Footer comment -->
        `;
        
        mockedAxios.get.mockResolvedValueOnce({ data: htmlWithComments });
        
        const mockOpenAIResponse = {
          choices: [{
            message: {
              content: JSON.stringify(mockGptResponse)
            }
          }]
        };

        const MockOpenAI = require('openai');
        const mockInstance = MockOpenAI();
        mockInstance.chat.completions.create.mockResolvedValueOnce(mockOpenAIResponse);

        const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
        expect(result).toBeDefined();
        expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.not.stringContaining('var x = 1')
              })
            ])
          })
        );
      });

      it('should handle recipe with all optional fields', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });

        const fullRecipeResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                ...mockGptResponse,
                description: 'Detailed description',
                servings: 8,
                prepTime: 20,
                cookTime: 30,
                imageUrl: 'https://example.com/image.jpg'
              })
            }
          }]
        };

        const MockOpenAI = require('openai');
        const mockInstance = MockOpenAI();
        mockInstance.chat.completions.create.mockResolvedValueOnce(fullRecipeResponse);

        const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
        expect(result.description).toBe('Detailed description');
        expect(result.servings).toBe(8);
        expect(result.prepTime).toBe(20);
        expect(result.cookTime).toBe(30);
        expect(result.imageUrl).toBe('https://example.com/image.jpg');
      });
    });
  });
});