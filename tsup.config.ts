import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  esbuildOptions: (options) => {
    options.sourcemap = true;
  },
  format: ['cjs', 'esm'],
  target: 'node20',
  treeshake: true,
});
