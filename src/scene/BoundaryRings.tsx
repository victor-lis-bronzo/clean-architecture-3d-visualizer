/**
 * BoundaryRings — os três anéis luminosos de fronteira entre Layers.
 *
 * Renderiza exatamente um Boundary_Ring em cada uma das três fronteiras entre
 * Layers concêntricas adjacentes (totalizando 3 anéis para 4 Layers), nos
 * raios calculados pelo helper puro `boundaryRadii()` (req. 1.5).
 *
 * Cada anel usa `torusGeometry` com um material PBR luminoso (`emissive` com
 * intensidade elevada) para representar visualmente o cruzamento de fronteira
 * arquitetural. Os anéis são posicionados no plano XZ (deitados no equador das
 * esferas), coerentes com o corte de 90° das esferas.
 *
 * Regra da Dependência (req. 5.1): pertence a `scene/`; importa apenas de
 * `scene/`, `three` e R3F. NÃO importa de `ui/`.
 */

import { useMemo } from 'react';

import { boundaryRadii } from './geometry';

/**
 * Espessura (raio do tubo) do torus de cada anel. Mantida fina para dar a
 * aparência de um anel luminoso, não de um toro volumoso.
 */
const RING_TUBE_RADIUS = 0.03;

/** Cor luminosa (branco-azulado) comum aos anéis de fronteira. */
const RING_COLOR = '#BFE9FF';

/** Segmentos do torus (radiais e tubulares) para uma curva suave. */
const RADIAL_SEGMENTS = 16;
const TUBULAR_SEGMENTS = 128;

/**
 * Grupo com os três anéis luminosos posicionados nas fronteiras entre Layers.
 *
 * Os raios vêm de `boundaryRadii()` (ponto médio entre Layers adjacentes). Cada
 * torus é rotacionado para ficar deitado no plano XZ (equador), circundando as
 * esferas concêntricas.
 */
export default function BoundaryRings() {
  const radii = useMemo(() => boundaryRadii(), []);

  return (
    <group>
      {radii.map((radius, index) => (
        <mesh
          key={index}
          // Deita o torus no plano XZ (por padrão fica no plano XY).
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry
            args={[radius, RING_TUBE_RADIUS, RADIAL_SEGMENTS, TUBULAR_SEGMENTS]}
          />
          <meshStandardMaterial
            color={RING_COLOR}
            emissive={RING_COLOR}
            emissiveIntensity={1.5}
            metalness={0.1}
            roughness={0.2}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
