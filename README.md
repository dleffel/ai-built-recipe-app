# AI-Built Recipe App

A full-stack recipe application built with React frontend and Express backend.

## Project Structure

```
ai-built-recipe-app/
├── backend/             # Express server
│   ├── src/
│   │   ├── server.js   # Main server file
│   │   ├── routes/     # API routes
│   │   └── config/     # Server configuration
│   └── package.json
└── frontend/           # React application
    ├── src/
    │   ├── components/
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
cd ai-built-recipe-app
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

- `GET /api/health` - Health check endpoint

## Contributing

[Add contribution guidelines here]

## License

ISC