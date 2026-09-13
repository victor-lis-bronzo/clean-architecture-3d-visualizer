/**
 * Teste de fumaça (smoke test) do tooling de testes.
 *
 * Confirma que:
 * - o runner Vitest executa e os globals (`describe`/`it`/`expect`) funcionam;
 * - o ambiente `jsdom` está ativo (existe um `document`/`window`);
 * - o `fast-check` (property-based testing) está disponível e roda ≥100 iterações.
 *
 * Este arquivo valida apenas a infraestrutura de testes (tarefa 1.2) e não
 * exercita lógica de domínio.
 */
import * as fc from 'fast-check';

describe('tooling de testes', () => {
  it('executa o Vitest com globals habilitados', () => {
    expect(1 + 1).toBe(2);
  });

  it('fornece o ambiente jsdom', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });

  it('roda testes de propriedade com fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
      { numRuns: 100 },
    );
  });
});
