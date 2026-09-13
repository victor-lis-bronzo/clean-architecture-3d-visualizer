/**
 * Teste de exemplo do Tour_Data real do caso de uso "CriarPedido".
 *
 * Cobre a tarefa 2.6 (Requirements 4.1): verifica que os dados estáticos reais
 * (`TOUR_DATA`) passam por `validateTourData` sem erros, têm exatamente 8
 * passos com `order` 1..8 sequencial, e que a sequência de `focusLayer` segue
 * o mapeamento definido na seção Data Models do design.
 */
import { TOUR_DATA } from './tour-data';
import { validateTourData } from './validate';
import type { Layer } from './types';

describe('TOUR_DATA — "CriarPedido" (Requirements 4.1)', () => {
  it('passa por validateTourData sem erros', () => {
    expect(validateTourData(TOUR_DATA)).toEqual([]);
  });

  it('contém exatamente 8 passos', () => {
    expect(TOUR_DATA).toHaveLength(8);
  });

  it('tem order 1..8 sequencial e sem lacunas', () => {
    const orders = TOUR_DATA.map((step) => step.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('segue o mapeamento de focusLayer do design', () => {
    // Mapeamento da tabela Data Models do design:
    // 1 F&D, 2 F&D, 3 IA, 4 IA, 5 Use Cases, 6 Entities, 7 IA, 8 Entities.
    const expectedLayers: readonly Layer[] = [
      'Frameworks_And_Drivers',
      'Frameworks_And_Drivers',
      'Interface_Adapters',
      'Interface_Adapters',
      'Use_Cases',
      'Entities',
      'Interface_Adapters',
      'Entities',
    ];
    const actualLayers = TOUR_DATA.map((step) => step.focusLayer);
    expect(actualLayers).toEqual(expectedLayers);
  });
});
