# Organizer

A full-stack modular organization application with React frontend and Express backend, featuring recipe management, task organization, CRM (contact management), and Gmail integration modules.

## Features

- **Recipe Management**: Create, edit, and organize recipes with URL import functionality
- **Task Management**: Daily task lists with categories, priorities, and rollover support
- **CRM (Contacts)**: Contact management with version history, tagging, and search
- **Gmail Integration**: Connect Gmail accounts for email monitoring and notifications
- **Activity Feed**: Track recent activity across all modules
- **Google OAuth**: Secure authentication via Google

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js with Google OAuth 2.0
- **AI Integration**: OpenAI for recipe extraction
- **Testing**: Jest with Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **State Management**: React Context
- **Drag & Drop**: @dnd-kit
- **Styling**: CSS Modules
- **Testing**: Jest with React Testing Library

## Project Structure

```
organizer/
├── backend/                 # Express server (TypeScript)
│   ├── src/
│   │   ├── index.ts        # Application entry point
│   │   ├── server.ts       # Express server setup
│   │   ├── routes/         # API route handlers
│   │   │   ├── auth.ts     # Authentication routes
│   │   │   ├── recipes.ts  # Recipe CRUD operations
│   │   │   ├── tasks.ts    # Task management
│   │   │   ├── contacts.ts # CRM contacts
│   │   │   ├── tags.ts     # Tag management
│   │   │   ├── gmail.ts    # Gmail integration
│   │   │   ├── activity.ts # Activity feed
│   │   │   └── webhooks.ts # External webhooks
│   │   ├── services/       # Business logic layer
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Server configuration
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   └── package.json
├── frontend/               # React application (TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── recipes/    # Recipe module components
│   │   │   ├── todos/      # Task module components
│   │   │   ├── crm/        # Contact management components
│   │   │   ├── gmail/      # Gmail integration components
│   │   │   ├── activity/   # Activity feed components
│   │   │   ├── layout/     # Shared layout components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
└── package.json            # Root package with workspace scripts
```

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v8 or higher)
- PostgreSQL database
- Google Cloud Console project (for OAuth and Gmail API)

## Environment Setup

### Backend Environment Variables

Create a `backend/.env` file based on `backend/.env.example`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/organizer"

# Server
PORT=5001
NODE_ENV=development

# Session
SESSION_SECRET="your-session-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5001/api/auth/google/callback"

# Frontend URL (for CORS and redirects)
CLIENT_URL="http://localhost:3000"

# OpenAI (for recipe extraction)
OPENAI_API_KEY="your-openai-api-key"

# Gmail API (optional, for Gmail integration)
GMAIL_PUBSUB_TOPIC="projects/your-project/topics/gmail-notifications"
```

### Frontend Environment Variables

Create a `frontend/.env` file based on `frontend/.env.example`:

```bash
REACT_APP_API_URL=http://localhost:5001
REACT_APP_GOOGLE_CLIENT_ID="your-google-client-id"
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd organizer
```

2. Install dependencies for both frontend and backend:
```bash
npm run install-all
```

3. Set up the database:
```bash
cd backend
npm run prisma:migrate:dev
```

## Development

To run both frontend and backend in development mode:

```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:5001

### Available Scripts

#### Root Level
- `npm run dev` - Run both frontend and backend in development mode
- `npm run frontend` - Run only the frontend
- `npm run backend` - Run only the backend
- `npm run stop` - Stop all running servers
- `npm run install-all` - Install dependencies for both frontend and backend
- `npm test` - Run all tests
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only
- `npm run test:coverage` - Run tests with coverage reports

#### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:migrate:dev` - Create and apply migrations
- `npm run prisma:migrate:deploy` - Apply migrations (production)

#### Frontend Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## Testing

The project includes comprehensive test suites for both frontend and backend components.

### Running Tests

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Run tests with coverage reports
npm run test:coverage
```

### Test Coverage

Generate coverage reports:
```bash
npm run test:coverage
```

View coverage reports:
- Backend: Open `backend/coverage/lcov-report/index.html`
- Frontend: Open `frontend/coverage/lcov-report/index.html`

Coverage thresholds are set to 80% for:
- Branches
- Functions
- Lines
- Statements

### Continuous Testing

For development with continuous testing:
```bash
# Backend continuous testing
cd backend && npm run test:watch

# Frontend continuous testing
cd frontend && npm test
```

## API Endpoints

All API endpoints are prefixed with `/api`.

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Log out current user

### Health Check
- `GET /api/health` - Health check endpoint

### Recipe Module
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create a new recipe
- `GET /api/recipes/:id` - Get recipe details
- `PUT /api/recipes/:id` - Update a recipe
- `DELETE /api/recipes/:id` - Delete a recipe
- `POST /api/recipes/extract-url` - Extract recipe from URL using AI

### Task Module
- `GET /api/tasks` - List tasks (supports date filtering)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Contact Module (CRM)
- `GET /api/contacts` - List contacts (supports search, pagination, sorting)
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update a contact
- `DELETE /api/contacts/:id` - Soft delete a contact
- `GET /api/contacts/:id/versions` - Get contact version history
- `GET /api/contacts/:id/versions/:version` - Get specific version
- `POST /api/contacts/:id/restore/:version` - Restore to a specific version

### Tag Module
- `GET /api/tags` - List all tags (supports search for autocomplete)

### Gmail Integration
- `GET /api/gmail/accounts` - List connected Gmail accounts
- `POST /api/gmail/accounts/connect` - Initiate Gmail OAuth connection
- `GET /api/gmail/callback` - Gmail OAuth callback
- `POST /api/gmail/accounts/:id/activate` - Activate Gmail monitoring
- `POST /api/gmail/accounts/:id/deactivate` - Deactivate Gmail monitoring
- `DELETE /api/gmail/accounts/:id` - Disconnect Gmail account

### Activity Feed
- `GET /api/activity` - Get recent activity feed (supports pagination)

### Webhooks
- `POST /api/webhooks/gmail` - Gmail Pub/Sub webhook endpoint

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:

- **User**: User accounts with Google OAuth integration
- **Recipe**: Recipe storage with ingredients, instructions, and metadata
- **Task**: Daily tasks with categories, priorities, and completion tracking
- **Contact**: CRM contacts with emails, phones, and version history
- **Tag**: User-defined tags for organizing contacts
- **GmailAccount**: Connected Gmail accounts with OAuth tokens
- **GmailWatch**: Gmail push notification subscriptions

Run `npm run prisma:studio` in the backend directory to explore the database visually.

## Deployment

The application is configured for deployment on Railway with Docker containers.

### Backend Deployment
- Dockerfile: `backend/Dockerfile`
- Configuration: `backend/railway.toml`

### Frontend Deployment
- Dockerfile: `frontend/Dockerfile`
- Configuration: `frontend/railway.toml`
- Nginx configuration: `frontend/nginx.conf`

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the project's coding standards
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

ISC
