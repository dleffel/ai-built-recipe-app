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

class RecipeExtractor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  private async fetchWebpage(url: string): Promise<string> {
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

  private cleanHtml(html: string): string {
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style').remove();

    // Remove comments
    $('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();

    // Try to find recipe-specific content first
    const recipeContent = $('[itemtype*="Recipe"], [class*="recipe"], [id*="recipe"]').first();
    
    // If no recipe-specific content, try common article containers
    const mainContent = recipeContent.length ? recipeContent :
      $('article, [class*="content"], main, .post-content, .entry-content').first();
    
    // If we found a container, use it; otherwise use body
    const content = mainContent.length ? mainContent : $('body');

    // Get content with better structure preservation
    const structuredContent: string[] = [];
    
    // Extract recipe-specific elements first
    content.find('[class*="instruction"], [class*="step"], [class*="method"], ol li, ul li').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text && !text.includes('share') && !text.includes('print') && !text.includes('save')) {
        structuredContent.push(text);
      }
    });

    // Then get other content
    content.find('h1, h2, h3, h4, h5, h6, p').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text) {
        structuredContent.push(text);
      }
    });

    // Join with newlines to preserve structure
    return structuredContent
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Replace excessive newlines with double newlines
  }

  private async extractRecipeWithGPT(content: string, sourceUrl: string): Promise<CreateRecipeDTO> {
    const prompt = `
You are a recipe extraction expert. Your task is to thoroughly extract ALL recipe information from the webpage content and format it as a valid JSON object. It is CRITICAL that you capture EVERY SINGLE INSTRUCTION STEP, even for long, complex recipes.

The JSON object MUST have this exact structure:
{
  "title": "string (required)",
  "description": "string (optional)",
  "ingredients": ["string", "string", ...] (required array of strings),
  "instructions": ["string", "string", ...] (required array of strings),
  "servings": number (optional),
  "prepTime": number (optional, in minutes),
  "cookTime": number (optional, in minutes),
  "imageUrl": "string (optional)",
  "sourceUrl": "string (optional)"
}

Rules:
1. The response must be ONLY the JSON object, no other text
2. All strings must be properly escaped
3. The ingredients must be an array of strings
4. Each instruction must be a single, clear step
5. Numbers must be actual numbers, not strings
6. Required fields (title, ingredients, instructions) must be present
7. Optional fields should be omitted if not found (not null or empty string)
8. IMPORTANT: You MUST capture ALL instruction steps - do not truncate or summarize
9. For complex recipes with many steps, ensure you include every detail
10. If you encounter numbered steps in the source, preserve that exact numbering

Webpage content:
${content}
`;

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
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new RecipeExtractionError('No response from GPT');
    }

    try {
      const parsedRecipe = JSON.parse(result) as {
        title: string;
        description?: string;
        ingredients: string | string[];
        instructions: string | string[];
        servings?: number;
        prepTime?: number;
        cookTime?: number;
        imageUrl?: string;
      };

      if (!parsedRecipe.title || !parsedRecipe.ingredients || !parsedRecipe.instructions) {
        throw new RecipeExtractionError(
          'Missing required recipe fields',
          `Received: ${JSON.stringify(parsedRecipe, null, 2)}`
        );
      }

      const recipe: CreateRecipeDTO = {
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        ingredients: Array.isArray(parsedRecipe.ingredients)
          ? parsedRecipe.ingredients
          : [parsedRecipe.ingredients],
        instructions: Array.isArray(parsedRecipe.instructions)
          ? parsedRecipe.instructions
          : typeof parsedRecipe.instructions === 'string'
            ? parsedRecipe.instructions.split(/[\n\r]+/).filter(Boolean)
            : ['No instructions provided'],
        servings: parsedRecipe.servings,
        prepTime: parsedRecipe.prepTime,
        cookTime: parsedRecipe.cookTime,
        imageUrl: parsedRecipe.imageUrl,
        sourceUrl
      };

      // Clean up ingredients and instructions
      recipe.ingredients = recipe.ingredients
        .map(i => i.trim())
        .filter(i => i.length > 0);

      recipe.instructions = recipe.instructions
        .map(i => i.trim())
        .filter(i => i.length > 0);

      if (recipe.ingredients.length === 0) {
        throw new RecipeExtractionError('No valid ingredients found');
      }

      if (recipe.instructions.length === 0) {
        throw new RecipeExtractionError('No valid instructions found');
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
  }

  public async extractRecipeFromUrl(url: string): Promise<CreateRecipeDTO> {
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
    return this.extractRecipeWithGPT(cleanedContent, url);
  }
}

// Export a singleton instance
export const RecipeExtractionService = new RecipeExtractor();