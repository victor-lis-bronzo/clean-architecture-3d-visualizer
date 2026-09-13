/**
 * Teste de propriedade (fast-check) para a suspensão de renderização em
 * dimensão não positiva (tarefa 9.5).
 *
 * Cobre a Correctness Property 25 do design (clean-architecture-3d-visualizer):
 * o predicado puro `shouldRender(w, h)` retorna `false` sempre que qualquer
 * dimensão for não positiva (`w <= 0` ou `h <= 0`) — sinalizando a suspensão do
 * frameloop com o estado da cena preservado — e retorna `true` somente quando
 * ambas são estritamente positivas (req. 11.5).
 *
 * O teste de propriedade usa `fc.assert(..., { numRuns: 100 })`.
 *
 * _Validates: Requirements 11.5_
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { shouldRender } from './geometry';

/** Gerador de número finito (sem NaN/Infinity) numa faixa que inclui <= 0 e > 0. */
function finiteNumber(min: number, max: number): fc.Arbitrary<number> {
  return fc.double({ min, max, noNaN: true, noDefaultInfinity: true });
}

/** Dimensões estritamente positivas (> 0). */
const positive = finiteNumber(Number.MIN_VALUE, 4096);

/** Dimensões não positivas (<= 0). */
const nonPositive = finiteNumber(-4096, 0);

describe('Property 25 — suspensão de renderização em dimensão não positiva (Requirements 11.5)', () => {
  it('shouldRender é true sse e somente se ambas as dimensões são > 0', () => {
    // Feature: clean-architecture-3d-visualizer, Property 25: Para qualquer estado da cena e quaisquer dimensões, se w <= 0 ou h <= 0 então shouldRender(w, h) === false e o estado da cena permanece inalterado; quando ambas as dimensões voltam a ser > 0, shouldRender === true e a cena preservada é retomada.
    fc.assert(
      fc.property(
        finiteNumber(-4096, 4096),
        finiteNumber(-4096, 4096),
        (w, h) => {
          const expected = w > 0 && h > 0;
          expect(shouldRender(w, h)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('qualquer dimensão <= 0 ⇒ shouldRender === false (frameloop suspenso)', () => {
    // Feature: clean-architecture-3d-visualizer, Property 25: Para qualquer estado da cena e quaisquer dimensões, se w <= 0 ou h <= 0 então shouldRender(w, h) === false e o estado da cena permanece inalterado; quando ambas as dimensões voltam a ser > 0, shouldRender === true e a cena preservada é retomada.
    fc.assert(
      fc.property(
        fc.oneof(
          // w <= 0, h qualquer
          fc.tuple(nonPositive, finiteNumber(-4096, 4096)),
          // h <= 0, w qualquer
          fc.tuple(finiteNumber(-4096, 4096), nonPositive),
        ),
        ([w, h]) => {
          expect(shouldRender(w, h)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ambas as dimensões > 0 ⇒ shouldRender === true (renderização retomada)', () => {
    // Feature: clean-architecture-3d-visualizer, Property 25: Para qualquer estado da cena e quaisquer dimensões, se w <= 0 ou h <= 0 então shouldRender(w, h) === false e o estado da cena permanece inalterado; quando ambas as dimensões voltam a ser > 0, shouldRender === true e a cena preservada é retomada.
    fc.assert(
      fc.property(positive, positive, (w, h) => {
        expect(shouldRender(w, h)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
