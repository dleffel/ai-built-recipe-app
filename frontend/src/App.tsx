import React, { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { RecipeList } from './components/RecipeList';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipeForm } from './components/RecipeForm';
import { Recipe, CreateRecipeDTO } from './types/recipe';
import { recipeApi } from './services/api';

type View = 'list' | 'detail' | 'create' | 'edit';

interface ViewState {
  type: View;
  recipeId?: string;
}

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>({ type: 'list' });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleCreateRecipe = async (data: CreateRecipeDTO) => {
    try {
      await recipeApi.create(data);
      setCurrentView({ type: 'list' });
    } catch (error) {
      console.error('Error creating recipe:', error);
    }
  };

  const handleEditRecipe = async (data: CreateRecipeDTO) => {
    if (!selectedRecipe) return;
    
    try {
      await recipeApi.update(selectedRecipe.id, data);
      setCurrentView({ type: 'list' });
    } catch (error) {
      console.error('Error updating recipe:', error);
    }
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await recipeApi.delete(recipe.id);
      setCurrentView({ type: 'list' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const renderContent = () => {
    if (!user) {
      return (
        <div className="login-message">
          <p>Please sign in to access your recipes</p>
        </div>
      );
    }

    switch (currentView.type) {
      case 'detail':
        if (!selectedRecipe) return null;
        return (
          <RecipeDetail
            recipe={selectedRecipe}
            onEdit={() => setCurrentView({ type: 'edit' })}
            onDelete={() => handleDeleteRecipe(selectedRecipe)}
            onBack={() => setCurrentView({ type: 'list' })}
          />
        );

      case 'create':
        return (
          <RecipeForm
            onSubmit={handleCreateRecipe}
            onCancel={() => setCurrentView({ type: 'list' })}
          />
        );

      case 'edit':
        if (!selectedRecipe) return null;
        return (
          <RecipeForm
            recipe={selectedRecipe}
            onSubmit={handleEditRecipe}
            onCancel={() => setCurrentView({ type: 'list' })}
          />
        );

      case 'list':
      default:
        return (
          <div className="recipe-container">
            <div className="recipe-header">
              <h2>My Recipes</h2>
              <button
                onClick={() => setCurrentView({ type: 'create' })}
                className="create-button"
              >
                Create New Recipe
              </button>
            </div>
            <RecipeList
              onRecipeClick={(recipe) => {
                setSelectedRecipe(recipe);
                setCurrentView({ type: 'detail' });
              }}
              onRecipeEdit={(recipe) => {
                setSelectedRecipe(recipe);
                setCurrentView({ type: 'edit' });
              }}
              onRecipeDelete={handleDeleteRecipe}
            />
          </div>
        );
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header" role="banner">
        <div className="header-content">
          <div className="header-left">
            <h1>Recipe App</h1>
            {currentView.type !== 'list' && (
              <div className="breadcrumb" role="navigation">
                <span
                  onClick={() => setCurrentView({ type: 'list' })}
                  style={{ cursor: 'pointer' }}
                >
                  My Recipes
                </span>
                <span>/</span>
                <span>
                  {currentView.type === 'detail' ? selectedRecipe?.title :
                   currentView.type === 'create' ? 'New Recipe' :
                   currentView.type === 'edit' ? `Edit ${selectedRecipe?.title}` : ''}
                </span>
              </div>
            )}
          </div>
          <Login />
        </div>
      </header>
      <main className="App-main">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;