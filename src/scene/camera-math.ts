/**
 * Helpers puros de câmera do domínio Scene (3D).
 *
 * Este módulo é 100% puro e determinístico: sem React, sem Three.js, sem
 * side-effects. Ele isola as invariantes do requisito 3 (transições de câmera)
 * para que sejam testáveis por propriedades (Correctness Properties 13–16) e
 * consumidas pelo `CameraController.tsx` (tarefa 9.3).
 *
 * Regra da Dependência (req. 5.1): `scene/` pode importar de `tour-data/`
 * (tipos e dados validados), mas NUNCA de `ui/`. Aqui importamos apenas os
 * tipos `Vec3`/`CameraConfig` do núcleo `tour-data/`.
 *
 * _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_
 */

import type { CameraConfig, Vec3 } from '../tour-data/types';

/** Limites da duração de uma transição de câmera, em segundos (req. 3.2). */
export const MIN_DURATION_SEC = 0.3;
export const MAX_DURATION_SEC = 2.0;
/** Duração padrão de uma transição de câmera quando não especificada (req. 3.2). */
export const DEFAULT_DURATION_SEC = 1.0;

/**
 * Estado mínimo do Camera_Controller relevante para o gating dos controles
 * manuais (órbita/zoom/pan). Um espelho puro da `TransitionState` do store,
 * definido localmente para manter este módulo desacoplado do `state/`.
 */
export interface CameraGateState {
  /** `true` enquanto uma transição (lerp) de câmera está em andamento. */
  isTransitioning: boolean;
}

/**
 * Função de suavização (easing) com velocidade nula nas extremidades.
 *
 * Usa a smoothstep clássica `3t² − 2t³`, cuja derivada `6t − 6t² = 6t(1 − t)`
 * é zero em `t = 0` e `t = 1` (velocidade nula no início e no fim — req. 3.1)
 * e não-negativa em `[0, 1]` (monotônica não-decrescente). Satisfaz
 * `easing(0) = 0` e `easing(1) = 1`.
 *
 * O argumento é clampado a `[0, 1]` para robustez contra pequenos overshoots
 * numéricos no loop de animação.
 *
 * @param t Parâmetro de progresso, idealmente em `[0, 1]`.
 * @returns Valor suavizado em `[0, 1]`.
 */
export function easing(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Interpolação linear escalar entre `a` e `b`.
 *
 * Para `t` em `[0, 1]` o resultado permanece entre `a` e `b` (inclusive).
 * Usada em conjunto com {@link easing} para produzir transições suaves:
 * `lerp(a, b, easing(t))` (req. 3.1).
 *
 * @param a Valor inicial.
 * @param b Valor final.
 * @param t Parâmetro de interpolação.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolação linear componente a componente entre dois vetores 3D.
 *
 * Útil para interpolar `position` e `target` da câmera.
 *
 * @param a Vetor inicial.
 * @param b Vetor final.
 * @param t Parâmetro de interpolação.
 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as const;
}

/**
 * Interpola uma `CameraConfig` completa (posição + alvo) aplicando `easing`
 * ao parâmetro de progresso `t`, garantindo velocidade nula nas extremidades
 * (req. 3.1).
 *
 * @param from Configuração de câmera inicial.
 * @param to Configuração de câmera final.
 * @param t Progresso bruto em `[0, 1]` (o easing é aplicado internamente).
 */
export function lerpCamera(from: CameraConfig, to: CameraConfig, t: number): CameraConfig {
  const e = easing(t);
  return {
    position: lerpVec3(from.position, to.position, e),
    target: lerpVec3(from.target, to.target, e),
  };
}

/**
 * Resolve a duração de uma transição de câmera dentro dos limites do req. 3.2.
 *
 * - Quando `d` é `undefined`/`null` (câmera ausente/valor não informado),
 *   retorna o padrão de `1.0` segundo.
 * - Quando `d` é um número não finito (`NaN`, `±Infinity`), também recai no
 *   padrão de `1.0` segundo (robustez).
 * - Caso contrário, clampa `d` ao intervalo `[0.3, 2.0]`.
 *
 * @param d Duração solicitada em segundos (opcional).
 * @returns Duração resolvida em `[0.3, 2.0]`.
 */
export function resolveDuration(d?: number | null): number {
  if (d === undefined || d === null || !Number.isFinite(d)) {
    return DEFAULT_DURATION_SEC;
  }
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, d));
}

/**
 * Determina se os controles manuais de câmera (órbita/zoom/pan) estão
 * habilitados. Habilitados se e somente se NÃO há transição em andamento
 * (req. 3.4/3.5) — Correctness Property 16.
 *
 * @param state Estado de gating do Camera_Controller.
 * @returns `true` quando o usuário pode orbitar/zoom/pan manualmente.
 */
export function orbitEnabled(state: CameraGateState): boolean {
  return !state.isTransitioning;
}

/**
 * Predicado puro da regra de no-op para câmera ausente (req. 3.6).
 *
 * Quando o Tour_Step ativado não possui configuração de câmera definida
 * (`null`/`undefined`), iniciar uma transição é uma no-op: `isTransitioning`
 * permanece `false` e a posição/alvo atuais são preservados. Retorna `true`
 * apenas quando há uma `CameraConfig` válida — ou seja, quando de fato deve-se
 * iniciar a transição (Correctness Property 15).
 *
 * @param cameraConfig Configuração de câmera do passo, ou `null`/`undefined`.
 * @returns `true` se uma transição deve ser iniciada; `false` (no-op) se ausente.
 */
export function shouldStartTransition(
  cameraConfig: CameraConfig | null | undefined,
): boolean {
  return cameraConfig !== null && cameraConfig !== undefined;
}

/** Clampa um número ao intervalo `[0, 1]`. */
function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}
