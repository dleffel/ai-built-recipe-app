# Step-by-Step Instructions Implementation Plan

## Overview
Currently, recipe instructions are stored as a single text block. This plan outlines the changes needed to break instructions into individual steps, similar to how ingredients are handled.

## Database Changes

### 1. Schema Update
Modify `backend/prisma/schema.prisma`:
```prisma
model Recipe {
  // ... other fields ...
  instructions String[]  // Changed from String to String[]
}
```

### 2. Migration
- Generate and apply a new Prisma migration
- Include data migration to split existing instructions into steps (if needed)

## Backend Changes

### 1. Recipe Extraction Service Updates
- Modify GPT prompt in `recipeExtractionService.ts` to:
  ```typescript
  const prompt = `
  ... // existing prompt content
  The JSON object MUST have this exact structure:
  {
    "title": "string (required)",
    "description": "string (optional)",
    "ingredients": ["string", "string", ...] (required array of strings),
    "instructions": ["string", "string", ...] (required array of strings), // Changed from string to array
    "servings": number (optional),
    "prepTime": number (optional, in minutes),
    "cookTime": number (optional, in minutes),
    "imageUrl": "string (optional)"
  }
  
  Rules:
  1. The response must be ONLY the JSON object, no other text
  2. All strings must be properly escaped
  3. Both ingredients and instructions must be arrays of strings
  4. Each instruction should be a single, clear step
  5. Numbers must be actual numbers, not strings
  6. Required fields (title, ingredients, instructions) must be present
  7. Optional fields should be omitted if not found (not null or empty string)
  8. Break instructions into logical, sequential steps
  `;
  ```
- Update validation logic to ensure instructions is an array
- Add cleaning/filtering for instruction steps similar to ingredients

### 2. Service Layer Updates
- Update RecipeService to handle array of instructions
- Update validation logic if needed

### 2. API Updates
- Ensure API endpoints handle the new instructions format
- Update any response transformations

### 3. Tests
- Update unit tests for RecipeService
- Update integration tests for recipe endpoints
- Update recipe extraction tests

## Frontend Changes

### 1. Type Updates
Modify `frontend/src/types/recipe.ts`:
```typescript
export interface Recipe {
  // ... other fields ...
  instructions: string[];  // Changed from string to string[]
}

export interface CreateRecipeDTO {
  // ... other fields ...
  instructions: string[];  // Changed from string to string[]
}
```

### 2. Component Updates

#### RecipeForm Component
- Add state management for instruction steps:
  ```tsx
  const [instructions, setInstructions] = useState<string[]>(recipe?.instructions || ['']);
  ```

- Add handlers for managing steps:
  ```tsx
  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };
  ```

- Add UI for step management:
  ```tsx
  <div className={styles.field}>
    <label>Instructions *</label>
    {instructions.map((instruction, index) => (
      <div key={index} className={styles.instructionRow}>
        <div className={styles.stepNumber}>{index + 1}</div>
        <textarea
          value={instruction}
          onChange={e => handleInstructionChange(index, e.target.value)}
          placeholder="Enter step instructions"
          rows={2}
          required
        />
        <button
          type="button"
          onClick={() => handleRemoveInstruction(index)}
          className={styles.removeButton}
          disabled={instructions.length === 1}
        >
          Remove
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={handleAddInstruction}
      className={styles.addButton}
    >
      Add Step
    </button>
  </div>
  ```

- Add CSS styling in RecipeForm.module.css:
  ```css
  .instructionRow {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .stepNumber {
    background: var(--primary-color);
    color: white;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: bold;
  }
  ```

- Update form submission logic:
  ```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove empty instructions
    const filteredInstructions = instructions
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const data: CreateRecipeDTO = {
      // ... other fields ...
      instructions: filteredInstructions,
    };
    // ... rest of submission logic
  };
  ```

- Update URL import handling in handleImportSuccess:
  ```tsx
  const handleImportSuccess = (importedRecipe: CreateRecipeDTO) => {
    // ... other fields ...
    setInstructions(importedRecipe.instructions);
  };
  ```

#### RecipeDetail Component
- Update instruction display to handle array of steps:
  ```tsx
  <div className={styles.section}>
    <h2>Instructions</h2>
    <ol className={styles.instructions}>
      {recipe.instructions.map((instruction, index) => (
        <li key={index} className={styles.instruction}>
          {instruction}
        </li>
      ))}
    </ol>
  </div>
  ```
- Add CSS styling for numbered steps in RecipeDetail.module.css:
  ```css
  .instructions {
    list-style-position: outside;
    padding-left: 1.5em;
    counter-reset: step-counter;
  }

  .instruction {
    margin-bottom: 1em;
    position: relative;
    padding-left: 0.5em;
  }

  .instruction::marker {
    font-weight: bold;
    color: var(--primary-color);
  }
  ```
- Remove existing split('\n') logic since instructions will be an array

### 3. Frontend Tests
- Update RecipeForm tests
- Update RecipeDetail tests
- Update any snapshot tests
- Add new tests for instruction step management

## Implementation Order

1. Create database migration (but don't apply yet)
2. Update backend types and services
3. Update frontend types and components
4. Update all tests
5. Apply database migration
6. Deploy changes

## Notes
- No need to migrate existing recipes yet as per requirements
- New recipes will use the step-by-step format
- Consider adding validation for minimum/maximum number of steps
- Consider adding drag-and-drop reordering of steps in future enhancement

## Questions to Consider
- Should we enforce a minimum number of steps?
- Should we add a character limit per step?
- Should we allow rich text formatting in steps?
- Should we consider adding sub-steps in the future?