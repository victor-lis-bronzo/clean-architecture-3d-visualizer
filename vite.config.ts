/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Configuração do Vite.
 *
 * A opção `base` é configurável para permitir o deploy em subcaminho de host
 * (por exemplo, GitHub Pages: `https://usuario.github.io/repositorio/`),
 * cumprindo o Requisito 10.4 sem alterar código-fonte.
 *
 * Defina a variável de ambiente `VITE_BASE` no momento do build para publicar
 * em um subcaminho. Exemplo:
 *   VITE_BASE=/clean-architecture-3d-visualizer/ npm run build
 *
 * Quando `VITE_BASE` não é definida, o padrão é '/' (raiz do host, ex.: Vercel).
 *
 * O bloco `test` integra o Vitest ao pipeline do Vite/TS (Requisito 5.2):
 * - `environment: 'jsdom'` fornece DOM para testes de componentes React/R3F;
 * - `globals: true` expõe `describe`/`it`/`expect` sem imports explícitos;
 * - `setupFiles` carrega os matchers do `@testing-library/jest-dom`.
 * A execução única fica a cargo do script `test` (`vitest --run`).
 */
export default defineConfig(() => {
  const base = process.env.VITE_BASE ?? '/';

  return {
    base,
    plugins: [react()],
    build: {
      outDir: 'dist',
      // Garante artefatos 100% estáticos (Requisito 10.1/10.3).
      sourcemap: false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
