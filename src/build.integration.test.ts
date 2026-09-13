/**
 * Teste de integração do build estático.
 *
 * Diferentemente dos testes de unidade/propriedade (lógica pura), este arquivo
 * exercita o pipeline real de build (`tsc -b && vite build`) via `execSync`,
 * inspecionando os artefatos gerados em `dist/` no sistema de arquivos.
 *
 * Cobertura (Requisito 10):
 *  - 10.1: o build produz `dist/` composto EXCLUSIVAMENTE por artefatos
 *          estáticos (HTML/CSS/JS/assets), sem arquivos que exijam servidor.
 *  - 10.4: com `base` de subcaminho (VITE_BASE), o `index.html` referencia os
 *          assets com o prefixo de subcaminho correto.
 *  - 10.2: um build que falha encerra com exit code != 0 e NÃO grava/modifica
 *          o conteúdo de `dist/` (o Vite escreve a saída apenas em caso de
 *          sucesso).
 *
 * Este é um teste HERMÉTICO: ele restaura um `dist/` de base padrão ao final,
 * evitando deixar o repositório com um `dist/` específico de subcaminho.
 *
 * Como `vite build` é demorado, cada caso usa timeout generoso. É possível
 * pular o suite em CI restrita definindo `SKIP_BUILD_INTEGRATION=1`.
 */
/// <reference types="node" />
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// Raiz do projeto: este arquivo vive em <root>/src/, então subimos um nível.
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

const SUBPATH_BASE = '/clean-architecture-3d-visualizer/';

// Timeout generoso: `tsc -b && vite build` pode levar dezenas de segundos.
const BUILD_TIMEOUT_MS = 180_000;

// Guard para ambientes de CI restritos.
const SKIP = process.env.SKIP_BUILD_INTEGRATION === '1';
const describeBuild = SKIP ? describe.skip : describe;

// Extensões consideradas artefatos estáticos válidos em `dist/assets`.
const STATIC_ASSET_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.map',
  '.html',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.wasm',
  '.txt',
  '.webmanifest',
  '.mp3',
  '.mp4',
  '.hdr',
  '.glb',
  '.gltf',
]);

// Padrões que jamais devem aparecer num build 100% estático (exigem servidor).
const SERVER_SIDE_EXTENSIONS = new Set([
  '.php',
  '.py',
  '.rb',
  '.jsp',
  '.asp',
  '.aspx',
  '.cgi',
]);

/**
 * Lista recursivamente todos os arquivos (caminhos relativos a `dir`).
 */
function listFilesRecursive(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
    } else {
      out.push(path.relative(base, full));
    }
  }
  return out.sort();
}

/**
 * Snapshot do conteúdo de `dist/` para detectar modificações: nome + tamanho +
 * mtime de cada arquivo. Se o build de falha modificar `dist/`, o snapshot muda.
 */
function snapshotDir(dir: string): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const rel of listFilesRecursive(dir)) {
    const st = statSync(path.join(dir, rel));
    snap[rel] = `${st.size}:${st.mtimeMs}`;
  }
  return snap;
}

/**
 * Executa o build com um `base` específico. Lança em caso de exit != 0.
 */
function runBuild(base: string): void {
  execSync('npm run build', {
    cwd: PROJECT_ROOT,
    env: { ...process.env, VITE_BASE: base },
    stdio: 'pipe',
    timeout: BUILD_TIMEOUT_MS,
  });
}

