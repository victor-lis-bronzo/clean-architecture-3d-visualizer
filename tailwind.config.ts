import type { Config } from 'tailwindcss';

/**
 * Configuração do Tailwind CSS.
 *
 * O `content` cobre o HTML raiz e todos os módulos de UI/Scene em `src/`,
 * permitindo o tree-shaking das classes utilitárias no build estático.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
