/**
 * Teste de exemplo do App Shell — roteamento de teclas e fluxo de erro de dados
 * (tarefa 13.2).
 *
 * Cobre dois comportamentos que o App integra na tarefa 13.1:
 *
 *  1. **Roteamento de atalhos de teclado** (req. 7.1/7.3/7.6/7.7/7.8): o App liga
 *     o hook `useKeyboardShortcuts` às ações do store. Aqui exercitamos o hook
 *     diretamente (via `renderHook`) com callbacks-espião (`vi.fn()`), despachando
 *     eventos reais de `keydown` no `window` e verificando que cada tecla mapeada
 *     aciona o comando correto:
 *       ArrowRight → next, ArrowLeft → prev, 'f' → toggleFullscreen,
 *       'n' → toggleNotes, 'r' → resetCamera, Space → next.
 *     Essa abordagem focada valida exatamente o roteamento do qual o App depende,
 *     sem exigir a montagem do `<Canvas>` R3F (WebGL indisponível no jsdom).
 *     Também verificamos o gate (`enabled = false`), que espelha a desativação
 *     dos atalhos quando o Tour_Data é inválido (o tour não inicia — req. 5.3/5.4).
 *
 *  2. **Fluxo de erro de dados** (req. 5.3/5.4): o store valida o TOUR_DATA na
 *     inicialização e expõe `dataError`. O gate do App (`hasDataError`) decide
 *     entre exibir o `DataErrorPanel` (mensagem de erro, tour NÃO iniciado) e
 *     montar a cena. Como o TOUR_DATA real (singleton) é válido, verificamos:
 *       - o seletor puro `hasDataError` retorna `true`/`false` conforme `dataError`;
 *       - renderizando `<App/>` com dados válidos, a mensagem de erro NÃO aparece
 *         (o gate deixa passar) e o caminho normal é renderizado — em jsdom o
 *         WebGL é indisponível, logo o `WebGLFallback` (req. 1.6) é exibido no
 *         lugar da cena, confirmando que o tour foi iniciado (sem erro de dados).
 *
 * SSR/jsdom-safe: polyfill mínimo de `ResizeObserver` para o R3F/overlay não
 * quebrarem sob jsdom; o caminho de WebGL indisponível é o esperado no jsdom.
 *
 * _Requirements: 5.3, 5.4, 7.1, 7.3, 7.6, 7.7, 7.8_
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, cleanup } from '@testing-library/react';

import App from './App';
import { WEBGL_FALLBACK_TITLE } from './ui/WebGLFallback';
import { useKeyboardShortcuts } from './platform/useKeyboardShortcuts';
import { hasDataError } from './state/selectors';
import type { TourDataError } from './tour-data/types';

// ────────────────────────────────────────────────────────────────────────────
// Polyfills mínimos para o jsdom (R3F / overlay / hooks de plataforma).
// ────────────────────────────────────────────────────────────────────────────

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof window.matchMedia === 'undefined') {
    // Alguns hooks de plataforma consultam matchMedia (reduced-motion).
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

afterEach(() => {
  cleanup();
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers de teclado.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Despacha um `keydown` no `window` a partir de um alvo não editável (uma
 * `<div>` anexada ao documento), garantindo que o gating de campos editáveis
 * (req. 7.9) NÃO seja acionado.
 */
function pressKey(init: KeyboardEventInit): void {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  // Força o alvo (jsdom não define `target` a partir do dispatch em window).
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  window.dispatchEvent(event);
  target.remove();
}

/** Conjunto de ações-espião: cada callback do hook é um `vi.fn()` tipado. */
type SpyActions = {
  next: ReturnType<typeof vi.fn<() => void>>;
  prev: ReturnType<typeof vi.fn<() => void>>;
  toggleFullscreen: ReturnType<typeof vi.fn<() => void>>;
  toggleNotes: ReturnType<typeof vi.fn<() => void>>;
  resetCamera: ReturnType<typeof vi.fn<() => void>>;
};

