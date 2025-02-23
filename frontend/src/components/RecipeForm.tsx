import React, { useState } from 'react';
import { Recipe, CreateRecipeDTO } from '../types/recipe';
import { recipeApi } from '../services/api';
import { URLImportModal } from './URLImportModal';
import styles from './RecipeForm.module.css';

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: CreateRecipeDTO) => Promise<void>;
  onCancel: () => void;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  recipe,
  onSubmit,
  onCancel
}) => {
  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(recipe?.ingredients || ['']);
  const [instructions, setInstructions] = useState<string[]>(recipe?.instructions || ['']);
  const [servings, setServings] = useState(recipe?.servings?.toString() || '');
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() || '');
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '');
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl || '');
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

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

  const handleImportSuccess = (importedRecipe: CreateRecipeDTO) => {
    setTitle(importedRecipe.title);
    setDescription(importedRecipe.description || '');
    setIngredients(importedRecipe.ingredients);
    setInstructions(importedRecipe.instructions);
    setServings(importedRecipe.servings?.toString() || '');
    setPrepTime(importedRecipe.prepTime?.toString() || '');
    setCookTime(importedRecipe.cookTime?.toString() || '');
    setImageUrl(importedRecipe.imageUrl || '');
    setSourceUrl(importedRecipe.sourceUrl || '');
    setShowImportModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredIngredients = ingredients
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const filteredInstructions = instructions
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const data: CreateRecipeDTO = {
      title: title.trim(),
      description: description.trim() || undefined,
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      servings: servings ? parseInt(servings) : undefined,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      imageUrl: imageUrl.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined
    };

    try {
      setLoading(true);
      await onSubmit(data);
    } catch (err) {
      console.error('Error submitting recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {showImportModal && (
        <URLImportModal
          onImport={recipeApi.extractFromUrl}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {!recipe && (
          <div className={styles.importSection}>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className={styles.importButton}
              disabled={loading}
            >
              Import from URL
            </button>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Recipe title"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the recipe"
            rows={3}
          />
        </div>

        <div className={styles.field}>
          <label>Ingredients *</label>
          {ingredients.map((ingredient, index) => (
            <div key={index} className={styles.ingredientRow}>
              <input
                type="text"
                value={ingredient}
                onChange={e => handleIngredientChange(index, e.target.value)}
                placeholder="Enter an ingredient"
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveIngredient(index)}
                className={styles.removeButton}
                disabled={ingredients.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddIngredient}
            className={styles.addButton}
          >
            Add Ingredient
          </button>
        </div>

        <div className={styles.field}>
          <label>Instructions *</label>
          {instructions.map((instruction, index) => (
            <div key={index} className={styles.instructionRow}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <textarea
                value={instruction}
                onChange={e => handleInstructionChange(index, e.target.value)}
                placeholder={`Step ${index + 1}`}
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

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="servings">Servings</label>
            <input
              id="servings"
              type="number"
              value={servings}
              onChange={e => setServings(e.target.value)}
              min="1"
              placeholder="Number of servings"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="prepTime">Prep Time (minutes)</label>
            <input
              id="prepTime"
              type="number"
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              min="0"
              placeholder="Preparation time"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="cookTime">Cook Time (minutes)</label>
            <input
              id="cookTime"
              type="number"
              value={cookTime}
              onChange={e => setCookTime(e.target.value)}
              min="0"
              placeholder="Cooking time"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="URL of recipe image"
          />
        </div>

        <div className={styles.buttons}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
};