/**
 * Adaptador de plataforma — Preferência de redução de movimento.
 *
 * Este módulo pertence ao domínio `platform/` e encapsula a detecção da
 * preferência de sistema `prefers-reduced-motion`, isolando o uso de
 * `window.matchMedia` do resto da aplicação. A Scene consome este sinal para
 * congelar a animação das Data_Particles (req. 2.3).
 *
 * Regra da Dependência (req. 5.1): `platform/` pode importar de React; NÃO
 * importa de `scene/`/`ui/`.
 *
 * Comportamento (requisito 2.3):
 *  - Retorna `true` quando o sistema indica preferência por movimento reduzido
 *    (`(prefers-reduced-motion: reduce)`), `false` caso contrário.
 *  - Registra um listener em `MediaQueryList` para refletir mudanças em runtime
 *    (o usuário pode alterar a preferência sem recarregar a página).
 *
 * SSR/jsdom-safe: acesso a `window`/`matchMedia` é guardado; quando indisponível
 * (SSR ou jsdom sem `matchMedia`), assume `false` (sem redução de movimento).
 *
 * _Requirements: 2.3_
 */

import { useEffect, useState } from 'react';

/** Media query que expressa a preferência por movimento reduzido. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Lê a preferência atual de forma SSR-safe (retorna `false` se indisponível). */
function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Hook que retorna se a preferência de movimento reduzido está ativa,
 * atualizando-se em runtime conforme a preferência do sistema muda.
 *
 * @returns `true` se `prefers-reduced-motion: reduce`; caso contrário `false`.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(readReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    function handleChange(event: MediaQueryListEvent): void {
      setReducedMotion(event.matches);
    }

    // Sincroniza imediatamente caso o valor tenha mudado entre o render inicial
    // e a montagem do efeito.
    setReducedMotion(mediaQuery.matches);

    // `addEventListener` é a API moderna; alguns navegadores antigos só expõem
    // `addListener`/`removeListener` (mantido como fallback defensivo).
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    const legacy = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener?.(handleChange);
    return () => {
      legacy.removeListener?.(handleChange);
    };
  }, []);

  return reducedMotion;
}

export default useReducedMotion;
