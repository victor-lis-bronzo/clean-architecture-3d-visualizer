/**
 * Validador do Tour_Data — módulo puro do núcleo.
 *
 * Materializa a Dependency_Rule (requisito 5.1): importa apenas `zod` e os
 * tipos de `./types`. NÃO importa nada de `scene/`, `ui/`, `state/`,
 * `platform/` nem de React/Three.js.
 *
 * Cobre (req. 5.2/5.3/5.4):
 * - Limites de campo via Zod (title 1..80, body 1..1000, notes 0..2000,
 *   order inteiro 1..50, focusLayer ∈ LAYER_ORDER, camera com Vec3 finitos).
 * - Total de registros: 1..50.
 * - Sequência de `order`: o conjunto ordenado deve ser exatamente `1..N`
 *   (sequencial, sem lacunas nem duplicatas).
 * - Referência de `focusLayer` a uma Layer existente (erro com
 *   `field = 'focusLayer'` para Layer inexistente).
 *
 * `validateTourData` retorna a lista de `TourDataError` (vazia = válido).
 * Cada erro identifica o `stepOrder` afetado (null para erros globais) e o
 * `field` inválido, com mensagem exibível em pt-BR.
 */

import { z } from 'zod';
import { LAYER_ORDER, type Layer, type TourDataError } from './types';

/** Total mínimo/máximo de registros de Tour_Step (req. 5.2). */
const MIN_RECORDS = 1;
const MAX_RECORDS = 50;

/** Limites do identificador de ordem (req. 5.2). */
const MIN_ORDER = 1;
const MAX_ORDER = 50;

/** Limites de comprimento dos campos textuais (req. 5.2). */
const TITLE_MIN = 1;
const TITLE_MAX = 80;
const BODY_MIN = 1;
const BODY_MAX = 1000;
const NOTES_MIN = 0;
const NOTES_MAX = 2000;

/** Schema de um Vec3: tupla de exatamente 3 números finitos. */
const vec3Schema = z.tuple([
  z.number().finite('coordenada deve ser um número finito'),
  z.number().finite('coordenada deve ser um número finito'),
  z.number().finite('coordenada deve ser um número finito'),
]);

/** Schema da configuração de câmera: posição + alvo, ambos Vec3 finitos. */
const cameraSchema = z.object({
  position: vec3Schema,
  target: vec3Schema,
});

/** Schema de uma Layer (conjunto fechado derivado de LAYER_ORDER). */
const layerSchema = z.enum(LAYER_ORDER as unknown as [Layer, ...Layer[]]);

/** Schema de um Tour_Step com todos os limites de campo (req. 5.2). */
const stepSchema = z.object({
  order: z
    .number()
    .int('order deve ser um número inteiro')
    .min(MIN_ORDER, `order deve ser >= ${MIN_ORDER}`)
    .max(MAX_ORDER, `order deve ser <= ${MAX_ORDER}`),
  title: z
    .string()
    .min(TITLE_MIN, `title deve ter no mínimo ${TITLE_MIN} caractere`)
    .max(TITLE_MAX, `title deve ter no máximo ${TITLE_MAX} caracteres`),
  body: z
    .string()
    .min(BODY_MIN, `body deve ter no mínimo ${BODY_MIN} caractere`)
    .max(BODY_MAX, `body deve ter no máximo ${BODY_MAX} caracteres`),
  focusLayer: layerSchema,
  camera: cameraSchema,
  notes: z
    .string()
    .min(NOTES_MIN)
    .max(NOTES_MAX, `notes deve ter no máximo ${NOTES_MAX} caracteres`),
});

/** Schema do Tour_Data completo: array de 1..50 registros (req. 5.2). */
const tourDataSchema = z
  .array(stepSchema)
  .min(MIN_RECORDS, `Tour_Data deve conter ao menos ${MIN_RECORDS} registro`)
  .max(MAX_RECORDS, `Tour_Data deve conter no máximo ${MAX_RECORDS} registros`);

/**
 * Tenta resolver o `stepOrder` de um registro a partir do dado bruto, para
 * anexá-lo ao erro. Retorna `null` quando o `order` não é um número utilizável
 * (ex.: ausente ou de tipo inválido).
 */
