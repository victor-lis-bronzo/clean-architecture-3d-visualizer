/**
 * Tour_Data do cenário prático "CriarPedido" — módulo puro do núcleo.
 *
 * Materializa a Dependency_Rule (requisito 5.1): importa APENAS os tipos de
 * `./types`. NÃO importa nada de `scene/`, `ui/`, `state/`, `platform/` nem de
 * React/Three.js. Alterar o texto de qualquer passo aqui nunca toca em código
 * de cena ou de interface.
 *
 * Conteúdo: os 8 Tour_Steps do caso de uso "CriarPedido" (CreateOrder), na
 * ordem definida pelo requisito 4.1, cada um com `title`, `body`, `focusLayer`,
 * `camera` (posição + alvo) e `notes`, mapeados às Layers conforme a tabela da
 * seção Data Models do design:
 *
 * | order | título (resumo)                        | focusLayer                    |
 * |-------|----------------------------------------|-------------------------------|
 * |   1   | Visão geral e a Regra da Dependência   | Frameworks_And_Drivers (geral)|
 * |   2   | Frameworks & Drivers                   | Frameworks_And_Drivers        |
 * |   3   | Interface Adapters                     | Interface_Adapters            |
 * |   4   | Fronteira e Inversão de Dependência    | Interface_Adapters            |
 * |   5   | Use Cases                              | Use_Cases                     |
 * |   6   | Entities                               | Entities                      |
 * |   7   | Adaptadores de retorno                 | Interface_Adapters            |
 * |   8   | Síntese — "Detalhes são Detalhes"      | Entities (overview)           |
 *
 * Convenção de câmera: a câmera fica sempre no octante −X/−Z, de modo a encarar
 * de frente a abertura do corte de 90° (o interior exposto da "cebola"). Os raios
 * das esferas crescem de `Entities` (mais interna) a `Frameworks_And_Drivers`
 * (mais externa). O passo 1 (visão geral) usa uma câmera afastada; os passos de
 * foco aproximam-se progressivamente da Layer em discussão, sempre mirando
 * (target) o centro da cena e olhando PARA DENTRO da fatia aberta — nunca para o
 * lado sólido/traseiro. O passo final de síntese (8) é um overview de zoom-out:
 * afasta-se de volta ao enquadramento geral (todas as camadas visíveis, sem
 * destaque exclusivo) e NÃO segue o fluxo de aproximação dos passos anteriores.
 *
 * Os campos respeitam os limites do requisito 5.2 (title 1..80, body 1..1000,
 * notes 0..2000) e a sequência de `order` é 1..8 sem lacunas.
 */

import type { CameraConfig, TourData } from './types';

/**
 * Câmera de visão geral, afastada o suficiente para enquadrar as 4 Layers.
 * Posicionada no octante −X/−Z para encarar de frente a abertura do corte de 90°.
 */
const OVERVIEW_CAMERA: CameraConfig = {
  position: [-7.66, 5, -6.43],
  target: [0, 0, 0],
} as const;

/**
 * Os 8 Tour_Steps do "CriarPedido" (CreateOrder), na ordem do requisito 4.1.
 *
 * Cenário de referência: uma requisição HTTP `POST /orders` com corpo JSON cru
 * é recebida na borda externa, adaptada para um InputDTO, cruza a fronteira via
 * um Input Boundary, é orquestrada por um Use Case que aplica as invariantes das
 * Entities, e o resultado retorna por um Output Boundary → Presenter → ViewModel.
 * A tese central: "Detalhes são Detalhes" — o núcleo independe de banco e de UI.
 */
