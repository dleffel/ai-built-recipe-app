"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const server_config_1 = __importDefault(require("./config/server-config"));
/* istanbul ignore next */
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)({
        origin: server_config_1.default.corsOrigin,
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    return app;
}
const app = createApp();
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Test error endpoint
app.get('/test-error', (_req, _res, next) => {
    const error = new Error('Test error');
    error.status = 500;
    next(error);
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    /* istanbul ignore next */
    if (err.stack) {
        console.error(err.stack);
    }
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: {
            message: 'Not Found',
            status: 404
        }
    });
});
/* istanbul ignore next */
if (server_config_1.default.nodeEnv === 'production') {
    // Serve static files from the React app
    app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/build')));
    // Production catch-all route
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../../frontend/build/index.html'));
    });
}
/* istanbul ignore next */
function startServer() {
    app.listen(server_config_1.default.port, () => {
        console.log(`Server running on port ${server_config_1.default.port} in ${server_config_1.default.nodeEnv} mode`);
    });
}
// Start server only if this file is run directly
/* istanbul ignore if */
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map