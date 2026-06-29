import { Router } from "express";

const router = Router();

const openApiSchema = {
  openapi: "3.0.3",
  info: {
    title: "Agenario API Documentation",
    description: "Production API specification for Agenario static analysis, sandboxing, and security copilot services.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "/api",
      description: "Default Base Server",
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                  phone: { type: "string" },
                  otp: { type: "string" },
                },
                required: ["email", "password", "name", "phone", "otp"],
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Invalid input" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Authenticate user and open session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/send-otp": {
      post: {
        summary: "Generate and send OTP code to mobile number",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "+911234567890" },
                },
                required: ["phone"],
              },
            },
          },
        },
        responses: {
          200: { description: "OTP sent successfully" },
          400: { description: "Invalid phone number format" },
        },
      },
    },
    "/scans": {
      post: {
        summary: "Start a new codebase security scan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sourceType: { type: "string", enum: ["github", "zip", "url", "description"] },
                  sourceInput: { type: "string", example: "https://github.com/example/repo" },
                  appDescription: { type: "string" },
                },
                required: ["sourceType", "sourceInput"],
              },
            },
          },
        },
        responses: {
          201: { description: "Scan queued successfully" },
          401: { description: "Not authenticated" },
        },
      },
      get: {
        summary: "List recent security scans run by the user",
        responses: {
          200: { description: "Array of scan records" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/scans/{id}": {
      get: {
        summary: "Fetch details and engine telemetry for a specific scan",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Completed scan report and proofs" },
          404: { description: "Scan not found" },
        },
      },
    },
    "/teams": {
      post: {
        summary: "Create a new enterprise team workspace",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: { description: "Team created successfully" },
          401: { description: "Not authenticated" },
        },
      },
      get: {
        summary: "List teams user is a member of",
        responses: {
          200: { description: "List of team memberships" },
        },
      },
    },
    "/health/deep": {
      get: {
        summary: "Detailed deep dependency health checks",
        responses: {
          200: { description: "Detailed check of PG connection, AI APIs, and memory health" },
        },
      },
    },
  },
};

router.get("/docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Agenario API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #fafafa;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='/api/openapi.json'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
      </body>
    </html>
  `);
});

router.get("/openapi.json", (req, res) => {
  res.json(openApiSchema);
});

export default router;