export const TOUR_DATA: TourData = [
  {
    order: 1,
    title: 'Visão geral e a Regra da Dependência',
    body:
      'Bem-vindos à "cebola 3D" da Clean Architecture. As quatro esferas concêntricas são as camadas do sistema: Entities no núcleo, envolvida por Use Cases, depois Interface Adapters e, na casca externa, Frameworks & Drivers. A regra que rege tudo é uma só — a Regra da Dependência: as dependências de código apontam sempre para dentro, das camadas externas para as internas. Nada no núcleo conhece o que existe fora dele. Vamos seguir o caso de uso "CriarPedido" (CreateOrder) atravessando cada camada, de fora para dentro e de volta.',
    focusLayer: 'Frameworks_And_Drivers',
    camera: OVERVIEW_CAMERA,
    notes:
      'Abertura do tour (Parte IV do roteiro). Enfatizar a metáfora da cebola e o corte de 90° que revela o interior. A ideia-chave a plantar já aqui: as setas de dependência apontam para dentro; o núcleo nunca importa a casca. Prometer que o "CriarPedido" vai concretizar a teoria. Sugestão de fala: "vamos acompanhar o dado entrando por uma requisição HTTP e voltando como uma resposta, cruzando fronteiras bem definidas". Tempo alvo: ~2 min.',
  },
  {
    order: 2,
    title: 'Frameworks & Drivers',
    body:
      'A camada mais externa é onde vivem os detalhes voláteis: o servidor web, o framework HTTP, o banco de dados, a UI. Aqui chega a requisição "POST /orders" com um corpo JSON cru — dados sem significado de negócio ainda. Esta camada não contém regras de negócio; ela apenas fornece a plataforma. É intencionalmente descartável: trocar Express por Fastify, ou Postgres por MySQL, não deve abalar o núcleo. Por isso ela ocupa a borda: tudo aqui depende do que está dentro, e nada do que está dentro depende daqui.',
    focusLayer: 'Frameworks_And_Drivers',
    camera: { position: [-7.05, 4, -5.91], target: [0, 0, 0] },
    notes:
      'Camada verde (Frameworks_And_Drivers, raio externo). Exemplos concretos: Express/Fastify, driver do Postgres, o navegador. Martelar: "detalhes". A requisição HTTP crua entra por aqui. Contraste didático: um framework é um detalhe substituível; a regra de negócio, não. Ponto de dependência: setas entram, nunca saem do núcleo para cá.',
  },
  {
    order: 3,
    title: 'Interface Adapters',
    body:
      'Um passo para dentro estão os Interface Adapters. É aqui que mora o CreateOrderController: ele recebe o JSON cru vindo do framework HTTP e o traduz em um InputDTO — uma estrutura de dados no formato que o núcleo entende. Esta camada converte entre o mundo externo (HTTP, SQL, formatos de serialização) e o mundo interno (casos de uso e entidades). Controllers, Presenters e Gateways vivem aqui. Repare: o adaptador conhece tanto o formato externo quanto a fronteira interna, mas o caso de uso jamais conhece HTTP.',
    focusLayer: 'Interface_Adapters',
    camera: { position: [-5.36, 3, -4.5], target: [0, 0, 0] },
    notes:
      'Camada azul (Interface_Adapters, raio 3). Personagem: CreateOrderController. Papel: adaptar/traduzir — JSON cru → InputDTO. Reforçar que "adaptar" é o verbo desta camada. Aqui também moram Presenters e Gateways (voltaremos aos Presenters no passo 7). Analogia útil: tradutor simultâneo entre dois idiomas — HTTP de um lado, linguagem do domínio do outro.',
  },
  {
    order: 4,
    title: 'Fronteira e Inversão de Dependência',
    body:
      'Como o Controller (externo) invoca o caso de uso (interno) sem que o núcleo dependa dele? Pela Inversão de Dependência. O núcleo define uma interface — o CreateOrderInputBoundary — e o Controller depende dessa abstração, não de uma implementação concreta. O caso de uso implementa a interface; o Controller apenas a chama, passando o InputDTO. A seta de dependência do código continua apontando para dentro, mesmo que o fluxo de controle atravesse a fronteira de fora para dentro. É o "D" do SOLID sustentando a Regra da Dependência na prática.',
    focusLayer: 'Interface_Adapters',
    camera: { position: [-4.83, 2.6, -4.05], target: [0, 0, 0] },
    notes:
      'Momento conceitual mais denso do tour. Destaque ainda na fronteira Interface_Adapters ↔ Use_Cases. Separar duas coisas que confundem a plateia: fluxo de controle (de fora para dentro) vs. direção de dependência do código-fonte (sempre para dentro). O InputBoundary é a interface que o núcleo possui; o Controller depende da abstração (DIP, o "D" de SOLID). Ligar de volta à Parte II (SOLID) da apresentação. Talvez desenhar as setas no ar.',
  },
  {
    order: 5,
    title: 'Use Cases',
    body:
      'Chegamos ao CreateOrderUseCase, o coração da aplicação. Ele orquestra a regra de negócio específica de "criar um pedido": recebe o InputDTO pela fronteira de entrada, coordena as Entities, valida o fluxo e prepara o resultado. Contém as regras de negócio da aplicação — as que existem por causa deste software específico — mas não as regras corporativas mais fundamentais (essas ficam nas Entities). Fundamental: o caso de uso não sabe se veio de um HTTP POST ou de um teste; não sabe se será salvo em Postgres ou em memória. Ele conhece apenas abstrações.',
    focusLayer: 'Use_Cases',
    camera: { position: [-3.45, 2, -2.89], target: [0, 0, 0] },
    notes:
      'Camada vermelho-coral (Use_Cases, raio 2). Personagem: CreateOrderUseCase. Distinção-chave: regras de negócio da APLICAÇÃO (use case) vs. regras de negócio CORPORATIVAS/empresariais (entities) — próximo passo. Enfatizar a independência: o caso de uso não conhece framework nem banco; conversa por interfaces (Input/Output Boundaries, Gateways). Bom lugar para lembrar: testar o caso de uso não requer servidor nem banco reais.',
  },
  {
    order: 6,
    title: 'Entities',
    body:
      'No núcleo estão as Entities: o Pedido (Order) e suas regras corporativas mais estáveis. É aqui que vivem as invariantes do negócio — um pedido precisa de ao menos um item, o total não pode ser negativo, quantidades são positivas. Essas regras existiriam mesmo sem software, sem web, sem banco. São as menos propensas a mudar e as que menos dependem de qualquer coisa: uma Entity não conhece caso de uso, controller, HTTP ou SQL. O CreateOrderUseCase pede à Entity que valide suas próprias invariantes; a Entity as garante e nada mais.',
    focusLayer: 'Entities',
    camera: { position: [-2.45, 1.5, -2.06], target: [0, 0, 0] },
    notes:
      'Camada amarelo-ouro (Entities, raio 1, mais interna). Personagem: a Entity Order e suas invariantes. Exemplos de invariante: pedido com ≥ 1 item, total ≥ 0, quantidade > 0. Frase de efeito: "estas regras existiriam mesmo se o negócio fosse feito com papel e caneta". É a camada mais estável e mais independente — zero dependências para fora. Contrastar com a volatilidade da casca externa (passo 2).',
  },
  {
    order: 7,
    title: 'Adaptadores de retorno',
    body:
      'O dado agora volta. O CreateOrderUseCase entrega seu resultado por outra interface do núcleo — o OutputBoundary — e não a um Presenter concreto. Novamente, inversão de dependência: o caso de uso conhece apenas a abstração de saída. Do lado de fora, o Presenter implementa esse boundary e transforma o resultado em um ViewModel: uma estrutura pronta para exibição, com números formatados, datas legíveis e mensagens. O Controller devolve então uma resposta HTTP. O núcleo nunca formatou nada para a tela — ele apenas produziu dados; a apresentação é, mais uma vez, um detalhe da borda.',
    focusLayer: 'Interface_Adapters',
    camera: { position: [-5.36, 3, -4.5], target: [0, 0, 0] },
    notes:
      'De volta à camada azul (Interface_Adapters) — agora no fluxo de saída. Cadeia: UseCase → OutputBoundary (interface do núcleo) → Presenter (implementação externa) → ViewModel → resposta HTTP. Reforçar a simetria com os passos 3–4: entrada usa InputBoundary/Controller, saída usa OutputBoundary/Presenter. O ViewModel é formatação para a tela — outro "detalhe". O núcleo produz dados, não pixels.',
  },
  {
    order: 8,
    title: 'Síntese — "Detalhes são Detalhes"',
    body:
      'Fechamos o ciclo do "CriarPedido": HTTP cru → Controller → InputDTO → InputBoundary → UseCase → Entities → OutputBoundary → Presenter → ViewModel → resposta. Cada fronteira foi cruzada com a dependência apontando sempre para dentro. A lição que fica é o mantra do Uncle Bob: "Detalhes são Detalhes". O banco de dados é um detalhe. A web é um detalhe. O framework é um detalhe. Eles orbitam o núcleo e podem ser trocados sem tocá-lo. As regras de negócio — Entities e Use Cases — são independentes de tudo isso, e é essa independência que torna o sistema testável, flexível e duradouro.',
    // `focusLayer` mantido para validação e direção de partículas; o destaque
    // exclusivo é SUPRIMIDO por `overview: true` (nenhuma camada é realçada).
    focusLayer: 'Entities',
    overview: true,
    camera: OVERVIEW_CAMERA,
    notes:
      'Encerramento. Recapitular o caminho completo de ida e volta em uma frase. Bordão final: "Detalhes são Detalhes" (banco, web, framework — todos substituíveis). Amarrar com o payoff prático: independência ⇒ testabilidade (sem servidor/banco), flexibilidade (trocar detalhes) e longevidade. A câmera faz um zoom-out de volta à visão geral de todas as camadas (não foca as Entities), reforçando que a síntese abrange o sistema inteiro. Reservar tempo para perguntas; observar o timer (faixa amarela/vermelha).',
  },
] as const;

export default TOUR_DATA;
