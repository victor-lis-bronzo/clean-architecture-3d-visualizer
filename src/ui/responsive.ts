/**
 * Helpers puros de responsividade do UI_Overlay e da cena 3D.
 *
 * Este módulo pertence ao domínio `ui/` (2D). Conforme a Regra da Dependência
 * (requisito 5.1), NÃO importa nada de `scene/` (3D). Contém apenas funções
 * puras e sem efeitos colaterais, facilmente testáveis (Properties 23, 24, 25).
 *
 * Cobre:
 *  - `computeAspect(w, h)`   → proporção largura/altura (Property 24, req. 11.1).
 *  - `shouldRender(w, h)`    → suspensão de renderização em dimensão não positiva
 *                              (Property 25, req. 11.5).
 *  - `overlayVisibilityFor(w)` → mapeamento de visibilidade por breakpoint,
 *                              monotônico e com controles sempre visíveis
 *                              (Property 23, req. 11.2/11.3/11.4).
 */

/**
 * Visibilidade dos elementos do UI_Overlay para uma dada largura de viewport.
 *
 * Os controles de navegação estão SEMPRE visíveis; timer e indicador de
 * progresso são ocultados progressivamente conforme a largura diminui.
 */
export interface OverlayVisibility {
  /** Controles de navegação (avançar/retroceder). Sempre `true`. */
  controls: boolean;
  /** Timer de apresentação. */
  timer: boolean;
  /** Indicador de progresso do tour ("N de 8"). */
  progress: boolean;
}

/** Breakpoint (largura mínima em px) a partir do qual o timer é exibido. */
export const TIMER_BREAKPOINT_PX = 640;

/** Breakpoint (largura mínima em px) a partir do qual o progresso é exibido. */
export const PROGRESS_BREAKPOINT_PX = 1024;

/**
 * Calcula a proporção (aspect ratio) da janela de visualização.
 *
 * Função pura e total para dimensões positivas: retorna estritamente `w / h`
 * (Property 24, requisito 11.1). Para dimensões não positivas o resultado não
 * é significativo — nesses casos use {@link shouldRender} para suspender a
 * renderização antes de aplicar a proporção.
 *
 * @param w Largura da janela em pixels.
 * @param h Altura da janela em pixels.
 * @returns A razão `w / h`.
 */
export function computeAspect(w: number, h: number): number {
  return w / h;
}

/**
 * Decide se a cena 3D deve ser renderizada para as dimensões informadas.
 *
 * Retorna `false` quando qualquer dimensão é não positiva (`w <= 0` ou
 * `h <= 0`), sinalizando que a renderização deve ser suspensa preservando o
 * estado atual da cena; retorna `true` somente quando ambas as dimensões são
 * estritamente maiores que zero (Property 25, requisito 11.5).
 *
 * @param w Largura da janela em pixels.
 * @param h Altura da janela em pixels.
 * @returns `true` se ambas as dimensões forem `> 0`; caso contrário `false`.
 */
export function shouldRender(w: number, h: number): boolean {
  return w > 0 && h > 0;
}

/**
 * Mapeia a largura da viewport para a visibilidade dos elementos do UI_Overlay.
 *
 * Regras por breakpoint (requisitos 11.2, 11.3, 11.4):
 *  - `w >= 1024`        → { controls: true, timer: true,  progress: true  }
 *  - `640 <= w < 1024`  → { controls: true, timer: true,  progress: false }
 *  - `w < 640`          → { controls: true, timer: false, progress: false }
 *
 * Invariantes garantidas (Property 23):
 *  - Os controles de navegação estão sempre visíveis.
 *  - O mapeamento é monotônico: reduzir a largura nunca adiciona elementos.
 *
 * @param w Largura da viewport em pixels (espera-se `w > 0`).
 * @returns A visibilidade resolvida de cada elemento do overlay.
 */
export function overlayVisibilityFor(w: number): OverlayVisibility {
  return {
    controls: true,
    timer: w >= TIMER_BREAKPOINT_PX,
    progress: w >= PROGRESS_BREAKPOINT_PX,
  };
}
