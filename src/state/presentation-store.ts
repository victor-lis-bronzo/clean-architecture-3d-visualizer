/**
 * Presentation Store (Zustand) — fonte única de verdade compartilhada.
 *
 * É o ponto de coordenação entre a Scene (3D) e a UI (2D): ambos os domínios
 * leem/escrevem neste store, sem se importarem mutuamente (design: "Store
 * compartilhado (Zustand)"). O store NÃO contém lógica de negócio complexa —
 * ela é delegada às funções puras de `state/tour-controller.ts`,
 * `state/timer.ts` e `state/notes.ts`. Este módulo é apenas um contêiner de
 * estado observável.
 *
 * Regra da Dependência (req. 5.1): `state/` importa apenas de `tour-data/`
 * (tipos e dados validados) e das demais funções puras de `state/`. NÃO importa
 * de `scene/`, `ui/`, `platform/` nem de React. `zustand/vanilla` é usado para
 * manter o store desacoplado do React (a UI/Scene podem se ligar via o hook
 * `useStore` do zustand quando necessário, fora deste módulo).
 *
 * Estado inicial (tarefa 6.1 / design "PresentationState"):
 * - `activeStepOrder = 1` — passo 1 é o único ativo ao carregar (req. 4.2).
 * - `notesVisible = false` — o Presenter_Notes_Panel inicia oculto (req. 8.6).
 * - `timer = { status: 'idle', elapsedSec: 0 }` — timer parado em 00:00.
 * - `isFullscreen = false`, `webglSupported = true`.
 * - `dataError` — resultado da validação do TOUR_DATA na inicialização:
 *   `null` se válido; o primeiro `TourDataError` caso haja violações.
 *
 * _Requirements: 4.2, 8.6_
 */

import { createStore } from 'zustand/vanilla';

import type { TimerState, TourDataError } from '../tour-data/types';
import { TOUR_DATA } from '../tour-data/tour-data';
import { validateTourData } from '../tour-data/validate';
import { next as controllerNext, prev as controllerPrev } from './tour-controller';
import {
  pauseTimer as pauseTimerPure,
  resetTimer as resetTimerPure,
  startTimer as startTimerPure,
} from './timer';
import { toggleNotes as toggleNotesPure } from './notes';

/** Estado da transição de câmera / troca de passo. */
export interface TransitionState {
  /** `true` durante o lerp de câmera / troca de passo (gating — req. 4.10). */
  isTransitioning: boolean;
}

/**
 * Estado (dados) do store de apresentação, conforme a interface
 * `PresentationState` do design.
 */
export interface PresentationStateData {
  // ── Tour ──
  /** Ordem do Tour_Step ativo, sempre em `[1, stepCount]` (inicia 1 — req. 4.2). */
  activeStepOrder: number;
  /** Estado da transição (gating de navegação e controles de câmera). */
  transition: TransitionState;
  /** Pedido de reset de câmera, consumido pelo CameraController (req. 3.3/3.7). */
  cameraResetRequested: boolean;

  // ── Timer ──
  /** Estado do Presentation_Timer (inicia `idle`/0). */
  timer: TimerState;

  // ── Flags de UI ──
  /** Visibilidade do Presenter_Notes_Panel (inicia `false` — req. 8.6). */
  notesVisible: boolean;
  /** `true` enquanto o Visualizer está em tela cheia (inicia `false`). */
  isFullscreen: boolean;

  // ── Erros de carregamento / capacidades ──
  /** Erro de validação do Tour_Data; `null` = dados válidos (req. 5.3/5.4). */
  dataError: TourDataError | null;
  /** `true` se o WebGL é suportado (pode ser ajustado pela Scene — req. 1.6). */
  webglSupported: boolean;
}

/** Ações do store (delegam às funções puras de `state/`). */
export interface PresentationActions {
  /** Avança um passo, respeitando o gating por transição (req. 4.3/4.5/4.10). */
  next(): void;
  /** Retrocede um passo, respeitando o gating por transição (req. 4.4/4.6/4.10). */
  prev(): void;
  /** Solicita o reset de câmera (consumido pelo CameraController — req. 3.3/3.7). */
  resetCamera(): void;
  /** Alterna a visibilidade das notas do apresentador (req. 8.1/8.2). */
  toggleNotes(): void;
  /** Define o estado de tela cheia (req. 9.1/9.2). */
  setFullscreen(on: boolean): void;
  /** Marca o início/fim de uma transição (usado pelo CameraController). */
  setTransitioning(isTransitioning: boolean): void;
  /** Confirma que o pedido de reset de câmera foi consumido. */
  clearCameraReset(): void;

