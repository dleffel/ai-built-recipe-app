import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { RecipeList } from './components/RecipeList';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipeForm } from './components/RecipeForm';
import { Recipe, CreateRecipeDTO } from './types/recipe';
import { recipeApi } from './services/api';

// Protected route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return user ? <>{children}</> : null;
};

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecipe = async () => {
      try {
        if (id) {
          const data = await recipeApi.get(id);
          setRecipe(data);
        }
      } catch (error) {
        console.error('Error fetching recipe:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id, navigate]);

  if (loading) {
    return <div className="loading">Loading recipe...</div>;
  }

  if (!recipe) {
    return null;
  }

  return (
    <RecipeDetail
      recipe={recipe}
      onEdit={() => navigate(`/recipes/${recipe.id}/edit`)}
      onDelete={async () => {
        try {
          await recipeApi.delete(recipe.id);
          navigate('/');
        } catch (error) {
          console.error('Error deleting recipe:', error);
        }
      }}
      onBack={() => navigate('/')}
    />
  );
};

const RecipeFormPage: React.FC<{ mode: 'create' | 'edit' }> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [loading, setLoading] = React.useState(mode === 'edit');

  React.useEffect(() => {
    const fetchRecipe = async () => {
      if (mode === 'edit' && id) {
        try {
          const data = await recipeApi.get(id);
          setRecipe(data);
        } catch (error) {
          console.error('Error fetching recipe:', error);
          navigate('/');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRecipe();
  }, [mode, id, navigate]);

  if (loading) {
    return <div className="loading">Loading recipe...</div>;
  }

  const handleSubmit = async (data: CreateRecipeDTO) => {
    try {
      if (mode === 'edit' && recipe) {
        await recipeApi.update(recipe.id, data);
      } else {
        await recipeApi.create(data);
      }
      navigate('/');
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} recipe:`, error);
    }
  };

  return (
    <RecipeForm
      recipe={recipe || undefined}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/')}
    />
  );
};

const RecipeListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="login-message">
        <p>Please sign in to access your recipes</p>
      </div>
    );
  }

  return (
    <>
      <div className="recipe-header">
        <button
          onClick={() => navigate('/new')}
          className="create-button"
        >
          Create New Recipe
        </button>
      </div>
      <RecipeList
        onRecipeClick={(recipe) => navigate(`/${recipe.id}`)}
        onRecipeEdit={(recipe) => navigate(`/${recipe.id}/edit`)}
        onRecipeDelete={async (recipe) => {
          try {
            await recipeApi.delete(recipe.id);
            // No need to navigate since we're already on the list page
          } catch (error) {
            console.error('Error deleting recipe:', error);
          }
        }}
      />
    </>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header" role="banner">
        <div className="header-content">
          <div className="header-left">
            <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Recipe App</h1>
            {location.pathname !== '/' && (
              <div className="breadcrumb" role="navigation">
                <span
                  onClick={() => navigate('/')}
                  style={{ cursor: 'pointer' }}
                >
                  My Recipes
                </span>
                <span>/</span>
                <span>
                  {location.pathname.includes('/new') ? 'New Recipe' :
                   location.pathname.includes('/edit') ? 'Edit Recipe' :
                   'Recipe Details'}
                </span>
              </div>
            )}
          </div>
          <Login />
        </div>
      </header>
      <main className="App-main">
        <Routes>
          <Route path="/" element={<RecipeListPage />} />
          <Route path="/recipes" element={<Navigate to="/" replace />} />
          <Route
            path="/new"
            element={
              <ProtectedRoute>
                <RecipeFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:id"
            element={
              <ProtectedRoute>
                <RecipeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:id/edit"
            element={
              <ProtectedRoute>
                <RecipeFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;