/** Cria um conjunto completo de ações-espião para o hook. */
function makeSpyActions(): SpyActions {
  return {
    next: vi.fn<() => void>(),
    prev: vi.fn<() => void>(),
    toggleFullscreen: vi.fn<() => void>(),
    toggleNotes: vi.fn<() => void>(),
    resetCamera: vi.fn<() => void>(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1) Roteamento de atalhos de teclado (req. 7.1/7.3/7.6/7.7/7.8).
// ────────────────────────────────────────────────────────────────────────────

describe('App — roteamento de atalhos de teclado (Requirements 7.1, 7.3, 7.6, 7.7, 7.8)', () => {
  it('cada tecla mapeada aciona exatamente o comando correspondente', () => {
    const actions = makeSpyActions();
    renderHook(() => useKeyboardShortcuts(actions, true));

    // ArrowRight → next (req. 7.1)
    pressKey({ key: 'ArrowRight', code: 'ArrowRight' });
    expect(actions.next).toHaveBeenCalledTimes(1);

    // ArrowLeft → prev (req. 7.3)
    pressKey({ key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(actions.prev).toHaveBeenCalledTimes(1);

    // 'f' → toggleFullscreen (req. 7.6)
    pressKey({ key: 'f', code: 'KeyF' });
    expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);

    // 'n' → toggleNotes (req. 7.7)
    pressKey({ key: 'n', code: 'KeyN' });
    expect(actions.toggleNotes).toHaveBeenCalledTimes(1);

    // 'r' → resetCamera (req. 7.8)
    pressKey({ key: 'r', code: 'KeyR' });
    expect(actions.resetCamera).toHaveBeenCalledTimes(1);

    // Nenhuma ação foi acionada de forma cruzada.
    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(actions.prev).toHaveBeenCalledTimes(1);
    expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(actions.toggleNotes).toHaveBeenCalledTimes(1);
    expect(actions.resetCamera).toHaveBeenCalledTimes(1);
  });

  it('Space também aciona next (req. 7.5) e faz preventDefault', () => {
    const actions = makeSpyActions();
    renderHook(() => useKeyboardShortcuts(actions, true));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: target,
      configurable: true,
    });
    window.dispatchEvent(event);

    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    target.remove();
  });

  it('maiúsculas (Shift) roteiam as mesmas teclas de letra', () => {
    const actions = makeSpyActions();
    renderHook(() => useKeyboardShortcuts(actions, true));

    pressKey({ key: 'F', code: 'KeyF', shiftKey: true });
    pressKey({ key: 'N', code: 'KeyN', shiftKey: true });
    pressKey({ key: 'R', code: 'KeyR', shiftKey: true });

    expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(actions.toggleNotes).toHaveBeenCalledTimes(1);
    expect(actions.resetCamera).toHaveBeenCalledTimes(1);
  });

  it('teclas não mapeadas não acionam nenhum comando', () => {
    const actions = makeSpyActions();
    renderHook(() => useKeyboardShortcuts(actions, true));

    pressKey({ key: 'x', code: 'KeyX' });
    pressKey({ key: 'Enter', code: 'Enter' });
    pressKey({ key: 'ArrowUp', code: 'ArrowUp' });

    expect(actions.next).not.toHaveBeenCalled();
    expect(actions.prev).not.toHaveBeenCalled();
    expect(actions.toggleFullscreen).not.toHaveBeenCalled();
    expect(actions.toggleNotes).not.toHaveBeenCalled();
    expect(actions.resetCamera).not.toHaveBeenCalled();
  });

  it('com o gate desativado (enabled=false, como no Tour_Data inválido) nenhum comando dispara', () => {
    const actions = makeSpyActions();
    // Espelha o wiring do App: `useKeyboardShortcuts(actions, !dataError)`.
    renderHook(() => useKeyboardShortcuts(actions, false));

    pressKey({ key: 'ArrowRight', code: 'ArrowRight' });
    pressKey({ key: 'ArrowLeft', code: 'ArrowLeft' });
    pressKey({ key: 'f', code: 'KeyF' });
    pressKey({ key: 'n', code: 'KeyN' });
    pressKey({ key: 'r', code: 'KeyR' });

    expect(actions.next).not.toHaveBeenCalled();
    expect(actions.prev).not.toHaveBeenCalled();
    expect(actions.toggleFullscreen).not.toHaveBeenCalled();
    expect(actions.toggleNotes).not.toHaveBeenCalled();
    expect(actions.resetCamera).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2) Fluxo de erro de dados (req. 5.3/5.4).
// ────────────────────────────────────────────────────────────────────────────

describe('App — fluxo de erro do Tour_Data (Requirements 5.3, 5.4)', () => {
  it('hasDataError: o gate reflete a presença de um TourDataError', () => {
    // Dados válidos ⇒ gate falso (o tour pode iniciar).
    expect(hasDataError({ dataError: null })).toBe(false);

    // Erro de campo genérico (req. 5.3).
    const fieldError: TourDataError = {
      stepOrder: 3,
      field: 'title',
      message: 'título fora dos limites',
    };
    expect(hasDataError({ dataError: fieldError })).toBe(true);

    // Erro de focusLayer inexistente (req. 5.4).
    const layerError: TourDataError = {
      stepOrder: 5,
      field: 'focusLayer',
      message: 'Layer inexistente',
    };
    expect(hasDataError({ dataError: layerError })).toBe(true);
  });

  it('com o TOUR_DATA válido, o App não exibe erro de dados e inicia o tour', () => {
    render(<App />);

    // A mensagem de erro de validação do Tour_Data NÃO deve aparecer.
    expect(
      screen.queryByText(/Não foi possível carregar o tour/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Os dados do tour \(Tour_Data\) são inválidos/i),
    ).not.toBeInTheDocument();

    // O tour foi iniciado (gate liberado): em jsdom o WebGL é indisponível,
    // então o caminho normal renderiza o WebGLFallback (req. 1.6), e não o
    // painel de erro de dados.
    expect(screen.getByText(WEBGL_FALLBACK_TITLE)).toBeInTheDocument();
  });
});
