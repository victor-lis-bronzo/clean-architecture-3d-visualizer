/**
 * Testes de propriedade para as funções puras de notas do apresentador.
 *
 * Cobre as propriedades de correção do design.md:
 * - Property 17: Involução do toggle de notas (req. 8.1, 8.2).
 * - Property 18: Truncamento das notas do apresentador (req. 8.3).
 * - Property 19: Estado vazio das notas (req. 8.4).
 *
 * Ferramentas: Vitest + fast-check (≥100 iterações por propriedade).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  EMPTY_NOTES_MESSAGE,
  MAX_NOTES_LENGTH,
  TRUNCATION_INDICATOR,
  resolveNotesContent,
  toggleNotes,
  truncateNotes,
} from './notes';

describe('Presenter_Notes — funções puras', () => {
  // Feature: clean-architecture-3d-visualizer, Property 17: Involução do toggle de notas. Para qualquer valor de visibilidade v, toggleNotes(toggleNotes(v)) === v (aplicar o toggle duas vezes retorna ao estado original).
  it('Property 17: o toggle de notas é uma involução (Validates: Requirements 8.1, 8.2)', () => {
    fc.assert(
      fc.property(fc.boolean(), (v) => {
        // Aplicar o toggle duas vezes retorna ao estado original.
        expect(toggleNotes(toggleNotes(v))).toBe(v);
        // Uma aplicação inverte o valor (sanidade do comportamento).
        expect(toggleNotes(v)).toBe(!v);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 18: Truncamento das notas do apresentador. Para qualquer string de notas s, truncateNotes(s) tem comprimento de texto ≤ 5.000 caracteres; quando s excede 5.000, o resultado é um prefixo de s acrescido de um indicador de truncamento; quando |s| ≤ 5.000, o resultado é igual a s sem indicador.
  it('Property 18: trunca as notas em no máximo MAX_NOTES_LENGTH com indicador (Validates: Requirements 8.3)', () => {
    fc.assert(
      fc.property(
        // Gera strings abaixo e acima do limite de 5.000 caracteres. O maxLength
        // bem acima de 5.000 (~6000) garante a cobertura frequente do caso de
        // truncamento; o caso |s| ≤ 5.000 também é amplamente exercitado.
        fc.string({ maxLength: 6000 }),
        (s) => {
          const result = truncateNotes(s);

          // O resultado nunca excede o limite máximo (Property 18, req. 8.3).
          expect(result.length).toBeLessThanOrEqual(MAX_NOTES_LENGTH);

          if (s.length <= MAX_NOTES_LENGTH) {
            // Abaixo/no limite: retorna s inalterado, sem indicador.
            expect(result).toBe(s);
          } else {
            // Acima do limite: prefixo de s + indicador de truncamento.
            expect(result.endsWith(TRUNCATION_INDICATOR)).toBe(true);
            const prefix = result.slice(
              0,
              result.length - TRUNCATION_INDICATOR.length,
            );
            // O prefixo do resultado é de fato um prefixo da string original.
            expect(s.startsWith(prefix)).toBe(true);
            // O comprimento total ocupa exatamente o limite máximo.
            expect(result.length).toBe(MAX_NOTES_LENGTH);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Casos-alvo grandes explícitos, para garantir a exploração determinística do
  // ramo de truncamento (strings muito acima de 5.000 caracteres).
  it('Property 18 (casos-alvo grandes): trunca strings bem acima do limite (Validates: Requirements 8.3)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_NOTES_LENGTH + 1, max: 20000 }),
        fc.string({ minLength: 1, maxLength: 1 }),
        (len, ch) => {
          const s = ch.repeat(len);
          const result = truncateNotes(s);

          expect(result.length).toBe(MAX_NOTES_LENGTH);
          expect(result.endsWith(TRUNCATION_INDICATOR)).toBe(true);
          const prefix = result.slice(
            0,
            result.length - TRUNCATION_INDICATOR.length,
          );
          expect(s.startsWith(prefix)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: clean-architecture-3d-visualizer, Property 19: Estado vazio das notas. Para qualquer Tour_Step cujas notes sejam a string vazia, o conteúdo resolvido do Presenter_Notes_Panel é a mensagem de estado vazio (e não uma string em branco).
  it('Property 19: notas em branco resolvem para a mensagem de estado vazio (Validates: Requirements 8.4)', () => {
    fc.assert(
      fc.property(
        // Gera strings compostas apenas de espaços em branco (incluindo a string
        // vazia), cobrindo o caso vazio e o caso whitespace-only.
        fc.stringMatching(/^[ \t\n\r\f\v]*$/),
        (blank) => {
          // Pré-condição: a string é de fato em branco (vazia ou só whitespace).
          expect(blank.trim().length).toBe(0);

          const content = resolveNotesContent(blank);

          // Resolve para a mensagem de estado vazio — nunca uma string em branco.
          expect(content).toBe(EMPTY_NOTES_MESSAGE);
          expect(content.trim().length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