function resolveStepOrder(record: unknown): number | null {
  if (typeof record === 'object' && record !== null && 'order' in record) {
    const raw = (record as { order: unknown }).order;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
  }
  return null;
}

/** Deriva um nome de campo legível a partir do caminho do issue do Zod. */
function fieldFromPath(path: ReadonlyArray<PropertyKey>): string {
  // path[0] é o índice do registro no array; o campo começa em path[1].
  const fieldParts = path.slice(1);
  if (fieldParts.length === 0) {
    return 'registro';
  }
  return fieldParts.map((segment) => String(segment)).join('.');
}

/**
 * Mapeia um issue do Zod para um `TourDataError`, resolvendo `stepOrder` e
 * `field`. `data` é o valor bruto usado para recuperar o `order` do registro.
 */
function issueToError(
  issue: z.core.$ZodIssue,
  data: unknown,
): TourDataError {
  const path = issue.path;
  const isArrayLevel = path.length === 0 || typeof path[0] !== 'number';

  if (isArrayLevel) {
    // Erro global do Tour_Data (ex.: não é array, tamanho fora dos limites).
    return {
      stepOrder: null,
      field: 'tourData',
      message: issue.message,
    };
  }

  const index = path[0] as number;
  const record = Array.isArray(data) ? data[index] : undefined;
  const stepOrder = resolveStepOrder(record);
  const field = fieldFromPath(path);
  const locator =
    stepOrder !== null ? `Tour_Step ${stepOrder}` : `Tour_Step no índice ${index}`;

  return {
    stepOrder,
    field,
    message: `${locator}: campo "${field}" inválido — ${issue.message}.`,
  };
}

/**
 * Valida a sequência de `order`: o conjunto deve ser exatamente `1..N`, sem
 * lacunas nem duplicatas (req. 5.2/5.3). Assume que cada `order` já passou na
 * validação de limites por campo. Retorna os erros de sequência encontrados.
 */
function validateOrderSequence(steps: ReadonlyArray<{ order: number }>): TourDataError[] {
  const errors: TourDataError[] = [];
  const n = steps.length;

  // Detecta duplicatas.
  const seen = new Map<number, number>();
  for (const step of steps) {
    seen.set(step.order, (seen.get(step.order) ?? 0) + 1);
  }
  for (const [order, count] of seen) {
    if (count > 1) {
      errors.push({
        stepOrder: order,
        field: 'order',
        message: `Tour_Step ${order}: identificador de ordem duplicado (aparece ${count} vezes). Os identificadores de ordem devem ser únicos.`,
      });
    }
  }

  // O conjunto ordenado deve ser exatamente 1..N (sem lacunas).
  const expected = new Set<number>();
  for (let i = 1; i <= n; i += 1) {
    expected.add(i);
  }
  for (const step of steps) {
    if (!expected.has(step.order)) {
      errors.push({
        stepOrder: step.order,
        field: 'order',
        message: `Tour_Step ${step.order}: identificador de ordem fora da sequência esperada de 1 a ${n} (a ordem deve ser sequencial, sem lacunas).`,
      });
    }
  }
  // Identifica lacunas explícitas (valores esperados ausentes).
  const present = new Set(steps.map((s) => s.order));
  for (let i = 1; i <= n; i += 1) {
    if (!present.has(i)) {
      errors.push({
        stepOrder: null,
        field: 'order',
        message: `A sequência de ordem tem uma lacuna: o identificador ${i} está ausente (esperado 1 a ${n} sem lacunas).`,
      });
    }
  }

  return errors;
}

/**
 * Valida os dados do Tour_Data.
 *
 * @param data Valor bruto (desconhecido) a validar.
 * @returns Lista de `TourDataError`; vazia significa dados válidos.
 */
export function validateTourData(data: unknown): TourDataError[] {
  const parsed = tourDataSchema.safeParse(data);

  if (!parsed.success) {
    // Erros de limite de campo / estrutura têm precedência: retorna-os
    // mapeados com stepOrder/field, sem tentar validar a sequência sobre
    // dados possivelmente malformados.
    return parsed.error.issues.map((issue) => issueToError(issue, data));
  }

  // Campos válidos: valida a sequência de order (1..N sem lacunas/duplicatas).
  return validateOrderSequence(parsed.data);
}
