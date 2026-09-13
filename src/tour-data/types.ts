/**
 * Tipos base do domínio Tour_Data — o núcleo puro da aplicação.
 *
 * Este módulo é a materialização da Dependency_Rule: NÃO importa nada de
 * `scene/`, `ui/`, `state/` nem de React/Three.js. Contém apenas tipos e
 * constantes de dados puras (requisito 5.1).
 */

/** Vetor 3D imutável. */
export type Vec3 = readonly [x: number, y: number, z: number];

/** Identificadores válidos de Layer (conjunto fechado). */
export type Layer =
  | 'Entities'
  | 'Use_Cases'
  | 'Interface_Adapters'
  | 'Frameworks_And_Drivers';

/**
 * Ordem das Layers do raio menor (interna) ao raio maior (externa).
 * `Entities` é a esfera mais interna; `Frameworks_And_Drivers` a mais externa.
 */
export const LAYER_ORDER: readonly Layer[] = [
  'Entities', // raio menor (interna)
  'Use_Cases',
  'Interface_Adapters',
  'Frameworks_And_Drivers', // raio maior (externa)
] as const;

/** Configuração de câmera de um Tour_Step: posição e ponto de mira. */
export interface CameraConfig {
  /** Posição da câmera. */
  position: Vec3;
  /** Ponto de mira (lookAt). */
  target: Vec3;
}

/** Um passo do tour guiado "CriarPedido". */
export interface TourStep {
  /** Inteiro único 1..50, sequencial sem lacunas (req. 5.2). */
  order: number;
  /** Título do passo (1..80 caracteres). */
  title: string;
  /** Texto explicativo do passo (1..1000 caracteres). */
  body: string;
  /** Layer em foco — referência a uma Layer existente (req. 5.4). */
  focusLayer: Layer;
  /**
   * Quando `true`, o passo é uma visão geral (overview): a câmera se afasta
   * para enquadrar todas as camadas e NENHUMA Layer é destacada individualmente
   * (evita sugerir que a síntese "é" uma camada específica). `focusLayer`
   * continua obrigatório (usado para validação e direção de partículas), mas o
   * destaque é suprimido neste modo.
   */
  overview?: boolean;
  /** Configuração de câmera: posição + alvo. */
  camera: CameraConfig;
  /** Notas do apresentador (0..2000 caracteres). */
  notes: string;
}

/** Estrutura estática do tour: 1..50 registros (req. 5.2). */
export type TourData = readonly TourStep[];

/** Estados possíveis do Presentation_Timer. */
export type TimerStatus = 'idle' | 'running' | 'paused';

/** Estado do timer de apresentação. */
export interface TimerState {
  status: TimerStatus;
  /** Tempo decorrido em segundos; >= 0, não limitado a 30:00 (req. 6.8). */
  elapsedSec: number;
}

/** Erro de validação do Tour_Data, exibível ao usuário. */
export interface TourDataError {
  /** Qual Tour_Step (null se for um erro global). */
  stepOrder: number | null;
  /** Qual campo é inválido. */
  field: string;
  /** Mensagem exibível ao usuário. */
  message: string;
}
