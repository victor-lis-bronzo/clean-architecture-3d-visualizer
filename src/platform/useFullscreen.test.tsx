/**
 * Teste de integração para o adaptador de plataforma de tela cheia
 * (`useFullscreen`), tarefa 12.4.
 *
 * Diferente dos testes de propriedade da lógica pura, este exercita o hook real
 * com a Fullscreen API do navegador mockada sobre o `document` do jsdom, através
 * de `renderHook` do @testing-library/react. Cobre:
 *
 *  - Entrar em tela cheia: `toggle()` fora de tela cheia chama
 *    `requestFullscreen` e resolve `{ ok: true }`; o evento `fullscreenchange`
 *    com `fullscreenElement` definido atualiza `isFullscreen=true` e chama
 *    `onChange(true)` — req. 9.1.
 *  - Sair de tela cheia: `toggle()` em tela cheia chama `exitFullscreen`; o
 *    evento `fullscreenchange` com `fullscreenElement=null` atualiza
 *    `isFullscreen=false` e chama `onChange(false)` — req. 9.2.
 *  - Rejeição: `requestFullscreen` rejeita ⇒ `toggle()` resolve
 *    `{ ok: false, error }`, `console.error` é chamado e o estado não muda —
 *    req. 9.3.
 *  - Saída via Esc: o navegador dispara `fullscreenchange` com
 *    `fullscreenElement=null` (mesmo evento) ⇒ `isFullscreen=false` /
 *    `onChange(false)` — req. 9.5.
 *
 * _Validates: Requirements 9.1, 9.2, 9.3, 9.5_
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFullscreen } from './useFullscreen';

/**
 * Elemento sentinela que representa o alvo em tela cheia. Usado como valor de
 * `document.fullscreenElement` quando a cena está em tela cheia.
 */
const FULLSCREEN_ELEMENT = {} as Element;

/** Estado do mock: o elemento atualmente em tela cheia (ou `null`). */
let currentFullscreenElement: Element | null = null;

/** Referência aos mocks para asserções por teste. */
let requestFullscreenMock: ReturnType<typeof vi.fn>;
let exitFullscreenMock: ReturnType<typeof vi.fn>;

/**
 * Dispara o evento `fullscreenchange` no `document`, como o navegador faz após
 * entrar/sair de tela cheia (inclusive na saída via Esc — req. 9.5).
 */
function dispatchFullscreenChange(): void {
  document.dispatchEvent(new Event('fullscreenchange'));
}

/**
 * Simula o navegador entrando em tela cheia com sucesso: define o elemento
 * ativo e dispara o evento de sincronização.
 */
function enterFullscreen(): void {
  currentFullscreenElement = FULLSCREEN_ELEMENT;
  dispatchFullscreenChange();
}

/**
 * Simula o navegador saindo de tela cheia (via `toggle`/`exitFullscreen` ou via
 * Esc): limpa o elemento ativo e dispara o evento.
 */
function exitFullscreenChange(): void {
  currentFullscreenElement = null;
  dispatchFullscreenChange();
}

beforeEach(() => {
  currentFullscreenElement = null;

  // Mock de `document.fullscreenElement` como getter que reflete o estado do
  // mock — o hook lê esse valor para decidir entrar/sair e para sincronizar.
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => currentFullscreenElement,
  });

  // Mock de `requestFullscreen` no elemento raiz: por padrão, resolve com
  // sucesso (o teste de rejeição substitui a implementação).
  requestFullscreenMock = vi.fn(() => Promise.resolve());
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    writable: true,
    value: requestFullscreenMock,
  });

  // Mock de `document.exitFullscreen`: resolve com sucesso por padrão.
  exitFullscreenMock = vi.fn(() => Promise.resolve());
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    writable: true,
    value: exitFullscreenMock,
  });
});

afterEach(() => {
  // Restaura os mocks/spies e remove as propriedades adicionadas ao document.
  vi.restoreAllMocks();
  delete (document as unknown as { fullscreenElement?: unknown }).fullscreenElement;
  delete (document.documentElement as unknown as { requestFullscreen?: unknown })
    .requestFullscreen;
  delete (document as unknown as { exitFullscreen?: unknown }).exitFullscreen;
  currentFullscreenElement = null;
});

describe('useFullscreen — integração com a Fullscreen API (Requirements 9.1, 9.2, 9.3, 9.5)', () => {
  it('inicia com isFullscreen=false quando não há elemento em tela cheia', () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('entrar (req. 9.1): toggle fora de tela cheia chama requestFullscreen e resolve { ok: true }; o evento atualiza o estado e onChange(true)', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFullscreen(onChange));

    let toggleResult: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      toggleResult = await result.current.toggle();
    });

    // A solicitação foi feita no elemento raiz e resolveu com sucesso.
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    expect(exitFullscreenMock).not.toHaveBeenCalled();
    expect(toggleResult).toEqual({ ok: true });

    // Antes do evento do navegador, o estado ainda não mudou.
    expect(result.current.isFullscreen).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    // O navegador confirma a entrada disparando `fullscreenchange`.
    act(() => {
      enterFullscreen();
    });

    expect(result.current.isFullscreen).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('sair (req. 9.2): toggle em tela cheia chama exitFullscreen; o evento com fullscreenElement=null atualiza isFullscreen=false e onChange(false)', async () => {
    // Estado inicial já em tela cheia.
    currentFullscreenElement = FULLSCREEN_ELEMENT;
    const onChange = vi.fn();
    const { result } = renderHook(() => useFullscreen(onChange));
    expect(result.current.isFullscreen).toBe(true);

    let toggleResult: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      toggleResult = await result.current.toggle();
    });

    // Saiu de tela cheia (não solicitou entrada).
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    expect(requestFullscreenMock).not.toHaveBeenCalled();
    expect(toggleResult).toEqual({ ok: true });

    // O navegador confirma a saída disparando `fullscreenchange`.
    act(() => {
      exitFullscreenChange();
    });

    expect(result.current.isFullscreen).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('rejeição (req. 9.3): requestFullscreen rejeita ⇒ toggle resolve { ok: false, error }, console.error é chamado e o estado não muda', async () => {
    const rejection = new Error('Solicitação de tela cheia negada pelo navegador.');
    requestFullscreenMock.mockImplementation(() => Promise.reject(rejection));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const onChange = vi.fn();
    const { result } = renderHook(() => useFullscreen(onChange));

    let toggleResult: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      toggleResult = await result.current.toggle();
    });

    // A tentativa foi feita, mas rejeitada — nunca rejeita para o chamador.
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    expect(toggleResult).toEqual({ ok: false, error: rejection });

    // A falha foi registrada no console (req. 9.3).
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Falha ao alternar tela cheia'),
      rejection,
    );

    // O estado de exibição é preservado (nenhum `fullscreenchange` disparado).
    expect(result.current.isFullscreen).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saída via Esc (req. 9.5): o navegador dispara fullscreenchange com fullscreenElement=null ⇒ isFullscreen=false / onChange(false)', () => {
    // Começa em tela cheia (sem passar por toggle).
    currentFullscreenElement = FULLSCREEN_ELEMENT;
    const onChange = vi.fn();
    const { result } = renderHook(() => useFullscreen(onChange));
    expect(result.current.isFullscreen).toBe(true);

    // Esc é tratado pelo navegador, que dispara o mesmo evento
    // `fullscreenchange` com o elemento zerado — sem chamar `exitFullscreen`
    // a partir da aplicação.
    act(() => {
      exitFullscreenChange();
    });

    expect(exitFullscreenMock).not.toHaveBeenCalled();
    expect(result.current.isFullscreen).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
