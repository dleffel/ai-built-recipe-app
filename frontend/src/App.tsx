import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { RecipeList } from './components/recipes/RecipeList';
import { RecipeDetail } from './components/recipes/RecipeDetail';
import { RecipeForm } from './components/recipes/RecipeForm';
import { Recipe, CreateRecipeDTO } from './types/recipe';
import { recipeApi } from './services/api';
import { contactApi } from './services/contactApi';
import Layout from './components/layout/Layout';
import HomePage from './components/HomePage';
import { TodoPlaceholder } from './components/todos/TodoPlaceholder';
import { Button } from './components/ui/Button';
import { ContactList, ContactDetail, ContactForm } from './components/crm';
import { Contact, CreateContactDTO, UpdateContactDTO } from './types/contact';
import { GmailSettings } from './components/gmail';
import { FeedSettings } from './components/settings';

// Protected route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="login-message">
        <p>Please sign in to access this page</p>
      </div>
    );
  }

  return <>{children}</>;
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
        navigate('/recipes');
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
      onEdit={() => navigate(`/recipes/recipe/${recipe.id}/edit`)}
      onDelete={async () => {
        try {
          await recipeApi.delete(recipe.id);
          navigate('/recipes');
        } catch (error) {
          console.error('Error deleting recipe:', error);
        }
      }}
      onBack={() => navigate('/recipes')}
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
          navigate('/recipes');
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
      navigate('/recipes');
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} recipe:`, error);
    }
  };

  return (
    <RecipeForm
      recipe={recipe || undefined}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/recipes')}
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
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/recipes/new')}
        >
          Create New Recipe
        </Button>
      </div>
      <RecipeList
        onRecipeClick={(recipe) => navigate(`/recipes/recipe/${recipe.id}`)}
        onRecipeEdit={(recipe) => navigate(`/recipes/recipe/${recipe.id}/edit`)}
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

// CRM Page Components
const ContactListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="login-message">
        <p>Please sign in to access your contacts</p>
      </div>
    );
  }

  return (
    <ContactList
      onContactClick={(contact) => navigate(`/contacts/${contact.id}`)}
      onCreateClick={() => navigate('/contacts/new')}
    />
  );
};

const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = React.useState<Contact | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchContact = async () => {
      try {
        if (id) {
          const data = await contactApi.get(id);
          setContact(data);
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
        navigate('/contacts');
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [id, navigate]);

  if (loading) {
    return <div className="loading">Loading contact...</div>;
  }

  if (!contact) {
    return null;
  }

  return (
    <ContactDetail
      contact={contact}
      onEdit={() => navigate(`/contacts/${contact.id}/edit`)}
      onDelete={async () => {
        try {
          await contactApi.delete(contact.id);
          navigate('/contacts');
        } catch (error) {
          console.error('Error deleting contact:', error);
        }
      }}
      onBack={() => navigate('/contacts')}
      onContactUpdated={(updatedContact) => setContact(updatedContact)}
    />
  );
};

const ContactFormPage: React.FC<{ mode: 'create' | 'edit' }> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = React.useState<Contact | null>(null);
  const [loading, setLoading] = React.useState(mode === 'edit');

  React.useEffect(() => {
    const fetchContact = async () => {
      if (mode === 'edit' && id) {
        try {
          const data = await contactApi.get(id);
          setContact(data);
        } catch (error) {
          console.error('Error fetching contact:', error);
          navigate('/contacts');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchContact();
  }, [mode, id, navigate]);

  if (loading) {
    return <div className="loading">Loading contact...</div>;
  }

  const handleSubmit = async (data: CreateContactDTO | UpdateContactDTO) => {
    try {
      if (mode === 'edit' && contact) {
        await contactApi.update(contact.id, data as UpdateContactDTO);
      } else {
        await contactApi.create(data as CreateContactDTO);
      }
      navigate('/contacts');
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} contact:`, error);
      throw error;
    }
  };

  return (
    <ContactForm
      contact={contact || undefined}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/contacts')}
    />
  );
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/recipes/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<RecipeListPage />} />
                <Route
                  path="/new"
                  element={
                    <ProtectedRoute>
                      <RecipeFormPage mode="create" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recipe/:id"
                  element={
                    <ProtectedRoute>
                      <RecipeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recipe/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RecipeFormPage mode="edit" />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          }
        />
        <Route
          path="/todos/*"
          element={
            <Layout>
              <ProtectedRoute>
                <TodoPlaceholder />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/contacts/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<ContactListPage />} />
                <Route
                  path="/new"
                  element={
                    <ProtectedRoute>
                      <ContactFormPage mode="create" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/:id"
                  element={
                    <ProtectedRoute>
                      <ContactDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/:id/edit"
                  element={
                    <ProtectedRoute>
                      <ContactFormPage mode="edit" />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          }
        />
        <Route
          path="/settings/*"
          element={
            <Layout>
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<GmailSettings />} />
                  <Route path="/gmail" element={<GmailSettings />} />
                  <Route path="/feed" element={<FeedSettings />} />
                </Routes>
              </ProtectedRoute>
            </Layout>
          }
        />
      </Routes>
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