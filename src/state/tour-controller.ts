/**
 * Tour_Controller — lógica pura da máquina de estados do tour.
 *
 * Isola as invariantes do requisito 4 (navegação com clamp, gating por
 * transição, destaque exclusivo da Layer em foco e formato do indicador de
 * progresso). Este módulo é **puro**: não conhece React nem Three.js.
 *
 * Respeita a Regra da Dependência (requisito 5.1): `state/` importa apenas de
 * `tour-data/` (tipos). NÃO importa de `scene/`, `ui/`, `platform/` nem de
 * React/Three.js.
 *
 * Propriedades de correção cobertas (ver design.md):
 * - Property 1: Clamp e gating da navegação do tour (req. 4.3–4.6, 4.10).
 * - Property 3: Destaque exclusivo da Layer em foco (req. 4.8).
 * - Property 4: Formato do indicador de progresso (req. 4.9).
 */

import { LAYER_ORDER, type Layer, type TourStep } from '../tour-data/types';

/**
 * Mapeamento de destaque por Layer: `true` na Layer em foco, `false` nas demais.
 */
export type HighlightMap = Readonly<Record<Layer, boolean>>;

/**
 * Avança um passo, com clamp no total de passos.
 *
 * Para qualquer `active` em `[1, count]`, retorna `min(active + 1, count)`,
 * mantendo o resultado dentro de `[1, count]`. Ao ativar o comando de avançar
 * no último passo, mantém o passo atual (req. 4.3, 4.5).
 *
 * @param active Ordem do passo ativo (esperado em `[1, count]`).
 * @param count Total de passos válidos carregados (`>= 1`).
 * @returns A nova ordem do passo ativo.
 */
export function computeNext(active: number, count: number): number {
  return Math.min(active + 1, count);
}

/**
 * Retrocede um passo, com clamp no primeiro passo.
 *
 * Para qualquer `active`, retorna `max(active - 1, 1)`. Ao ativar o comando de
 * retroceder no primeiro passo, mantém o passo atual (req. 4.4, 4.6).
 *
 * @param active Ordem do passo ativo (esperado em `[1, count]`).
 * @returns A nova ordem do passo ativo.
 */
export function computePrev(active: number): number {
  return Math.max(active - 1, 1);
}

/**
 * Aplica o comando de avançar respeitando o gating por transição (req. 4.10).
 *
 * Se `isTransitioning` é verdadeiro, retorna `active` inalterado (o comando é
 * ignorado até a transição terminar). Caso contrário, aplica {@link computeNext}.
 *
 * @param active Ordem do passo ativo (esperado em `[1, count]`).
 * @param count Total de passos válidos carregados (`>= 1`).
 * @param isTransitioning `true` se há uma transição em andamento.
 * @returns A nova ordem do passo ativo (ou `active` se em transição).
 */
export function next(
  active: number,
  count: number,
  isTransitioning: boolean,
): number {
  if (isTransitioning) {
    return active;
  }
  return computeNext(active, count);
}

/**
 * Aplica o comando de retroceder respeitando o gating por transição (req. 4.10).
 *
 * Se `isTransitioning` é verdadeiro, retorna `active` inalterado (o comando é
 * ignorado até a transição terminar). Caso contrário, aplica {@link computePrev}.
 *
 * @param active Ordem do passo ativo (esperado em `[1, count]`).
 * @param isTransitioning `true` se há uma transição em andamento.
 * @returns A nova ordem do passo ativo (ou `active` se em transição).
 */
export function prev(active: number, isTransitioning: boolean): number {
  if (isTransitioning) {
    return active;
  }
  return computePrev(active);
}

/**
 * Calcula o mapa de destaque para um Tour_Step.
 *
 * Marca exatamente a `focusLayer` do passo como destacada (`true`) e todas as
 * demais Layers como não destacadas (`false`). Enumera todas as Layers via
 * `LAYER_ORDER`, garantindo cobertura total do conjunto de Layers (req. 4.8).
 *
 * Caso especial de overview: quando `step.overview === true`, o passo é uma
 * visão geral e NENHUMA Layer é destacada exclusivamente — todas as Layers
 * retornam `false`. Isso evita sugerir que a síntese "é" uma camada específica,
 * mesmo que `focusLayer` continue definido (para validação e direção de
 * partículas).
 *
 * @param step O Tour_Step ativo.
 * @returns Mapa imutável de `Layer` → `boolean`.
 */
export function computeHighlight(step: TourStep): HighlightMap {
  const map = {} as Record<Layer, boolean>;
  for (const layer of LAYER_ORDER) {
    map[layer] = step.overview === true ? false : layer === step.focusLayer;
  }
  return map;
}

/**
 * Formata o indicador de posição do tour (req. 4.9).
 *
 * Produz a string `"{active} de {count}"`, onde `active` é o número do passo
 * ativo e `count` é o total de passos.
 *
 * @param active Ordem do passo ativo (esperado em `[1, count]`).
 * @param count Total de passos válidos carregados.
 * @returns String no formato `"{active} de {count}"`.
 */
export function formatProgress(active: number, count: number): string {
  return `${active} de ${count}`;
}
