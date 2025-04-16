# Modular Application Transformation Plan

## 1. Overview and Goals

This plan outlines the transformation of the current recipe application into a modular platform that can host multiple functionalities. The immediate goals are:

1. Move the current homepage (recipe list) to `/recipes`
2. Set up a navigation structure to support multiple modules
3. Prepare the application for adding to-do functionality as the next module

## 2. Current Structure Analysis

### Frontend Structure
- React application with React Router
- Current routes:
  - `/` - Recipe list (homepage)
  - `/recipes` - Redirects to `/`
  - `/new` - Create new recipe form
  - `/:id` - Recipe detail page
  - `/:id/edit` - Edit recipe form
- Main components:
  - Login
  - RecipeList
  - RecipeDetail
  - RecipeForm
- Authentication via AuthContext (Google OAuth)

### Backend Structure
- Express.js API
- Recipe routes:
  - GET `/api/recipes` - List recipes
  - POST `/api/recipes` - Create recipe
  - GET `/api/recipes/:id` - Get recipe details
  - PUT `/api/recipes/:id` - Update recipe
  - DELETE `/api/recipes/:id` - Delete recipe
  - POST `/api/recipes/extract-url` - Extract recipe from URL
- Authentication required for all recipe operations

### Database Structure
- PostgreSQL with Prisma ORM
- Models:
  - User (id, email, googleId, displayName, etc.)
  - Recipe (id, title, ingredients, instructions, etc.)
  - User has many Recipes

## 3. Transformation Plan

### 3.1 Frontend Changes

#### New Route Structure
- `/` - New homepage with big, easy-to-use links to different modules
- `/recipes` - Recipe list (moved from homepage)
- `/recipes/new` - Create new recipe form
- `/recipes/:id` - Recipe detail page
- `/recipes/:id/edit` - Edit recipe form
- `/todos` - Future to-do list module (stub implementation)
- `/todos/new` - Future create new to-do form
- `/todos/:id` - Future to-do detail page
- `/todos/:id/edit` - Future edit to-do form

#### New Component Structure
- Create a new `Layout` component with:
  - Header with app title
  - Navigation menu for different modules
  - Main content area
- Create a new `HomePage` component with:
  - Large, visually appealing module cards/links
  - Active modules (Recipes) and coming-soon modules (To-dos)
- Move existing recipe components to a `/components/recipes` directory
- Create placeholder for future to-do components in `/components/todos` directory

#### Navigation Structure
- Create a `Navigation` component that displays:
  - Links to different modules (Recipes, To-dos, etc.)
  - User profile/login information
- Implement breadcrumb navigation within each module

### 3.2 Backend Changes

#### API Route Structure
- Keep existing recipe routes under `/api/recipes`
- Prepare structure for future to-do routes under `/api/todos`

#### Service Structure
- Organize services by module:
  - Recipe-related services
  - Future to-do-related services
  - Shared services (auth, etc.)

### 3.3 Database Changes
- No immediate database changes required for moving the recipe module
- Prepare for future to-do module by planning the Todo model

## 4. Implementation Steps

### Phase 1: Frontend Restructuring

1. **Create Layout Components**
   - Create a new `Layout` component with header, navigation, and content area
   - Create a `Navigation` component for module navigation
   - Create a new `HomePage` component with:
     - Large, visually appealing cards/links for each module
     - Active "Recipes" module card with icon and description
     - "Coming Soon" To-do module card with icon and description
     - Styling to make navigation intuitive and user-friendly

2. **Update Routing**
   - Update routes in `App.tsx` to reflect the new structure
   - Move recipe routes under `/recipes/*`
   - Create a new homepage route at `/`

3. **Reorganize Components**
   - Move recipe components to `/components/recipes` directory
   - Update imports throughout the application
   - Create placeholder directory for to-do components

4. **Update API Service Calls**
   - Update any hardcoded URLs in API calls to reflect new routes

### Phase 2: Backend Preparation

1. **Organize Backend Structure**
   - No immediate changes needed to backend routes
   - Plan structure for future to-do module

### Phase 3: Testing and Deployment

1. **Test All Functionality**
   - Ensure all recipe functionality works with new routes
   - Test navigation between modules
   - Test authentication flow

2. **Deploy Changes**
   - Deploy updated application

## 5. Testing Plan

1. **Unit Tests**
   - Update existing tests to reflect new routes and component structure
   - Add tests for new components (Layout, Navigation)

2. **Integration Tests**
   - Test navigation flow between modules
   - Test recipe CRUD operations with new routes

3. **End-to-End Tests**
   - Test complete user flows with new navigation structure

## 6. Future Considerations

### To-Do Module Implementation
- Create database model for Todo items
- Implement backend API for to-do CRUD operations
- Develop frontend components for to-do management

### Additional Modules
- Consider other potential modules (e.g., meal planning, shopping lists)
- Design a scalable approach to adding new modules

### Shared Functionality
- Identify and implement shared functionality across modules
- Consider a more robust state management solution if needed