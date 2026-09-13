/**
 * Funções puras das notas do apresentador (Presenter_Notes_Panel).
 *
 * Este módulo pertence ao domínio `state/` (coordenação) e importa apenas de
 * `tour-data/`. NÃO importa React nem Three.js — é lógica pura, testável de
 * forma isolada e reutilizável tanto pelo store quanto pela UI.
 *
 * Cobre os requisitos:
 *  - 8.1 / 8.2: alternância (toggle) da visibilidade do painel.
 *  - 8.3: truncamento das notas em no máximo 5.000 caracteres com indicador.
 *  - 8.4: mensagem de estado vazio quando o passo não possui notas.
 *
 * Propriedades de correção associadas: 17 (involução do toggle), 18
 * (truncamento) e 19 (estado vazio).
 */

/**
 * Comprimento máximo, em caracteres, do texto de notas exibido no
 * Presenter_Notes_Panel (req. 8.3). O resultado de `truncateNotes` — incluindo
 * o indicador de truncamento — nunca excede este valor.
 */
export const MAX_NOTES_LENGTH = 5000;

/**
 * Indicador visual de truncamento acrescentado ao final do texto quando as
 * notas excedem `MAX_NOTES_LENGTH` (req. 8.3). É contabilizado dentro do limite
 * máximo, de modo que o comprimento total do resultado permaneça ≤ 5.000.
 */
export const TRUNCATION_INDICATOR = '…';

/**
 * Mensagem de estado vazio exibida quando o Tour_Step ativo não possui notas
 * definidas (req. 8.4). Em pt-BR, conforme a estratégia de mensagens do design.
 */
export const EMPTY_NOTES_MESSAGE = 'Sem notas para este passo.';

/**
 * Alterna a visibilidade do Presenter_Notes_Panel (req. 8.1 / 8.2).
 *
 * É uma involução: `toggleNotes(toggleNotes(v)) === v` para qualquer `v`
 * (Property 17).
 *
 * @param v Estado atual de visibilidade.
 * @returns O estado oposto de visibilidade.
 */
export function toggleNotes(v: boolean): boolean {
  return !v;
}

/**
 * Trunca o texto de notas em no máximo `MAX_NOTES_LENGTH` caracteres (req. 8.3).
 *
 * - Quando `|s| ≤ MAX_NOTES_LENGTH`, retorna `s` inalterado, sem indicador.
 * - Quando `s` excede `MAX_NOTES_LENGTH`, retorna um prefixo de `s` acrescido do
 *   indicador de truncamento, de forma que o comprimento total do resultado
 *   seja exatamente `MAX_NOTES_LENGTH` (o indicador é contabilizado no limite).
 *
 * Property 18 garante que o resultado sempre tem comprimento ≤ 5.000.
 *
 * @param s Texto original das notas.
 * @returns O texto (possivelmente) truncado.
 */
export function truncateNotes(s: string): string {
  if (s.length <= MAX_NOTES_LENGTH) {
    return s;
  }
  const prefixLength = MAX_NOTES_LENGTH - TRUNCATION_INDICATOR.length;
  return s.slice(0, prefixLength) + TRUNCATION_INDICATOR;
}

/**
 * Resolve o conteúdo a ser exibido no Presenter_Notes_Panel para as notas de um
 * passo (req. 8.3 / 8.4).
 *
 * - Se as notas forem em branco (vazias ou apenas espaços em branco), retorna a
 *   mensagem de estado vazio `EMPTY_NOTES_MESSAGE`, garantindo que o painel
 *   nunca exiba uma string em branco (Property 19).
 * - Caso contrário, retorna as notas truncadas em `MAX_NOTES_LENGTH` (req. 8.3).
 *
 * @param notes Notas do apresentador definidas para o Tour_Step ativo.
 * @returns O conteúdo textual pronto para exibição no painel.
 */
export function resolveNotesContent(notes: string): string {
  if (notes.trim().length === 0) {
    return EMPTY_NOTES_MESSAGE;
  }
  return truncateNotes(notes);
}
