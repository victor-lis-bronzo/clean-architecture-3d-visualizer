/**
 * CameraController — controle imperativo da câmera 3D (domínio Scene).
 *
 * Renderiza DENTRO do `<Canvas>` do React Three Fiber e coordena as transições
 * suaves de câmera do requisito 3, além de habilitar/desabilitar os controles
 * manuais (`OrbitControls`) conforme o estado de transição.
 *
 * Responsabilidades (tarefa 9.3):
 *  - **Transição ao mudar de passo** (req. 3.1/3.2): quando `activeStepOrder`
 *    muda e o passo ativo possui uma `CameraConfig` (`shouldStartTransition`),
 *    inicia uma transição — marca `isTransitioning = true` e interpola, por
 *    quadro (`useFrame`), `camera.position` e o `target` dos `OrbitControls`
 *    da posição/alvo atuais até o destino, ao longo de `resolveDuration()`
 *    segundos, aplicando `easing` (velocidade nula nas extremidades). Ao
 *    concluir, marca `isTransitioning = false`.
 *  - **No-op sem câmera** (req. 3.6): se o passo ativo não tem configuração de
 *    câmera (`getActiveCamera` retorna `null`), nenhuma transição é iniciada e
 *    `isTransitioning` permanece `false`.
 *  - **Reset de câmera** (req. 3.3/3.7): ao detectar `cameraResetRequested`,
 *    cancela qualquer transição em curso e interpola da posição/alvo atuais
 *    até a visão geral ({@link OVERVIEW_CAMERA}), depois consome o pedido via
 *    `clearCameraReset`.
 *  - **Gating dos controles manuais** (req. 3.4/3.5): `OrbitControls` fica
 *    `enabled={orbitEnabled({ isTransitioning })}` — órbita/zoom/pan são
 *    desabilitados durante a transição e reabilitados quando não há transição.
 *
 * Estratégia de implementação: o progresso da transição é mantido em `ref`s
 * (não em estado React) e avançado dentro de `useFrame`, evitando re-renders a
 * cada quadro. A escrita da posição é imperativa (`camera.position.set`) e o
 * alvo é escrito diretamente no `OrbitControls` (`controls.target`), seguido de
 * `controls.update()`. A leitura reativa do store (passo ativo, flags) usa o
 * binding `useStore` do zustand sobre o store *vanilla*.
 *
 * Regra da Dependência (req. 5.1): pertence a `scene/`; importa de `scene/`,
 * `state/`, `tour-data/`, `three`, R3F e drei. NÃO importa de `ui/`.
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from 'zustand';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import type { CameraConfig, Vec3 } from '../tour-data/types';
import { presentationStore } from '../state/presentation-store';
import { getActiveCamera } from '../state/selectors';
import {
  easing,
  lerpVec3,
  orbitEnabled,
  resolveDuration,
  shouldStartTransition,
} from './camera-math';

/**
 * Câmera de visão geral usada como destino do reset (req. 3.3).
 *
 * Enquadra as 4 Layers a partir de uma posição afastada, mirando o centro da
 * cena. Fica no octante −X/−Z para encarar de frente a abertura do corte de 90°
 * (interior exposto), de modo que o reset também olhe PARA DENTRO da fatia e
 * nunca para o lado sólido/traseiro. Espelha a `OVERVIEW_CAMERA` do passo 1 em
 * `tour-data/tour-data.ts` (que não é exportada), mantendo `scene/` autocontido:
 * o reset sempre leva à mesma visão geral, independentemente do passo ativo.
 * Definida localmente para respeitar a restrição de criar apenas este arquivo.
 */
const OVERVIEW_CAMERA: CameraConfig = {
  position: [-7.66, 5, -6.43],
  target: [0, 0, 0],
} as const;

/** Estado imperativo de uma transição de câmera em andamento. */
interface ActiveTransition {
  /** Posição/alvo de partida (câmera atual no instante em que iniciou). */
  from: CameraConfig;
  /** Posição/alvo de destino. */
  to: CameraConfig;
  /** Duração resolvida da transição, em segundos (`[0.3, 2.0]`). */
  durationSec: number;
  /** Tempo decorrido desde o início da transição, em segundos. */
  elapsedSec: number;
}

/** Props do {@link CameraController}. */
export interface CameraControllerProps {
  /**
   * Duração desejada da transição, em segundos. Passada por `resolveDuration`
   * (clamp `[0.3, 2.0]`, padrão `1.0` — req. 3.2). Opcional.
   */
  durationSeconds?: number;
}

