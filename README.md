# Clean Architecture 3D Visualizer

SPA 3D interativa dos círculos concêntricos da Clean Architecture (Vite + React + TypeScript + Tailwind + React Three Fiber). Aplicação 100% estática, sem backend, destinada a apoiar uma apresentação sobre Arquitetura de Software.

## Desenvolvimento

```bash
npm ci        # instala as dependências
npm run dev   # servidor de desenvolvimento
npm run build # gera o build estático em dist/
npm run test  # executa os testes (vitest --run)
npm run lint  # verifica o desacoplamento arquitetural (ESLint)
```

## Deploy

A aplicação é totalmente estática: o `npm run build` gera a pasta `dist/` contendo apenas `index.html` e os assets (JS/CSS/imagens). Basta servir esses arquivos por qualquer host estático.

O caminho base é configurável pela variável de ambiente `VITE_BASE` (padrão `/`), permitindo publicar tanto na raiz do host quanto em um subcaminho, sem alterar código-fonte.

### Vercel

O host serve a aplicação na raiz, portanto o `base` padrão (`/`) já funciona. A configuração está em `vercel.json`:

- `framework: vite`, `outputDirectory: dist`;
- `rewrites` reescreve todas as rotas para `/index.html`, garantindo o funcionamento do refresh/roteamento no cliente (SPA).

Basta conectar o repositório na Vercel — o build (`npm run build`) e o deploy são automáticos.

### GitHub Pages

O GitHub Pages serve o site em um subcaminho (`https://<usuario>.github.io/<repositorio>/`), então é preciso definir `VITE_BASE` com o nome do repositório (com barras nas pontas):

```bash
VITE_BASE=/clean-architecture-3d-visualizer/ npm run build
```

O workflow `.github/workflows/deploy-pages.yml` automatiza isso a cada push na branch `main`: faz `checkout`, instala Node, `npm ci`, roda `npm run build` com `VITE_BASE` já configurado para o subcaminho do repositório, publica `dist/` como artefato do Pages e faz o deploy via `actions/deploy-pages`.

> Se o nome do repositório for diferente, ajuste o valor de `VITE_BASE` no workflow para `/<nome-do-repositorio>/`.
