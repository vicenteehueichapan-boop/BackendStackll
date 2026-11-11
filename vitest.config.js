import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Las pruebas leen .env.test (base de datos de pruebas separada, nunca la de uso real).
export default defineConfig({
  test: {
    environment: 'node',
    env: loadEnv('test', process.cwd(), ''),
    include: ['tests/**/*.test.js'],
    globalSetup: './tests/prepararBaseDatos.js',
    // Las pruebas de integración comparten la base: se ejecutan una a una.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
