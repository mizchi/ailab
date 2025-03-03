/**
 * 実際のユースケースに基づくテストケース
 */

import { expect, test } from "./deps.ts";
import { TypePredictor } from "./mod.ts";

test("usecase - API response", () => {
  const predictor = new TypePredictor();
  const input = {
    success: true,
    status: 200,
    data: {
      users: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
          metadata: {
            lastLogin: "2024-02-24T10:00:00Z",
            loginCount: 42,
            preferences: {
              theme: "dark",
              notifications: true,
            },
          },
          posts: [
            {
              id: 1,
              title: "Hello World",
              content: "Lorem ipsum...",
              tags: ["tech", "blog"],
              comments: [
                {
                  id: 1,
                  user: "jane",
                  text: "Great post!",
                  likes: 5,
                },
              ],
            },
          ],
        },
      ],
      pagination: {
        total: 100,
        page: 1,
        limit: 10,
        hasMore: true,
      },
    },
    meta: {
      requestId: "req-123",
      processingTime: 0.123,
      cache: {
        hit: false,
        ttl: 3600,
      },
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("usecase - form data", () => {
  const predictor = new TypePredictor();
  const input = {
    form: {
      personal: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+1-234-567-8900",
        birthDate: "1990-01-01",
      },
      address: {
        street: "123 Main St",
        city: "Boston",
        state: "MA",
        zip: "02101",
        country: "USA",
      },
      preferences: {
        newsletter: true,
        marketing: false,
        notifications: {
          email: true,
          sms: false,
          push: null,
        },
      },
      account: {
        username: "johndoe",
        password: "********",
        confirmPassword: "********",
        securityQuestions: [
          {
            question: "What is your first pet's name?",
            answer: "********",
          },
          {
            question: "Where were you born?",
            answer: "********",
          },
        ],
      },
      files: {
        avatar: {
          name: "photo.jpg",
          size: 1024000,
          type: "image/jpeg",
          lastModified: "2024-02-24T10:00:00Z",
        },
        documents: [
          {
            name: "passport.pdf",
            size: 2048000,
            type: "application/pdf",
            lastModified: "2024-02-24T10:00:00Z",
          },
        ],
      },
    },
    meta: {
      submitted: "2024-02-24T10:00:00Z",
      browser: "Chrome",
      platform: "Windows",
      ip: "192.168.1.1",
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("usecase - configuration file", () => {
  const predictor = new TypePredictor();
  const input = {
    app: {
      name: "MyApp",
      version: "1.0.0",
      environment: "production",
      debug: false,
    },
    server: {
      host: "localhost",
      port: 3000,
      ssl: {
        enabled: true,
        cert: "/path/to/cert.pem",
        key: "/path/to/key.pem",
      },
      cors: {
        enabled: true,
        origins: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        headers: ["Content-Type", "Authorization"],
      },
    },
    database: {
      primary: {
        type: "postgres",
        host: "localhost",
        port: 5432,
        name: "myapp",
        user: "admin",
        password: "********",
        pool: {
          min: 5,
          max: 20,
          idle: 10000,
        },
      },
      replica: {
        enabled: false,
        hosts: [],
      },
      redis: {
        enabled: true,
        host: "localhost",
        port: 6379,
        password: null,
      },
    },
    logging: {
      level: "info",
      format: "json",
      outputs: ["console", "file"],
      files: {
        error: "/var/log/myapp/error.log",
        access: "/var/log/myapp/access.log",
      },
      rotation: {
        enabled: true,
        size: "100M",
        keep: 10,
      },
    },
    features: {
      authentication: {
        enabled: true,
        providers: ["local", "google", "github"],
        jwt: {
          secret: "********",
          expiry: "24h",
        },
        rateLimit: {
          window: 3600,
          max: 100,
        },
      },
      cache: {
        enabled: true,
        ttl: 3600,
        invalidation: {
          strategy: "time-based",
          interval: "1h",
        },
      },
      notifications: {
        email: {
          enabled: true,
          provider: "smtp",
          from: "noreply@example.com",
        },
        sms: {
          enabled: false,
          provider: null,
        },
        push: {
          enabled: true,
          provider: "firebase",
          credentials: {
            projectId: "my-project",
            privateKey: "********",
          },
        },
      },
    },
    monitoring: {
      metrics: {
        enabled: true,
        interval: 60,
        exporters: ["prometheus"],
      },
      tracing: {
        enabled: true,
        sampler: 0.1,
        exporters: ["jaeger"],
      },
      alerts: {
        enabled: true,
        channels: ["email", "slack"],
        rules: [
          {
            name: "high_cpu",
            condition: "cpu > 80%",
            duration: "5m",
            severity: "warning",
          },
          {
            name: "high_memory",
            condition: "memory > 90%",
            duration: "5m",
            severity: "critical",
          },
        ],
      },
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("usecase - database records", () => {
  const predictor = new TypePredictor();
  const input = {
    users: [
      {
        id: 1,
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        username: "john_doe",
        email: "john@example.com",
        password_hash: "********",
        status: "active",
        role: "admin",
        created_at: "2024-02-24T10:00:00Z",
        updated_at: "2024-02-24T10:00:00Z",
        deleted_at: null,
        profile: {
          first_name: "John",
          last_name: "Doe",
          avatar_url: "https://example.com/avatar.jpg",
          bio: "Software Engineer",
          location: {
            city: "Boston",
            country: "USA",
            coordinates: {
              latitude: 42.3601,
              longitude: -71.0589,
            },
          },
        },
        settings: {
          theme_dark: true,
          theme_compact: false,
          notifications_email: true,
          notifications_push: false,
        },
        metadata: {
          last_login: "2024-02-24T09:00:00Z",
          login_count: 42,
          failed_attempts: 0,
          password_changed_at: "2024-01-01T00:00:00Z",
          verified_at: "2024-01-01T00:00:00Z",
        },
      },
    ],
    posts: [
      {
        id: 1,
        uuid: "650e8400-e29b-41d4-a716-446655440000",
        user_id: 1,
        title: "Hello World",
        slug: "hello-world",
        content: "Lorem ipsum...",
        status: "published",
        created_at: "2024-02-24T10:00:00Z",
        updated_at: "2024-02-24T10:00:00Z",
        published_at: "2024-02-24T10:00:00Z",
        deleted_at: null,
        metadata: {
          word_count: 100,
          read_time: 5,
          language: "en",
          seo: {
            title: "Custom SEO Title",
            description: "Custom SEO Description",
            keywords: ["tech", "blog"],
          },
        },
        stats: {
          views: 1000,
          likes: 50,
          comments: 10,
          shares: 5,
        },
      },
    ],
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});
