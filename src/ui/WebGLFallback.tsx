/**
 * WebGLFallback — mensagem de navegador incompatível (req. 1.6).
 *
 * Componente do domínio `ui/` (2D). Conforme a Regra da Dependência
 * (requisito 5.1), NÃO importa nada de `scene/` (3D). É um componente
 * puramente apresentacional, sem estado nem efeitos colaterais: exibe uma
 * mensagem textual visível, em pt-BR, informando que o navegador não suporta a
 * visualização 3D. É renderizado pelo `SceneCanvas` (ou pelo App Shell) quando
 * a inicialização do WebGL falha, em substituição à cena — nenhuma esfera é
 * montada nesse cenário.
 *
 * _Requirements: 1.6_
 */

/** Título curto exibido no fallback de WebGL (pt-BR). */
export const WEBGL_FALLBACK_TITLE = 'Visualização 3D indisponível';

/**
 * Mensagem principal do fallback de WebGL (pt-BR, req. 1.6). Informa que o
 * navegador não suporta a visualização 3D.
 */
export const WEBGL_FALLBACK_MESSAGE =
  'Seu navegador não suporta a visualização 3D (WebGL). ' +
  'Tente atualizar o navegador ou habilitar a aceleração de hardware ' +
  'para exibir os círculos concêntricos da Clean Architecture.';

/**
 * Mensagem textual visível exibida quando a renderização WebGL não está
 * disponível (req. 1.6). Ocupa toda a área disponível e centraliza o conteúdo,
 * de modo a ficar evidente no lugar da cena 3D.
 */
export default function WebGLFallback() {
  return (
    <div
      role="alert"
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <h2 className="text-xl font-semibold tracking-tight text-gray-100">
        {WEBGL_FALLBACK_TITLE}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-gray-400">
        {WEBGL_FALLBACK_MESSAGE}
      </p>
    </div>
  );
}
