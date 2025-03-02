# URL Routing Implementation Plan

## Current State
- Navigation is handled through React state (`currentView`)
- No URL-based routing
- Views include: list, detail, create, and edit
- Basic breadcrumb navigation exists

## Implementation Plan

### 1. Setup and Dependencies
- Add React Router dependencies:
  ```bash
  npm install react-router-dom @types/react-router-dom
  ```

### 2. Route Structure
Define the following routes:
- `/` - Home/Recipe List
- `/recipes` - Recipe List (redirect from home)
- `/recipes/new` - Create Recipe
- `/recipes/:id` - Recipe Detail
- `/recipes/:id/edit` - Edit Recipe

### 3. Implementation Steps

1. **Router Setup**
   - Wrap the app with `BrowserRouter`
   - Define route components in App.tsx
   - Create route definitions for all views

2. **Component Updates**
   - Update navigation to use `useNavigate` hook instead of state
   - Replace `setCurrentView` calls with route navigation
   - Update links to use `Link` components
   - Preserve recipe state using URL parameters

3. **URL Parameter Handling**
   - Use `useParams` to get recipe ID from URL
   - Fetch recipe data based on URL parameters
   - Handle loading states during data fetching

4. **Navigation Updates**
   - Update breadcrumb navigation to use routing
   - Implement proper back button behavior
   - Handle 404 cases for invalid recipe IDs

5. **Authentication Integration**
   - Add route protection for authenticated routes
   - Redirect to login for unauthenticated users
   - Preserve intended destination after login

### 4. Testing Requirements
- Add tests for route navigation
- Test protected route behavior
- Test URL parameter handling
- Test back button functionality
- Test 404 handling

### 5. Considerations
- Maintain current user experience while adding routing
- Ensure proper loading states during navigation
- Handle edge cases (invalid IDs, unauthorized access)
- Preserve current breadcrumb functionality
- Ensure proper history stack for back button

## Migration Strategy
1. Implement changes incrementally to minimize disruption
2. Keep current state-based navigation until routing is fully tested
3. Switch to URL-based routing once all components are updated
4. Remove old state-based navigation code

## Success Criteria
- All pages accessible via URLs
- Back button works as expected
- Breadcrumb navigation preserved
- Authentication flow integrated with routing
- All tests passing
- No regression in existing functionality