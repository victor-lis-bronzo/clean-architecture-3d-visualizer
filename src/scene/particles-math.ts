/**
 * Helpers puros do sistema de Data_Particles.
 *
 * **Framework-agnóstico**: matemática pura, sem React nem mutação de cena
 * Three.js viva, de modo a ser unit/property-testável. Pertence ao domínio
 * `scene/`; pode importar de `tour-data/`, mas NUNCA de `ui/` (req. 5.1).
 *
 * Cobre:
 *  - `clampParticleCount(n)` — contagem sempre em `[20, 200]` (req. 2.1, 2.4).
 *  - `updateParticlesFrame(...)` — atualização de quadro pura com contenção e
 *    reciclagem dentro do raio mais externo (req. 2.5) e no-op sob
 *    `reducedMotion` (req. 2.3).
 *  - `particleDirectionFor(step)` — direção finita não-nula coerente com a
 *    `focusLayer` do passo (req. 2.2).
 */

import { LAYER_ORDER, type TourStep, type Vec3 } from '../tour-data/types';
import { outermostRadius } from './geometry';

/** Contagem mínima de Data_Particles animadas (req. 2.1). */
export const MIN_PARTICLES = 20;

/** Contagem máxima de Data_Particles animadas (req. 2.1, 2.4). */
export const MAX_PARTICLES = 200;

/**
 * Limita a quantidade de Data_Particles ao intervalo `[20, 200]` (req. 2.1,
 * 2.4). Valores acima de 200 resultam em 200; abaixo de 20 resultam em 20.
 * Valores não inteiros são truncados; entradas não finitas caem no mínimo.
 */
export function clampParticleCount(n: number): number {
  if (!Number.isFinite(n)) {
    return MIN_PARTICLES;
  }
  const truncated = Math.trunc(n);
  if (truncated < MIN_PARTICLES) {
    return MIN_PARTICLES;
  }
  if (truncated > MAX_PARTICLES) {
    return MAX_PARTICLES;
  }
  return truncated;
}

/** Uma Data_Particle: posição e velocidade no espaço da cena. */
export interface Particle {
  /** Posição atual (relativa ao centro da cena, na origem). */
  position: Vec3;
  /** Vetor velocidade (unidades por segundo). */
  velocity: Vec3;
}

/** Distância euclidiana de um ponto à origem (centro da cena). */
function magnitude(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

/**
 * Reposiciona radialmente um ponto para o `targetRadius`, preservando a
 * direção. Se o ponto está na origem (sem direção definida), reinicia em um
 * ponto determinístico sobre o eixo X ao raio alvo.
 */
function repositionToRadius(position: Vec3, targetRadius: number): Vec3 {
  const dist = magnitude(position);
  if (dist === 0) {
    return [targetRadius, 0, 0];
  }
  const scale = targetRadius / dist;
  return [position[0] * scale, position[1] * scale, position[2] * scale];
}

/**
 * Atualiza um quadro do sistema de partículas de forma **pura**: recebe as
 * partículas atuais, o passo de tempo `dt` (segundos) e a flag `reducedMotion`,
 * e retorna um novo array de partículas.
 *
 * Regras:
 *  - `reducedMotion === true` → **no-op sobre as posições**: retorna partículas
 *    com posições idênticas às anteriores (req. 2.3 / Property 11).
 *  - Caso contrário, avança `position += velocity · dt`. Se a distância ao
 *    centro exceder o raio da Layer mais externa, a partícula é **reciclada**,
 *    reposicionada de modo a permanecer contida dentro do limite externo
 *    (req. 2.5 / Property 10). A contenção é garantida por construção: a
 *    distância resultante nunca ultrapassa `outermostRadius()`.
 *
 * @param particles partículas atuais.
 * @param dt passo de tempo em segundos (esperado positivo).
 * @param reducedMotion se `true`, congela as posições.
 * @param recycleRadius raio de reinício ao reciclar; padrão = raio da Layer
 *   mais interna, mantendo a partícula bem dentro do limite externo.
 */
export function updateParticlesFrame(
  particles: readonly Particle[],
  dt: number,
  reducedMotion: boolean,
  recycleRadius = LAYER_ORDER.length > 0 ? 1 : 0,
): Particle[] {
  const limit = outermostRadius();

  if (reducedMotion) {
    // No-op sobre as posições: retorna cópias com a mesma posição.
    return particles.map((p) => ({
      position: [p.position[0], p.position[1], p.position[2]] as Vec3,
      velocity: [p.velocity[0], p.velocity[1], p.velocity[2]] as Vec3,
    }));
  }

  return particles.map((p) => {
    const next: Vec3 = [
      p.position[0] + p.velocity[0] * dt,
      p.position[1] + p.velocity[1] * dt,
      p.position[2] + p.velocity[2] * dt,
    ];

    let contained = next;
    if (magnitude(next) > limit) {
      // Reciclagem: reposiciona a partícula para dentro do limite externo,
      // preservando a direção do movimento.
      contained = repositionToRadius(next, Math.min(recycleRadius, limit));
    }

    return {
      position: contained,
      velocity: [p.velocity[0], p.velocity[1], p.velocity[2]] as Vec3,
    };
  });
}

/**
 * Direção do movimento das Data_Particles coerente com o Tour_Step ativo
 * (req. 2.2 / Property 12).
 *
 * A orientação segue a `focusLayer`: quanto mais interna a Layer em foco, mais
 * o fluxo aponta "para dentro" (rumo ao núcleo `Entities`); quanto mais externa,
 * mais aponta "para fora". Retorna sempre um vetor **finito e não-nulo**.
 *
 * O vetor é um vetor radial unitário sobre o eixo X cujo sinal codifica a
 * direção (negativo = para dentro, positivo = para fora), garantindo módulo 1.
 */
export function particleDirectionFor(step: TourStep): Vec3 {
  const index = LAYER_ORDER.indexOf(step.focusLayer);
  const lastIndex = LAYER_ORDER.length - 1;

  // Mapeia o índice para um sinal em {-1, +1}: a metade mais interna aponta
  // para dentro (-1), a metade mais externa para fora (+1). Nunca zero.
  const midpoint = lastIndex / 2;
  const sign = index <= midpoint ? -1 : 1;

  return [sign, 0, 0];
}
