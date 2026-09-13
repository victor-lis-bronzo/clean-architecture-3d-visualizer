/**
 * DataParticles — o sistema de partículas de tráfego de dados.
 *
 * Anima entre 20 e 200 Data_Particles que se movem entre as Layers,
 * representando o fluxo de dados através das fronteiras (req. 2.1). Usa um
 * único `InstancedMesh` para performance (uma malha, N instâncias), atualizado
 * por quadro via `useFrame`.
 *
 * Toda a matemática é delegada aos **helpers puros** de `particles-math.ts`:
 *  - `clampParticleCount(n)` limita a contagem a `[20, 200]` (req. 2.1/2.4);
 *  - `updateParticlesFrame(...)` avança/recicla as posições contendo-as no raio
 *    mais externo (req. 2.5) e é **no-op sob `reducedMotion`** (req. 2.3);
 *  - `particleDirectionFor(step)` orienta o vetor de movimento conforme a Layer
 *    em foco do Tour_Step ativo (req. 2.2).
 *
 * O passo ativo é lido do store; ao mudar o passo, a direção das partículas é
 * reorientada de imediato (bem dentro dos 500 ms do req. 2.2). A preferência de
 * redução de movimento é lida localmente via `matchMedia` (ou pode ser injetada
 * via prop para testes), sem depender de `platform/` — que ainda não existe
 * nesta etapa (a fonte da verdade sob teste é o helper puro).
 *
 * Regra da Dependência (req. 5.1): pertence a `scene/`; importa apenas de
 * `scene/`, `state/`, `tour-data/`, `three` e R3F. NÃO importa de `ui/`.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from 'zustand';

import type { Vec3 } from '../tour-data/types';
import { presentationStore } from '../state/presentation-store';
import { getActiveStep } from '../state/selectors';
import { outermostRadius } from './geometry';
import {
  clampParticleCount,
  particleDirectionFor,
  updateParticlesFrame,
  type Particle,
} from './particles-math';

/** Velocidade escalar (unidades por segundo) do fluxo de partículas. */
const PARTICLE_SPEED = 0.6;

/** Raio (tamanho) visual de cada partícula. */
const PARTICLE_SIZE = 0.03;

/** Cor luminosa das partículas de dados. */
const PARTICLE_COLOR = '#FFFFFF';

/** Props do {@link DataParticles}. */
export interface DataParticlesProps {
  /**
   * Quantidade solicitada de partículas. É sempre limitada a `[20, 200]` via
   * `clampParticleCount` (req. 2.1/2.4). Padrão: 120.
   */
  count?: number;
  /**
   * Se `true`, congela a animação (posições estáticas — req. 2.3). Quando
   * omitido, é lido de `prefers-reduced-motion` via `matchMedia`.
   */
  reducedMotion?: boolean;
}

/** Lê `prefers-reduced-motion: reduce` de forma segura fora do navegador. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gera as partículas iniciais de forma determinística, distribuídas dentro do
 * volume das esferas (dentro do raio mais externo). A velocidade inicial aponta
 * na direção `dir` com módulo `PARTICLE_SPEED`.
 */
function createInitialParticles(count: number, dir: Vec3): Particle[] {
  const limit = outermostRadius();
  const particles: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    // Distribuição determinística em coordenadas esféricas (sem RNG para ser
    // reproduzível). Espalha os pontos por ângulos e raios variados.
    const u = (i + 1) / (count + 1); // (0, 1)
    const theta = u * Math.PI * 2 * 7.0; // várias voltas em azimute
    const phi = Math.acos(1 - 2 * u); // inclinação uniforme
    const r = limit * (0.2 + 0.7 * u); // dentro do limite externo

    const position: Vec3 = [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
    const velocity: Vec3 = [
      dir[0] * PARTICLE_SPEED,
      dir[1] * PARTICLE_SPEED,
      dir[2] * PARTICLE_SPEED,
    ];
    particles.push({ position, velocity });
  }
  return particles;
}

/**
 * Sistema de partículas de dados como `InstancedMesh`.
 *
 * Mantém o array de partículas em uma `ref` (mutável entre quadros, fora do
 * ciclo de render do React) e reescreve a matriz de cada instância a cada
 * quadro a partir das posições calculadas pelos helpers puros.
 */
export default function DataParticles({
  count = 120,
  reducedMotion,
}: DataParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Contagem limitada a [20, 200] (req. 2.1/2.4).
  const clampedCount = useMemo(() => clampParticleCount(count), [count]);

  // Passo ativo → direção do fluxo (req. 2.2).
  const activeStepOrder = useStore(presentationStore, (s) => s.activeStepOrder);
  const direction = useMemo<Vec3>(() => {
    const step = getActiveStep({ activeStepOrder });
    return step ? particleDirectionFor(step) : ([-1, 0, 0] as const);
  }, [activeStepOrder]);

  // Estado mutável das partículas entre quadros.
  const particlesRef = useRef<Particle[]>(
    createInitialParticles(clampedCount, direction),
  );
  // Rastreia a última contagem aplicada, para distinguir "mudou a contagem"
  // (recriar tudo) de "mudou apenas a direção" (reorientar velocidades).
  const lastCountRef = useRef(clampedCount);

  // Reage a mudanças de contagem e/ou direção mantendo as posições quando
  // apenas a direção muda (req. 2.2), e recriando quando a contagem muda.
  useEffect(() => {
    if (lastCountRef.current !== clampedCount) {
      lastCountRef.current = clampedCount;
      particlesRef.current = createInitialParticles(clampedCount, direction);
      return;
    }
    // Apenas a direção mudou: reorienta a velocidade preservando as posições.
    particlesRef.current = particlesRef.current.map((p) => ({
      position: p.position,
      velocity: [
        direction[0] * PARTICLE_SPEED,
        direction[1] * PARTICLE_SPEED,
        direction[2] * PARTICLE_SPEED,
      ] as Vec3,
    }));
  }, [clampedCount, direction]);

  // Resolve a preferência de redução de movimento: prop tem prioridade; caso
  // contrário lê de matchMedia (req. 2.3).
  const frozen = reducedMotion ?? prefersReducedMotion();

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    // Avança/recicla as posições via helper puro. Sob reducedMotion é no-op
    // (posições idênticas — req. 2.3), mantendo as partículas estáticas.
    const dt = Number.isFinite(delta) && delta > 0 ? delta : 0;
    particlesRef.current = updateParticlesFrame(
      particlesRef.current,
      dt,
      frozen,
    );

    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i += 1) {
      const [x, y, z] = particles[i].position;
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      // A contagem de instâncias é fixa após a montagem; a `key` força a
      // remontagem quando a contagem muda para redimensionar o buffer.
      key={clampedCount}
      args={[undefined, undefined, clampedCount]}
    >
      <sphereGeometry args={[PARTICLE_SIZE, 8, 8]} />
      <meshStandardMaterial
        color={PARTICLE_COLOR}
        emissive={PARTICLE_COLOR}
        emissiveIntensity={1.2}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
