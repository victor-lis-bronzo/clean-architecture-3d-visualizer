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

import {
  computeHighlight,
  computeNext,
  computePrev,
  formatProgress,
  next,
  prev,
} from './tour-controller';
import { LAYER_ORDER } from '../tour-data/types';
import type { CameraConfig, TourStep, Vec3 } from '../tour-data/types';

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

  // Feature: clean-architecture-3d-visualizer, Property 3: Destaque exclusivo da Layer em foco. Para qualquer Tour_Step válido, computeHighlight(step) marca exatamente a focusLayer desse passo como destacada e todas as demais Layers como não destacadas.
  it('Property 3: destaca exclusivamente a Layer em foco (Validates: Requirements 4.8)', () => {
    // Gerador de Vec3 finito para compor uma CameraConfig válida.
    const arbVec3: fc.Arbitrary<Vec3> = fc
      .tuple(
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
      )
      .map(([x, y, z]) => [x, y, z] as Vec3);

    const arbCamera: fc.Arbitrary<CameraConfig> = fc.record({
      position: arbVec3,
      target: arbVec3,
    });

    // Gera um TourStep válido escolhendo focusLayer dentre LAYER_ORDER.
    const arbStep: fc.Arbitrary<TourStep> = fc.record({
      order: fc.integer({ min: 1, max: 50 }),
      title: fc.string({ minLength: 1, maxLength: 80 }),
      body: fc.string({ minLength: 1, maxLength: 1000 }),
      focusLayer: fc.constantFrom(...LAYER_ORDER),
      camera: arbCamera,
      notes: fc.string({ maxLength: 2000 }),
    });

    fc.assert(
      fc.property(arbStep, (step) => {
        const highlight = computeHighlight(step);

        // A Layer em foco está destacada.
        expect(highlight[step.focusLayer]).toBe(true);

        // Todas as demais Layers não estão destacadas, e há exatamente um true.
        let trueCount = 0;
        for (const layer of LAYER_ORDER) {
          if (layer === step.focusLayer) {
            expect(highlight[layer]).toBe(true);
            trueCount += 1;
          } else {
            expect(highlight[layer]).toBe(false);
          }
        }
        expect(trueCount).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 4: Formato do indicador de progresso. Para qualquer active em [1, count], formatProgress(active, count) produz a string "{active} de {count}" com active sempre dentro de [1, count].
  it('Property 4: formata o indicador de progresso como "{active} de {count}" (Validates: Requirements 4.9)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (count, activeSeed) => {
          // active constrangido ao espaço válido [1, count].
          const active = ((activeSeed - 1) % count) + 1;

          // active permanece dentro de [1, count].
          expect(active).toBeGreaterThanOrEqual(1);
          expect(active).toBeLessThanOrEqual(count);

          // Formato "{active} de {count}".
          expect(formatProgress(active, count)).toBe(`${active} de ${count}`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
