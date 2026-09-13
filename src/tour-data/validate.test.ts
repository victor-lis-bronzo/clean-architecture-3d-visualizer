/**
 * Testes de propriedade do validador do Tour_Data (`validateTourData`).
 *
 * Cobre as Correctness Properties 20 e 21 do design:
 * - Property 20: dados válidos dentro de todos os limites são aceitos
 *   (lista de erros vazia). Validates: Requirements 5.2.
 * - Property 21: dados inválidos (uma violação injetada) são rejeitados com
 *   localização do erro (`stepOrder` + `field`), com `field = 'focusLayer'`
 *   no caso de Layer inexistente. Validates: Requirements 5.3, 5.4.
 *
 * Usa fast-check com >=100 iterações por propriedade (`{ numRuns: 100 }`).
 */
import * as fc from 'fast-check';
import { validateTourData } from './validate';
import { LAYER_ORDER, type CameraConfig, type Layer, type TourStep } from './types';

/** Gera um número finito "razoável" para coordenadas de câmera. */
const arbFiniteNumber = fc.double({
  min: -1e6,
  max: 1e6,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Gera um Vec3 de números finitos. */
const arbVec3 = fc.tuple(arbFiniteNumber, arbFiniteNumber, arbFiniteNumber);

/** Gera uma CameraConfig com vetores finitos. */
const arbCamera: fc.Arbitrary<CameraConfig> = fc.record({
  position: arbVec3,
  target: arbVec3,
});

/** Gera uma Layer pertencente a LAYER_ORDER. */
const arbLayer: fc.Arbitrary<Layer> = fc.constantFrom(...LAYER_ORDER);

/**
 * Gera um Tour_Data válido dentro de TODOS os limites (Property 20):
 * - 1..50 registros;
 * - `order` formando exatamente 1..N (sequencial, único, sem lacunas);
 * - `title` 1..80; `body` 1..1000; `notes` 0..2000;
 * - `focusLayer` ∈ LAYER_ORDER; `camera` com vetores finitos.
 *
 * A sequência de `order` é atribuída de 1..N na construção, garantindo por
 * construção a invariante de sequência, deixando fast-check variar os demais
 * campos dentro dos limites.
 */
const arbTourData: fc.Arbitrary<TourStep[]> = fc
  .integer({ min: 1, max: 50 })
  .chain((count) =>
    fc.tuple(
      fc.array(fc.string({ minLength: 1, maxLength: 80 }), {
        minLength: count,
        maxLength: count,
      }),
      fc.array(fc.string({ minLength: 1, maxLength: 1000 }), {
        minLength: count,
        maxLength: count,
      }),
      fc.array(fc.string({ minLength: 0, maxLength: 2000 }), {
        minLength: count,
        maxLength: count,
      }),
      fc.array(arbLayer, { minLength: count, maxLength: count }),
      fc.array(arbCamera, { minLength: count, maxLength: count }),
    ).map(([titles, bodies, notes, layers, cameras]) =>
      Array.from({ length: count }, (_, i) => ({
        order: i + 1,
        title: titles[i],
        body: bodies[i],
        focusLayer: layers[i],
        camera: cameras[i],
        notes: notes[i],
      })),
    ),
  );

describe('validateTourData — Property 20: dados válidos são aceitos', () => {
  // Feature: clean-architecture-3d-visualizer, Property 20: Dados válidos do Tour_Data são aceitos — Para qualquer Tour_Data gerado dentro dos limites (1..50 registros; order formando exatamente 1..N sem lacunas nem duplicatas; title 1..80; body 1..1000; notes 0..2000; focusLayer ∈ LAYER_ORDER; camera com vetores finitos), validateTourData retorna uma lista de erros vazia.
  it('aceita qualquer Tour_Data dentro de todos os limites (lista de erros vazia)', () => {
    fc.assert(
      fc.property(arbTourData, (data) => {
        const errors = validateTourData(data);
        expect(errors).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});

/** Tipos de violação que podem ser injetadas em um dado válido. */
type Violation =
  | 'missingRequired'
  | 'emptyRequired'
  | 'titleTooLong'
  | 'bodyTooLong'
  | 'notesTooLong'
  | 'orderOutOfBounds'
  | 'duplicateOrder'
  | 'nonSequentialOrder'
  | 'invalidLayer';

const arbViolation: fc.Arbitrary<Violation> = fc.constantFrom(
  'missingRequired',
  'emptyRequired',
  'titleTooLong',
  'bodyTooLong',
  'notesTooLong',
  'orderOutOfBounds',
  'duplicateOrder',
  'nonSequentialOrder',
  'invalidLayer',
);

/**
 * Gera um Tour_Data inválido (Property 21): parte de dados válidos e injeta
 * EXATAMENTE uma violação em um passo escolhido, retornando também metadados
 * (índice afetado e o tipo de violação) para permitir asserts precisos.
 */
const arbInvalidTourData = arbTourData.chain((valid) =>
  fc
    .tuple(fc.nat({ max: valid.length - 1 }), arbViolation)
    .map(([index, violation]) => {
      // Clona superficialmente os passos para não mutar o dado original.
      const steps: Array<Record<string, unknown>> = valid.map((s) => ({ ...s }));
      const target = steps[index];
      const originalOrder = target.order as number;

      switch (violation) {
        case 'missingRequired':
          // Remove um campo obrigatório (title).
          delete target.title;
          break;
        case 'emptyRequired':
          // title vazio viola o mínimo de 1 caractere.
          target.title = '';
          break;
        case 'titleTooLong':
          target.title = 'x'.repeat(81);
          break;
        case 'bodyTooLong':
          target.body = 'x'.repeat(1001);
          break;
        case 'notesTooLong':
          target.notes = 'x'.repeat(2001);
          break;
        case 'orderOutOfBounds':
          // order = 0 está fora de [1, 50].
          target.order = 0;
          break;
        case 'duplicateOrder':
          if (steps.length >= 2) {
            const otherIndex = index === 0 ? 1 : 0;
            target.order = steps[otherIndex].order;
          } else {
            // Com um único passo não há como duplicar; usa order fora de sequência.
            target.order = 99;
          }
          break;
        case 'nonSequentialOrder':
          // Desloca a ordem para criar lacuna/não-sequencialidade.
          target.order = valid.length + 5;
          break;
        case 'invalidLayer':
          target.focusLayer = 'Nonexistent_Layer';
          break;
      }

      return { steps, index, violation, originalOrder };
    }),
);

describe('validateTourData — Property 21: dados inválidos são rejeitados com localização', () => {
  // Feature: clean-architecture-3d-visualizer, Property 21: Dados inválidos do Tour_Data são rejeitados com localização do erro — Para qualquer Tour_Data que viole ao menos uma regra (campo obrigatório ausente/vazio, valor fora dos limites, order duplicado ou não sequencial, ou focusLayer fora de LAYER_ORDER), validateTourData retorna ao menos um TourDataError que identifica o stepOrder afetado e o field inválido; no caso específico de Layer inexistente, o erro reporta field = 'focusLayer'.
  it('rejeita dados com uma violação e localiza o stepOrder/field afetados', () => {
    fc.assert(
      fc.property(arbInvalidTourData, ({ steps, violation, originalOrder }) => {
        const errors = validateTourData(steps);

        // Ao menos um erro deve ser reportado.
        expect(errors.length).toBeGreaterThanOrEqual(1);

        // Todo erro deve carregar um `field` não vazio (localização do campo).
        for (const err of errors) {
          expect(typeof err.field).toBe('string');
          expect(err.field.length).toBeGreaterThan(0);
        }

        switch (violation) {
          case 'invalidLayer': {
            // Caso específico do req. 5.4: field === 'focusLayer' e stepOrder afetado.
            const layerErr = errors.find((e) => e.field === 'focusLayer');
            expect(layerErr).toBeDefined();
            expect(layerErr?.stepOrder).toBe(originalOrder);
            break;
          }
          case 'missingRequired':
          case 'emptyRequired':
          case 'titleTooLong': {
            const err = errors.find((e) => e.field === 'title');
            expect(err).toBeDefined();
            expect(err?.stepOrder).toBe(originalOrder);
            break;
          }
          case 'bodyTooLong': {
            const err = errors.find((e) => e.field === 'body');
            expect(err).toBeDefined();
            expect(err?.stepOrder).toBe(originalOrder);
            break;
          }
          case 'notesTooLong': {
            const err = errors.find((e) => e.field === 'notes');
            expect(err).toBeDefined();
            expect(err?.stepOrder).toBe(originalOrder);
            break;
          }
          case 'orderOutOfBounds': {
            const err = errors.find((e) => e.field === 'order');
            expect(err).toBeDefined();
            break;
          }
          case 'duplicateOrder':
          case 'nonSequentialOrder': {
            // Violações de sequência são reportadas no campo 'order'.
            const err = errors.find((e) => e.field === 'order');
            expect(err).toBeDefined();
            break;
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
