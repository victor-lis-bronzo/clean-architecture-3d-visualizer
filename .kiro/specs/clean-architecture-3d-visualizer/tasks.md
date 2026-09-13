# Implementation Plan: Clean Architecture 3D Visualizer

## Overview

Este plano converte o design em uma sequência de tarefas de codificação incrementais e orientadas a testes, respeitando a Regra da Dependência do próprio design: o núcleo **Tour_Data** (sem dependências) é implementado primeiro, seguido por **state/** (store + Tour_Controller), depois os domínios **scene/** e **ui/**, os **adaptadores de plataforma**, a **integração no App Shell** e, por fim, a **configuração de build/deploy**. Cada tarefa constrói sobre as anteriores e termina com a integração, sem código órfão. Testes de propriedade (fast-check, ≥100 iterações) cobrem a lógica pura; testes de exemplo/integração cobrem rendering 3D, chamadas ao browser e build.

A implementação usa **TypeScript** com **Vite + React + Tailwind CSS**, **Three.js + React Three Fiber + @react-three/drei** para 3D, **Zustand** para o store, **Zod** para validação, e **Vitest + fast-check** para testes.

## Tasks

- [x] 1. Configurar o scaffold do projeto e o tooling de qualidade
  - [x] 1.1 Inicializar o projeto Vite + React + TypeScript + Tailwind
    - Criar `package.json`, `index.html`, `src/main.tsx` (bootstrap React) e a estrutura de pastas desacoplada (`src/tour-data/`, `src/state/`, `src/scene/`, `src/ui/`, `src/platform/`)
    - Configurar `tsconfig.json`, `tailwind.config.ts` e `vite.config.ts` com a opção `base` configurável para deploy em subcaminho
    - Adicionar as dependências Three.js, `@react-three/fiber`, `@react-three/drei`, `zustand`, `zod`
    - _Requirements: 10.1, 10.4_

  - [x] 1.2 Configurar o tooling de testes Vitest + fast-check
    - Adicionar `vitest`, `fast-check`, `@testing-library/react` e `@react-three/test-renderer` como devDependencies
    - Criar a configuração do Vitest integrada ao Vite/TS e o script de teste com execução única (`vitest --run`)
    - _Requirements: 5.2_

  - [x] 1.3 Configurar a regra ESLint de desacoplamento arquitetural
    - Configurar ESLint com a regra `import/no-restricted-paths` proibindo: `tour-data/*` importar de `scene/*`, `ui/*` ou React; `scene/*` importar de `ui/*`; `ui/*` importar de `scene/*`
    - Adicionar script de lint que falha se as restrições forem violadas
    - _Requirements: 5.1_

- [x] 2. Implementar o domínio Tour_Data (núcleo, sem dependências)
  - [x] 2.1 Definir os tipos base e a paleta de cores
    - Criar `tour-data/types.ts` com `Vec3`, `Layer`, `LAYER_ORDER`, `CameraConfig`, `TourStep`, `TourData`, `TimerState`, `TimerStatus`, `TourDataError`
    - Criar `tour-data/palette.ts` com `LAYER_PALETTE` (uma cor distinta por Layer) e `TIMER_BANDS` (verde/amarelo/vermelho)
    - _Requirements: 1.3, 5.2_

  - [x] 2.2 Implementar o validador do Tour_Data com Zod
    - Criar `tour-data/validate.ts` com `validateTourData(data): TourDataError[]` cobrindo limites de campo (Zod), sequência de `order` (1..N sem lacunas/duplicatas), referências de `focusLayer` a `LAYER_ORDER` e vetores de câmera finitos
    - Retornar erros que identificam `stepOrder` e `field` (com `field = 'focusLayer'` para Layer inexistente)
    - _Requirements: 5.2, 5.3, 5.4_

  - [x]* 2.3 Escrever teste de propriedade para dados válidos do Tour_Data
    - **Property 20: Dados válidos do Tour_Data são aceitos**
    - Gerador `arbTourData` produzindo dados dentro de todos os limites; asserir lista de erros vazia
    - **Validates: Requirements 5.2**

  - [x]* 2.4 Escrever teste de propriedade para dados inválidos do Tour_Data
    - **Property 21: Dados inválidos do Tour_Data são rejeitados com localização do erro**
    - Gerador `arbInvalidTourData` (com violação injetada); asserir ao menos um `TourDataError` com `stepOrder`/`field` corretos, incluindo o caso `focusLayer`
    - **Validates: Requirements 5.3, 5.4**

  - [x] 2.5 Definir os 8 Tour_Steps do "CriarPedido"
    - Criar `tour-data/tour-data.ts` com os 8 passos na ordem especificada, cada um com `title`, `body`, `focusLayer`, `camera` e `notes`, mapeados às Layers conforme a tabela do design
    - _Requirements: 4.1, 5.1_

  - [x]* 2.6 Escrever teste de exemplo para o Tour_Data do "CriarPedido"
    - Verificar que os dados reais passam por `validateTourData` sem erros e que os 8 passos e suas `focusLayer` seguem a ordem esperada
    - _Requirements: 4.1_

- [x] 3. Implementar a lógica pura do Tour_Controller
  - [x] 3.1 Implementar as funções puras de navegação e destaque
    - Criar `state/tour-controller.ts` com `computeNext(active, count)` (clamp em `count`), `computePrev(active)` (clamp em 1), gating por `isTransitioning`, `computeHighlight(step)` e `formatProgress(active, count)`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10_

  - [x]* 3.2 Escrever teste de propriedade para clamp e gating da navegação
    - **Property 1: Clamp e gating da navegação do tour**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.10**

  - [x]* 3.3 Escrever teste de propriedade para reversibilidade da navegação interior
    - **Property 2: Reversibilidade da navegação no interior**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 3.4 Escrever teste de propriedade para destaque exclusivo da Layer
    - **Property 3: Destaque exclusivo da Layer em foco**
    - **Validates: Requirements 4.8**

  - [ ]* 3.5 Escrever teste de propriedade para o formato do indicador de progresso
    - **Property 4: Formato do indicador de progresso**
    - **Validates: Requirements 4.9**

- [x] 4. Implementar a lógica pura do timer
  - [x] 4.1 Implementar as funções puras de faixa de cor e formatação
    - Criar helpers de timer (ex.: `state/timer.ts`) com `timerColorBand(sec)`, `formatMMSS(sec)`, `parseMMSS(str)`, e transições puras `startTimer`/`pauseTimer`/`resetTimer` sobre `TimerState`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x]* 4.2 Escrever teste de propriedade para as faixas de cor do timer
    - **Property 5: Faixas de cor do timer são totais e monotônicas**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.8**

  - [x]* 4.3 Escrever teste de propriedade para o round-trip de mm:ss
    - **Property 6: Round-trip de formatação mm:ss**
    - **Validates: Requirements 6.1**

  - [x]* 4.4 Escrever teste de propriedade para pausar/retomar preservando o tempo
    - **Property 7: Pausar e retomar preserva o tempo decorrido**
    - **Validates: Requirements 6.5, 6.7**

  - [x]* 4.5 Escrever teste de propriedade para reiniciar o timer
    - **Property 8: Reiniciar zera e interrompe a contagem**
    - **Validates: Requirements 6.6**

- [x] 5. Implementar as funções puras de notas do apresentador
  - [x] 5.1 Implementar `toggleNotes`, `truncateNotes` e resolução de estado vazio
    - Criar helpers (ex.: `state/notes.ts`) com `toggleNotes(v)`, `truncateNotes(s)` (≤ 5.000 caracteres com indicador) e resolução da mensagem de estado vazio para notas em branco
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x]* 5.2 Escrever teste de propriedade para a involução do toggle de notas
    - **Property 17: Involução do toggle de notas**
    - **Validates: Requirements 8.1, 8.2**

  - [x]* 5.3 Escrever teste de propriedade para o truncamento das notas
    - **Property 18: Truncamento das notas do apresentador**
    - **Validates: Requirements 8.3**

  - [x]* 5.4 Escrever teste de propriedade para o estado vazio das notas
    - **Property 19: Estado vazio das notas**
    - **Validates: Requirements 8.4**

- [x] 6. Implementar o Presentation Store (Zustand)
  - [x] 6.1 Criar o store compartilhado e os seletores
    - Criar `state/presentation-store.ts` (Zustand) com `activeStepOrder`, `transition`, `timer`, `notesVisible` (inicia `false`), `isFullscreen`, `dataError`, `webglSupported`, e as ações `next`/`prev`/`resetCamera`/`toggleNotes`/`setFullscreen` delegando às funções puras
    - Criar `state/selectors.ts` para leituras derivadas; definir estado inicial (passo 1 ativo, notas ocultas)
    - _Requirements: 4.2, 8.6_

  - [ ]* 6.2 Escrever teste de exemplo para o estado inicial do store
    - Verificar que ao carregar o store o passo 1 é o único ativo e `notesVisible` é `false`
    - _Requirements: 4.2, 8.6_

- [~] 7. Checkpoint — Garantir que a lógica pura e o store passam nos testes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementar as funções puras de câmera e partículas
  - [x] 8.1 Implementar helpers puros de câmera
    - Criar helpers (ex.: `scene/camera-math.ts`) com `easing(t)`, `lerp(a, b, t)`, `resolveDuration(d)` (clamp 0,3–2,0; default 1,0), `orbitEnabled(state)` e a regra de no-op para câmera ausente
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x]* 8.2 Escrever teste de propriedade para o easing com velocidade nula nas extremidades
    - **Property 13: Easing com velocidade nula nas extremidades**
    - **Validates: Requirements 3.1**

  - [x]* 8.3 Escrever teste de propriedade para o clamp da duração da transição
    - **Property 14: Clamp da duração da transição de câmera**
    - **Validates: Requirements 3.2**

  - [x]* 8.4 Escrever teste de propriedade para o no-op de câmera ausente
    - **Property 15: Ausência de configuração de câmera é no-op**
    - **Validates: Requirements 3.6**

  - [x]* 8.5 Escrever teste de propriedade para o gating dos controles manuais
    - **Property 16: Gating dos controles manuais de câmera**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 8.6 Implementar helpers puros de partículas e geometria
    - Criar `scene/geometry.ts` (raios estritamente crescentes, corte de 90° via `phiLength`) e helpers de partículas com `clampParticleCount(n)` (20..200), atualização de quadro com contenção/reciclagem, no-op sob `reducedMotion` e `particleDirectionFor(step)`
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 8.7 Escrever teste de propriedade para o clamp da contagem de partículas
    - **Property 9: Clamp da contagem de partículas**
    - **Validates: Requirements 2.1, 2.4**

  - [x]* 8.8 Escrever teste de propriedade para a contenção das partículas
    - **Property 10: Contenção das partículas dentro dos limites**
    - **Validates: Requirements 2.5**

  - [x]* 8.9 Escrever teste de propriedade para o congelamento sob reduced-motion
    - **Property 11: Congelamento sob prefers-reduced-motion**
    - **Validates: Requirements 2.3**

  - [x]* 8.10 Escrever teste de propriedade para a direção das partículas
    - **Property 12: Direção das partículas coerente com o passo**
    - **Validates: Requirements 2.2**

- [ ] 9. Implementar os componentes da Scene (3D)
  - [x] 9.1 Implementar o SceneCanvas com checagem de WebGL
    - Criar `scene/SceneCanvas.tsx` com o `<Canvas>` R3F, checagem de suporte a WebGL antes de montar (não montar esferas em falha) e suspensão do `frameloop` quando a dimensão do viewport for ≤ 0
    - _Requirements: 1.6, 11.5_

  - [~] 9.2 Implementar as esferas concêntricas, os anéis e as partículas
    - Criar `scene/ConcentricSpheres.tsx` (4 esferas, raios crescentes, corte 90°, `DoubleSide`, material PBR, cor da paleta, destaque da Layer em foco), `scene/BoundaryRings.tsx` (3 anéis) e `scene/DataParticles.tsx` (`InstancedMesh` usando os helpers puros)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.8_

  - [~] 9.3 Implementar o CameraController
    - Criar `scene/CameraController.tsx` interpolando posição/alvo por `useFrame` com easing e duração resolvida, habilitando/desabilitando `OrbitControls` conforme `isTransitioning`, tratando câmera ausente como no-op e cancelando transição em curso no reset
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 9.4 Escrever teste de exemplo para a montagem da cena
    - Usar `@react-three/test-renderer` para asserir 4 esferas, 3 anéis e o corte de 90°; verificar que nenhuma esfera é montada quando o WebGL não é suportado (fallback)
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [ ]* 9.5 Escrever teste de propriedade para a suspensão de renderização
    - **Property 25: Suspensão de renderização em dimensão não positiva**
    - **Validates: Requirements 11.5**

- [x] 10. Implementar os helpers puros de responsividade
  - [x] 10.1 Implementar `computeAspect` e o mapeamento de breakpoints
    - Criar helpers (ex.: `ui/responsive.ts`) com `computeAspect(w, h)`, `shouldRender(w, h)` e o mapeamento de visibilidade por breakpoint (≥1024, 640–1024, <640) mantendo os controles sempre visíveis
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 10.2 Escrever teste de propriedade para a visibilidade responsiva por breakpoint
    - **Property 23: Visibilidade responsiva monotônica por breakpoint**
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [x]* 10.3 Escrever teste de propriedade para o aspect ratio no redimensionamento
    - **Property 24: Aspect ratio no redimensionamento**
    - **Validates: Requirements 11.1**

- [ ] 11. Implementar os componentes do UI Overlay (2D)
  - [~] 11.1 Implementar o Overlay responsivo e os controles do tour
    - Criar `ui/Overlay.tsx` (layout responsivo aplicando os breakpoints) e `ui/TourControls.tsx` (botões avançar/retroceder, título/texto do passo, indicador "N de 8")
    - _Requirements: 4.7, 4.9, 11.2, 11.3, 11.4_

  - [~] 11.2 Implementar o timer, o painel de notas e o fallback WebGL
    - Criar `ui/PresentationTimer.tsx` (mm:ss + faixa de cor via helpers puros), `ui/PresenterNotesPanel.tsx` (visível/oculto, truncamento, estado vazio, atualização ao mudar de passo) e `ui/WebGLFallback.tsx` (mensagem de navegador incompatível)
    - _Requirements: 1.6, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 11.3 Escrever teste de exemplo para a troca de texto do overlay
    - Verificar que mudar o passo ativo atualiza título/texto do overlay e o indicador "N de 8", e que o painel de notas atualiza o conteúdo exibido
    - _Requirements: 4.7, 4.9, 8.5_

- [ ] 12. Implementar os adaptadores de plataforma
  - [~] 12.1 Implementar o hook de atalhos de teclado com gating em inputs de texto
    - Criar `platform/useKeyboardShortcuts.ts` com `isEditableTarget(el)` e o roteamento das teclas (setas, espaço, F, N, R) para os comandos do store, ignorando quando o foco está em campo editável
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 12.2 Escrever teste de propriedade para o gating de teclas em campos editáveis
    - **Property 22: Atalhos ignorados em campos de texto editáveis**
    - **Validates: Requirements 7.9**

  - [~] 12.3 Implementar os hooks de fullscreen, reduced-motion e breakpoint de viewport
    - Criar `platform/useFullscreen.ts` (Fullscreen API tratando rejeição da Promise, evento `fullscreenchange` e Esc), `platform/useReducedMotion.ts` (`matchMedia` com listener) e `platform/useViewportBreakpoint.ts` (breakpoints + resize)
    - _Requirements: 2.3, 9.1, 9.2, 9.3, 9.4, 9.5, 11.1_

  - [ ]* 12.4 Escrever teste de integração para a Fullscreen API
    - Verificar entrar/sair, tratamento de rejeição (mensagem + `console.error`) e saída via Esc, com a Fullscreen API mockada
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 13. Integrar tudo no App Shell
  - [~] 13.1 Compor a Scene, o UI Overlay e os adaptadores
    - Criar `App.tsx` compondo `SceneCanvas` + `Overlay`, ligando os hooks de plataforma ao store, com `ErrorBoundary` e exibição da mensagem de erro de validação do Tour_Data (não iniciar o tour em caso de erro)
    - Ligar `main.tsx` ao `App.tsx`
    - _Requirements: 4.2, 5.3, 5.4, 9.3, 11.5_

  - [ ]* 13.2 Escrever teste de exemplo para o roteamento de teclas e o fluxo de erro de dados
    - Verificar que teclas mapeadas acionam os comandos corretos via App e que Tour_Data inválido exibe a mensagem de erro sem iniciar o tour
    - _Requirements: 5.3, 5.4, 7.1, 7.3, 7.6, 7.7, 7.8_

- [~] 14. Checkpoint — Garantir que a aplicação integrada passa nos testes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Configurar o build estático e o deploy
  - [~] 15.1 Finalizar a configuração de build e os arquivos de deploy
    - Garantir que `vite build` gere `dist/` apenas com estáticos e respeite `base` de subcaminho; criar arquivos de configuração de deploy (ex.: `vercel.json` e/ou workflow do GitHub Pages) sem alterar código
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 15.2 Escrever teste de integração para o build estático
    - Verificar que o build produz `dist/` só com artefatos estáticos, que `base` de subcaminho gera caminhos corretos e que a falha de build encerra com exit code ≠ 0 sem escrever/modificar `dist/`
    - _Requirements: 10.1, 10.2, 10.4_

- [~] 16. Checkpoint final — Garantir que todos os testes passam
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais (testes) e podem ser puladas para um MVP mais rápido; as tarefas de implementação principal nunca são opcionais.
- Cada tarefa referencia requisitos específicos para rastreabilidade; tarefas de teste de propriedade referenciam a Propriedade e o requisito do design.
- A ordem respeita a Regra da Dependência: `tour-data/` → `state/` → `scene/`/`ui/` → `platform/` → App Shell → build/deploy.
- Testes de propriedade usam **fast-check** com **≥100 iterações** (`fc.assert(..., { numRuns: 100 })`) e são anotados como `// Feature: clean-architecture-3d-visualizer, Property {number}: {property_text}`.
- Testes de exemplo/integração cobrem rendering 3D, Fullscreen API e build (áreas fora do escopo de PBT).
- A regra ESLint `import/no-restricted-paths` (tarefa 1.3) impõe estaticamente o desacoplamento do requisito 5.1.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "8.1", "8.6", "10.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "3.1", "4.1", "5.1", "8.2", "8.3", "8.4", "8.5", "8.7", "8.8", "8.9", "8.10", "10.2", "10.3"] },
    { "id": 4, "tasks": ["2.6", "3.2", "3.3", "3.4", "3.5", "4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4", "6.1", "9.1"] },
    { "id": 5, "tasks": ["6.2", "9.2", "9.3", "11.1", "11.2", "12.1", "12.3"] },
    { "id": 6, "tasks": ["9.4", "9.5", "11.3", "12.2", "12.4", "13.1"] },
    { "id": 7, "tasks": ["13.2", "15.1"] },
    { "id": 8, "tasks": ["15.2"] }
  ]
}
```
