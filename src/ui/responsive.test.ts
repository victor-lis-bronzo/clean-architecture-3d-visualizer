/**
 * Testes de propriedade dos helpers puros de responsividade (`ui/responsive.ts`).
 *
 * - Property 23: Visibilidade responsiva monotônica por breakpoint (req. 11.2, 11.3, 11.4).
 * - Property 24: Aspect ratio no redimensionamento (req. 11.1).
 *
 * Ferramentas: Vitest + fast-check (≥100 iterações por propriedade).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  computeAspect,
  overlayVisibilityFor,
  PROGRESS_BREAKPOINT_PX,
  TIMER_BREAKPOINT_PX,
  type OverlayVisibility,
} from './responsive';

/**
 * Conjunto de elementos visíveis (nomes) derivado de uma OverlayVisibility.
 * Usado para verificar a invariante de subconjunto (monotonicidade).
 */
function visibleSet(v: OverlayVisibility): Set<string> {
  const s = new Set<string>();
  if (v.controls) s.add('controls');
  if (v.timer) s.add('timer');
  if (v.progress) s.add('progress');
  return s;
}

/** Verdadeiro se `a` é subconjunto de `b`. */
function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

describe('ui/responsive — helpers puros de responsividade', () => {
  // Feature: clean-architecture-3d-visualizer, Property 23: Visibilidade responsiva monotônica por breakpoint. Para qualquer largura de viewport w > 0, o conjunto de elementos visíveis do UI_Overlay obedece: w ≥ 1024 → {controles, timer, progresso}; 640 ≤ w < 1024 → {controles, timer}; w < 640 → {controles}. O conjunto é monotônico: reduzir a largura nunca adiciona elementos, e os controles de navegação estão sempre visíveis.
  it('Property 23: visibilidade por breakpoint com controles sempre visíveis (Validates: Requirements 11.2, 11.3, 11.4)', () => {
    fc.assert(
      fc.property(
        // Larguras estritamente positivas, cobrindo as três faixas de breakpoint.
        fc.double({ min: 1, max: 5000, noNaN: true, noDefaultInfinity: true }),
        (w) => {
          const v = overlayVisibilityFor(w);

          // Controles sempre visíveis, independentemente da largura.
          expect(v.controls).toBe(true);

          if (w >= PROGRESS_BREAKPOINT_PX) {
            // w >= 1024 → todos visíveis.
            expect(v).toEqual({ controls: true, timer: true, progress: true });
          } else if (w >= TIMER_BREAKPOINT_PX) {
            // 640 <= w < 1024 → controles + timer, sem progresso.
            expect(v).toEqual({ controls: true, timer: true, progress: false });
          } else {
            // w < 640 → apenas controles.
            expect(v).toEqual({ controls: true, timer: false, progress: false });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 23: Visibilidade responsiva monotônica por breakpoint. Monotonicidade: para w1 <= w2, o conjunto visível em w1 é subconjunto do conjunto visível em w2 (reduzir a largura nunca adiciona elementos).
  it('Property 23: monotonicidade — reduzir a largura nunca adiciona elementos (Validates: Requirements 11.2, 11.3, 11.4)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 5000, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const w1 = Math.min(a, b);
          const w2 = Math.max(a, b);
          const smaller = visibleSet(overlayVisibilityFor(w1));
          const larger = visibleSet(overlayVisibilityFor(w2));
          // visible(w1) ⊆ visible(w2)
          expect(isSubset(smaller, larger)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 24: Aspect ratio no redimensionamento. Para quaisquer dimensões de viewport w > 0 e h > 0, computeAspect(w, h) === w / h.
  it('Property 24: computeAspect(w, h) === w / h (Validates: Requirements 11.1)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 100000, noNaN: true, noDefaultInfinity: true }),
        (w, h) => {
          expect(computeAspect(w, h)).toBe(w / h);
        },
      ),
      { numRuns: 100 },
    );
  });
});
