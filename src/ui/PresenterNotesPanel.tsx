/**
 * PresenterNotesPanel — painel de notas do apresentador (req. 8).
 *
 * Componente do domínio `ui/` (2D). Conforme a Regra da Dependência
 * (requisito 5.1), NÃO importa nada de `scene/` (3D); importa apenas de `state/`
 * (store + seletores) e React. A resolução do conteúdo (truncamento, estado
 * vazio) vive nas funções puras de `state/notes.ts`, expostas via o seletor
 * `getVisibleNotes` — este componente apenas as renderiza.
 *
 * Comportamento:
 *  - Renderiza somente quando `notesVisible` é `true`; inicia oculto
 *    (req. 8.6) — quando oculto, `getVisibleNotes` retorna `null` e o painel
 *    não é exibido.
 *  - Exibe as notas do passo ativo, truncadas em 5.000 caracteres com indicador
 *    (req. 8.3), via `getVisibleNotes` / `resolveNotesContent`.
 *  - Exibe a mensagem de estado vazio quando o passo não possui notas
 *    (req. 8.4) — coberto por `resolveNotesContent`.
 *  - Atualiza o conteúdo automaticamente quando o passo ativo muda (req. 8.5),
 *    pois lê `activeStepOrder` do store reativo.
 *  - Oferece uma afordância de fechar que aciona `toggleNotes` (req. 8.2).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
 */

import { useStore } from 'zustand';

import { presentationStore } from '../state/presentation-store';
import { getVisibleNotes } from '../state/selectors';

/**
 * Painel de notas do apresentador.
 *
 * O parâmetro `store` é injetável para facilitar testes isolados; por padrão
 * usa o singleton `presentationStore` da aplicação.
 */
export default function PresenterNotesPanel({
  store = presentationStore,
}: {
  store?: typeof presentationStore;
}) {
  // Reage tanto a `notesVisible` quanto a `activeStepOrder`: o seletor combina
  // ambos e devolve `null` quando o painel está oculto (req. 8.6) e o conteúdo
  // resolvido (truncado / estado vazio) quando visível (req. 8.3/8.4/8.5).
  const notes = useStore(store, (s) =>
    getVisibleNotes({
      activeStepOrder: s.activeStepOrder,
      notesVisible: s.notesVisible,
    }),
  );
  const toggleNotes = useStore(store, (s) => s.toggleNotes);

  // Oculto (req. 8.6) ou passo não resolvido → não renderiza o painel.
  if (notes === null) {
    return null;
  }

  return (
    <aside
      aria-label="Notas do apresentador"
      className="tour-scroll flex max-h-[30vh] w-full max-w-md flex-col gap-2 overflow-y-auto rounded-md bg-black/60 p-4 text-sm text-gray-100 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Notas do apresentador
        </h2>
        <button
          type="button"
          onClick={() => toggleNotes()}
          className="rounded px-2 py-0.5 text-xs text-gray-300 hover:bg-white/10"
          aria-label="Ocultar notas do apresentador"
        >
          Fechar
        </button>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{notes}</p>
    </aside>
  );
}
