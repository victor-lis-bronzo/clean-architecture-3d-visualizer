/**
 * SceneCanvas — a raiz do domínio 3D (Scene).
 *
 * Monta o `<Canvas>` do React Three Fiber que hospeda as esferas concêntricas,
 * os anéis de fronteira, as partículas e o controlador de câmera (fornecidos
 * como `children` pelas tarefas 9.2/9.3 e compostos pelo App na tarefa 13.1).
 *
 * Responsabilidades desta tarefa (9.1):
 *  - **Checagem de suporte a WebGL antes de montar** (requisito 1.6): se o
 *    navegador não suporta WebGL, o `<Canvas>` NÃO é montado (nenhuma esfera é
 *    criada) e o componente sinaliza a indisponibilidade via `onUnsupported`,
 *    permitindo que o App exiba o `WebGLFallback` (tarefa 11.2 / 13.1). A UI de
 *    fallback vive em `ui/` e é deliberadamente mantida fora de `scene/`
 *    (Regra da Dependência, req. 5.1).
 *  - **Suspensão do `frameloop`** quando o viewport tem dimensão ≤ 0
 *    (requisito 11.5): usa o predicado puro `shouldRender(w, h)`. Com dimensão
 *    não positiva, `frameloop = 'never'` congela a renderização preservando o
 *    estado da cena; ao voltar a `> 0`, retorna a `'always'` e retoma.
 *  - **Resize-aware / 100% do contêiner**: o R3F observa o tamanho do contêiner
 *    automaticamente; o wrapper preenche 100% da área disponível.
 *
 * Regra da Dependência (req. 5.1): este módulo pertence a `scene/` e importa
 * apenas de `scene/` e de bibliotecas 3D (R3F/Three). NÃO importa de `ui/`.
 */

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';

import { shouldRender } from './geometry';

/**
 * Detecta suporte a WebGL criando um `WebGLRenderingContext` de teste em um
 * `<canvas>` descartável, sem montar nenhuma cena (requisito 1.6).
 *
 * Tenta `webgl` e, como alternativa, `experimental-webgl`. Qualquer exceção
 * (ex.: ambiente sem DOM) é tratada como "não suportado". É seguro chamar no
 * cliente; retorna `false` fora do navegador.
 *
 * @returns `true` se um contexto WebGL pôde ser criado; caso contrário `false`.
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return context != null;
  } catch {
    return false;
  }
}

/** Props do {@link SceneCanvas}. */
export interface SceneCanvasProps {
  /**
   * Largura atual do viewport em pixels. Quando `<= 0` (junto com `height`)
   * suspende o `frameloop` preservando o estado da cena (req. 11.5). Se
   * omitida, assume-se um viewport visível e a renderização segue ativa (o R3F
   * dimensiona pelo contêiner).
   */
  width?: number;
  /**
   * Altura atual do viewport em pixels. Ver {@link SceneCanvasProps.width}.
   */
  height?: number;
  /**
   * Chamado quando o WebGL não está disponível (req. 1.6). O App deve reagir
   * exibindo o `WebGLFallback` (em `ui/`). É invocado uma única vez na
   * montagem quando o suporte está ausente.
   */
  onUnsupported?: () => void;
  /**
   * Conteúdo da cena 3D (esferas, anéis, partículas, câmera). Renderizado
   * apenas quando o WebGL é suportado.
   */
  children?: ReactNode;
}

/**
 * Raiz da cena 3D com checagem de WebGL e suspensão de frameloop.
 *
 * Quando o WebGL não é suportado, NÃO monta o `<Canvas>` (nenhuma esfera) e
 * sinaliza via `onUnsupported`, retornando `null` para que o App renderize o
 * fallback textual (req. 1.6). Caso contrário, monta o `<Canvas>` preenchendo
 * 100% do contêiner, com `frameloop` suspenso enquanto o viewport tiver
 * dimensão ≤ 0 (req. 11.5).
 */
export default function SceneCanvas({
  width,
  height,
  onUnsupported,
  children,
}: SceneCanvasProps) {
  const webglSupported = isWebGLAvailable();

  // Sinaliza a indisponibilidade de WebGL uma vez, após a montagem, para o App
  // exibir o WebGLFallback (mantido em ui/, fora de scene/ — req. 1.6/5.1).
  useEffect(() => {
    if (!webglSupported) {
      onUnsupported?.();
    }
  }, [webglSupported, onUnsupported]);

  // Sem suporte a WebGL: não montar nenhuma esfera (req. 1.6).
  if (!webglSupported) {
    return null;
  }

  // Suspende a renderização (frameloop) quando o viewport tem dimensão ≤ 0
  // (req. 11.5). Se `width`/`height` não forem informados, mantém a cena ativa;
  // o R3F ajusta as dimensões a partir do contêiner (resize-aware, req. 11.1).
  const dimensionsKnown = width !== undefined && height !== undefined;
  const active = dimensionsKnown ? shouldRender(width, height) : true;
  const frameloop = active ? 'always' : 'never';

  return (
    <div className="h-full w-full">
      <Canvas
        frameloop={frameloop}
        // Preenche 100% do contêiner; o R3F observa o resize automaticamente.
        style={{ width: '100%', height: '100%' }}
        // `onCreated` não força re-render; a checagem prévia já garante suporte.
        // Rede de segurança para falhas de contexto em runtime fica a cargo do
        // App via estado do store (req. 1.6).
      >
        {children}
      </Canvas>
    </div>
  );
}
