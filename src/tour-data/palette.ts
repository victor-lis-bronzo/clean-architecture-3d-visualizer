/**
 * Paleta de cores fixa do Tour_Data — módulo puro do núcleo.
 *
 * Não importa nada de `scene/`, `ui/`, `state/` nem de React/Three.js
 * (Dependency_Rule / requisito 5.1). Define exatamente uma cor por Layer
 * (mutuamente distintas, requisito 1.3) e as faixas de cor do timer.
 */

import type { Layer } from './types';

/**
 * Exatamente uma cor por Layer, mutuamente distintas (req. 1.3).
 * Cores em formato hex.
 */
export const LAYER_PALETTE: Readonly<Record<Layer, string>> = {
  Entities: '#F2C94C', // amarelo-ouro (núcleo)
  Use_Cases: '#EB5757', // vermelho-coral
  Interface_Adapters: '#2D9CDB', // azul
  Frameworks_And_Drivers: '#27AE60', // verde
} as const;

/**
 * Faixas de cor do Presentation_Timer (req. 6.2/6.3/6.4/6.8).
 * Intervalos em segundos, semiabertos `[fromSec, toSec)`:
 * - verde:    [0, 1200)         → [00:00, 20:00)
 * - amarelo:  [1200, 1620)      → [20:00, 27:00)
 * - vermelho: [1620, Infinity)  → [27:00, ∞)
 */
export const TIMER_BANDS = {
  green: { fromSec: 0, toSec: 20 * 60, color: '#27AE60' },
  yellow: { fromSec: 20 * 60, toSec: 27 * 60, color: '#F2C94C' },
  red: { fromSec: 27 * 60, toSec: Infinity, color: '#EB5757' },
} as const;
