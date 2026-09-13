/**
 * Adaptador de plataforma — Modo tela cheia (Fullscreen API).
 *
 * Este módulo pertence ao domínio `platform/` e encapsula a Fullscreen API do
 * navegador, isolando suas particularidades (Promise que rejeita, evento
 * `fullscreenchange`, saída via Esc tratada pelo próprio navegador) do resto da
 * aplicação.
 *
 * Regra da Dependência (req. 5.1): `platform/` pode importar de React; NÃO
 * importa de `scene/`/`ui/`. Para manter o hook desacoplado do store concreto,
 * a sincronização do estado de tela cheia é entregue por um callback opcional
 * (`onChange`) — o App liga esse callback à ação `setFullscreen` do store
 * (design: comunicação via store compartilhado).
 *
 * Comportamento (requisito 9):
 *  - `toggle()` entra/sai de tela cheia conforme o estado atual (req. 9.1/9.2),
 *    retornando uma Promise que resolve `{ ok, error? }` — NUNCA rejeita.
 *  - Em rejeição da solicitação (req. 9.3): o estado de exibição é preservado
 *    (o listener de `fullscreenchange` não dispara), a falha é registrada com
 *    `console.error`, e o resultado é `{ ok: false, error }`. A exibição da
 *    mensagem ao usuário é responsabilidade da UI, que observa o `error`/store.
 *  - Sincroniza `isFullscreen` pelo evento `fullscreenchange`, refletindo
 *    também as saídas via tecla Esc (req. 9.2/9.5), já que o navegador dispara
 *    o mesmo evento.
 *
 * SSR/jsdom-safe: todo acesso a `document` é guardado por
 * `typeof document !== 'undefined'`.
 *
 * _Requirements: 9.1, 9.2, 9.3, 9.5_
 */

import { useCallback, useEffect, useState } from 'react';

/** Resultado de uma tentativa de alternância de tela cheia. Nunca rejeita. */
export interface FullscreenToggleResult {
  /** `true` se a operação (entrar/sair) foi concluída sem rejeição. */
  ok: boolean;
  /** Motivo da falha quando `ok === false` (ex.: solicitação negada — req. 9.3). */
  error?: unknown;
}

/** API pública do hook de tela cheia. */
export interface FullscreenApi {
  /** `true` enquanto o documento está em tela cheia (reflete Esc — req. 9.5). */
  isFullscreen: boolean;
  /**
   * Alterna o modo de tela cheia aplicando o estado oposto ao atual
   * (req. 9.1/9.2). Trata a rejeição da Promise (req. 9.3) e sempre resolve
   * com `{ ok, error? }`.
   */
  toggle(): Promise<FullscreenToggleResult>;
}

/** Lê o elemento atualmente em tela cheia de forma SSR-safe. */
function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.fullscreenElement ?? null;
}

/**
 * Hook que gerencia o estado e a alternância de tela cheia.
 *
 * @param onChange Callback opcional invocado sempre que o estado de tela cheia
 *   muda (via toggle ou Esc). O App liga isto a `setFullscreen` do store para
 *   que a UI/Scene reajam (req. 9.5).
 * @returns {@link FullscreenApi} com `isFullscreen` e `toggle`.
 */
export function useFullscreen(onChange?: (isFullscreen: boolean) => void): FullscreenApi {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => getFullscreenElement() !== null,
  );

  // Sincroniza o estado com o evento `fullscreenchange` do navegador, que
  // também dispara nas saídas via Esc (req. 9.5).
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    function handleFullscreenChange(): void {
      const active = getFullscreenElement() !== null;
      setIsFullscreen(active);
      onChange?.(active);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onChange]);

  const toggle = useCallback(async (): Promise<FullscreenToggleResult> => {
    if (typeof document === 'undefined') {
      return { ok: false, error: new Error('Fullscreen API indisponível (sem document).') };
    }

    try {
      if (getFullscreenElement() === null) {
        // Entrar em tela cheia no elemento raiz do documento (req. 9.1/9.4).
        const target = document.documentElement;
        if (typeof target.requestFullscreen !== 'function') {
          const error = new Error('Fullscreen API não suportada neste navegador.');
          console.error('Falha ao solicitar tela cheia:', error);
          return { ok: false, error };
        }
        await target.requestFullscreen();
      } else {
        // Sair de tela cheia (req. 9.2).
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen();
        }
      }
      // O estado é atualizado pelo listener de `fullscreenchange`.
      return { ok: true };
    } catch (error) {
      // Solicitação negada/rejeitada pelo navegador (req. 9.3): preserva a
      // exibição atual (nenhuma mudança de estado) e registra no console.
      console.error('Falha ao alternar tela cheia:', error);
      return { ok: false, error };
    }
  }, []);

  return { isFullscreen, toggle };
}

export default useFullscreen;
