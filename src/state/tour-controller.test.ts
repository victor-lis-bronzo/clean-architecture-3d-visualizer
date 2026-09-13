/**
 * Testes de propriedade para a lógica pura de navegação do Tour_Controller.
 *
 * Cobre as propriedades de correção do design.md:
 * - Property 1: Clamp e gating da navegação do tour (req. 4.3–4.6, 4.10).
 * - Property 2: Reversibilidade da navegação no interior (req. 4.3, 4.4).
 *
 * Ferramentas: Vitest + fast-check (≥100 iterações por propriedade).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { computeNext, computePrev, next, prev } from './tour-controller';

describe('Tour_Controller — navegação pura', () => {
  // Feature: clean-architecture-3d-visualizer, Property 1: Clamp e gating da navegação do tour. Para qualquer contagem de passos count (1..50), qualquer passo ativo active em [1, count] e qualquer flag isTransitioning: se isTransitioning é verdadeiro, next e prev retornam active inalterado; caso contrário, next retorna min(active+1, count) e prev retorna max(active-1, 1), permanecendo sempre em [1, count].
  it('Property 1: aplica clamp e gating por transição na navegação (Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.10)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.boolean(),
        (count, activeSeed, isTransitioning) => {
          // active constrangido ao espaço válido [1, count].
          const active = ((activeSeed - 1) % count) + 1;

          const resultNext = next(active, count, isTransitioning);
          const resultPrev = prev(active, isTransitioning);

          if (isTransitioning) {
            // Gating: comandos ignorados durante transição (req. 4.10).
            expect(resultNext).toBe(active);
            expect(resultPrev).toBe(active);
          } else {
            // Clamp de avançar/retroceder (req. 4.3–4.6).
            expect(resultNext).toBe(Math.min(active + 1, count));
            expect(resultPrev).toBe(Math.max(active - 1, 1));
          }

          // O resultado permanece sempre em [1, count].
          expect(resultNext).toBeGreaterThanOrEqual(1);
          expect(resultNext).toBeLessThanOrEqual(count);
          expect(resultPrev).toBeGreaterThanOrEqual(1);
          expect(resultPrev).toBeLessThanOrEqual(count);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 2: Reversibilidade da navegação no interior. Para qualquer count ≥ 2 e qualquer active em [2, count-1] (interior, sem transição), aplicar next seguido de prev retorna ao mesmo active, e prev seguido de next também.
  it('Property 2: navegação no interior é reversível sem transição (Validates: Requirements 4.3, 4.4)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 50 }),
        fc.integer({ min: 2, max: 49 }),
        (count, activeSeed) => {
          // Constrange active ao interior [2, count-1] (exige count ≥ 3 para
          // um interior não-vazio; count ≥ 2 tem interior vazio).
          const interiorSize = count - 2; // >= 1 pois count >= 3
          const active = 2 + ((activeSeed - 2) % interiorSize);

          // Pré-condições do interior (sem transição).
          expect(active).toBeGreaterThanOrEqual(2);
          expect(active).toBeLessThanOrEqual(count - 1);

          // next então prev retorna ao active original.
          const afterNextPrev = computePrev(computeNext(active, count));
          expect(afterNextPrev).toBe(active);

          // prev então next retorna ao active original.
          const afterPrevNext = computeNext(computePrev(active), count);
          expect(afterPrevNext).toBe(active);
        },
      ),
      { numRuns: 100 },
    );
  });
});
