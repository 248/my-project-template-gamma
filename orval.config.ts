import { defineConfig } from 'orval';

export default defineConfig({
  'template-gamma-api': {
    input: {
      target: './openapi/openapi.yaml',
    },
    output: {
      target: './packages/generated/api-client.ts',
      client: 'fetch',
      mode: 'single',
      httpClient: 'fetch',
      prettier: true,
      baseUrl: 'http://localhost:3000',
    },
  },
});
