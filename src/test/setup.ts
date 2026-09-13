/**
 * Setup global do Vitest.
 *
 * Registra os matchers do `@testing-library/jest-dom` (ex.: `toBeInTheDocument`,
 * `toHaveTextContent`) para uso nos testes de exemplo/integração de componentes
 * React/R3F. Este arquivo é carregado via `setupFiles` na configuração do Vitest
 * dentro de `vite.config.ts`.
 */
import '@testing-library/jest-dom/vitest';
