/**
 * PresentationTimer — timer discreto de apresentação (req. 6).
 *
 * Componente do domínio `ui/` (2D). Conforme a Regra da Dependência
 * (requisito 5.1), NÃO importa nada de `scene/` (3D); importa apenas de `state/`
 * (store + funções puras) e React. Toda a lógica de formatação e de faixa de
 * cor vive nas funções puras `formatMMSS` / `timerColorBand` de
 * `state/timer.ts` — este componente é uma fina camada de apresentação sobre o
 * store.
 *
 * Comportamento:
 *  - Exibe o tempo decorrido no formato `mm:ss` via `formatMMSS` (req. 6.1).
 *  - Aplica a cor do indicador (verde/amarelo/vermelho) via `timerColorBand`
 *    (req. 6.2/6.3/6.4).
 *  - Controles iniciar/pausar/reiniciar delegam às ações do store, que por sua
 *    vez delegam às transições puras (req. 6.5/6.6/6.7).
 *  - Enquanto o timer está `running`, um `setInterval` chama `tick(dt)` a cada
 *    segundo para avançar o tempo decorrido (req. 6.1); o intervalo é limpo ao
 *    pausar/reiniciar (status ≠ 'running') e no unmount, evitando vazamentos.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4_
 */

import { useEffect } from 'react';
import { useStore } from 'zustand';

import { presentationStore } from '../state/presentation-store';
import { formatMMSS, timerColorBand } from '../state/timer';

/** Intervalo do relógio, em milissegundos (1 tick por segundo — req. 6.1). */
const TICK_INTERVAL_MS = 1000;

/** Passo de tempo aplicado a cada tick, em segundos. */
const TICK_STEP_SEC = 1;

/**
 * Timer de apresentação: exibe `mm:ss` com faixa de cor e controles discretos.
 *
 * O parâmetro `store` é injetável para facilitar testes isolados; por padrão
 * usa o singleton `presentationStore` da aplicação.
 */
export default function PresentationTimer({
  store = presentationStore,
}: {
  store?: typeof presentationStore;
}) {
  const timer = useStore(store, (s) => s.timer);
  const startTimer = useStore(store, (s) => s.startTimer);
  const pauseTimer = useStore(store, (s) => s.pauseTimer);
  const resetTimer = useStore(store, (s) => s.resetTimer);
  const tick = useStore(store, (s) => s.tick);

  const isRunning = timer.status === 'running';

  // Relógio: enquanto `running`, avança o tempo decorrido 1s por segundo
  // (req. 6.1). O efeito só liga o intervalo quando o timer conta; ao pausar,
  // reiniciar ou desmontar, o cleanup limpa o intervalo (sem vazamentos).
  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const id = setInterval(() => {
      tick(TICK_STEP_SEC);
    }, TICK_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [isRunning, tick]);

  const display = formatMMSS(timer.elapsedSec);
  const color = timerColorBand(timer.elapsedSec);

  return (
    <div className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 text-sm backdrop-blur-sm">
      {/* Indicador de tempo com a cor da faixa (verde/amarelo/vermelho). */}
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="font-mono text-base tabular-nums"
        style={{ color }}
        role="timer"
        aria-label={`Tempo decorrido ${display}`}
      >
        {display}
      </span>

      <div className="ml-1 flex items-center gap-1">
        {isRunning ? (
          <button
            type="button"
            onClick={() => pauseTimer()}
            className="rounded px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
            aria-label="Pausar timer"
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTimer()}
            className="rounded px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
            aria-label="Iniciar timer"
          >
            Iniciar
          </button>
        )}
        <button
          type="button"
          onClick={() => resetTimer()}
          className="rounded px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
          aria-label="Reiniciar timer"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
