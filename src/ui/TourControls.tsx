/**
 * TourControls — controles de navegação do tour guiado (UI_Overlay / 2D).
 *
 * Renderiza:
 *  - Botões "retroceder" / "avançar" ligados às ações `prev()`/`next()` do
 *    Presentation Store (req. 4.3/4.4/4.5/4.6; o clamp e o gating por transição
 *    são resolvidos pelas funções puras do Tour_Controller, chamadas dentro das
 *    ações do store — este componente apenas as dispara).
 *  - Título e texto explicativo do passo ativo (req. 4.7), obtidos via
 *    seletores `getActiveTitle`/`getActiveBody`.
 *  - Indicador de progresso "N de 8" (req. 4.9) via `getProgressLabel`.
 *
 * Regra da Dependência (req. 5.1): pertence a `ui/` e NÃO importa de `scene/`.
 * Lê/escreve exclusivamente pelo store compartilhado (`state/`), como manda o
 * design ("a comunicação entre Scene e UI ocorre pelo store").
 *
 * Acessibilidade: os botões são elementos `<button>` nativos (foco por teclado
 * e ativação por Enter/Espaço nativas), com `aria-label` em pt-BR; o indicador
 * de progresso e o título/texto são expostos como região "polite" para leitores
 * de tela acompanharem a troca de passo.
 *
 * _Requirements: 4.7, 4.9_
 */

import { useStore } from 'zustand';

import { presentationStore } from '../state/presentation-store';
import {
  getActiveBody,
  getActiveTitle,
  getProgressLabel,
  getStepCount,
} from '../state/selectors';

/** Props do TourControls. */
export interface TourControlsProps {
  /**
   * Se `false`, oculta o indicador de progresso "N de 8" (req. 11.3/11.4, para
   * larguras < 1024px). Os controles de navegação, o título e o texto
   * permanecem sempre visíveis. Padrão: `true`.
   */
  showProgress?: boolean;
}

/**
 * Controles do tour: navegação (avançar/retroceder), título/texto do passo
 * ativo e indicador de progresso "N de 8".
 */
export default function TourControls({
  showProgress = true,
}: TourControlsProps): React.JSX.Element {
  // Assinatura granular do store: cada seletor recomputa apenas quando o dado
  // derivado muda, evitando re-render desnecessário (design: store Zustand).
  const activeStepOrder = useStore(
    presentationStore,
    (s) => s.activeStepOrder,
  );
  const next = useStore(presentationStore, (s) => s.next);
  const prev = useStore(presentationStore, (s) => s.prev);

  // Seletores derivados (funções puras de `state/selectors.ts`).
  const title = getActiveTitle({ activeStepOrder });
  const body = getActiveBody({ activeStepOrder });
  const progressLabel = getProgressLabel({ activeStepOrder });

  const stepCount = getStepCount();
  const isFirst = activeStepOrder <= 1;
  const isLast = activeStepOrder >= stepCount;

  return (
    <section
      className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-xl bg-black/60 p-4 text-white shadow-lg backdrop-blur"
      aria-label="Controles do tour"
    >
      {/* Título + texto do passo ativo (req. 4.7). */}
      <div aria-live="polite" className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-gray-200 sm:text-base">
          {body}
        </p>
      </div>

      {/* Navegação + indicador de progresso. */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={isFirst}
          aria-label="Passo anterior"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">←</span> Anterior
        </button>

        {showProgress && (
          <span
            aria-live="polite"
            aria-label={`Passo ${progressLabel}`}
            className="select-none text-sm font-medium tabular-nums text-gray-100"
          >
            {progressLabel}
          </span>
        )}

        <button
          type="button"
          onClick={next}
          disabled={isLast}
          aria-label="Próximo passo"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
