/**
 * Adaptador de plataforma — Atalhos de teclado (Keyboard_Handler).
 *
 * Este módulo pertence ao domínio `platform/` (adaptadores de plataforma).
 * Ele captura eventos `keydown` no `window` e roteia as teclas de apresentação
 * para os comandos do store, isolando a dependência do DOM/navegador do resto
 * da aplicação.
 *
 * Regra da Dependência (req. 5.1): `platform/` pode importar de `state/` e de
 * React, mas NÃO de `scene/` nem de `ui/`. Para manter o hook desacoplado do
 * store concreto (e trivialmente wireável a partir do App — tarefa 13.1), ele
 * recebe os comandos por parâmetro (`KeyboardShortcutActions`), em vez de
 * importar o singleton do store diretamente. O App liga esses callbacks às
 * ações do Presentation Store.
 *
 * Mapeamento de teclas (requisito 7):
 *  - `ArrowRight` → `next`         (avançar Tour_Step — req. 7.1/7.2)
 *  - `ArrowLeft`  → `prev`         (retroceder Tour_Step — req. 7.3/7.4)
 *  - `Space`      → `next`         (avançar — req. 7.5; `preventDefault` p/ não rolar a página)
 *  - `f` / `F`    → `toggleFullscreen` (alternar tela cheia — req. 7.6)
 *  - `n` / `N`    → `toggleNotes`  (alternar notas — req. 7.7)
 *  - `r` / `R`    → `resetCamera`  (reset de câmera — req. 7.8)
 *
 * Gating em campos editáveis (req. 7.9): quando o foco está em um `<input>`
 * textual, `<textarea>` ou elemento `contenteditable`, TODAS as teclas mapeadas
 * são ignoradas — o apresentador está digitando, não navegando.
 *
 * SSR/jsdom-safe: todo acesso a `window`/`document` é guardado por
 * `typeof window !== 'undefined'`.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_
 */

import { useEffect } from 'react';

/**
 * Comandos acionáveis pelos atalhos de teclado. O App liga cada callback à
 * ação correspondente do Presentation Store (`next`, `prev`, `resetCamera`,
 * `toggleNotes`) e ao toggle de tela cheia (`useFullscreen`).
 *
 * Todos os campos são opcionais: um atalho sem callback definido é
 * simplesmente ignorado (permite wiring parcial em testes).
 */
export interface KeyboardShortcutActions {
  /** Avançar para o próximo Tour_Step (ArrowRight / Space — req. 7.1/7.5). */
  next?(): void;
  /** Retroceder para o Tour_Step anterior (ArrowLeft — req. 7.3). */
  prev?(): void;
  /** Alternar o modo de tela cheia (F — req. 7.6). */
  toggleFullscreen?(): void;
  /** Alternar a visibilidade das notas do apresentador (N — req. 7.7). */
  toggleNotes?(): void;
  /** Acionar o reset de câmera (R — req. 7.8). */
  resetCamera?(): void;
}

/** Tipos de `<input>` considerados textuais/editáveis para o gating (req. 7.9). */
const EDITABLE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** Tipos de `<input>` NÃO textuais (botões, seletores) — não bloqueiam atalhos. */
const NON_EDITABLE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * Indica se o alvo do evento é um campo de entrada de texto editável.
 *
 * Retorna `true` para:
 *  - `<textarea>`;
 *  - `<input>` de tipo textual (text, search, email, url, tel, password,
 *    number, date/time variants, …). Um `<input>` sem `type` explícito é
 *    tratado como `text` (comportamento padrão do HTML);
 *  - qualquer elemento com `contenteditable` ativo (`isContentEditable`).
 *
 * Retorna `false` para `<input>` não textuais (checkbox, radio, button, …),
 * elementos não editáveis e `null`.
 *
 * Função pura (sem efeitos colaterais), exportada para teste direto
 * (Property 22, requisito 7.9).
 *
 * @param el Alvo do evento (tipicamente `event.target`), ou `null`.
 * @returns `true` se o foco está em um campo de texto editável.
 */
