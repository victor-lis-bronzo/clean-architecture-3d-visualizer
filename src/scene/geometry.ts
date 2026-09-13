/**
 * Helpers puros de geometria da cena 3D.
 *
 * Este módulo é **framework-agnóstico**: contém apenas matemática pura (sem
 * React, sem mutação de cena Three.js viva), de modo a ser unit/property-
 * testável. Pertence ao domínio `scene/`, que pode importar de `tour-data/`
 * (tipos e ordem de Layers), mas NUNCA de `ui/` (Regra da Dependência, req. 5.1).
 *
 * Cobre:
 *  - Raios estritamente crescentes por Layer, de `Entities` (menor/interna) a
 *    `Frameworks_And_Drivers` (maior/externa) — requisito 1.2.
 *  - Parâmetros do corte de seção de 90° (um quadrante removido) via
 *    `phiLength = 1.5·π` (270°), expondo a superfície interior — requisito 1.4.
 */

import { LAYER_ORDER, type Layer } from '../tour-data/types';

/** Raio base da Layer mais interna (`Entities`). */
export const BASE_RADIUS = 1;

/** Incremento de raio entre Layers concêntricas adjacentes (estritamente > 0). */
export const RADIUS_STEP = 1;

/**
 * Raio de uma Layer, estritamente crescente conforme sua posição em
 * `LAYER_ORDER`: `Entities` é a esfera de menor raio (índice 0) e
 * `Frameworks_And_Drivers` a de maior raio (último índice). Como
 * `RADIUS_STEP > 0`, o raio é estritamente maior que o da Layer imediatamente
 * interior (requisito 1.2).
 */
export function radiusForLayer(layer: Layer): number {
  const index = LAYER_ORDER.indexOf(layer);
  if (index < 0) {
    throw new Error(`Layer desconhecida: ${String(layer)}`);
  }
  return BASE_RADIUS + index * RADIUS_STEP;
}

/**
 * Vetor com os raios de todas as Layers, na ordem de `LAYER_ORDER`
 * (estritamente crescente). Índice 0 = mais interna, último = mais externa.
 */
export function layerRadii(): number[] {
  return LAYER_ORDER.map((layer) => radiusForLayer(layer));
}

/**
 * Raio da Layer mais externa (`Frameworks_And_Drivers`) — o limite de
 * contenção das partículas (requisito 2.5).
 */
export function outermostRadius(): number {
  return radiusForLayer(LAYER_ORDER[LAYER_ORDER.length - 1]);
}

/**
 * Raio de uma fronteira entre duas Layers concêntricas adjacentes: o ponto
 * médio entre os raios das duas Layers. Existem `LAYER_ORDER.length - 1`
 * fronteiras (3 para 4 Layers), usadas pelos Boundary_Rings (req. 1.5).
 *
 * @param innerIndex índice (em `LAYER_ORDER`) da Layer interna da fronteira,
 *   em `[0, LAYER_ORDER.length - 2]`.
 */
export function boundaryRadius(innerIndex: number): number {
  if (innerIndex < 0 || innerIndex >= LAYER_ORDER.length - 1) {
    throw new Error(`Índice de fronteira inválido: ${innerIndex}`);
  }
  const inner = radiusForLayer(LAYER_ORDER[innerIndex]);
  const outer = radiusForLayer(LAYER_ORDER[innerIndex + 1]);
  return (inner + outer) / 2;
}

/** Vetor com os raios das três fronteiras entre Layers adjacentes. */
export function boundaryRadii(): number[] {
  const radii: number[] = [];
  for (let i = 0; i < LAYER_ORDER.length - 1; i += 1) {
    radii.push(boundaryRadius(i));
  }
  return radii;
}

/**
 * Parâmetros de geometria para o corte de seção de 90° (um quadrante removido).
 *
 * Correspondem aos argumentos de `THREE.SphereGeometry`
 * `(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)`.
 * Usando `phiLength = 1.5·π` (270°) gera-se apenas 3/4 da esfera, expondo a
 * superfície interior (requisito 1.4). A esfera fica aberta, portanto o material
 * deve usar `DoubleSide` para renderizar a face interna.
 */
export interface SphereCutParams {
  radius: number;
  widthSegments: number;
  heightSegments: number;
  phiStart: number;
  /** Extensão angular em torno do eixo (270° = 1,5·π), removendo um quadrante. */
  phiLength: number;
  thetaStart: number;
  thetaLength: number;
}

/** Extensão angular total de uma esfera completa (2·π = 360°). */
export const FULL_PHI = Math.PI * 2;

/**
 * Extensão angular do corte de 90°: 270° = 1,5·π. Remove exatamente um
 * quadrante (90°) da esfera (requisito 1.4).
 */
export const CUT_PHI_LENGTH = Math.PI * 1.5;

/**
 * Gera os parâmetros de geometria de uma esfera com corte de seção de 90°
 * para a Layer indicada. `phiLength = 1.5·π` remove um quadrante, expondo o
 * interior; `thetaLength = π` mantém a esfera completa no eixo polar.
 *
 * @param layer Layer cuja esfera será gerada.
 * @param segments número de segmentos (largura e altura); padrão 64.
 */
export function sphereCutParamsForLayer(
  layer: Layer,
  segments = 64,
): SphereCutParams {
  return {
    radius: radiusForLayer(layer),
    widthSegments: segments,
    heightSegments: segments,
    phiStart: 0,
    phiLength: CUT_PHI_LENGTH,
    thetaStart: 0,
    thetaLength: Math.PI,
  };
}

/**
 * Decide se a cena 3D deve ser renderizada para as dimensões informadas.
 *
 * Predicado puro, local ao domínio `scene/`: retorna `false` quando qualquer
 * dimensão é não positiva (`w <= 0` ou `h <= 0`), sinalizando que o
 * `frameloop` do R3F deve ser suspenso preservando o estado atual da cena;
 * retorna `true` somente quando ambas as dimensões são estritamente maiores
 * que zero (requisito 11.5).
 *
 * NOTA: um predicado equivalente existe em `ui/responsive.ts`, mas `scene/`
 * NÃO pode importar de `ui/` (Regra da Dependência, req. 5.1). Por isso a
 * lógica trivial é duplicada aqui, mantendo os domínios desacoplados.
 *
 * @param w Largura do viewport em pixels.
 * @param h Altura do viewport em pixels.
 * @returns `true` se ambas as dimensões forem `> 0`; caso contrário `false`.
 */
export function shouldRender(w: number, h: number): boolean {
  return w > 0 && h > 0;
}
