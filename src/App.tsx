/**
 * App Shell — composição da aplicação (tarefa 13.1).
 *
 * Este é o único módulo autorizado a compor os três domínios desacoplados
 * (`scene/`, `ui/`) juntamente com os adaptadores de `platform/` e o store de
 * `state/`. Ele vive na raiz de `src/` (fora de `scene/`/`ui/`), portanto pode
 * importar de ambos sem violar a Regra da Dependência (req. 5.1) — a regra
 * `import-x/no-restricted-paths` restringe apenas as fronteiras
 * `tour-data`/`scene`/`ui`, não a raiz do App.
 *
 * Responsabilidades:
 *  1. **ErrorBoundary** (classe React) envolvendo a aplicação para capturar
 *     erros de runtime de render e exibir um fallback amigável em pt-BR, sem
 *     derrubar a página (design "Error Handling").
 *  2. **Gate de validação do Tour_Data** (req. 5.3/5.4): o store valida o
 *     `TOUR_DATA` na inicialização e expõe `dataError`. Havendo erro, o App
 *     exibe uma mensagem identificando o `stepOrder`/`field` e **não** inicia o
 *     tour nem monta as interações da cena.
 *  3. **WebGL** (req. 1.6): usa `isWebGLAvailable` / `onUnsupported` do
 *     `SceneCanvas` para sincronizar `webglSupported` no store; sem suporte,
 *     renderiza `WebGLFallback` (de `ui/`) no lugar da cena.
 *  4. **Composição da cena**: `SceneCanvas` hospeda `ConcentricSpheres`,
 *     `BoundaryRings`, `DataParticles` (recebendo `reducedMotion`),
 *     `CameraController` e as luzes (ambient + directional) necessárias para os
 *     materiais PBR ficarem visíveis. O `Overlay` fica por cima com os slots do
 *     timer e das notas (o `Overlay` já compõe os `TourControls`).
 *  5. **Wiring dos adaptadores de plataforma** ao store: atalhos de teclado,
 *     tela cheia, breakpoint de viewport e preferência de movimento reduzido.
 *
 * _Requirements: 4.2, 5.3, 5.4, 9.3, 11.5_
 */

