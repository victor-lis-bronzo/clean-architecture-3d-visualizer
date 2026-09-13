// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

/**
 * Configuração ESLint (flat config) do Clean Architecture 3D Visualizer.
 *
 * O objetivo central desta config é impor **estaticamente** a Regra da
 * Dependência do design (requisito 5.1). As dependências apontam para dentro,
 * em direção ao núcleo `tour-data/`:
 *
 *   - `src/tour-data/**` NÃO pode importar de `src/scene/**`, `src/ui/**`,
 *     `src/state/**`, `src/scene/**`, nem de `react`/`react-dom` (núcleo puro).
 *   - `src/scene/**` NÃO pode importar de `src/ui/**`.
 *   - `src/ui/**`    NÃO pode importar de `src/scene/**`.
 *
 * A regra `import-x/no-restricted-paths` cobre as fronteiras entre os domínios
 * do projeto (imports por caminho), e `no-restricted-imports` cobre a proibição
 * de importar o pacote `react`/`react-dom` dentro de `tour-data/`.
 */
export default tseslint.config(
  // Não lintar artefatos de build/deps e a própria config.
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // Base recomendada JS + TS.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Regras arquiteturais aplicadas a todo o código-fonte TS/TSX.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'import-x': importX,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: ['tsconfig.app.json', 'tsconfig.node.json'],
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
    },
    rules: {
      // ── Regra da Dependência (requisito 5.1) ──
      // `no-restricted-paths` impede que um conjunto de arquivos (`from`)
      // importe de um alvo (`target`). Cada zona materializa uma seta proibida
      // do grafo de dependências do design.
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // tour-data (núcleo) não importa de nenhum outro domínio.
            {
              target: './src/tour-data',
              from: './src/scene',
              message:
                'tour-data/ é o núcleo puro e não pode importar de scene/ (Regra da Dependência, req. 5.1).',
            },
            {
              target: './src/tour-data',
              from: './src/ui',
              message:
                'tour-data/ é o núcleo puro e não pode importar de ui/ (Regra da Dependência, req. 5.1).',
            },
            {
              target: './src/tour-data',
              from: './src/state',
              message:
                'tour-data/ é o núcleo puro e não pode importar de state/ (Regra da Dependência, req. 5.1).',
            },
            {
              target: './src/tour-data',
              from: './src/platform',
              message:
                'tour-data/ é o núcleo puro e não pode importar de platform/ (Regra da Dependência, req. 5.1).',
            },
            // scene/ não importa de ui/ (domínios 3D e 2D desacoplados).
            {
              target: './src/scene',
              from: './src/ui',
              message:
                'scene/ (3D) não pode importar de ui/ (2D); a comunicação ocorre pelo store (req. 5.1).',
            },
            // ui/ não importa de scene/.
            {
              target: './src/ui',
              from: './src/scene',
              message:
                'ui/ (2D) não pode importar de scene/ (3D); a comunicação ocorre pelo store (req. 5.1).',
            },
          ],
        },
      ],
    },
  },

  // Proibição de importar React dentro de tour-data/ (núcleo sem deps de UI).
  // `no-restricted-paths` cobre caminhos do projeto; pacotes bare (react) são
  // cobertos por `no-restricted-imports`, escopado apenas a tour-data/.
  {
    files: ['src/tour-data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'tour-data/ é um módulo TS puro e não pode depender de React (Regra da Dependência, req. 5.1).',
            },
            {
              name: 'react-dom',
              message:
                'tour-data/ é um módulo TS puro e não pode depender de react-dom (Regra da Dependência, req. 5.1).',
            },
          ],
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message:
                'tour-data/ é um módulo TS puro e não pode depender de React/react-dom (Regra da Dependência, req. 5.1).',
            },
          ],
        },
      ],
    },
  },
);
