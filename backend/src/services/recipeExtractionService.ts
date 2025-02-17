import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CreateRecipeDTO } from './recipeService';

// Error types
export class URLFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'URLFetchError';
  }
}

export class RecipeExtractionError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'RecipeExtractionError';
  }
}

export class RecipeExtractionService {
  private static openai: OpenAI;
  private static initialized = false;

  private static initialize() {
    if (!this.initialized) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      this.openai = new OpenAI({
        apiKey: apiKey,
      });

      this.initialized = true;
    }
  }

  private static async fetchWebpage(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new URLFetchError(`Failed to fetch URL: ${error.message}`);
      }
      throw error;
    }
  }

  private static cleanHtml(html: string): string {
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style').remove();

    // Remove comments
    $('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();

    // Extract main content (common recipe article containers)
    const mainContent = $('article, [class*="recipe"], [class*="content"], main').first();
    
    // If we found a main content container, use it; otherwise use body
    const content = mainContent.length ? mainContent : $('body');

    // Get text content with some structure preserved
    return content.text().trim()
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .slice(0, 8000);       // Limit content length for GPT-3.5
  }

  private static async extractRecipeWithGPT(content: string): Promise<CreateRecipeDTO> {
    try {
      const prompt = `
You are a recipe extraction expert. Extract recipe information from the following webpage content and format it as a valid JSON object.

The JSON object MUST have this exact structure:
{
  "title": "string (required)",
  "description": "string (optional)",
  "ingredients": ["string", "string", ...] (required array of strings),
  "instructions": "string (required)",
  "servings": number (optional),
  "prepTime": number (optional, in minutes),
  "cookTime": number (optional, in minutes),
  "imageUrl": "string (optional)"
}

Rules:
1. The response must be ONLY the JSON object, no other text
2. All strings must be properly escaped
3. The ingredients must be an array of strings
4. Numbers must be actual numbers, not strings
5. Required fields (title, ingredients, instructions) must be present
6. Optional fields should be omitted if not found (not null or empty string)

Webpage content:
${content}
`;

      console.log('Sending request to GPT...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a recipe extraction expert that outputs only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }  // Ensure JSON response
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new RecipeExtractionError('No response from GPT');
      }

      console.log('GPT Response:', result);

      try {
        const recipe = JSON.parse(result) as CreateRecipeDTO;
        
        // Validate required fields
        if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
          throw new RecipeExtractionError(
            'Missing required recipe fields',
            `Received: ${JSON.stringify(recipe, null, 2)}`
          );
        }

        // Ensure ingredients is an array
        if (!Array.isArray(recipe.ingredients)) {
          console.log('Converting ingredients to array:', recipe.ingredients);
          recipe.ingredients = [recipe.ingredients];
        }

        // Clean up ingredients (remove empty strings and trim)
        recipe.ingredients = recipe.ingredients
          .map(i => i.trim())
          .filter(i => i.length > 0);

        if (recipe.ingredients.length === 0) {
          throw new RecipeExtractionError(
            'No valid ingredients found',
            `Original ingredients: ${JSON.stringify(recipe.ingredients, null, 2)}`
          );
        }

        return recipe;
      } catch (error) {
        if (error instanceof RecipeExtractionError) {
          throw error;
        }
        throw new RecipeExtractionError(
          'Failed to parse GPT response as recipe',
          `Response was: ${result}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      if (error instanceof RecipeExtractionError) {
        throw error;
      }
      throw new RecipeExtractionError(
        `GPT extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  static async extractRecipeFromUrl(url: string): Promise<CreateRecipeDTO> {
    this.initialize();

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new URLFetchError('Invalid URL format');
    }

    // Fetch and process webpage
    const html = await this.fetchWebpage(url);
    const cleanedContent = this.cleanHtml(html);
    
    // Extract recipe using GPT-3.5
    return await this.extractRecipeWithGPT(cleanedContent);
  }
}