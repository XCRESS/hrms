/**
 * OpenAPI 3.0 Specification for HRMS API
 * Auto-generated API documentation and contracts
 */

import { oas31 } from 'openapi3-ts';

export const openApiSpec: oas31.OpenAPIObject = {
  openapi: '3.1.0',
  info: {
    title: 'HRMS API',
    version: '1.0.0',
    description: 'Human Resource Management System API with comprehensive employee management, attendance tracking, and payroll features',
    contact: {
      name: 'HRMS Support',
      email: 'support@hrms.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api',
      description: 'Development server',
    },
    {
      url: 'https://hrms-jx26.vercel.app/api',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Employees', description: 'Employee management' },
    { name: 'Attendance', description: 'Attendance tracking' },
    { name: 'Leave', description: 'Leave management' },
    { name: 'Holidays', description: 'Holiday calendar' },
    { name: 'Salary', description: 'Salary structures and slips' },
    { name: 'Settings', description: 'System settings' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'hr', 'employee'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          employeeId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          department: { type: 'string' },
          position: { type: 'string' },
          joiningDate: { type: 'string', format: 'date' },
          isActive: { type: 'boolean' },
        },
      },
      Attendance: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          employee: { type: 'string' },
          date: { type: 'string', format: 'date' },
          checkIn: { type: 'string', format: 'date-time' },
          checkOut: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['present', 'absent', 'late', 'half-day'] },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        description: 'Authenticate user and return JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'Get all employees',
        description: 'Retrieve list of all employees (HR/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'Employees retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Employee' },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/attendance/check-in': {
      post: {
        tags: ['Attendance'],
        summary: 'Check in attendance',
        description: 'Record employee check-in with location',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['latitude', 'longitude'],
                properties: {
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Check-in successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Attendance' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid location or already checked in',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
