import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['*.ts', 'core/**/*.ts'],
            exclude: ['vitest.config.ts'],
            reporter: ['text', 'lcov']
        }
    }
});
