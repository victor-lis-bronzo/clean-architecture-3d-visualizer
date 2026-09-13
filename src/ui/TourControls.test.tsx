/**
 * Teste de exemplo da troca de texto do UI_Overlay (tarefa 11.3).
 *
 * Verifica, com `@testing-library/react` sobre o DOM (jsdom), que ao mudar o
 * passo ativo do tour:
 *  - o `TourControls` atualiza o título e o texto explicativo do passo
 *    (req. 4.7 — o conteúdo do passo anterior é substituído pelo do novo passo);
 *  - o indicador de posição reflete "N de 8" corretamente (req. 4.9);
 *  - o `PresenterNotesPanel`, quando visível, atualiza as notas exibidas para
 *    as do passo ativo (req. 8.5), e não renderiza nada quando oculto.
 *
 * Estratégia de teste:
 *  - `TourControls` lê o singleton `presentationStore` diretamente (não aceita
 *    prop de store), então a navegação é dirigida chamando as ações do store
 *    (`next()`/`prev()`) dentro de `act()`, e o DOM é asserido em seguida.
 *  - `PresenterNotesPanel` aceita uma prop `store` injetável; para manter o
 *    teste alinhado ao comportamento real do overlay, usamos o mesmo singleton.
 *  - Após cada teste, o singleton é restaurado ao estado inicial (passo 1,
 *    notas ocultas, sem transição) para evitar vazamento entre testes.
 *
 * A fonte de verdade dos textos esperados é o `TOUR_DATA` real, garantindo que
 * o teste valide o mapeamento efetivo passo → conteúdo exibido.
 *
 * _Requirements: 4.7, 4.9, 8.5_
 */

import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

import TourControls from './TourControls';
import PresenterNotesPanel from './PresenterNotesPanel';
import { presentationStore } from '../state/presentation-store';
import { TOUR_DATA } from '../tour-data/tour-data';
import { resolveNotesContent } from '../state/notes';

/** Passos de referência (índices 0 e 1 → orders 1 e 2). */
const STEP_1 = TOUR_DATA[0];
const STEP_2 = TOUR_DATA[1];

/** Restaura o singleton ao estado inicial (passo 1, notas ocultas, sem transição). */
function resetStore(): void {
  act(() => {
    presentationStore.setState({
      activeStepOrder: 1,
      notesVisible: false,
      transition: { isTransitioning: false },
    });
  });
}

afterEach(() => {
  cleanup();
  resetStore();
});

describe('TourControls — troca de título/texto do overlay (Requirements 4.7)', () => {
  it('exibe título/texto do passo 1 e passa a exibir os do passo 2 ao avançar', () => {
    resetStore();
    render(<TourControls />);

    // Passo 1 inicial: título e texto do TOUR_DATA[0] estão no DOM.
    expect(
      screen.getByRole('heading', { name: STEP_1.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(STEP_1.body)).toBeInTheDocument();

    // O conteúdo do passo 2 ainda NÃO está visível.
    expect(
      screen.queryByRole('heading', { name: STEP_2.title }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(STEP_2.body)).not.toBeInTheDocument();

    // Avança o passo ativo pelo store (TourControls lê o singleton).
    act(() => {
      presentationStore.getState().next();
    });

    // Agora o título/texto do passo 2 substituem os do passo 1 (req. 4.7).
    expect(
      screen.getByRole('heading', { name: STEP_2.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(STEP_2.body)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: STEP_1.title }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(STEP_1.body)).not.toBeInTheDocument();
  });
});

describe('TourControls — indicador "N de 8" (Requirements 4.9)', () => {
  it('mostra "1 de 8" inicialmente e "2 de 8" após avançar', () => {
    resetStore();
    render(<TourControls />);

    expect(screen.getByText('1 de 8')).toBeInTheDocument();

    act(() => {
      presentationStore.getState().next();
    });

    expect(screen.getByText('2 de 8')).toBeInTheDocument();
    expect(screen.queryByText('1 de 8')).not.toBeInTheDocument();
  });

  it('não exibe o indicador quando showProgress é false', () => {
    resetStore();
    render(<TourControls showProgress={false} />);

    expect(screen.queryByText('1 de 8')).not.toBeInTheDocument();
    // Título/texto continuam visíveis.
    expect(
      screen.getByRole('heading', { name: STEP_1.title }),
    ).toBeInTheDocument();
  });
});

describe('PresenterNotesPanel — atualização das notas ao mudar de passo (Requirements 8.5)', () => {
  it('quando visível, exibe as notas do passo 1 e passa às do passo 2 ao avançar', () => {
    resetStore();
    // Torna o painel visível antes de renderizar.
    act(() => {
      presentationStore.setState({ notesVisible: true });
    });

    render(<PresenterNotesPanel store={presentationStore} />);

    const panel = screen.getByRole('complementary', {
      name: 'Notas do apresentador',
    });
    // Passo 1: as notas resolvidas do TOUR_DATA[0] estão no painel.
    expect(
      within(panel).getByText(resolveNotesContent(STEP_1.notes)),
    ).toBeInTheDocument();

    // Avança o passo ativo: o painel deve refletir as notas do passo 2 (req. 8.5).
    act(() => {
      presentationStore.getState().next();
    });

    const panelAfter = screen.getByRole('complementary', {
      name: 'Notas do apresentador',
    });
    expect(
      within(panelAfter).getByText(resolveNotesContent(STEP_2.notes)),
    ).toBeInTheDocument();
    expect(
      within(panelAfter).queryByText(resolveNotesContent(STEP_1.notes)),
    ).not.toBeInTheDocument();
  });

  it('não renderiza nada quando notesVisible é false', () => {
    resetStore(); // notesVisible = false
    const { container } = render(
      <PresenterNotesPanel store={presentationStore} />,
    );

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByRole('complementary', { name: 'Notas do apresentador' }),
    ).not.toBeInTheDocument();
  });
});
