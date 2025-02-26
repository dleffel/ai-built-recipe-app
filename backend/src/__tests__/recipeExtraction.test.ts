import { RecipeExtractionService } from '../services/recipeExtractionService';
import axios from 'axios';
import OpenAI from 'openai';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock OpenAI
jest.mock('openai', () => {
  const mockChatCompletions = {
    create: jest.fn()
  };

  return jest.fn(() => ({
    chat: {
      completions: mockChatCompletions
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  describe('HTML Cleaning', () => {
    it('should extract recipe-specific content when available', async () => {
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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockGptResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
    });

    it('should handle HTML with comments and scripts', async () => {
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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockGptResponse);

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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockGptResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs', async () => {
      const invalidUrl = 'not-a-url';
      await expect(
        RecipeExtractionService.extractRecipeFromUrl(invalidUrl)
      ).rejects.toThrow('Invalid URL format');
    });

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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockInvalidResponse);

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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockIncompleteResponse);

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

      const mockOpenAI = new (OpenAI as any)();
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockFullResponse);

      const result = await RecipeExtractionService.extractRecipeFromUrl(mockValidUrl);
      expect(result.description).toBe('A test recipe');
      expect(result.servings).toBe(4);
      expect(result.prepTime).toBe(15);
      expect(result.cookTime).toBe(30);
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });
});