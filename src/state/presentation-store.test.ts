/**
 * Teste de exemplo do estado inicial do Presentation Store (tarefa 6.2).
 *
 * Verifica que, ao carregar o store (instância fresca via
 * `createPresentationStore()` e o estado puro `createInitialState()`):
 *  - o passo 1 é o único ativo (`activeStepOrder === 1`) — req. 4.2;
 *  - as notas do apresentador iniciam ocultas (`notesVisible === false`) — req. 8.6;
 *  - o timer inicia parado em 00:00 (`status === 'idle'`, `elapsedSec === 0`);
 *  - `dataError` é `null` para o TOUR_DATA válido (o tour pode iniciar).
 *
 * _Requirements: 4.2, 8.6_
 */

import { describe, expect, it } from 'vitest';

import {
  createInitialState,
  createPresentationStore,
  INITIAL_STEP_ORDER,
} from './presentation-store';

describe('Presentation Store — estado inicial (Requirements 4.2, 8.6)', () => {
  it('createInitialState: passo 1 ativo, notas ocultas, timer idle/0, dataError null', () => {
    const state = createInitialState();

    // Passo 1 é o único ativo ao carregar (req. 4.2).
    expect(state.activeStepOrder).toBe(1);
    expect(INITIAL_STEP_ORDER).toBe(1);

    // Notas do apresentador iniciam ocultas (req. 8.6).
    expect(state.notesVisible).toBe(false);

    // Timer parado em 00:00.
    expect(state.timer.status).toBe('idle');
    expect(state.timer.elapsedSec).toBe(0);

    // TOUR_DATA é válido => nenhum erro de dados (o tour pode iniciar).
    expect(state.dataError).toBeNull();

    // Sem transição em curso e sem pedido de reset de câmera pendente.
    expect(state.transition.isTransitioning).toBe(false);
    expect(state.cameraResetRequested).toBe(false);
  });

  it('createPresentationStore: instância fresca reflete o estado inicial', () => {
    const store = createPresentationStore();
    const s = store.getState();

    expect(s.activeStepOrder).toBe(1);
    expect(s.notesVisible).toBe(false);
    expect(s.timer.status).toBe('idle');
    expect(s.timer.elapsedSec).toBe(0);
    expect(s.dataError).toBeNull();
  });

  it('instâncias criadas via fábrica são isoladas entre si', () => {
    const a = createPresentationStore();
    const b = createPresentationStore();

    // Avançar uma instância não afeta a outra (passo 1 permanece na segunda).
    a.getState().next();

    expect(a.getState().activeStepOrder).toBe(2);
    expect(b.getState().activeStepOrder).toBe(1);
  });
});
