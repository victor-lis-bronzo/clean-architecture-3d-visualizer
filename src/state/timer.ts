/**
 * Lógica pura do Presentation_Timer (domínio de coordenação `state/`).
 *
 * Este módulo é 100% puro e determinístico: sem React, sem Three.js, sem
 * side-effects (nenhum `Date.now`, `setInterval` ou relógio). Ele isola as
 * invariantes do requisito 6 (timer de apresentação) para que sejam testáveis
 * por propriedades (Correctness Properties 5–8) e consumidas pelo
 * `PresentationTimer.tsx` (tarefa 11.2) e pelo store (tarefa 6.1).
 *
 * Regra da Dependência (req. 5.1): `state/` importa apenas de `tour-data/`
 * (tipos e dados validados), NUNCA de React/Three.js, `scene/` ou `ui/`. Aqui
 * importamos apenas os tipos/dados do núcleo `tour-data/` (`TimerState`,
 * `TimerStatus` e as faixas `TIMER_BANDS`).
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
 */

import { TIMER_BANDS } from '../tour-data/palette';
import type { TimerState } from '../tour-data/types';

/**
 * Retorna a cor (hex) da faixa do timer para um tempo decorrido `sec`.
 *
 * As faixas são totais e mutuamente exclusivas, em segundos semiabertos
 * `[fromSec, toSec)` (Correctness Property 5):
 * - verde:    `[0, 1200)`       → `[00:00, 20:00)`   (req. 6.2)
 * - amarelo:  `[1200, 1620)`    → `[20:00, 27:00)`   (req. 6.3)
 * - vermelho: `[1620, ∞)`       → `[27:00, ∞)`       (req. 6.4)
 *
 * A função é monotônica na ordem verde → amarelo → vermelho: aumentar `sec`
 * nunca retrocede a faixa, permanecendo vermelha para todo `sec ≥ 1620`,
 * inclusive `≥ 1800` (30:00) — o timer não é limitado a 30:00 (req. 6.8).
 *
 * Valores negativos ou não finitos são tratados de forma robusta: `sec < 0`
 * (ou `NaN`) recai na faixa verde (o menor tempo válido é `00:00`).
 *
 * @param sec Tempo decorrido em segundos (idealmente `≥ 0`).
 * @returns A cor hex correspondente à faixa (uma das cores de `TIMER_BANDS`).
 */
export function timerColorBand(sec: number): string {
  // [1620, ∞) → vermelho (inclui ≥ 1800 / 30:00 — req. 6.8).
  if (sec >= TIMER_BANDS.red.fromSec) {
    return TIMER_BANDS.red.color;
  }
  // [1200, 1620) → amarelo.
  if (sec >= TIMER_BANDS.yellow.fromSec) {
    return TIMER_BANDS.yellow.color;
  }
  // [0, 1200) → verde. Também acolhe sec < 0 e NaN por robustez (mínimo
  // válido é 00:00), pois ambas as comparações `>=` acima são falsas nesses
  // casos e caímos aqui.
  return TIMER_BANDS.green.color;
}

/**
 * Formata um tempo decorrido em segundos como `mm:ss`.
 *
 * O componente de segundos `ss` fica sempre em `[0, 59]` e a fração de segundo
 * é truncada (floor) — nunca arredondada (Correctness Property 6, req. 6.1).
 * Os minutos NÃO são limitados a 59: o timer continua além de 30:00, então
 * tempos como `90:00` são suportados (req. 6.8). Ambos os campos são
 * preenchidos com zero à esquerda para no mínimo 2 dígitos.
 *
 * Entradas negativas ou não finitas são clampadas a `00:00` por robustez.
 *
 * @param sec Tempo decorrido em segundos.
 * @returns String no formato `mm:ss` (mm com 2+ dígitos, ss em `[0, 59]`).
 */
export function formatMMSS(sec: number): string {
  const total = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Converte uma string `mm:ss` de volta para o total de segundos.
 *
 * É a inversa de {@link formatMMSS} tal que
 * `parseMMSS(formatMMSS(sec)) === Math.floor(sec)` para todo `sec ≥ 0`
 * (Correctness Property 6, req. 6.1).
 *
 * Aceita `mm` com qualquer número de dígitos (para suportar tempos além de
 * `59:59`) e `ss` com 1–2 dígitos. Strings malformadas retornam `0`.
 *
 * @param str String no formato `mm:ss`.
 * @returns Total de segundos representado, ou `0` se a string for inválida.
 */
export function parseMMSS(str: string): number {
  const match = /^(\d+):([0-5]?\d)$/.exec(str.trim());
  if (match === null) return 0;
  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

/**
 * Transição pura: iniciar/retomar a contagem do timer.
 *
 * Coloca o timer em `status = 'running'` preservando `elapsedSec`. A partir de
 * um estado `idle` (`elapsedSec = 0`) inicia do zero (req. 6.1); a partir de um
 * estado `paused` retoma do tempo preservado sem perda (req. 6.7, Correctness
 * Property 7). Se já estiver `running`, é idempotente.
 *
 * @param state Estado atual do timer.
 * @returns Novo `TimerState` com `status = 'running'` e o mesmo `elapsedSec`.
 */
export function startTimer(state: TimerState): TimerState {
  return { status: 'running', elapsedSec: state.elapsedSec };
}

/**
 * Transição pura: pausar a contagem do timer.
 *
 * Coloca o timer em `status = 'paused'` preservando o `elapsedSec` atual
 * (req. 6.5, Correctness Property 7). Combinada com {@link startTimer}, garante
 * retomada sem perda de tempo.
 *
 * @param state Estado atual do timer.
 * @returns Novo `TimerState` com `status = 'paused'` e o mesmo `elapsedSec`.
 */
export function pauseTimer(state: TimerState): TimerState {
  return { status: 'paused', elapsedSec: state.elapsedSec };
}

/**
 * Transição pura: reiniciar o timer.
 *
 * Zera `elapsedSec` e interrompe a contagem, retornando ao estado `idle`
 * (`status ≠ 'running'`) até que {@link startTimer} seja acionado (req. 6.6,
 * Correctness Property 8).
 *
 * O reset é incondicional: não depende do estado anterior do timer, por isso
 * não recebe parâmetros. Combinada com {@link startTimer}, a contagem só é
 * retomada após um novo `start`.
 *
 * @returns Novo `TimerState` com `elapsedSec = 0` e `status = 'idle'`.
 */
export function resetTimer(): TimerState {
  return { status: 'idle', elapsedSec: 0 };
}

/** Preenche um inteiro não-negativo com zero à esquerda para 2+ dígitos. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
