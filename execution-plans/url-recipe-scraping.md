# URL-Based Recipe Scraping Implementation Plan

## Overview
Add the ability to create recipes by pasting a URL, which will automatically scrape and extract recipe information using GPT-4.

## Technical Components

### 1. Frontend Changes

#### RecipeForm.tsx Modifications
- Add a new "Import from URL" button at the top of the form
- Create a URL input modal component that appears when the button is clicked
- Add loading state for URL processing
- Implement error handling for failed URL imports

#### New Components
- `URLImportModal.tsx`: Modal component for URL input
  - URL input field
  - Import button
  - Loading state
  - Error display
  - Success confirmation

#### API Service Updates
- Add new endpoint call for URL scraping in `api.ts`
- Handle response mapping to recipe form fields

### 2. Backend Changes

#### New Endpoint
Add new endpoint in `recipes.ts` route:
```typescript
POST /api/recipes/scrape-url
Body: { url: string }
Response: CreateRecipeDTO
```

#### Recipe Service Updates
Add new method to `recipeService.ts`:
- `scrapeRecipeFromUrl(url: string): Promise<CreateRecipeDTO>`
- Implement URL validation
- Handle various recipe website formats
- Error handling for invalid URLs or unsupported websites

#### GPT-4 Integration
Create new service `recipeExtractionService.ts`:
- Initialize OpenAI client
- Define prompt template for recipe extraction
- Implement HTML cleaning and preprocessing
- Handle GPT-4 response parsing
- Map extracted data to CreateRecipeDTO format

### 3. Dependencies
- Add OpenAI SDK for GPT-4 integration
- Add HTML fetching/parsing library (e.g., axios, cheerio)
- Add URL validation library

### 4. Testing

#### Frontend Tests
- URL input validation
- Modal interaction tests
- Loading state management
- Error handling
- Successful import flow

#### Backend Tests
- URL validation
- Recipe extraction integration tests
- GPT-4 response parsing
- Error cases (invalid URLs, unsupported sites)

### 5. Error Handling
- Invalid URL format
- Unsupported recipe websites
- Network failures
- GPT-4 API failures
- Parsing failures
- Rate limiting

## Implementation Phases

### Phase 1: Backend Foundation
1. Set up OpenAI integration
2. Implement URL fetching and validation
3. Create basic GPT-4 prompt template
4. Add new endpoint
5. Basic error handling

### Phase 2: Recipe Extraction
1. Implement HTML preprocessing
2. Refine GPT-4 prompt
3. Add response parsing
4. Map to CreateRecipeDTO
5. Add comprehensive error handling

### Phase 3: Frontend Integration
1. Add URL import button
2. Create URL input modal
3. Implement API integration
4. Add loading states
5. Implement error handling

### Phase 4: Testing & Refinement
1. Add comprehensive tests
2. Refine error messages
3. Improve success rate
4. Add user feedback
5. Performance optimization

## Security Considerations
- URL validation and sanitization
- Rate limiting for URL scraping
- OpenAI API key protection
- Error message sanitization
- CORS configuration

## Future Improvements
- Cache frequently accessed recipes
- Support more recipe website formats
- Improve extraction accuracy
- Add batch import capability
- Add preview before import
- Save original URL with recipe

## Notes
- GPT-4 costs should be monitored
- Consider fallback options for failed extractions
- May need to handle different recipe formats
- Consider adding support for PDF recipes later