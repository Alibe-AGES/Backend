import { OpenAPIObject, SchemaObject } from '@nestjs/swagger';

const userSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'name', 'email', 'emailVerified', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Ana Beatriz Silva' },
    email: { type: 'string', format: 'email', example: 'ana.silva@example.com' },
    emailVerified: { type: 'boolean', example: false },
    image: { type: 'string', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const sessionSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'userId', 'token', 'expiresAt', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    token: { type: 'string', description: 'Identificador opaco da sessão.' },
    expiresAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    ipAddress: { type: 'string', nullable: true },
    userAgent: { type: 'string', nullable: true },
  },
};

const errorSchema: SchemaObject = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
  },
};

/**
 * Better Auth owns its HTTP handler, so these routes are not discovered from
 * Nest controllers. Keep their public contract in the generated Nest Swagger.
 */
export function addBetterAuthOpenApiPaths(document: OpenAPIObject): OpenAPIObject {
  document.paths['/api/auth/get-session'] = {
    get: {
      tags: ['Authentication'],
      operationId: 'getSession',
      summary: 'Consultar a sessão atual',
      description:
        'Obtém a sessão pelo cookie do Better Auth ou por Authorization: Bearer <token>. No Swagger, use Authorize e cole o token retornado pelo login. Retorna null quando a autenticação está ausente, inválida ou expirada.',
      security: [{ 'better-auth-bearer': [] }, { 'better-auth': [] }, {}],
      responses: {
        200: {
          description: 'Sessão atual ou null quando não existe uma sessão válida.',
          headers: {
            'Cache-Control': {
              description: 'A resposta de sessão não deve ser armazenada em cache.',
              schema: { type: 'string', example: 'no-store' },
            },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                nullable: true,
                required: ['session', 'user'],
                properties: {
                  session: sessionSchema,
                  user: userSchema,
                },
              },
            },
          },
        },
      },
    },
  };

  document.paths['/api/auth/sign-up/email'] = {
    post: {
      tags: ['Authentication'],
      operationId: 'signUpWithEmail',
      summary: 'Criar usuário com e-mail e senha',
      description:
        'Cria o usuário e sua conta credential. Como autoSignIn está desabilitado, não cria sessão e retorna token null.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Ana Beatriz Silva' },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'ana.silva@example.com',
                },
                password: {
                  type: 'string',
                  format: 'password',
                  minLength: 8,
                  maxLength: 128,
                  example: 'senha-segura',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            'Usuário criado. Para não revelar e-mails existentes, uma tentativa duplicada também pode retornar uma resposta genérica 200.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'user'],
                properties: {
                  token: {
                    type: 'string',
                    nullable: true,
                    example: null,
                    description: 'Sempre null porque autoSignIn está desabilitado.',
                  },
                  user: userSchema,
                },
              },
            },
          },
        },
        400: {
          description: 'Body, e-mail ou senha inválidos.',
          content: { 'application/json': { schema: errorSchema } },
        },
        422: {
          description: 'Não foi possível persistir o usuário ou a conta credential.',
          content: { 'application/json': { schema: errorSchema } },
        },
        429: {
          description: 'Excesso de tentativas quando o rate limit está habilitado.',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    },
  };

  document.paths['/api/auth/sign-in/email'] = {
    post: {
      tags: ['Authentication'],
      operationId: 'signInWithEmail',
      summary: 'Iniciar sessão com e-mail e senha',
      description:
        'Valida as credenciais, cria a sessão no banco e envia o cookie de sessão. ' +
        'No aplicativo mobile, o cliente Better Auth Expo persiste e reenvia esse cookie.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'ana.silva@example.com',
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'senha-segura',
                },
                rememberMe: {
                  type: 'boolean',
                  default: true,
                  description: 'Quando false, cria uma sessão não persistente.',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login realizado. Também envia o cookie HttpOnly better-auth.session_token.',
          headers: {
            'Set-Cookie': {
              description: 'Cookie opaco da sessão, gerenciado pelo Better Auth.',
              schema: { type: 'string' },
            },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['redirect', 'token', 'user'],
                properties: {
                  redirect: { type: 'boolean', enum: [false] },
                  token: {
                    type: 'string',
                    description:
                      'Token opaco retornado pelo Better Auth; o app não deve persistir esse campo manualmente.',
                  },
                  user: userSchema,
                },
              },
            },
          },
        },
        400: {
          description: 'Body inválido ou e-mail em formato inválido.',
          content: { 'application/json': { schema: errorSchema } },
        },
        401: {
          description: 'E-mail ou senha inválidos.',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    },
  };

  return document;
}
