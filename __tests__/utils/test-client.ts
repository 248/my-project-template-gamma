import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

/**
 * Next.js アプリケーションのテスト用クライアント
 */
export class TestClient {
  private app: unknown;
  private handle: unknown;
  private server: unknown;
  private baseUrl: string;

  constructor(private port: number = 3000) {
    this.baseUrl = `http://localhost:${port}`;
  }

  async start() {
    const dev = process.env.NODE_ENV !== 'production';
    this.app = next({
      dev,
      hostname: 'localhost',
      port: this.port,
      dir: './apps/web',
    });
    this.handle = this.app.getRequestHandler();
    await this.app.prepare();

    this.server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await this.handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    await new Promise<void>((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }
    if (this.app) {
      await this.app.close();
    }
  }

  async get(path: string, options: Record<string, unknown> = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.json().catch(() => null),
      text: await response.text().catch(() => ''),
    };
  }

  async post(
    path: string,
    data?: unknown,
    options: Record<string, unknown> = {}
  ) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.json().catch(() => null),
      text: await response.text().catch(() => ''),
    };
  }

  async put(
    path: string,
    data?: unknown,
    options: Record<string, unknown> = {}
  ) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.json().catch(() => null),
      text: await response.text().catch(() => ''),
    };
  }

  async delete(path: string, options: Record<string, unknown> = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      ...options,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.json().catch(() => null),
      text: await response.text().catch(() => ''),
    };
  }
}

// シングルトンインスタンス
export const testClient = new TestClient();