export function isEditableTarget(el: EventTarget | null): boolean {
  // Só elementos do DOM podem ser editáveis; descarta `null` e não-elementos
  // sem depender da existência global de `HTMLElement` (SSR-safe).
  if (el === null || typeof el !== 'object') {
    return false;
  }

  const node = el as Partial<HTMLElement> & {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
  };

  // `contenteditable` (inclui elementos herdando de um ancestral editável).
  if (node.isContentEditable === true) {
    return true;
  }

  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';

  if (tag === 'TEXTAREA') {
    return true;
  }

  if (tag === 'INPUT') {
    const rawType = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    // `<input>` sem type => 'text' (editável).
    if (rawType === '') {
      return true;
    }
    if (NON_EDITABLE_INPUT_TYPES.has(rawType)) {
      return false;
    }
    if (EDITABLE_INPUT_TYPES.has(rawType)) {
      return true;
    }
    // Tipos desconhecidos: o navegador degrada para um campo de texto, então
    // tratamos como editável por segurança (evita disparar atalhos ao digitar).
    return true;
  }

  return false;
}

/**
 * Resolve o comando a acionar a partir de um `KeyboardEvent`, sem executá-lo.
 *
 * Retorna a chave da ação correspondente (`'next' | 'prev' |
 * 'toggleFullscreen' | 'toggleNotes' | 'resetCamera'`) ou `null` quando a tecla
 * não é mapeada. Não considera o gating de campos editáveis — quem chama decide.
 *
 * Exportada para teste unitário do roteamento de teclas (req. 7.1–7.8).
 *
 * @param event O evento de teclado.
 * @returns A chave da ação mapeada, ou `null`.
 */
export function resolveShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code'>,
): keyof KeyboardShortcutActions | null {
  const { key } = event;

  switch (key) {
    case 'ArrowRight':
      return 'next';
    case 'ArrowLeft':
      return 'prev';
    // `Space` produz `key === ' '`; `event.code === 'Space'` como reforço.
    case ' ':
    case 'Spacebar': // navegadores legados
      return 'next';
    default:
      break;
  }

  if (event.code === 'Space') {
    return 'next';
  }

  switch (key.toLowerCase()) {
    case 'f':
      return 'toggleFullscreen';
    case 'n':
      return 'toggleNotes';
    case 'r':
      return 'resetCamera';
    default:
      return null;
  }
}

/**
 * Hook React que registra um listener global de `keydown` e roteia as teclas de
 * apresentação para os comandos fornecidos.
 *
 * Comportamento:
 *  - Ignora eventos cujo alvo seja um campo de texto editável (req. 7.9).
 *  - Ignora combinações com teclas modificadoras (Ctrl/Meta/Alt) para não
 *    sequestrar atalhos do sistema/navegador; `Shift` é tolerado (ex.: 'F').
 *  - Para a tecla de espaço, chama `preventDefault()` para evitar a rolagem da
 *    página (req. 7.5).
 *  - O clamp de fronteira (não avançar além do último passo — req. 7.2/7.4)
 *    é responsabilidade das ações do store (`next`/`prev` já fazem clamp).
 *
 * O `enabled` permite desativar os atalhos (ex.: quando o Tour_Data é inválido
 * e o tour não inicia). SSR/jsdom-safe: não registra listener se `window` não
 * existe.
 *
 * @param actions Callbacks ligados às ações do store (ver {@link KeyboardShortcutActions}).
 * @param enabled Se `false`, o hook não registra o listener. Padrão `true`.
 */
export function useKeyboardShortcuts(
  actions: KeyboardShortcutActions,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      // Não interferir em atalhos do sistema/navegador.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Gating: ignorar todas as teclas mapeadas quando digitando (req. 7.9).
      if (isEditableTarget(event.target)) {
        return;
      }

      const action = resolveShortcut(event);
      if (action === null) {
        return;
      }

      // Evita a rolagem da página ao usar a barra de espaço (req. 7.5) e o
      // scroll horizontal com as setas.
      if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
      }

      const handler = actions[action];
      if (typeof handler === 'function') {
        handler();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actions, enabled]);
}

export default useKeyboardShortcuts;