describeBuild('build estático (integração)', () => {
  // Garante que, aconteça o que acontecer, o repositório termina com um
  // `dist/` de base padrão ('/'), mantendo o teste hermético.
  afterAll(() => {
    try {
      runBuild('/');
    } catch {
      // Se a restauração falhar, ainda assim não deixamos o suite quebrar aqui;
      // os casos individuais já terão reportado eventuais problemas de build.
    }
  }, BUILD_TIMEOUT_MS);

  it(
    'produz dist/ apenas com artefatos estáticos (Req 10.1)',
    () => {
      // Build de base padrão.
      runBuild('/');

      // dist/index.html deve existir.
      expect(existsSync(DIST_INDEX), 'dist/index.html deve existir').toBe(true);

      // dist/assets deve existir e conter apenas artefatos estáticos.
      expect(existsSync(ASSETS_DIR), 'dist/assets deve existir').toBe(true);
      const assetFiles = readdirSync(ASSETS_DIR, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name);
      expect(assetFiles.length).toBeGreaterThan(0);
      for (const file of assetFiles) {
        const ext = path.extname(file).toLowerCase();
        expect(
          STATIC_ASSET_EXTENSIONS.has(ext),
          `asset com extensão inesperada em dist/assets: ${file}`,
        ).toBe(true);
      }

      // Nenhum arquivo do build inteiro pode exigir execução no servidor.
      const allFiles = listFilesRecursive(DIST_DIR);
      for (const rel of allFiles) {
        const ext = path.extname(rel).toLowerCase();
        expect(
          SERVER_SIDE_EXTENSIONS.has(ext),
          `arquivo server-side inesperado no build: ${rel}`,
        ).toBe(false);
      }

      // Não deve haver um entry de servidor (server.js/server.mjs) nem uma
      // pasta de API típica de backend.
      const topLevel = readdirSync(DIST_DIR);
      expect(topLevel).not.toContain('server.js');
      expect(topLevel).not.toContain('server.mjs');
      expect(topLevel).not.toContain('api');

      // O index.html deve referenciar os assets por caminho estático
      // (base padrão '/': prefixo "/assets/"; também aceitamos "./assets/").
      const html = readFileSync(DIST_INDEX, 'utf8');
      expect(
        /(?:src|href)=["'](?:\.)?\/assets\//.test(html),
        'index.html deve referenciar ./assets ou /assets',
      ).toBe(true);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'gera caminhos de asset com prefixo de subcaminho ao usar base configurável (Req 10.4)',
    () => {
      // Build com base de subcaminho.
      runBuild(SUBPATH_BASE);

      expect(existsSync(DIST_INDEX)).toBe(true);
      const html = readFileSync(DIST_INDEX, 'utf8');

      // As URLs de assets no HTML devem estar prefixadas com o subcaminho.
      const expectedPrefix = `${SUBPATH_BASE}assets/`;
      expect(
        html.includes(expectedPrefix),
        `index.html deve conter URLs de assets prefixadas com "${expectedPrefix}"`,
      ).toBe(true);

      // E NÃO devem apontar para a raiz "/assets/" (sem o subcaminho).
      expect(
        /(?:src|href)=["']\/assets\//.test(html),
        'com base de subcaminho, os assets não devem usar o prefixo raiz "/assets/"',
      ).toBe(false);

      // Restaura a base padrão para não deixar um dist/ específico de subcaminho.
      runBuild('/');
      const restored = readFileSync(DIST_INDEX, 'utf8');
      expect(restored.includes(expectedPrefix)).toBe(false);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'falha de build encerra com exit code != 0 sem modificar dist/ (Req 10.2)',
    () => {
      // Parte de um dist/ válido e conhecido (base padrão).
      runBuild('/');
      expect(existsSync(DIST_INDEX)).toBe(true);

      const before = snapshotDir(DIST_DIR);
      const indexBefore = readFileSync(DIST_INDEX, 'utf8');

      // Provoca uma falha determinística: aponta o Vite para um arquivo de
      // configuração inexistente. Isso deve encerrar com exit != 0 e, como o
      // Vite só grava a saída em caso de sucesso, dist/ permanece intacto.
      const tmp = mkdtempSync(path.join(tmpdir(), 'bad-cfg-'));
      const missingConfig = path.join(tmp, 'does-not-exist.config.ts');

      let threw = false;
      let exitCode: number | undefined;
      try {
        execSync(
          `npx vite build --config "${missingConfig}"`,
          {
            cwd: PROJECT_ROOT,
            env: { ...process.env },
            stdio: 'pipe',
            timeout: BUILD_TIMEOUT_MS,
          },
        );
      } catch (err: unknown) {
        threw = true;
        exitCode = (err as { status?: number }).status;
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }

      // O comando de build com falha DEVE encerrar com código != 0.
      expect(threw, 'o build com config inexistente deveria falhar').toBe(true);
      if (typeof exitCode === 'number') {
        expect(exitCode).not.toBe(0);
      }

      // dist/ NÃO pode ter sido modificado pela build que falhou.
      const after = snapshotDir(DIST_DIR);
      expect(after).toEqual(before);

      // O index.html preservado deve ser idêntico ao anterior à falha.
      const indexAfter = readFileSync(DIST_INDEX, 'utf8');
      expect(indexAfter).toBe(indexBefore);
    },
    BUILD_TIMEOUT_MS,
  );
});
