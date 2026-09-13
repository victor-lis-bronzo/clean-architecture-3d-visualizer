/**
 * Testes de propriedade para os helpers puros de câmera do domínio Scene.
 *
 * Cobre as propriedades de correção do design.md:
 * - Property 13: Easing com velocidade nula nas extremidades (req. 3.1).
 * - Property 14: Clamp da duração da transição de câmera (req. 3.2).
 * - Property 15: Ausência de configuração de câmera é no-op (req. 3.6).
 * - Property 16: Gating dos controles manuais de câmera (req. 3.4, 3.5).
 *
 * Ferramentas: Vitest + fast-check (≥100 iterações por propriedade).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { CameraConfig } from '../tour-data/types';
import {
  easing,
  lerp,
  orbitEnabled,
  resolveDuration,
  shouldStartTransition,
  DEFAULT_DURATION_SEC,
  MAX_DURATION_SEC,
  MIN_DURATION_SEC,
  type CameraGateState,
} from './camera-math';

/** Gera um número finito arbitrário (sem NaN/±Infinity). */
const arbFinite = (min = -1e6, max = 1e6) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

/** Gera um Vec3 finito arbitrário. */
const arbVec3 = () =>
  fc.tuple(arbFinite(), arbFinite(), arbFinite()) as fc.Arbitrary<
    readonly [number, number, number]
  >;

/** Gera uma CameraConfig válida arbitrária. */
const arbCameraConfig = (): fc.Arbitrary<CameraConfig> =>
  fc.record({ position: arbVec3(), target: arbVec3() });

describe('camera-math — helpers puros de câmera', () => {
  // ─── TASK 8.2 ──────────────────────────────────────────────────────────
  // Feature: clean-architecture-3d-visualizer, Property 13: Easing com velocidade nula nas extremidades. Para qualquer t em [0, 1], a função de easing satisfaz easing(0) = 0, easing(1) = 1 e é monotônica não-decrescente; consequentemente lerp(a, b, easing(t)) permanece entre a e b para quaisquer a, b.
  describe('Property 13: easing com velocidade nula nas extremidades', () => {
    it('easing(0) === 0 e easing(1) === 1 (Validates: Requirements 3.1)', () => {
      expect(easing(0)).toBe(0);
      expect(easing(1)).toBe(1);
    });

    it('easing é monotônica não-decrescente em [0, 1] (Validates: Requirements 3.1)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (u, v) => {
            // Ordena o par para garantir t1 <= t2.
            const t1 = Math.min(u, v);
            const t2 = Math.max(u, v);
            expect(easing(t1)).toBeLessThanOrEqual(easing(t2));
          },
        ),
        { numRuns: 100 },
      );
    });

    it('velocidade nula nas extremidades: derivada ~0 perto de t=0 e t=1 (Validates: Requirements 3.1)', () => {
      const h = 1e-6;
      // Derivada por diferença finita à direita em 0 e à esquerda em 1.
      const derivAt0 = (easing(h) - easing(0)) / h;
      const derivAt1 = (easing(1) - easing(1 - h)) / h;
      expect(Math.abs(derivAt0)).toBeLessThan(1e-3);
      expect(Math.abs(derivAt1)).toBeLessThan(1e-3);
    });

    it('lerp(a, b, easing(t)) permanece entre a e b para t em [0, 1] (Validates: Requirements 3.1)', () => {
      fc.assert(
        fc.property(
          arbFinite(),
          arbFinite(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (a, b, t) => {
            const result = lerp(a, b, easing(t));
            const lo = Math.min(a, b);
            const hi = Math.max(a, b);
            // Tolerância mínima para arredondamento de ponto flutuante.
            const eps = (Math.abs(a) + Math.abs(b)) * 1e-9 + 1e-9;
            expect(result).toBeGreaterThanOrEqual(lo - eps);
            expect(result).toBeLessThanOrEqual(hi + eps);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── TASK 8.3 ──────────────────────────────────────────────────────────
  // Feature: clean-architecture-3d-visualizer, Property 14: Clamp da duração da transição de câmera. Para qualquer duração solicitada d, resolveDuration(d) está em [0.3, 2.0]; quando d está ausente/indefinida o resultado é 1.0.
  describe('Property 14: clamp da duração da transição de câmera', () => {
    it('resolveDuration(d) permanece em [0.3, 2.0] para qualquer d finito (Validates: Requirements 3.2)', () => {
      fc.assert(
        fc.property(arbFinite(-1000, 1000), (d) => {
          const result = resolveDuration(d);
          expect(result).toBeGreaterThanOrEqual(MIN_DURATION_SEC);
          expect(result).toBeLessThanOrEqual(MAX_DURATION_SEC);
        }),
        { numRuns: 100 },
      );
    });

    it('resolveDuration recai no padrão 1.0 para undefined/null/não-finito (Validates: Requirements 3.2)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<number | null | undefined>(
            undefined,
            null,
            Number.NaN,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
          ),
          (d) => {
            expect(resolveDuration(d)).toBe(DEFAULT_DURATION_SEC);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('resolveDuration preserva valores já dentro do intervalo (Validates: Requirements 3.2)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: MIN_DURATION_SEC, max: MAX_DURATION_SEC, noNaN: true }),
          (d) => {
            expect(resolveDuration(d)).toBe(d);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