import { Component, useCallback, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { presentationStore } from './state/presentation-store';
import { hasDataError } from './state/selectors';

import SceneCanvas from './scene/SceneCanvas';
import ConcentricSpheres from './scene/ConcentricSpheres';
import BoundaryRings from './scene/BoundaryRings';
import DataParticles from './scene/DataParticles';
import CameraController from './scene/CameraController';

import Overlay from './ui/Overlay';
import PresentationTimer from './ui/PresentationTimer';
import PresenterNotesPanel from './ui/PresenterNotesPanel';
import WebGLFallback from './ui/WebGLFallback';

import { useKeyboardShortcuts } from './platform/useKeyboardShortcuts';
import { useFullscreen } from './platform/useFullscreen';
import { useReducedMotion } from './platform/useReducedMotion';
import { useViewportBreakpoint } from './platform/useViewportBreakpoint';

// ────────────────────────────────────────────────────────────────────────────
// ErrorBoundary — captura erros de runtime de render (design "Error Handling").
// ────────────────────────────────────────────────────────────────────────────

/** Título do fallback do ErrorBoundary (pt-BR). */
export const ERROR_BOUNDARY_TITLE = 'Ocorreu um erro inesperado';

/** Mensagem do fallback do ErrorBoundary (pt-BR). */
export const ERROR_BOUNDARY_MESSAGE =
  'A aplicação encontrou um erro e não pôde continuar a renderização. ' +
  'Tente recarregar a página; se o problema persistir, verifique o console ' +
  'para mais detalhes.';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Boundary de erro do App Shell. Captura exceções lançadas durante o render de
 * qualquer descendente e exibe um fallback textual amigável em pt-BR, evitando
 * que a página inteira caia (design "Erro de runtime em componente React").
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Registra no console para diagnóstico do apresentador/desenvolvedor.
    console.error('Erro capturado pelo ErrorBoundary do App Shell:', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <h2 className="text-xl font-semibold tracking-tight text-gray-100">
            {ERROR_BOUNDARY_TITLE}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-gray-400">
            {ERROR_BOUNDARY_MESSAGE}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Painel de erro de validação do Tour_Data (req. 5.3/5.4).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Exibe a mensagem de erro de validação do Tour_Data identificando o
 * `stepOrder` e o `field` inválidos (req. 5.3/5.4). Quando este painel é
 * renderizado, o tour **não** é iniciado e a cena não é montada.
 */
function DataErrorPanel(): React.JSX.Element {
  const dataError = useStore(presentationStore, (s) => s.dataError);

  const location =
    dataError && dataError.stepOrder !== null
      ? `Tour_Step ${dataError.stepOrder}, campo "${dataError.field}"`
      : dataError
        ? `campo "${dataError.field}"`
        : '';

  return (
    <div
      role="alert"
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <h2 className="text-xl font-semibold tracking-tight text-red-300">
        Não foi possível carregar o tour
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-gray-300">
        Os dados do tour (Tour_Data) são inválidos e o tour não foi iniciado.
      </p>
      {dataError ? (
        <p className="max-w-md text-sm leading-relaxed text-gray-400">
          <span className="font-medium text-gray-200">{location}:</span>{' '}
          {dataError.message}
        </p>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Composição da cena 3D.
// ────────────────────────────────────────────────────────────────────────────

/** Props da árvore de conteúdo da cena. */
interface SceneContentProps {
  /** Congela a animação das partículas quando `true` (req. 2.3). */
  reducedMotion: boolean;
}

/**
 * Conteúdo interno do `<Canvas>`: luzes + esferas + anéis + partículas +
 * controlador de câmera. As luzes (ambient + directional) garantem que os
 * materiais PBR (`meshStandardMaterial`) sejam visíveis.
 */
function SceneContent({ reducedMotion }: SceneContentProps): React.JSX.Element {
  return (
    <>
      {/* Iluminação para os materiais PBR ficarem visíveis. */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 10, 6]} intensity={1.1} />
      <pointLight position={[-6, -4, -8]} intensity={0.4} />

      <ConcentricSpheres />
      <BoundaryRings />
      <DataParticles reducedMotion={reducedMotion} />
      <CameraController />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Conteúdo principal do App (dentro do ErrorBoundary).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Conteúdo do App: resolve os gates (erro de dados / WebGL), compõe a cena e o
 * overlay e faz o wiring dos adaptadores de plataforma ao store.
 */
function AppContent(): React.JSX.Element {
  // ── Leituras reativas do store ──
  const dataError = useStore(presentationStore, hasDataError);
  const webglSupported = useStore(presentationStore, (s) => s.webglSupported);
  const setWebglSupported = useStore(
    presentationStore,
    (s) => s.setWebglSupported,
  );

  // ── Ações do store ligadas aos atalhos de teclado ──
  const next = useStore(presentationStore, (s) => s.next);
  const prev = useStore(presentationStore, (s) => s.prev);
  const toggleNotes = useStore(presentationStore, (s) => s.toggleNotes);
  const resetCamera = useStore(presentationStore, (s) => s.resetCamera);
  const setFullscreen = useStore(presentationStore, (s) => s.setFullscreen);

  // ── Adaptadores de plataforma ──
  const viewport = useViewportBreakpoint();
  const reducedMotion = useReducedMotion();

  // Sincroniza o estado de tela cheia do store com a Fullscreen API (req. 9.5).
  const handleFullscreenChange = useCallback(
    (isFullscreen: boolean) => setFullscreen(isFullscreen),
    [setFullscreen],
  );
  const fullscreen = useFullscreen(handleFullscreenChange);

  // Reação ao WebGL indisponível (req. 1.6): registra no store para renderizar
  // o fallback. Sinalizado pelo `SceneCanvas` via `onUnsupported`.
  const handleUnsupported = useCallback(
    () => setWebglSupported(false),
    [setWebglSupported],
  );

  // Atalhos de teclado ligados às ações do store; desabilitados quando o
  // Tour_Data é inválido (o tour não inicia — req. 5.3/5.4).
  const shortcutActions = useMemo(
    () => ({
      next,
      prev,
      toggleNotes,
      resetCamera,
      toggleFullscreen: () => {
        void fullscreen.toggle();
      },
    }),
    [next, prev, toggleNotes, resetCamera, fullscreen],
  );
  useKeyboardShortcuts(shortcutActions, !dataError);

  // ── Gate 1: Tour_Data inválido → exibe o erro e NÃO inicia o tour ──
  if (dataError) {
    return <DataErrorPanel />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-950 text-gray-100">
      {/* Cena 3D (ou fallback textual quando o WebGL não é suportado). */}
      {webglSupported ? (
        <SceneCanvas
          width={viewport.width}
          height={viewport.height}
          onUnsupported={handleUnsupported}
        >
          <SceneContent reducedMotion={reducedMotion} />
        </SceneCanvas>
      ) : (
        <WebGLFallback />
      )}

      {/* UI Overlay por cima da cena. O Overlay já compõe os TourControls;
          aqui injetamos os slots do timer e do painel de notas. */}
      {webglSupported ? (
        <Overlay
          width={viewport.width}
          timerSlot={<PresentationTimer />}
          notesSlot={<PresenterNotesPanel />}
        />
      ) : null}
    </div>
  );
}

/**
 * Componente raiz da aplicação. Envolve o conteúdo no {@link ErrorBoundary}
 * (design "Error Handling") e ocupa 100% da área disponível.
 */
export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen">
        <AppContent />
      </div>
    </ErrorBoundary>
  );
}
