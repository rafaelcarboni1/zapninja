import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: [
    // Excluir dependências problemáticas do blessed
    'term.js',
    'pty.js',
    // Outras dependências nativas que podem causar problemas
    'canvas',
    'sharp'
  ],
  esbuildOptions(options) {
    // Configurações adicionais do esbuild se necessário
    options.platform = 'node';
    options.target = 'node18';
  }
});