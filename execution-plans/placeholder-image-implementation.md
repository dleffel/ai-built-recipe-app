# Placeholder Image Implementation Plan

## Current Behavior
- Recipe cards only show the image container when imageUrl exists
- This causes inconsistent card heights in the grid layout
- Image container has a fixed height of 200px when present

## Implementation Plan

### 1. Modify RecipeCard Component
- Always render the image container regardless of imageUrl presence
- When imageUrl is not provided, render a placeholder image or design
- Options for placeholder:
  a. Use a static placeholder image (e.g., generic recipe book icon)
  b. Create a styled div with recipe title initials or icon

### 2. CSS Updates
- Keep existing image container styles (200px height, object-fit: cover)
- Add styles for placeholder state
- Ensure consistent styling between actual images and placeholders
- Maintain the grayscale filter aesthetic

### 3. Testing
- Update RecipeCard tests to verify placeholder rendering
- Test both states (with and without imageUrl)
- Ensure consistent card heights

### 4. Implementation Steps
1. Create or select a placeholder image/design
2. Modify RecipeCard.tsx to always render image section
3. Add placeholder state handling
4. Update CSS for placeholder styling
5. Update tests
6. Verify grid alignment

### 5. Considerations
- Maintain current grayscale aesthetic
- Ensure placeholder design fits the minimal, Kindle-like theme
- Keep consistent hover behavior
- Consider loading state handling

## Next Steps
After approval, switch to Code mode to implement these changes.