  // ── Ações de timer (delegam às transições puras de `timer.ts`) ──
  /** Inicia/retoma a contagem do timer (req. 6.1/6.7). */
  startTimer(): void;
  /** Pausa a contagem preservando o tempo decorrido (req. 6.5). */
  pauseTimer(): void;
  /** Reinicia o timer para 00:00 e interrompe a contagem (req. 6.6). */
  resetTimer(): void;
  /**
   * Avança o tempo decorrido em `dtSec` segundos enquanto o timer está
   * `running` (consumido por um relógio externo, ex.: `setInterval`). Se o
   * timer não está contando, é uma no-op (req. 6.1/6.5/6.6).
   */
  tick(dtSec: number): void;
  /** Define diretamente o tempo decorrido (clamp em `>= 0`). */
  setElapsed(elapsedSec: number): void;

  /** Define se o WebGL é suportado (Scene/fallback — req. 1.6). */
  setWebglSupported(supported: boolean): void;
}

/** Formato completo do store: dados + ações. */
export type PresentationState = PresentationStateData & PresentationActions;

/** Ordem do primeiro Tour_Step ativo ao carregar (req. 4.2). */
export const INITIAL_STEP_ORDER = 1;

/** Estado inicial do timer: parado em 00:00. */
const INITIAL_TIMER: TimerState = { status: 'idle', elapsedSec: 0 };

/**
 * Valida o TOUR_DATA na inicialização e resolve o `dataError` inicial.
 *
 * Retorna o primeiro `TourDataError` encontrado (o suficiente para exibir a
 * mensagem e não iniciar o tour — req. 5.3/5.4), ou `null` se os dados forem
 * válidos.
 */
function resolveInitialDataError(): TourDataError | null {
  const errors = validateTourData(TOUR_DATA);
  return errors.length > 0 ? errors[0] : null;
}

/** Estado inicial (dados) do store — passo 1 ativo, notas ocultas. */
export function createInitialState(): PresentationStateData {
  return {
    activeStepOrder: INITIAL_STEP_ORDER,
    transition: { isTransitioning: false },
    cameraResetRequested: false,
    timer: INITIAL_TIMER,
    notesVisible: false,
    isFullscreen: false,
    dataError: resolveInitialDataError(),
    webglSupported: true,
  };
}

/**
 * Total de Tour_Steps carregados. Deriva do TOUR_DATA estático; é usado como
 * `count` nas funções puras de navegação (clamp — req. 4.5).
 */
export const STEP_COUNT = TOUR_DATA.length;

/**
 * Cria uma instância do store de apresentação (vanilla, desacoplada do React).
 *
 * Exposta como fábrica para permitir instâncias isoladas em testes; o singleton
 * padrão da aplicação é {@link presentationStore}.
 */
export function createPresentationStore() {
  return createStore<PresentationState>()((set, get) => ({
    ...createInitialState(),

    next(): void {
      const { activeStepOrder, transition } = get();
      const nextOrder = controllerNext(
        activeStepOrder,
        STEP_COUNT,
        transition.isTransitioning,
      );
      if (nextOrder !== activeStepOrder) {
        set({ activeStepOrder: nextOrder });
      }
    },

    prev(): void {
      const { activeStepOrder, transition } = get();
      const prevOrder = controllerPrev(
        activeStepOrder,
        transition.isTransitioning,
      );
      if (prevOrder !== activeStepOrder) {
        set({ activeStepOrder: prevOrder });
      }
    },

    resetCamera(): void {
      // Marca uma solicitação de reset a ser consumida pelo CameraController,
      // que cancela qualquer transição em curso e interpola até o overview
      // (req. 3.3/3.7). Manter mínimo: apenas sinaliza o pedido.
      set({ cameraResetRequested: true });
    },

    clearCameraReset(): void {
      set({ cameraResetRequested: false });
    },

    toggleNotes(): void {
      set((state) => ({ notesVisible: toggleNotesPure(state.notesVisible) }));
    },

    setFullscreen(on: boolean): void {
      set({ isFullscreen: on });
    },

    setTransitioning(isTransitioning: boolean): void {
      set({ transition: { isTransitioning } });
    },

    startTimer(): void {
      set((state) => ({ timer: startTimerPure(state.timer) }));
    },

    pauseTimer(): void {
      set((state) => ({ timer: pauseTimerPure(state.timer) }));
    },

    resetTimer(): void {
      set({ timer: resetTimerPure() });
    },

    tick(dtSec: number): void {
      set((state) => {
        if (state.timer.status !== 'running') {
          return {};
        }
        const delta = Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
        return {
          timer: {
            status: state.timer.status,
            elapsedSec: state.timer.elapsedSec + delta,
          },
        };
      });
    },

    setElapsed(elapsedSec: number): void {
      const safe = Number.isFinite(elapsedSec) && elapsedSec > 0 ? elapsedSec : 0;
      set((state) => ({
        timer: { status: state.timer.status, elapsedSec: safe },
      }));
    },

    setWebglSupported(supported: boolean): void {
      set({ webglSupported: supported });
    },
  }));
}

/** Singleton do store de apresentação da aplicação. */
export const presentationStore = createPresentationStore();

export default presentationStore;
