# Adding Source URL to Recipes

## Overview
When a recipe is imported via URL, we want to persist the original source URL and make it clickable from the recipe detail page. This will help users reference the original recipe source when needed.

## Implementation Steps

### 1. Database Changes
- Add `sourceUrl` field (optional String) to Recipe model in schema.prisma
- Generate Prisma client
- Create and run migration

### 2. Backend Changes
#### Update Types and Services
- Update CreateRecipeDTO to include sourceUrl
- Modify recipeExtractionService to pass the source URL to recipeService
- Update recipeService to handle the new sourceUrl field

### 3. Frontend Changes
#### Update Types
- Add sourceUrl to Recipe interface
- Add sourceUrl to CreateRecipeDTO interface
- Add sourceUrl to UpdateRecipeDTO interface

#### Update Components
- Modify RecipeDetail component to display source URL
  - Add new section in metadata area for source URL
  - Style as a clickable link that opens in new tab
  - Only show section if sourceUrl exists
- Update RecipeDetail.module.css with link styling

### 4. Testing
- Update backend tests:
  - Add sourceUrl to test fixtures
  - Update recipe creation tests
  - Update recipe extraction tests
- Update frontend tests:
  - Add sourceUrl to mock data
  - Update RecipeDetail component tests
  - Update RecipeForm tests for URL import

## UI/UX Considerations
- Source URL link should be clearly visible but not dominate the recipe layout
- Link should open in new tab to preserve recipe view
- Consider adding an icon (e.g., external link icon) to indicate it opens in new tab

## Migration Considerations
- Field is optional, so existing recipes won't be affected
- Only new URL imports will have the source URL populated

## Security Considerations
- Validate URLs on backend before storing
- Sanitize URLs before displaying in frontend
- Use rel="noopener noreferrer" for external links