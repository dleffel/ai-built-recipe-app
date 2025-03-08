# Recipe Search Implementation Plan

## Overview
We need to implement a search function that allows users to search through their recipes. The search will be implemented both on the frontend and backend, allowing users to search through recipe titles, descriptions, and ingredients.

## Backend Changes

### 1. Update Recipe Service
Add a new search method to `RecipeService` that will:
- Accept search parameters (query string)
- Use Prisma's filtering capabilities to search across relevant fields
- Maintain pagination support
- Include proper type definitions

### 2. Update Recipe Routes
Add a new endpoint for search:
- Extend the existing GET /recipes endpoint to accept a search query parameter
- Maintain existing pagination functionality
- Return search results with proper metadata

## Frontend Changes

### 1. Update RecipeList Component
- Add a search input field at the top of the recipe list
- Implement debounced search to prevent excessive API calls
- Update the existing state management to handle search:
  - Add searchQuery state
  - Modify loadRecipes to include search parameter
  - Reset pagination when search query changes

### 2. Update API Service
- Extend the recipe list API call to include search parameters
- Handle proper URL parameter encoding

### 3. UI/UX Considerations
- Add a search input with proper styling
- Show loading state during search
- Handle empty search results gracefully
- Clear search functionality
- Maintain mobile responsiveness

## Implementation Steps

1. Backend Implementation:
   - Modify RecipeService to add search functionality
   - Update routes to handle search parameters
   - Add proper error handling and validation
   - Test search functionality with various queries

2. Frontend Implementation:
   - Add search input component to RecipeList
   - Implement search state management
   - Update API service to handle search
   - Add loading states and error handling
   - Style search interface
   - Test search functionality

3. Testing:
   - Test search with various queries
   - Verify pagination works with search
   - Test edge cases (empty results, special characters)
   - Ensure mobile responsiveness

## Technical Details

### Search Query Implementation
```typescript
// Example search query in Prisma
where: {
  userId,
  isDeleted: false,
  OR: [
    { title: { contains: query, mode: 'insensitive' } },
    { description: { contains: query, mode: 'insensitive' } },
    { ingredients: { hasSome: [query] } }
  ]
}
```

### API Endpoint
```typescript
GET /api/recipes?search=query&skip=0&take=12
```

### Frontend Search Component
```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  setPage(0);
  loadRecipes(0, debouncedSearch);
}, [debouncedSearch]);
```

## Success Criteria
- Users can search recipes by title, description, and ingredients
- Search is case-insensitive
- Search results update as user types (with debouncing)
- Pagination works correctly with search results
- Empty states are handled gracefully
- Search performance is optimized
- Mobile-friendly interface