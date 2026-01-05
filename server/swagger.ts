import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Aurora Pipeline API',
      version: '1.0.0',
      description: 'Production-ready content generation pipeline with media processing',
      contact: {
        name: 'Aurora Team',
        email: 'support@aurora.local',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: '/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authentication',
        },
        bearerToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'Bearer token for session-based authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        Run: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed'],
            },
            topic: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            assets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['text', 'audio', 'video'] },
                  status: { type: 'string' },
                  path: { type: 'string' },
                },
              },
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
          },
        },
        ReadyStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'not_ready'] },
            database: { type: 'string' },
            scheduler: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: [], // Will be populated by route documentation
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: true,
        filter: true,
        showRequestHeaders: true,
        presets: [
          swaggerUi.presets.apis,
          swaggerUi.SwaggerUIBundle.presets.SwaggerUIStandalonePresets,
        ],
        layout: 'BaseLayout',
      },
      customCss: '.swagger-ui .topbar { display: none }',
    }),
  );

  // Also serve the spec as JSON
  app.get('/api-spec.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Serve OpenAPI YAML
  app.get('/api-spec.yaml', (req, res) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(OPENAPI_YAML);
  });
}

// Raw OpenAPI specification in YAML format
const OPENAPI_YAML = `
openapi: 3.0.0
info:
  title: Aurora Pipeline API
  version: 1.0.0
  description: Production-ready content generation pipeline with media processing
  contact:
    name: Aurora Team
    email: support@aurora.local
  license:
    name: MIT

servers:
  - url: http://localhost:3000
    description: Development server
  - url: /api
    description: Production server

security:
  - apiKey: []
  - bearerToken: []

paths:
  /health:
    get:
      tags:
        - Health
      summary: Service health check
      description: Returns service health status. Used by Docker health checks and load balancers.
      operationId: getHealth
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  timestamp:
                    type: string
                    format: date-time
                  uptime:
                    type: number
                    description: Uptime in seconds
        '503':
          description: Service is unhealthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: unhealthy
                  reason:
                    type: string
                  timestamp:
                    type: string
                    format: date-time

  /ready:
    get:
      tags:
        - Health
      summary: Kubernetes readiness probe
      description: Checks if service is ready to accept traffic. Verifies database and scheduler.
      operationId: getReady
      responses:
        '200':
          description: Service is ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ready
                  database:
                    type: string
                  scheduler:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
        '503':
          description: Service is not ready

  /metrics:
    get:
      tags:
        - Monitoring
      summary: Prometheus-compatible metrics
      description: Returns metrics in Prometheus text format. Can be scraped by monitoring systems.
      operationId: getMetrics
      responses:
        '200':
          description: Metrics in text format
          content:
            text/plain:
              schema:
                type: string
                example: |
                  # HELP aurora_runs_total Total number of runs
                  # TYPE aurora_runs_total counter
                  aurora_runs_total 42

  /api/runs:
    get:
      tags:
        - Runs
      summary: List all runs
      description: Returns a list of all pipeline runs with pagination support
      operationId: getRuns
      security:
        - apiKey: []
        - bearerToken: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, running, completed, failed]
      responses:
        '200':
          description: List of runs
          content:
            application/json:
              schema:
                type: array
                items:
                  \$ref: '#/components/schemas/Run'
        '401':
          description: Unauthorized

  /api/runs/{runId}:
    get:
      tags:
        - Runs
      summary: Get run details
      description: Returns details of a specific pipeline run
      operationId: getRun
      security:
        - apiKey: []
        - bearerToken: []
      parameters:
        - name: runId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Run details
          content:
            application/json:
              schema:
                \$ref: '#/components/schemas/Run'
        '404':
          description: Run not found
        '401':
          description: Unauthorized

  /api/runs/trigger:
    post:
      tags:
        - Runs
      summary: Trigger a new pipeline run
      description: Manually triggers a new content generation pipeline run
      operationId: triggerRun
      security:
        - apiKey: []
        - bearerToken: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                topic:
                  type: string
                  description: Custom topic for content generation
      responses:
        '200':
          description: Run created and triggered
          content:
            application/json:
              schema:
                \$ref: '#/components/schemas/Run'
        '429':
          description: Rate limit exceeded
        '401':
          description: Unauthorized

  /api/auth/register:
    post:
      tags:
        - Authentication
      summary: Register new user
      description: Creates a new user account and returns API key
      operationId: register
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                password:
                  type: string
                role:
                  type: string
                  enum: [admin, user, viewer]
                  default: user
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    type: object
                    properties:
                      id:
                        type: string
                      username:
                        type: string
                      role:
                        type: string
                  apiKey:
                    type: string

  /api/auth/login:
    post:
      tags:
        - Authentication
      summary: Login
      description: Authenticate with username and password. Returns session token.
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    type: object
        '401':
          description: Invalid credentials

components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: x-api-key
    bearerToken:
      type: http
      scheme: bearer
      description: Session token from /auth/login
`;
