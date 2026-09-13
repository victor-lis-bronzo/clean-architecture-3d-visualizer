/**
 * Testes de propriedade para a lógica pura do Presentation_Timer.
 *
 * Cobre as propriedades de correção do design.md:
 * - Property 5: Faixas de cor do timer são totais e monotônicas (req. 6.2–6.4, 6.8).
 * - Property 6: Round-trip de formatação mm:ss (req. 6.1).
 * - Property 7: Pausar e retomar preserva o tempo decorrido (req. 6.5, 6.7).
 * - Property 8: Reiniciar zera e interrompe a contagem (req. 6.6).
 *
 * Ferramentas: Vitest + fast-check (≥100 iterações por propriedade).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  timerColorBand,
  formatMMSS,
  parseMMSS,
  startTimer,
  pauseTimer,
  resetTimer,
} from './timer';
import { TIMER_BANDS } from '../tour-data/palette';
import type { TimerState, TimerStatus } from '../tour-data/types';

describe('Presentation_Timer — lógica pura', () => {
  // Feature: clean-architecture-3d-visualizer, Property 5: Faixas de cor do timer são totais e monotônicas. Para qualquer tempo decorrido sec ≥ 0, timerColorBand(sec) retorna exatamente uma cor: verde em [0, 1200), amarelo em [1200, 1620), vermelho em [1620, ∞); e a função é monotônica na ordem verde → amarelo → vermelho (aumentar sec nunca retrocede a faixa), permanecendo vermelha para todo sec ≥ 1620, inclusive ≥ 1800 (30:00).
  it('Property 5: faixas de cor são totais e monotônicas (Validates: Requirements 6.2, 6.3, 6.4, 6.8)', () => {
    // Ordem esperada das faixas (0 = verde, 1 = amarelo, 2 = vermelho).
    const bandRank = (sec: number): number => {
      if (sec >= TIMER_BANDS.red.fromSec) return 2;
      if (sec >= TIMER_BANDS.yellow.fromSec) return 1;
      return 0;
    };
    const colorForRank = [
      TIMER_BANDS.green.color,
      TIMER_BANDS.yellow.color,
      TIMER_BANDS.red.color,
    ];

    fc.assert(
      fc.property(
        // sec ≥ 0, incluindo valores bem acima de 1800 (30:00) para cobrir req. 6.8.
        fc.double({ min: 0, max: 10_000, noNaN: true }),
        fc.double({ min: 0, max: 10_000, noNaN: true }),
        (a, b) => {
          const color = timerColorBand(a);

          // Totalidade: retorna exatamente uma das três cores das faixas.
          expect(colorForRank).toContain(color);

          // Faixa correta conforme os limites [0,1200)/[1200,1620)/[1620,∞).
          expect(color).toBe(colorForRank[bandRank(a)]);

          // Permanece vermelha para todo sec ≥ 1620, inclusive ≥ 1800 (req. 6.8).
          if (a >= TIMER_BANDS.red.fromSec) {
            expect(color).toBe(TIMER_BANDS.red.color);
          }

          // Monotonicidade: se a ≤ b então rank(a) ≤ rank(b) (nunca retrocede).
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(bandRank(lo)).toBeLessThanOrEqual(bandRank(hi));
        },
      ),
      { numRuns: 100 },
    );

    // Casos-âncora explícitos nas fronteiras das faixas.
    expect(timerColorBand(0)).toBe(TIMER_BANDS.green.color);
    expect(timerColorBand(1199)).toBe(TIMER_BANDS.green.color);
    expect(timerColorBand(1200)).toBe(TIMER_BANDS.yellow.color);
    expect(timerColorBand(1619)).toBe(TIMER_BANDS.yellow.color);
    expect(timerColorBand(1620)).toBe(TIMER_BANDS.red.color);
    expect(timerColorBand(1800)).toBe(TIMER_BANDS.red.color);
  });

  // Feature: clean-architecture-3d-visualizer, Property 6: Round-trip de formatação mm:ss. Para qualquer sec ≥ 0, formatMMSS(sec) produz uma string no formato mm:ss com ss em [0, 59], tal que parseMMSS(formatMMSS(sec)) === floor(sec).
  it('Property 6: round-trip de formatação mm:ss (Validates: Requirements 6.1)', () => {
    fc.assert(
      fc.property(
        // sec ≥ 0, incluindo tempos além de 59:59 (req. 6.8) e frações.
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        (sec) => {
          const formatted = formatMMSS(sec);

          // Formato mm:ss com mm de 2+ dígitos e ss de exatamente 2 dígitos.
          const match = /^(\d{2,}):(\d{2})$/.exec(formatted);
          expect(match).not.toBeNull();

          // ss sempre em [0, 59].
          const ss = Number.parseInt(match![2], 10);
          expect(ss).toBeGreaterThanOrEqual(0);
          expect(ss).toBeLessThanOrEqual(59);

          // Round-trip: parse ∘ format === floor(sec).
          expect(parseMMSS(formatted)).toBe(Math.floor(sec));
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 7: Pausar e retomar preserva o tempo decorrido. Para qualquer TimerState com elapsedSec = e, aplicar pause produz status = 'paused' com elapsedSec = e, e aplicar start em seguida produz status = 'running' mantendo elapsedSec = e (retomada sem perda).
  it('Property 7: pausar e retomar preserva o tempo decorrido (Validates: Requirements 6.5, 6.7)', () => {
    const arbStatus: fc.Arbitrary<TimerStatus> = fc.constantFrom(
      'idle',
      'running',
      'paused',
    );
    const arbTimerState: fc.Arbitrary<TimerState> = fc.record({
      status: arbStatus,
      elapsedSec: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    });

    fc.assert(
      fc.property(arbTimerState, (state) => {
        const e = state.elapsedSec;

        // pause → 'paused' preservando elapsedSec.
        const paused = pauseTimer(state);
        expect(paused.status).toBe('paused');
        expect(paused.elapsedSec).toBe(e);

        // start após pause → 'running' mantendo elapsedSec (retomada sem perda).
        const resumed = startTimer(paused);
        expect(resumed.status).toBe('running');
        expect(resumed.elapsedSec).toBe(e);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 8: Reiniciar zera e interrompe a contagem. Para qualquer TimerState, aplicar reset produz elapsedSec = 0 e um estado que não está contando (status ≠ 'running') até que start seja acionado.
  it('Property 8: reiniciar zera e interrompe a contagem (Validates: Requirements 6.6)', () => {
    const arbStatus: fc.Arbitrary<TimerStatus> = fc.constantFrom(
      'idle',
      'running',
      'paused',
    );
    const arbTimerState: fc.Arbitrary<TimerState> = fc.record({
      status: arbStatus,
      elapsedSec: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    });

    fc.assert(
      fc.property(arbTimerState, (_state) => {
        // resetTimer() é incondicional e não recebe argumentos.
        const reset = resetTimer();

        // Zera o tempo decorrido.
        expect(reset.elapsedSec).toBe(0);

        // Não está contando (status ≠ 'running').
        expect(reset.status).not.toBe('running');
      }),
      { numRuns: 100 },
    );
  });
});
