/**
 * Testes de propriedade (fast-check) para os helpers puros de Data_Particles.
 *
 * Cobre as Correctness Properties 9, 10, 11 e 12 do design
 * (clean-architecture-3d-visualizer):
 *  - Property 9  : Clamp da contagem de partículas.
 *  - Property 10 : Contenção das partículas dentro dos limites.
 *  - Property 11 : Congelamento sob prefers-reduced-motion.
 *  - Property 12 : Direção das partículas coerente com o passo.
 *
 * Cada teste de propriedade usa `fc.assert(..., { numRuns: 100 })`.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  MAX_PARTICLES,
  MIN_PARTICLES,
  type Particle,
  clampParticleCount,
  particleDirectionFor,
  updateParticlesFrame,
} from './particles-math';
import { outermostRadius } from './geometry';
import { LAYER_ORDER, type TourStep, type Vec3 } from '../tour-data/types';

/** Tolerância para comparações de ponto flutuante em raios/contenção. */
const EPSILON = 1e-9;

/** Gerador de números finitos (sem NaN nem Infinity) em uma faixa razoável. */
function finiteNumber(min: number, max: number): fc.Arbitrary<number> {
  return fc.double({ min, max, noNaN: true, noDefaultInfinity: true });
}

/** Gerador de um Vec3 com componentes finitas dentro de `[-bound, bound]`. */
function arbVec3(bound: number): fc.Arbitrary<Vec3> {
  return fc
    .tuple(
      finiteNumber(-bound, bound),
      finiteNumber(-bound, bound),
      finiteNumber(-bound, bound),
    )
    .map(([x, y, z]) => [x, y, z] as Vec3);
}

/** Gerador de uma Particle com posição/velocidade finitas e limitadas. */
function arbParticle(): fc.Arbitrary<Particle> {
  return fc.record({
    position: arbVec3(10),
    velocity: arbVec3(5),
  });
}

/** Gerador de um conjunto (array) de Data_Particles. */
function arbParticles(): fc.Arbitrary<Particle[]> {
  return fc.array(arbParticle(), { minLength: 0, maxLength: 30 });
}

/** Distância euclidiana de um ponto à origem (centro da cena). */
function magnitude(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

describe('particles-math property tests', () => {
  // Feature: clean-architecture-3d-visualizer, Property 9: Para qualquer inteiro solicitado n, clampParticleCount(n) está sempre em [20, 200]; se n > 200 o resultado é 200 e se n < 20 o resultado é 20.
  it('Property 9: clamp da contagem de partículas mantém o resultado em [20, 200]', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const result = clampParticleCount(n);
        expect(result).toBeGreaterThanOrEqual(MIN_PARTICLES);
        expect(result).toBeLessThanOrEqual(MAX_PARTICLES);
        if (n > MAX_PARTICLES) {
          expect(result).toBe(MAX_PARTICLES);
        }
        if (n < MIN_PARTICLES) {
          expect(result).toBe(MIN_PARTICLES);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 10: Para qualquer conjunto de Data_Particles e qualquer sequência de atualizações de quadro com dt positivo, a distância de cada partícula ao centro nunca excede o raio da Layer mais externa; ao atingir a fronteira, a partícula é reposicionada de modo a permanecer contida.
  it('Property 10: contenção das partículas dentro do raio mais externo após cada quadro', () => {
    const limit = outermostRadius();
    fc.assert(
      fc.property(
        arbParticles(),
        // Uma sequência de passos de tempo estritamente positivos e finitos.
        fc.array(finiteNumber(0.001, 2), { minLength: 1, maxLength: 8 }),
        (particles, dtSequence) => {
          let current = particles;
          for (const dt of dtSequence) {
            current = updateParticlesFrame(current, dt, false);
            for (const p of current) {
              expect(magnitude(p.position)).toBeLessThanOrEqual(limit + EPSILON);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 11: Para qualquer conjunto de Data_Particles e qualquer dt, atualizar o quadro com reducedMotion = true retorna posições idênticas às anteriores (o update é uma no-op sobre as posições).
  it('Property 11: congelamento sob prefers-reduced-motion preserva as posições', () => {
    fc.assert(
      fc.property(
        arbParticles(),
        finiteNumber(-100, 100),
        (particles, dt) => {
          const result = updateParticlesFrame(particles, dt, true);
          expect(result).toHaveLength(particles.length);
          result.forEach((p, i) => {
            expect(p.position[0]).toBe(particles[i].position[0]);
            expect(p.position[1]).toBe(particles[i].position[1]);
            expect(p.position[2]).toBe(particles[i].position[2]);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 12: Para qualquer Tour_Step válido, particleDirectionFor(step) retorna um vetor finito não-nulo cuja orientação é coerente com a focusLayer do passo (para dentro ou para fora conforme a Layer em foco).
  it('Property 12: direção das partículas é finita, não-nula e coerente com a focusLayer', () => {
    const lastIndex = LAYER_ORDER.length - 1;
    const midpoint = lastIndex / 2;

    fc.assert(
      fc.property(
        fc.constantFrom(...LAYER_ORDER),
        fc.integer({ min: 1, max: 50 }),
        fc.string({ minLength: 1, maxLength: 80 }),
        fc.string({ minLength: 1, maxLength: 1000 }),
        (focusLayer, order, title, body) => {
          const step: TourStep = {
            order,
            title,
            body,
            focusLayer,
            camera: { position: [0, 0, 5], target: [0, 0, 0] },
            notes: '',
          };

          const dir = particleDirectionFor(step);

          // Finito em todas as componentes.
          expect(Number.isFinite(dir[0])).toBe(true);
          expect(Number.isFinite(dir[1])).toBe(true);
          expect(Number.isFinite(dir[2])).toBe(true);

          // Não-nulo.
          expect(magnitude(dir)).toBeGreaterThan(0);

          // Coerência com a Layer em foco: metade interna aponta para dentro
          // (componente radial negativa), metade externa para fora (positiva).
          const index = LAYER_ORDER.indexOf(focusLayer);
          const expectedSign = index <= midpoint ? -1 : 1;
          expect(Math.sign(dir[0])).toBe(expectedSign);
        },
      ),
      { numRuns: 100 },
    );
  });
});
