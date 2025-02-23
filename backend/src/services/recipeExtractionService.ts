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

    // Log the extracted content for debugging
    console.log('Extracted content length:', structuredContent.length, 'elements');
    console.log('First few elements:', structuredContent.slice(0, 5));
    console.log('Last few elements:', structuredContent.slice(-5));

    // Join with newlines to preserve structure
    const processedContent = structuredContent
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Replace excessive newlines with double newlines

    console.log('Final content length:', processedContent.length, 'characters');
    
    return processedContent;
  }

  private static async extractRecipeWithGPT(content: string): Promise<CreateRecipeDTO> {
    try {
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
  "imageUrl": "string (optional)"
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

      console.log('GPT Response length:', result?.length);
      console.log('GPT Response preview (first 500 chars):', result?.slice(0, 500));
      console.log('GPT Response preview (last 500 chars):', result?.slice(-500));

      try {
        console.log('Attempting to parse GPT response as JSON...');
        // Parse JSON with a temporary type that matches potential GPT response
        interface GPTRecipeResponse {
          title: string;
          description?: string;
          ingredients: string | string[];
          instructions: string | string[];
          servings?: number;
          prepTime?: number;
          cookTime?: number;
          imageUrl?: string;
        }

        const parsedRecipe = JSON.parse(result) as GPTRecipeResponse;
        
        // Validate required fields
        if (!parsedRecipe.title || !parsedRecipe.ingredients || !parsedRecipe.instructions) {
          throw new RecipeExtractionError(
            'Missing required recipe fields',
            `Received: ${JSON.stringify(parsedRecipe, null, 2)}`
          );
        }

        // Convert to proper DTO format
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
          imageUrl: parsedRecipe.imageUrl
        };

        // Clean up ingredients and instructions (remove empty strings and trim)
        recipe.ingredients = recipe.ingredients
          .map(i => i.trim())
          .filter(i => i.length > 0);

        recipe.instructions = recipe.instructions
          .map(i => i.trim())
          .filter(i => i.length > 0);

        if (recipe.ingredients.length === 0) {
          throw new RecipeExtractionError(
            'No valid ingredients found',
            `Original ingredients: ${JSON.stringify(recipe.ingredients, null, 2)}`
          );
        }

        if (recipe.instructions.length === 0) {
          throw new RecipeExtractionError(
            'No valid instructions found',
            `Original instructions: ${JSON.stringify(recipe.instructions, null, 2)}`
          );
        }

        // Check for potentially truncated instructions
        const lastStep = recipe.instructions[recipe.instructions.length - 1];
        const stepNumberMatch = lastStep.match(/^(?:Step\s*)?(\d+)[:.]/i);
        if (stepNumberMatch) {
          const lastStepNumber = parseInt(stepNumberMatch[1], 10);
          if (lastStepNumber > recipe.instructions.length) {
            console.warn(`Warning: Recipe may be truncated. Found step ${lastStepNumber} but only have ${recipe.instructions.length} steps.`);
            throw new RecipeExtractionError(
              'Recipe instructions appear to be truncated',
              `Found reference to step ${lastStepNumber} but only extracted ${recipe.instructions.length} steps. The recipe may be incomplete.`
            );
          }
        }

        // Check for references to later steps
        const stepsText = recipe.instructions.join(' ');
        const stepReferences = stepsText.match(/step\s*\d+/gi);
        if (stepReferences) {
          const maxStepReferenced = Math.max(...stepReferences.map(ref => {
            const num = ref.match(/\d+/);
            return num ? parseInt(num[0], 10) : 0;
          }));
          if (maxStepReferenced > recipe.instructions.length) {
            console.warn(`Warning: Recipe may be truncated. Found reference to step ${maxStepReferenced} but only have ${recipe.instructions.length} steps.`);
            throw new RecipeExtractionError(
              'Recipe instructions appear to be truncated',
              `Found reference to step ${maxStepReferenced} but only extracted ${recipe.instructions.length} steps. The recipe may be incomplete.`
            );
          }
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
    
    // Log content details
    console.log('Raw HTML length:', html.length);
    console.log('Cleaned content length:', cleanedContent.length);
    console.log('Content preview (first 500 chars):', cleanedContent.slice(0, 500));
    console.log('Content preview (last 500 chars):', cleanedContent.slice(-500));

    // Extract recipe using GPT-3.5
    const recipe = await this.extractRecipeWithGPT(cleanedContent);

    // Log final recipe details
    console.log('Extracted recipe details:');
    console.log('- Title:', recipe.title);
    console.log('- Number of ingredients:', recipe.ingredients.length);
    console.log('- Number of instructions:', recipe.instructions.length);
    console.log('- First instruction:', recipe.instructions[0]);
    console.log('- Last instruction:', recipe.instructions[recipe.instructions.length - 1]);

    return recipe;
  }
}