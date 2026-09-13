/**
 * Adaptador de plataforma — Dimensões e breakpoint da viewport.
 *
 * Este módulo pertence ao domínio `platform/` e encapsula o acesso às
 * dimensões da janela (`window.innerWidth`/`innerHeight`) e ao evento
 * `resize`, isolando essa dependência do navegador. O UI_Overlay usa o
 * breakpoint resultante para decidir quais elementos exibir (req. 11.2/11.3/
 * 11.4) e a Scene usa `width`/`height` para ajustar o aspect ratio e suspender
 * a renderização quando a dimensão é ≤ 0 (req. 11.1/11.5).
 *
 * Regra da Dependência (req. 5.1): `platform/` pode importar de React; NÃO
 * importa de `scene/`/`ui/`. Os breakpoints são mantidos localmente para que
 * este adaptador seja autossuficiente e reutilizável por ambos os domínios sem
 * acoplá-los entre si — o mapeamento de visibilidade concreto vive em
 * `ui/responsive.ts`.
 *
 * SSR/jsdom-safe: acesso a `window` é guardado por `typeof window !== 'undefined'`;
 * quando indisponível, assume dimensões `0 × 0` e o breakpoint mais restritivo.
 *
 * _Requirements: 11.1_
 */

import { useEffect, useState } from 'react';

/**
 * Faixa de breakpoint da viewport, conforme os limiares do requisito 11:
 *  - `'desktop'`  → largura ≥ 1024 px (controles + timer + progresso).
 *  - `'tablet'`   → 640 px ≤ largura < 1024 px (controles + timer).
 *  - `'mobile'`   → largura < 640 px (apenas controles).
 */
export type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop';

/** Largura mínima (px) da faixa `'tablet'` — abaixo disso é `'mobile'`. */
export const TABLET_MIN_WIDTH_PX = 640;

/** Largura mínima (px) da faixa `'desktop'`. */
export const DESKTOP_MIN_WIDTH_PX = 1024;

/** Dimensões e breakpoint resolvidos da viewport. */
export interface ViewportState {
  /** Largura atual da viewport em pixels. */
  width: number;
  /** Altura atual da viewport em pixels. */
  height: number;
  /** Faixa de breakpoint derivada da largura. */
  breakpoint: ViewportBreakpoint;
}

/**
 * Deriva a faixa de breakpoint a partir da largura da viewport.
 *
 * Função pura, exportada para teste direto.
 *
 * @param width Largura da viewport em pixels.
 * @returns A {@link ViewportBreakpoint} correspondente.
 */
export function breakpointFor(width: number): ViewportBreakpoint {
  if (width >= DESKTOP_MIN_WIDTH_PX) {
    return 'desktop';
  }
  if (width >= TABLET_MIN_WIDTH_PX) {
    return 'tablet';
  }
  return 'mobile';
}

/** Lê as dimensões atuais da viewport de forma SSR-safe. */
function readViewport(): ViewportState {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, breakpoint: breakpointFor(0) };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height, breakpoint: breakpointFor(width) };
}

/**
 * Hook que rastreia as dimensões da viewport e o breakpoint derivado,
 * atualizando-se ao redimensionar a janela (req. 11.1).
 *
 * @returns {@link ViewportState} com `width`, `height` e `breakpoint`.
 */
export function useViewportBreakpoint(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(readViewport);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function handleResize(): void {
      setViewport(readViewport());
    }

    // Sincroniza imediatamente na montagem (as dimensões podem ter mudado
    // entre o render inicial e o efeito).
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewport;
}

export default useViewportBreakpoint;
