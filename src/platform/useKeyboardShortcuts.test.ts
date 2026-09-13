/**
 * Teste de propriedade (fast-check) para o gating de atalhos de teclado em
 * campos de texto editáveis (tarefa 12.2).
 *
 * Cobre a Correctness Property 22 do design (clean-architecture-3d-visualizer):
 * atalhos são ignorados quando o foco está em um campo de texto editável.
 *
 * A propriedade é verificada de forma pura, combinando `isEditableTarget` (o
 * gating do requisito 7.9) com `resolveShortcut` (o roteamento das teclas
 * mapeadas — setas, espaço, F, N, R): para qualquer alvo editável, o handler
 * não dispara comando; para alvos não editáveis, o comando mapeado é resolvido.
 *
 * O teste de propriedade usa `fc.assert(..., { numRuns: 100 })`.
 *
 * _Validates: Requirements 7.9_
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  isEditableTarget,
  resolveShortcut,
  type KeyboardShortcutActions,
} from './useKeyboardShortcuts';

/** Um alvo de evento falso, modelando as propriedades relevantes do DOM. */
type FakeTarget = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
};

/**
 * Simula a decisão do Keyboard_Handler: se o alvo é editável, NENHUM comando é
 * disparado (retorna `null`); caso contrário, retorna a ação mapeada de
 * `resolveShortcut` (que pode ser `null` para teclas não mapeadas).
 *
 * Espelha exatamente a ordem de decisão de `handleKeyDown` (gating antes do
 * roteamento), sem depender do DOM real.
 */
function dispatchedAction(
  target: FakeTarget | null,
  event: Pick<KeyboardEvent, 'key' | 'code'>,
): keyof KeyboardShortcutActions | null {
  if (isEditableTarget(target as EventTarget | null)) {
    return null;
  }
  return resolveShortcut(event);
}

/** Eventos de teclado mapeados e a ação esperada de cada um (req. 7.1–7.8). */
const MAPPED_KEYS: ReadonlyArray<{
  event: Pick<KeyboardEvent, 'key' | 'code'>;
  action: keyof KeyboardShortcutActions;
}> = [
  { event: { key: 'ArrowLeft', code: 'ArrowLeft' }, action: 'prev' },
  { event: { key: 'ArrowRight', code: 'ArrowRight' }, action: 'next' },
  { event: { key: ' ', code: 'Space' }, action: 'next' },
  { event: { key: 'f', code: 'KeyF' }, action: 'toggleFullscreen' },
  { event: { key: 'n', code: 'KeyN' }, action: 'toggleNotes' },
  { event: { key: 'r', code: 'KeyR' }, action: 'resetCamera' },
];

/** Gerador de um evento mapeado (par tecla → ação esperada). */
const arbMappedKey = fc.constantFrom(...MAPPED_KEYS);

/** Gerador de um alvo editável: input textual, textarea ou contenteditable. */
const arbEditableTarget: fc.Arbitrary<FakeTarget> = fc.oneof(
  // <input> textual (com type explícito editável)
  fc
    .constantFrom(
      'text',
      'search',
      'email',
      'url',
      'tel',
      'password',
      'number',
    )
    .map((type) => ({ tagName: 'INPUT', type })),
  // <input> sem type => tratado como 'text' (editável)
  fc.constant({ tagName: 'INPUT' }),
  // <textarea>
  fc.constant({ tagName: 'TEXTAREA' }),
  // elemento com contenteditable ativo (qualquer tag)
  fc
    .constantFrom('DIV', 'SPAN', 'P', 'SECTION')
    .map((tagName) => ({ tagName, isContentEditable: true })),
);

/** Gerador de um alvo NÃO editável. */
const arbNonEditableTarget: fc.Arbitrary<FakeTarget | null> = fc.oneof(
  fc.constantFrom('DIV', 'SPAN', 'BUTTON', 'A', 'CANVAS', 'BODY').map(
    (tagName) => ({ tagName }),
  ),
  // <input> não textual (checkbox, radio, button, …) — não bloqueia atalhos
  fc
    .constantFrom('checkbox', 'radio', 'button', 'submit', 'range', 'color')
    .map((type) => ({ tagName: 'INPUT', type })),
  // ausência de alvo
  fc.constant(null),
);

describe('Property 22 — atalhos ignorados em campos de texto editáveis (Requirements 7.9)', () => {
  it('alvo editável ⇒ nenhum comando é disparado para teclas mapeadas', () => {
    // Feature: clean-architecture-3d-visualizer, Property 22: Para qualquer alvo de evento que seja um campo de texto editável (<input> textual, <textarea> ou elemento contenteditable), o Keyboard_Handler não dispara nenhum comando para as teclas mapeadas (setas, espaço, F, N, R); para alvos não editáveis, o comando mapeado é disparado.
    fc.assert(
      fc.property(arbEditableTarget, arbMappedKey, (target, mapped) => {
        expect(isEditableTarget(target as EventTarget)).toBe(true);
        // Gating ativo: nenhuma ação é despachada, mesmo para tecla mapeada.
        expect(dispatchedAction(target, mapped.event)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('alvo não editável ⇒ a tecla mapeada dispara o comando esperado', () => {
    // Feature: clean-architecture-3d-visualizer, Property 22: Para qualquer alvo de evento que seja um campo de texto editável (<input> textual, <textarea> ou elemento contenteditable), o Keyboard_Handler não dispara nenhum comando para as teclas mapeadas (setas, espaço, F, N, R); para alvos não editáveis, o comando mapeado é disparado.
    fc.assert(
      fc.property(arbNonEditableTarget, arbMappedKey, (target, mapped) => {
        expect(isEditableTarget(target as EventTarget | null)).toBe(false);
        // Sem gating: a ação mapeada é resolvida e despachada.
        expect(dispatchedAction(target, mapped.event)).toBe(mapped.action);
      }),
      { numRuns: 100 },
    );
  });
});