/**
 * Controlador imperativo de câmera. Deve ser renderizado dentro do `<Canvas>`
 * do R3F (a árvore da Scene), pois usa `useThree`/`useFrame`.
 */
export default function CameraController({
  durationSeconds,
}: CameraControllerProps) {
  const camera = useThree((state) => state.camera);

  // Referência para o objeto de controles (drei/three-stdlib), usado para ler
  // e escrever o `target` (ponto de mira) durante a transição.
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Transição em curso (imperativa; fora do ciclo de render do React).
  const transitionRef = useRef<ActiveTransition | null>(null);

  // ── Leituras reativas do store (vanilla) via binding do zustand ──
  const activeStepOrder = useStore(
    presentationStore,
    (s) => s.activeStepOrder,
  );
  const isTransitioning = useStore(
    presentationStore,
    (s) => s.transition.isTransitioning,
  );
  const cameraResetRequested = useStore(
    presentationStore,
    (s) => s.cameraResetRequested,
  );
  const setTransitioning = useStore(presentationStore, (s) => s.setTransitioning);
  const clearCameraReset = useStore(presentationStore, (s) => s.clearCameraReset);

  /** Lê a posição/alvo atuais como uma `CameraConfig` (ponto de partida). */
  const readCurrentCamera = (): CameraConfig => {
    const position: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
    const controls = controlsRef.current;
    const target: Vec3 = controls
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [0, 0, 0];
    return { position, target };
  };

  /** Inicia uma transição imperativa da câmera atual até `to`. */
  const beginTransition = (to: CameraConfig): void => {
    transitionRef.current = {
      from: readCurrentCamera(),
      to,
      durationSec: resolveDuration(durationSeconds),
      elapsedSec: 0,
    };
    setTransitioning(true);
  };

  // ── Efeito: transição ao mudar o passo ativo (req. 3.1/3.2/3.6) ──
  // Ao mudar `activeStepOrder`, se o passo tem câmera, inicia a transição; se
  // não tem, é uma no-op (nenhuma transição; `isTransitioning` permanece false).
  useEffect(() => {
    const target = getActiveCamera({ activeStepOrder });
    if (!shouldStartTransition(target)) {
      return; // no-op — passo sem configuração de câmera (req. 3.6)
    }
    beginTransition(target as CameraConfig);
    // Reagimos apenas à mudança de passo; `beginTransition`/`durationSeconds`
    // são lidos no momento do disparo (padrão imperativo, sem re-render).
  }, [activeStepOrder]);

  // ── Efeito: reset de câmera (req. 3.3/3.7) ──
  // Cancela qualquer transição em curso e interpola até a visão geral, depois
  // consome o pedido. `beginTransition` já parte da posição atual (cancelando
  // a transição anterior por sobrescrita).
  useEffect(() => {
    if (!cameraResetRequested) {
      return;
    }
    beginTransition(OVERVIEW_CAMERA);
    clearCameraReset();
  }, [cameraResetRequested]);

  // ── Loop de animação: avança a transição por quadro (req. 3.1) ──
  useFrame((_, delta) => {
    const transition = transitionRef.current;
    if (!transition) {
      return;
    }

    transition.elapsedSec += delta;
    const rawProgress =
      transition.durationSec > 0
        ? transition.elapsedSec / transition.durationSec
        : 1;
    const clamped = rawProgress >= 1 ? 1 : rawProgress <= 0 ? 0 : rawProgress;

    // Interpola posição e alvo aplicando o easing (velocidade nula nas
    // extremidades — req. 3.1). Usamos `easing` diretamente para poder
    // reutilizar o mesmo `t` na posição e no target.
    const t = easing(clamped);
    const position = lerpVec3(transition.from.position, transition.to.position, t);
    const target = lerpVec3(transition.from.target, transition.to.target, t);

    camera.position.set(position[0], position[1], position[2]);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    } else {
      camera.lookAt(target[0], target[1], target[2]);
    }

    // Conclusão da transição: fixa o destino e libera o gating (req. 3.1).
    if (clamped >= 1) {
      transitionRef.current = null;
      setTransitioning(false);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      // Órbita/zoom/pan habilitados sse e somente se não há transição em curso
      // (req. 3.4/3.5) — Correctness Property 16.
      enabled={orbitEnabled({ isTransitioning })}
      enablePan
      enableZoom
      enableRotate
      makeDefault
    />
  );
}
