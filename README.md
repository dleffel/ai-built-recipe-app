# Organizer

A full-stack modular organization application with React frontend and Express backend, featuring recipe management and task organization modules.

## Project Structure

```
organizer/
├── backend/             # Express server
│   ├── src/
│   │   ├── server.js   # Main server file
│   │   ├── routes/     # API routes
│   │   └── config/     # Server configuration
│   └── package.json
└── frontend/           # React application
    ├── src/
    │   ├── components/
    │   │   ├── recipes/  # Recipe module components
    │   │   ├── todos/    # To-Do module components
    │   │   └── layout/   # Shared layout components
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

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

## Development

To run both frontend and backend in development mode:

```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:5001

### Available Scripts

- `npm run dev` - Run both frontend and backend in development mode
- `npm run frontend` - Run only the frontend
- `npm run backend` - Run only the backend
- `npm run stop` - Stop all running servers
- `npm run install-all` - Install dependencies for both frontend and backend

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

### Core Endpoints
- `GET /api/health` - Health check endpoint

### Recipe Module Endpoints
- `GET /api/recipes` - List recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/:id` - Get recipe details
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/extract-url` - Extract recipe from URL

### To-Do Module Endpoints
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Contributing

[Add contribution guidelines here]

## License

ISC