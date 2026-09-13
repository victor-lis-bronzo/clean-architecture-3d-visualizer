/**
 * ConcentricSpheres — as quatro esferas concêntricas da Clean Architecture.
 *
 * Renderiza exatamente uma esfera por Layer de `LAYER_ORDER` (4 no total),
 * com raios estritamente crescentes de `Entities` (mais interna) a
 * `Frameworks_And_Drivers` (mais externa) — requisitos 1.1 e 1.2.
 *
 * Cada esfera:
 *  - usa geometria com **corte de seção de 90°** (`phiLength = 1.5π`), expondo
 *    a superfície interior a partir da câmera (req. 1.4). Os parâmetros vêm do
 *    helper puro `sphereCutParamsForLayer`;
 *  - recebe uma **cor única e distinta** da `LAYER_PALETTE` (req. 1.3);
 *  - usa um material **PBR** (`meshStandardMaterial`), com
 *    `side = THREE.DoubleSide` para renderizar a face interna da esfera aberta
 *    (req. 1.3/1.4);
 *  - as Layers mais internas são mais "metálicas/sólidas" e as mais externas
 *    mais translúcidas, conforme a intenção de material do design;
 *  - aplica um **destaque visual exclusivo** (emissive + opacidade elevada) à
 *    Layer em foco do Tour_Step ativo, lido do store, e remove o destaque das
 *    demais (req. 4.8).
 *
 * Regra da Dependência (req. 5.1): pertence a `scene/`; importa apenas de
 * `scene/`, `state/`, `tour-data/`, `three` e R3F. NÃO importa de `ui/`.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from 'zustand';

import { LAYER_ORDER, type Layer } from '../tour-data/types';
import { LAYER_PALETTE } from '../tour-data/palette';
import { presentationStore } from '../state/presentation-store';
import { getHighlight } from '../state/selectors';
import { sphereCutParamsForLayer } from './geometry';

/** Props de uma única esfera de Layer. */
interface LayerSphereProps {
  /** Layer representada por esta esfera. */
  layer: Layer;
  /** Índice da Layer em `LAYER_ORDER` (0 = mais interna). */
  index: number;
  /** `true` se esta Layer é a que está em foco no passo ativo (req. 4.8). */
  highlighted: boolean;
}

/**
 * Opacidade base da esfera conforme a profundidade da Layer: as mais internas
 * são mais opacas/sólidas, as mais externas mais translúcidas (intenção de
 * material do design). Interpola linearmente de ~0,9 (interna) a ~0,45
 * (externa).
 */
function baseOpacityFor(index: number, total: number): number {
  if (total <= 1) {
    return 0.9;
  }
  const t = index / (total - 1); // 0 (interna) .. 1 (externa)
  return 0.9 - t * 0.45;
}

/**
 * Metalicidade conforme a profundidade: núcleo mais metálico, camadas externas
 * menos metálicas.
 */
function metalnessFor(index: number, total: number): number {
  if (total <= 1) {
    return 0.6;
  }
  const t = index / (total - 1);
  return 0.6 - t * 0.4; // 0.6 (interna) .. 0.2 (externa)
}

/** Uma esfera concêntrica de uma Layer, com corte de 90° e material PBR. */
function LayerSphere({ layer, index, highlighted }: LayerSphereProps) {
  const params = useMemo(() => sphereCutParamsForLayer(layer), [layer]);
  const color = LAYER_PALETTE[layer];
  const total = LAYER_ORDER.length;

  const baseOpacity = baseOpacityFor(index, total);
  // A Layer em destaque fica mais opaca/visível; as demais mantêm a base.
  const opacity = highlighted ? Math.min(1, baseOpacity + 0.25) : baseOpacity;
  // Intensidade do emissive: forte no destaque, sutil (leve brilho) fora dele.
  const emissiveIntensity = highlighted ? 0.9 : 0.05;

  return (
    <mesh>
      <sphereGeometry
        args={[
          params.radius,
          params.widthSegments,
          params.heightSegments,
          params.phiStart,
          params.phiLength,
          params.thetaStart,
          params.thetaLength,
        ]}
      />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        metalness={metalnessFor(index, total)}
        roughness={0.4}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Grupo com as quatro esferas concêntricas.
 *
 * Lê o mapa de destaque do passo ativo diretamente do store (via `useStore`
 * do zustand sobre a instância vanilla), de modo que a mudança de passo
 * atualize o destaque exclusivo da Layer em foco (req. 4.8). Renderiza uma
 * esfera por Layer, na ordem de `LAYER_ORDER`.
 */
export default function ConcentricSpheres() {
  const activeStepOrder = useStore(
    presentationStore,
    (s) => s.activeStepOrder,
  );

  // Mapa de destaque exclusivo da Layer em foco do passo ativo (req. 4.8).
  const highlight = useMemo(
    () => getHighlight({ activeStepOrder }),
    [activeStepOrder],
  );

  return (
    <group>
      {LAYER_ORDER.map((layer, index) => (
        <LayerSphere
          key={layer}
          layer={layer}
          index={index}
          highlighted={highlight ? highlight[layer] : false}
        />
      ))}
    </group>
  );
}
