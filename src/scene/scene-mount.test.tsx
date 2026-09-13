/**
 * Teste de exemplo da montagem da cena 3D (tarefa 9.4).
 *
 * Verifica, sem WebGL real (via `@react-three/test-renderer`), que ao compor
 * `ConcentricSpheres` + `BoundaryRings`:
 *  - existem exatamente 4 esferas (`sphereGeometry`) — uma por Layer (req. 1.1/1.2);
 *  - existem exatamente 3 anéis de fronteira (`torusGeometry`) — req. 1.5;
 *  - o corte de seção de 90° é aplicado: os `args` da `sphereGeometry` incluem
 *    `phiLength = 1.5·π = CUT_PHI_LENGTH` (req. 1.4).
 *
 * Também cobre o caminho de fallback de WebGL (req. 1.6): em jsdom não há
 * WebGL, portanto `isWebGLAvailable()` retorna `false` e `SceneCanvas` não monta
 * o `<Canvas>` (renderiza `null`), sinalizando a indisponibilidade via
 * `onUnsupported`.
 *
 * Os invariantes de contagem também são validados diretamente pelos helpers
 * puros de geometria (`layerRadii().length === 4`, `boundaryRadii().length === 3`),
 * mantendo o teste robusto mesmo se o test-renderer tiver dificuldades no jsdom.
 *
 * NOTA sobre ordenação: os testes de fallback de WebGL ficam ANTES de qualquer
 * uso do `@react-three/test-renderer`. O test-renderer instala um mock de
 * contexto WebGL no `<canvas>` do jsdom, o que faria `isWebGLAvailable()`
 * passar a retornar `true` no restante do arquivo — por isso a checagem do
 * ambiente sem WebGL é feita primeiro (em jsdom limpo o WebGL é ausente).
 *
 * _Requirements: 1.1, 1.4, 1.5, 1.6_
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ReactThreeTestRenderer from '@react-three/test-renderer';

import ConcentricSpheres from './ConcentricSpheres';
import BoundaryRings from './BoundaryRings';
import SceneCanvas, { isWebGLAvailable } from './SceneCanvas';
import { CUT_PHI_LENGTH, boundaryRadii, layerRadii } from './geometry';

/** Um nó da árvore retornada por `renderer.toTree()`. */
interface TreeNode {
  type?: string;
  props?: { args?: unknown[] };
  children?: TreeNode[];
}

/** Conta ocorrências de um tipo de elemento na árvore de teste (recursivo). */
function countByType(node: TreeNode | null | undefined, type: string): number {
  if (node == null || typeof node !== 'object') {
    return 0;
  }
  let count = node.type === type ? 1 : 0;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countByType(child, type);
    }
  }
  return count;
}

/** Coleta os `args` de todos os nós de um dado tipo na árvore de teste. */
function collectArgs(node: TreeNode | null | undefined, type: string): unknown[][] {
  const out: unknown[][] = [];
  function walk(cur: TreeNode | null | undefined): void {
    if (cur == null || typeof cur !== 'object') {
      return;
    }
    if (cur.type === type && Array.isArray(cur.props?.args)) {
      out.push(cur.props!.args as unknown[]);
    }
    if (Array.isArray(cur.children)) {
      cur.children.forEach(walk);
    }
  }
  walk(node);
  return out;
}

/** Normaliza `toTree()` (que pode ser um nó único ou array) em uma lista. */
function asRoots(tree: unknown): TreeNode[] {
  if (tree == null) {
    return [];
  }
  return (Array.isArray(tree) ? tree : [tree]) as TreeNode[];
}

// ── Fallback de WebGL PRIMEIRO (antes de qualquer uso do test-renderer) ──
describe('Fallback de WebGL (Requirements 1.6)', () => {
  it('isWebGLAvailable() é false em jsdom (sem WebGL)', () => {
    expect(isWebGLAvailable()).toBe(false);
  });

  it('SceneCanvas não monta o Canvas (renderiza null) e sinaliza indisponibilidade', () => {
    let unsupportedCalls = 0;

    const { container } = render(
      <SceneCanvas onUnsupported={() => (unsupportedCalls += 1)}>
        <ConcentricSpheres />
      </SceneCanvas>,
    );

    // Sem WebGL: nada é montado (nenhuma esfera, nenhum <canvas>) — req. 1.6.
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();

    // E a indisponibilidade é sinalizada ao App (para exibir o WebGLFallback).
    expect(unsupportedCalls).toBeGreaterThanOrEqual(1);
  });
});

describe('Montagem da cena 3D (Requirements 1.1, 1.4, 1.5)', () => {
  it('helpers de geometria: 4 raios de Layer e 3 raios de fronteira', () => {
    // Invariante de contagem independente do renderer (robustez).
    expect(layerRadii()).toHaveLength(4);
    expect(boundaryRadii()).toHaveLength(3);
  });

  it('compõe exatamente 4 esferas e 3 anéis com o corte de 90°', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <group>
        <ConcentricSpheres />
        <BoundaryRings />
      </group>,
    );

    const roots = asRoots(renderer.toTree());

    const sphereCount = roots.reduce(
      (acc, r) => acc + countByType(r, 'sphereGeometry'),
      0,
    );
    const torusCount = roots.reduce(
      (acc, r) => acc + countByType(r, 'torusGeometry'),
      0,
    );

    // 4 esferas (uma por Layer) e 3 anéis de fronteira.
    expect(sphereCount).toBe(4);
    expect(torusCount).toBe(3);

    // Corte de 90°: phiLength (5º arg) === 1.5·π em todas as esferas (req. 1.4).
    const sphereArgs = roots.flatMap((r) => collectArgs(r, 'sphereGeometry'));
    expect(sphereArgs).toHaveLength(4);
    for (const args of sphereArgs) {
      // args = [radius, widthSeg, heightSeg, phiStart, phiLength, thetaStart, thetaLength]
      expect(args[4]).toBeCloseTo(CUT_PHI_LENGTH, 10);
      expect(args[4] as number).toBeCloseTo(Math.PI * 1.5, 10);
    }

    await renderer.unmount();
  });
});
