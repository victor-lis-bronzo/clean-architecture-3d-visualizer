/**
 * Overlay — contêiner 2D responsivo sobreposto ao `<Canvas>` da cena 3D.
 *
 * Responsabilidades:
 *  - Posicionar-se de forma absoluta sobre a cena (o container é
 *    `pointer-events-none` para deixar a órbita/zoom do Canvas passar; cada
 *    ilha interativa reativa `pointer-events` localmente).
 *  - Compor o {@link TourControls} (título/texto do passo, navegação,
 *    indicador "N de 8").
 *  - Expor *slots* onde o timer e o painel de notas (tarefa 11.2) se encaixam,
 *    via as props `timerSlot` e `notesSlot`, sem que este componente conheça
 *    suas implementações.
 *  - Aplicar a visibilidade responsiva por breakpoint (req. 11.2/11.3/11.4)
 *    reutilizando o helper puro {@link overlayVisibilityFor}:
 *      • `w >= 1024`       → controles + timer + progresso
 *      • `640 <= w < 1024` → controles + timer (sem progresso)
 *      • `w < 640`         → apenas controles
 *    Os controles de navegação estão sempre visíveis (invariante da Property 23).
 *
 * Regra da Dependência (req. 5.1): pertence a `ui/` e NÃO importa de `scene/`.
 *
 * Largura da viewport: aceita uma prop `width` (útil para testes e para o hook
 * `useViewportBreakpoint` da tarefa 12.3). Quando ausente, lê `window.innerWidth`
 * e escuta `resize` localmente, de modo que o componente funcione de forma
 * autônoma antes de o hook de breakpoint existir.
 *
 * _Requirements: 4.7, 4.9, 11.2, 11.3, 11.4_
 */

import { useEffect, useState, type ReactNode } from 'react';

import TourControls from './TourControls';
import { overlayVisibilityFor } from './responsive';

/** Props do Overlay. */
export interface OverlayProps {
  /**
   * Largura da viewport em pixels usada para resolver os breakpoints. Se
   * omitida, o componente lê `window.innerWidth` e reage a `resize`.
   */
  width?: number;
  /**
   * Slot do timer de apresentação (tarefa 11.2). Renderizado apenas quando o
   * breakpoint permite exibir o timer (`w >= 640`).
   */
  timerSlot?: ReactNode;
  /**
   * Slot do painel de notas do apresentador (tarefa 11.2). A sua própria
   * visibilidade (oculto/visível) é controlada pelo store; o Overlay apenas
   * reserva o espaço/posição.
   */
  notesSlot?: ReactNode;
}

/**
 * Hook interno: resolve a largura da viewport a partir da prop `width` ou, na
 * ausência dela, de `window.innerWidth` com listener de `resize`.
 */
function useResolvedWidth(width?: number): number {
  const [innerWidth, setInnerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  useEffect(() => {
    // Quando `width` é controlada externamente, não precisamos do listener.
    if (width !== undefined || typeof window === 'undefined') {
      return;
    }
    const onResize = (): void => setInnerWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    // Sincroniza no mount (caso a largura tenha mudado antes da montagem).
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [width]);

  return width ?? innerWidth;
}

/**
 * Contêiner responsivo do UI_Overlay. Compõe os controles do tour e reserva os
 * slots do timer e das notas, aplicando os breakpoints do requisito 11.
 */
export default function Overlay({
  width,
  timerSlot,
  notesSlot,
}: OverlayProps): React.JSX.Element {
  const resolvedWidth = useResolvedWidth(width);
  const visibility = overlayVisibilityFor(resolvedWidth);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6"
      aria-label="Interface de apresentação"
    >
      {/* Faixa superior: timer (>= 640px) à direita. */}
      <div className="flex items-start justify-end">
        {visibility.timer && timerSlot ? (
          <div className="pointer-events-auto">{timerSlot}</div>
        ) : null}
      </div>

      {/* Painel de notas (visibilidade própria controlada pelo store). */}
      {notesSlot ? (
        <div className="pointer-events-auto flex justify-center">
          {notesSlot}
        </div>
      ) : null}

      {/* Faixa inferior: controles do tour, sempre visíveis. O indicador de
          progresso "N de 8" segue o breakpoint (>= 1024px). */}
      <div className="flex items-end justify-center">
        <TourControls showProgress={visibility.progress} />
      </div>
    </div>
  );
}
