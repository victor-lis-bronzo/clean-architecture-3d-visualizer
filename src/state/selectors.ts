/**
 * Seletores do Presentation Store — leituras derivadas puras.
 *
 * Concentra a lógica de derivação de estado (resolver o Tour_Step ativo,
 * calcular o destaque de Layer, formatar o indicador de progresso) fora dos
 * componentes, mantendo a Scene e a UI enxutas. Cada seletor é uma função pura
 * de `PresentationStateData` (o "slice" de dados do store), sem side-effects.
 *
 * Regra da Dependência (req. 5.1): importa apenas de `tour-data/` (tipos/dados)
 * e das funções puras de `state/`. NÃO importa de `scene/`, `ui/`, `platform/`
 * nem de React.
 *
 * _Requirements: 4.2, 4.8, 4.9, 8.6_
 */

import type { TourStep } from '../tour-data/types';
import { TOUR_DATA } from '../tour-data/tour-data';
import {
  computeHighlight,
  formatProgress,
  type HighlightMap,
} from './tour-controller';
import { resolveNotesContent } from './notes';
import type { PresentationStateData } from './presentation-store';

/** Total de Tour_Steps carregados. */
export function getStepCount(): number {
  return TOUR_DATA.length;
}

/**
 * Resolve o Tour_Step ativo a partir de `activeStepOrder`.
 *
 * Procura o passo cujo `order` corresponde ao `activeStepOrder`. Como o store
 * mantém `activeStepOrder` sempre em `[1, stepCount]` (clamp nas ações
 * `next`/`prev`), o passo é sempre encontrado para dados válidos; por robustez,
 * retorna `undefined` se nenhum passo corresponder.
 */
export function getActiveStep(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): TourStep | undefined {
  return TOUR_DATA.find((step) => step.order === state.activeStepOrder);
}

/**
 * Mapa de destaque das Layers para o passo ativo (req. 4.8).
 *
 * Marca exatamente a `focusLayer` do passo ativo como destacada e as demais
 * como não destacadas. Se o passo ativo não puder ser resolvido, retorna
 * `null` (nenhum destaque aplicável).
 */
export function getHighlight(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): HighlightMap | null {
  const step = getActiveStep(state);
  return step ? computeHighlight(step) : null;
}

/**
 * Rótulo do indicador de progresso no formato "N de {total}" (req. 4.9).
 */
export function getProgressLabel(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): string {
  return formatProgress(state.activeStepOrder, getStepCount());
}

/** Título do passo ativo (ou string vazia se não resolvido). */
export function getActiveTitle(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): string {
  return getActiveStep(state)?.title ?? '';
}

/** Texto explicativo do passo ativo (ou string vazia se não resolvido). */
export function getActiveBody(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): string {
  return getActiveStep(state)?.body ?? '';
}

/**
 * Conteúdo das notas a exibir no Presenter_Notes_Panel para o passo ativo.
 *
 * Aplica truncamento (req. 8.3) e mensagem de estado vazio (req. 8.4) via
 * `resolveNotesContent`. Retorna `null` quando o painel está oculto
 * (`notesVisible = false`, inicia oculto — req. 8.6) ou o passo não resolve,
 * permitindo que a UI omita o painel.
 */
export function getVisibleNotes(
  state: Pick<PresentationStateData, 'activeStepOrder' | 'notesVisible'>,
): string | null {
  if (!state.notesVisible) {
    return null;
  }
  const step = getActiveStep(state);
  return step ? resolveNotesContent(step.notes) : null;
}

/** Câmera do passo ativo (ou `null` = sem transição — req. 3.6). */
export function getActiveCamera(
  state: Pick<PresentationStateData, 'activeStepOrder'>,
): TourStep['camera'] | null {
  return getActiveStep(state)?.camera ?? null;
}

/** `true` se há um erro de validação do Tour_Data (não iniciar o tour). */
export function hasDataError(
  state: Pick<PresentationStateData, 'dataError'>,
): boolean {
  return state.dataError !== null;
}

/** `true` se os controles manuais de câmera estão habilitados (req. 3.4/3.5). */
export function isOrbitEnabled(
  state: Pick<PresentationStateData, 'transition'>,
): boolean {
  return !state.transition.isTransitioning;
}
