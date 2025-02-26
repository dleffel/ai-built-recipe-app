import { RecipeExtractionService } from '../services/recipeExtractionService';
import axios from 'axios';
import OpenAI from 'openai';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('RecipeExtractionService', () => {
  const mockValidUrl = 'https://example.com/recipe';
  const mockHtmlContent = `
    <div class="recipe-container">
      <h1>Test Recipe</h1>
      <div class="ingredients">
        <ul>
          <li>2 cups flour</li>
          <li>1 cup sugar</li>
        </ul>
      </div>
      <div class="instructions">
        <ol>
          <li>Mix dry ingredients</li>
          <li>Add wet ingredients</li>
          <li>Bake at 350F</li>
        </ol>
      </div>
    </div>
  `;

  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });
      const mockGptResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              ingredients: ['2 cups flour', '1 cup sugar'],
              instructions: ['Mix dry ingredients', 'Add wet ingredients', 'Bake at 350F']
            })
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
    });

    it('should reject invalid URLs', async () => {
      await expect(
        RecipeExtractionService.extractRecipeFromUrl('not-a-url')
      ).rejects.toThrow('Invalid URL format');
    });
  });

  describe('HTML Cleaning', () => {
    it('should handle HTML with scripts and comments', async () => {
      const htmlWithScripts = `
        <!-- Header comment -->
        <script>var x = 1;</script>
        <style>.recipe { color: red; }</style>
        ${mockHtmlContent}
        <!-- Footer comment -->
      `;
      
      mockedAxios.get.mockResolvedValueOnce({ data: htmlWithScripts });
      const mockGptResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              ingredients: ['2 cups flour', '1 cup sugar'],
              instructions: ['Mix dry ingredients', 'Add wet ingredients', 'Bake at 350F']
            })
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
    });

    it('should handle missing recipe container', async () => {
      const htmlWithoutContainer = `
        <div>
          <h1>Test Recipe</h1>
          <ul>
            <li>2 cups flour</li>
            <li>1 cup sugar</li>
          </ul>
          <ol>
            <li>Mix dry ingredients</li>
            <li>Add wet ingredients</li>
          </ol>
        </div>
      `;
      
      mockedAxios.get.mockResolvedValueOnce({ data: htmlWithoutContainer });
      const mockGptResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              ingredients: ['2 cups flour', '1 cup sugar'],
              instructions: ['Mix dry ingredients', 'Add wet ingredients']
            })
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('Failed to fetch URL');
    });

    it('should handle invalid GPT responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });
      const mockInvalidResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockInvalidResponse);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('Failed to parse GPT response as recipe');
    });

    it('should handle missing required fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });
      const mockIncompleteResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe'
              // Missing ingredients and instructions
            })
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockIncompleteResponse);

      await expect(
        RecipeExtractionService.extractRecipeFromUrl(mockValidUrl)
      ).rejects.toThrow('Missing required recipe fields');
    });
  });

  describe('Optional Fields', () => {
    it('should handle all optional fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtmlContent });
      const mockFullResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              description: 'A test recipe',
              ingredients: ['2 cups flour', '1 cup sugar'],
              instructions: ['Mix', 'Bake'],
              servings: 4,
              prepTime: 15,
              cookTime: 30,
              imageUrl: 'https://example.com/image.jpg'
            })
          }
        }]
      };

      const mockOpenAI = new OpenAI();
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockFullResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.description).toBe('A test recipe');
      expect(result.servings).toBe(4);
      expect(result.prepTime).toBe(15);
      expect(result.cookTime).toBe(30);
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });
});