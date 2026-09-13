/**
 * App Shell — placeholder mínimo.
 *
 * Esta é apenas a casca inicial verificável do scaffold (tarefa 1.1).
 * A composição real (SceneCanvas + Overlay + adaptadores de plataforma,
 * ErrorBoundary e fluxo de erro do Tour_Data) será implementada na tarefa 13.1,
 * e os domínios `scene/`, `ui/`, `state/`, `tour-data/` e `platform/` nas
 * tarefas subsequentes.
 */
export default function App() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Clean Architecture 3D Visualizer
      </h1>
      <p className="max-w-md text-sm text-gray-400">
        Scaffold inicial (Vite + React + TypeScript + Tailwind). Os domínios da
        cena 3D, da interface e do tour serão implementados nas próximas tarefas.
      </p>
    </main>
  );
}
