# Requirements Document

## Introduction

Este documento especifica os requisitos para o **Clean Architecture 3D Visualizer**: uma aplicação web interativa de página única (SPA), 100% estática e sem backend, destinada a apoiar uma apresentação de 30 minutos sobre Arquitetura de Software no IFSP. A aplicação oferece uma experiência visual tridimensional interativa dos círculos concêntricos da Clean Architecture de Robert C. Martin ("Uncle Bob").

A ferramenta é o ponto culminante da Parte IV de um roteiro de apresentação de quatro partes (Fundamentos, SOLID, Componentes, Clean Architecture) e demonstra, na prática, a Regra da Dependência por meio da metáfora de uma "cebola 3D com corte de 90 graus". Um cenário prático guiado de 8 passos (o caso de uso "CriarPedido") conduz o público através de cada camada arquitetural. A aplicação é compilada como build estático (`dist/`) e publicada no Vercel ou GitHub Pages.

O escopo deste documento cobre: a renderização e o comportamento da cena 3D, a interface 2D sobreposta, o sistema de tour guiado de 8 passos, os controles de apresentação (timer, atalhos de teclado, notas do apresentador), e as características não funcionais de build e deploy.

## Glossary

- **Visualizer**: A aplicação web SPA completa (cena 3D + interface 2D + dados do tour) que constitui o produto especificado neste documento.
- **Scene_Renderer**: O subsistema responsável por renderizar a cena 3D dos círculos concêntricos (esferas, anéis, partículas, câmera) usando Three.js e React Three Fiber.
- **Layer**: Cada uma das quatro camadas arquiteturais representadas como uma esfera concêntrica. Os valores válidos são: `Entities`, `Use_Cases`, `Interface_Adapters`, `Frameworks_And_Drivers`.
- **Boundary_Ring**: Um anel luminoso renderizado na fronteira entre duas Layers adjacentes, representando o cruzamento de fronteira arquitetural.
- **Data_Particle**: Um elemento visual animado que simula o tráfego de dados atravessando as fronteiras entre Layers.
- **Camera_Controller**: O subsistema que gerencia a posição e o alvo da câmera 3D, incluindo transições suaves por interpolação linear (lerp).
- **Tour_Controller**: O subsistema que gerencia a progressão pelos passos do cenário prático guiado.
- **Tour_Step**: Um dos 8 passos do cenário prático "CriarPedido", cada um com dados estáticos (título, texto explicativo, Layer em foco, configuração de câmera, notas do apresentador).
- **Presentation_Timer**: O componente que exibe o tempo decorrido da apresentação e sinaliza faixas de tempo por cor.
- **Presenter_Notes_Panel**: O painel sobreposto que exibe as notas do apresentador para o Tour_Step atual.
- **UI_Overlay**: A camada de interface 2D sobreposta à cena 3D (controles, textos, timer, indicadores).
- **Keyboard_Handler**: O subsistema que captura e processa os atalhos de teclado.
- **Static_Build**: O conjunto de artefatos estáticos gerados na pasta `dist/` pelo comando de build.
- **Dependency_Rule**: A regra formal da Clean Architecture segundo a qual as dependências de código-fonte apontam estritamente para dentro (das camadas externas para as internas).
- **Tour_Data**: A estrutura de dados estática, desacoplada da cena e da interface, que descreve os 8 Tour_Steps.

## Requirements

### Requisito 1: Renderização da Cena 3D dos Círculos Concêntricos

**User Story:** Como apresentador, quero visualizar as quatro camadas da Clean Architecture como esferas concêntricas em 3D, para que o público compreenda visualmente a estrutura em camadas da arquitetura.

#### Acceptance Criteria

1. WHEN o Visualizer é carregado, THE Scene_Renderer SHALL renderizar exatamente quatro esferas concêntricas representando as Layers `Entities`, `Use_Cases`, `Interface_Adapters` e `Frameworks_And_Drivers`, uma esfera por Layer.
2. THE Scene_Renderer SHALL renderizar as Layers em ordem crescente de raio, sendo `Entities` a esfera de menor raio (mais interna), seguida por `Use_Cases`, `Interface_Adapters` e `Frameworks_And_Drivers` como a esfera de maior raio (mais externa), com cada raio estritamente maior que o da Layer imediatamente interior.
3. THE Scene_Renderer SHALL aplicar a cada uma das quatro Layers um material PBR (Physically Based Rendering) e uma cor únicos e mutuamente distintos, conforme definido em uma paleta de cores fixa que atribui exatamente uma cor a cada Layer.
4. THE Scene_Renderer SHALL renderizar as Layers com um corte de seção de exatamente 90 graus (um quadrante removido), de modo que a superfície interior de todas as quatro esferas concêntricas fique visível a partir da câmera.
5. WHEN o Visualizer é carregado, THE Scene_Renderer SHALL renderizar um Boundary_Ring luminoso em cada uma das três fronteiras entre Layers adjacentes, totalizando três Boundary_Rings.
6. IF a inicialização da renderização WebGL falha, THEN THE Visualizer SHALL exibir uma mensagem textual visível informando que o navegador não suporta a visualização 3D e SHALL não exibir nenhuma esfera.

### Requisito 2: Partículas de Tráfego de Dados

**User Story:** Como apresentador, quero ver partículas animadas atravessando as fronteiras das camadas, para que o público visualize o fluxo de dados entre as camadas da arquitetura.

#### Acceptance Criteria

1. WHILE a cena 3D está ativa, THE Scene_Renderer SHALL animar entre 20 e 200 Data_Particles que se movem entre as Layers, mantendo no mínimo 30 quadros por segundo.
2. WHEN o Tour_Step atualmente em foco muda, THE Scene_Renderer SHALL orientar o vetor de movimento das Data_Particles na direção coerente com o Tour_Step ativo dentro de 500 milissegundos.
3. WHERE a preferência de sistema do usuário indica redução de movimento (`prefers-reduced-motion`), THE Scene_Renderer SHALL suprimir a animação das Data_Particles, mantendo-as em posições estáticas.
4. IF a quantidade de Data_Particles solicitada excede 200, THEN THE Scene_Renderer SHALL limitar a quantidade renderizada a 200 sem interromper a animação das Layers.
5. WHILE uma Data_Particle atinge o destino de fronteira, THE Scene_Renderer SHALL reciclar a Data_Particle, mantendo-a contida dentro dos limites das Layers.

### Requisito 3: Controle e Transições de Câmera

**User Story:** Como apresentador, quero que a câmera se mova suavemente para focar a camada em discussão, para que a atenção do público seja direcionada ao ponto relevante sem transições bruscas.

#### Acceptance Criteria

1. WHEN um novo Tour_Step é ativado, THE Camera_Controller SHALL interpolar (lerp) a posição e o alvo da câmera desde os valores atuais até a configuração de câmera definida naquele Tour_Step, usando uma função de suavização (easing) que resulte em velocidade nula no início e no fim da transição.
2. WHEN uma transição de câmera é iniciada, THE Camera_Controller SHALL concluir a transição em uma duração configurável entre 0,3 e 2,0 segundos, com valor padrão de 1,0 segundo.
3. WHEN o usuário aciona o atalho de reset de câmera, THE Camera_Controller SHALL interpolar a posição e o alvo da câmera desde os valores atuais até a posição e o alvo iniciais de visão geral, respeitando a mesma duração e função de suavização definidas para as demais transições.
4. WHILE uma transição de câmera está em andamento, THE Camera_Controller SHALL ignorar os comandos manuais de órbita, zoom e pan do usuário.
5. WHILE nenhuma transição está em andamento, THE Camera_Controller SHALL permitir que o usuário faça órbita, zoom e pan da câmera manualmente.
6. IF o Tour_Step ativado não possui uma configuração de câmera definida, THEN THE Camera_Controller SHALL manter a posição e o alvo atuais da câmera sem iniciar nenhuma transição.
7. IF o usuário aciona o atalho de reset de câmera enquanto uma transição já está em andamento, THEN THE Camera_Controller SHALL cancelar a transição em andamento e iniciar a interpolação até a posição e o alvo iniciais de visão geral.

### Requisito 4: Tour Guiado do Cenário Prático "CriarPedido"

**User Story:** Como apresentador, quero conduzir o público por um cenário prático de 8 passos do caso de uso "CriarPedido", para que a teoria da Clean Architecture seja demonstrada na prática.

#### Acceptance Criteria

1. THE Tour_Controller SHALL disponibilizar exatamente 8 Tour_Steps, na seguinte ordem: (1) Visão geral e a Regra da Dependência; (2) Frameworks & Drivers; (3) Interface Adapters; (4) Fronteira e Inversão de Dependência; (5) Use Cases; (6) Entities; (7) Adaptadores de retorno; (8) Síntese e "Detalhes são Detalhes".
2. WHEN o Visualizer conclui o carregamento, THE Tour_Controller SHALL definir o Tour_Step 1 como o único Tour_Step ativo.
3. WHEN o usuário aciona o comando de avançar enquanto qualquer Tour_Step de 1 a 7 está ativo, THE Tour_Controller SHALL ativar o Tour_Step de número imediatamente superior (N+1) como o único Tour_Step ativo.
4. WHEN o usuário aciona o comando de retroceder enquanto qualquer Tour_Step de 2 a 8 está ativo, THE Tour_Controller SHALL ativar o Tour_Step de número imediatamente inferior (N-1) como o único Tour_Step ativo.
5. IF o usuário aciona o comando de avançar enquanto o Tour_Step 8 está ativo, THEN THE Tour_Controller SHALL manter o Tour_Step 8 como o único Tour_Step ativo, sem alterar o passo ativo.
6. IF o usuário aciona o comando de retroceder enquanto o Tour_Step 1 está ativo, THEN THE Tour_Controller SHALL manter o Tour_Step 1 como o único Tour_Step ativo, sem alterar o passo ativo.
7. WHEN um Tour_Step é ativado, THE UI_Overlay SHALL exibir o título e o texto explicativo definidos para aquele Tour_Step, substituindo o título e o texto do Tour_Step anterior.
8. WHEN um Tour_Step é ativado, THE Scene_Renderer SHALL aplicar o destaque visual exclusivamente à Layer em foco definida para aquele Tour_Step e SHALL remover o destaque de todas as demais Layers.
9. WHEN um Tour_Step é ativado, THE UI_Overlay SHALL exibir o indicador de posição no formato "N de 8", onde N é o número do Tour_Step ativo (1 a 8) e 8 é o total de Tour_Steps.
10. IF o comando de avançar ou de retroceder é acionado enquanto uma transição entre Tour_Steps ainda está em andamento, THEN THE Tour_Controller SHALL ignorar o comando até que a transição em andamento seja concluída.

### Requisito 5: Dados Estáticos do Tour Desacoplados

**User Story:** Como desenvolvedor, quero que o conteúdo do tour esteja em uma estrutura de dados estática desacoplada, para que o conteúdo possa ser mantido sem alterar a cena 3D ou a interface.

#### Acceptance Criteria

1. THE Visualizer SHALL obter o conteúdo de cada Tour_Step a partir de uma estrutura Tour_Data estática, definida em módulo separado dos arquivos de código da cena 3D e da interface 2D, sem que a alteração do conteúdo textual de qualquer Tour_Step exija modificação nesses arquivos de código.
2. THE Tour_Data SHALL conter entre 1 e 50 registros de Tour_Step, cada um definindo obrigatoriamente os campos: identificador de ordem (número inteiro único de 1 a 50, sequencial e sem lacunas), título (texto de 1 a 80 caracteres), texto explicativo (texto de 1 a 1000 caracteres), Layer em foco (identificador de uma Layer existente), configuração de câmera (posição e alvo) e notas do apresentador (texto de 0 a 2000 caracteres).
3. IF um Tour_Step possui campo obrigatório ausente, com valor vazio fora dos limites definidos, ou com identificador de ordem duplicado ou não sequencial, THEN THE Visualizer SHALL rejeitar o carregamento do Tour_Data, exibir uma mensagem de erro indicando o Tour_Step e o campo inválido, e não iniciar o tour.
4. IF um Tour_Step referencia um Layer em foco inexistente na cena 3D, THEN THE Visualizer SHALL rejeitar o carregamento do Tour_Data e exibir uma mensagem de erro indicando o Tour_Step e o identificador de Layer inválido.

### Requisito 6: Timer de Apresentação com Alertas por Faixa de Tempo

**User Story:** Como apresentador, quero um timer discreto com alertas visuais por cor, para que eu controle o tempo dos 30 minutos da apresentação sem perder o ritmo.

#### Acceptance Criteria

1. WHEN o usuário aciona o comando de iniciar o timer, THE Presentation_Timer SHALL começar a contar o tempo decorrido a partir de 00:00 e atualizar a exibição no formato mm:ss a cada 1 segundo, com no máximo 1 segundo de defasagem em relação ao tempo real.
2. WHILE o tempo decorrido é maior ou igual a 00:00 e inferior a 20:00 minutos, THE Presentation_Timer SHALL exibir o indicador de tempo na cor verde.
3. WHILE o tempo decorrido é maior ou igual a 20:00 minutos e inferior a 27:00 minutos, THE Presentation_Timer SHALL exibir o indicador de tempo na cor amarela.
4. WHILE o tempo decorrido é maior ou igual a 27:00 minutos, THE Presentation_Timer SHALL exibir o indicador de tempo na cor vermelha.
5. WHEN o usuário aciona o comando de pausar o timer, THE Presentation_Timer SHALL interromper a contagem em no máximo 1 segundo e preservar o valor do tempo decorrido exibido no formato mm:ss.
6. WHEN o usuário aciona o comando de reiniciar o timer, THE Presentation_Timer SHALL redefinir o tempo decorrido para 00:00 e interromper a contagem até que um novo comando de iniciar seja acionado.
7. WHEN o usuário aciona o comando de iniciar o timer enquanto o timer está pausado, THE Presentation_Timer SHALL retomar a contagem a partir do tempo decorrido preservado.
8. IF o tempo decorrido atinge ou ultrapassa 30:00 minutos, THEN THE Presentation_Timer SHALL continuar contando e manter o indicador de tempo na cor vermelha.

### Requisito 7: Atalhos de Teclado

**User Story:** Como apresentador, quero controlar a aplicação por atalhos de teclado, para que eu conduza a apresentação sem depender do mouse.

#### Acceptance Criteria

1. WHEN o usuário pressiona a tecla seta para a direita e existe um Tour_Step subsequente, THE Keyboard_Handler SHALL acionar o comando de avançar para o próximo Tour_Step dentro de 100 milissegundos.
2. IF o usuário pressiona a tecla seta para a direita e o Tour_Step atual é o último da sequência, THEN THE Keyboard_Handler SHALL manter o Tour_Step atual inalterado e não acionar nenhuma transição.
3. WHEN o usuário pressiona a tecla seta para a esquerda e existe um Tour_Step anterior, THE Keyboard_Handler SHALL acionar o comando de retroceder para o Tour_Step anterior dentro de 100 milissegundos.
4. IF o usuário pressiona a tecla seta para a esquerda e o Tour_Step atual é o primeiro da sequência, THEN THE Keyboard_Handler SHALL manter o Tour_Step atual inalterado e não acionar nenhuma transição.
5. WHEN o usuário pressiona a tecla de espaço e existe um Tour_Step subsequente, THE Keyboard_Handler SHALL acionar o comando de avançar para o próximo Tour_Step dentro de 100 milissegundos.
6. WHEN o usuário pressiona a tecla F, THE Keyboard_Handler SHALL alternar o modo de tela cheia do Visualizer entre ativado e desativado dentro de 100 milissegundos, aplicando o estado oposto ao estado atual.
7. WHEN o usuário pressiona a tecla N, THE Keyboard_Handler SHALL alternar a visibilidade do Presenter_Notes_Panel entre visível e oculto dentro de 100 milissegundos, aplicando o estado oposto ao estado atual.
8. WHEN o usuário pressiona a tecla R, THE Keyboard_Handler SHALL acionar o comando de reset de câmera, restaurando a posição e orientação padrão da câmera dentro de 100 milissegundos.
9. WHILE o foco do teclado está em um campo de entrada de texto editável, THE Keyboard_Handler SHALL ignorar as teclas seta para a direita, seta para a esquerda, espaço, F, N e R sem acionar seus comandos associados.

### Requisito 8: Painel de Notas do Apresentador

**User Story:** Como apresentador, quero ver notas privadas para cada passo, para que eu me lembre dos pontos-chave a comentar em cada camada.

#### Acceptance Criteria

1. WHEN o usuário aciona o comando de alternar notas e o Presenter_Notes_Panel está oculto, THE Presenter_Notes_Panel SHALL tornar-se visível em até 300 milissegundos.
2. WHEN o usuário aciona o comando de alternar notas e o Presenter_Notes_Panel está visível, THE Presenter_Notes_Panel SHALL tornar-se oculto em até 300 milissegundos.
3. WHILE o Presenter_Notes_Panel está visível, THE Presenter_Notes_Panel SHALL exibir o texto das notas do apresentador definidas para o Tour_Step atualmente ativo, limitado a no máximo 5.000 caracteres, truncando o excedente com um indicador visual de truncamento.
4. WHILE o Presenter_Notes_Panel está visível e o Tour_Step atualmente ativo não possui notas do apresentador definidas, THE Presenter_Notes_Panel SHALL exibir uma mensagem de estado vazio indicando que não há notas para o passo atual.
5. WHEN o Tour_Step atualmente ativo muda enquanto o Presenter_Notes_Panel está visível, THE Presenter_Notes_Panel SHALL atualizar as notas exibidas para as notas do novo Tour_Step ativo em até 300 milissegundos.
6. WHEN o Visualizer é carregado, THE Presenter_Notes_Panel SHALL iniciar oculto.

### Requisito 9: Modo Tela Cheia

**User Story:** Como apresentador, quero exibir a aplicação em tela cheia, para que a projeção ocupe toda a tela durante a apresentação.

#### Acceptance Criteria

1. WHEN o usuário aciona o comando de tela cheia e o Visualizer não está em tela cheia, THE Visualizer SHALL entrar no modo de tela cheia ocupando 100% da largura e altura da tela em até 500 milissegundos.
2. WHEN o usuário aciona o comando de tela cheia e o Visualizer está em tela cheia, THE Visualizer SHALL sair do modo de tela cheia e restaurar as dimensões da janela ao estado anterior à entrada em tela cheia em até 500 milissegundos.
3. IF o navegador rejeita a solicitação de tela cheia, THEN THE Visualizer SHALL permanecer no modo de exibição atual sem alterar as dimensões, exibir uma mensagem indicando que a solicitação foi negada e registrar a falha no console.
4. WHILE o Visualizer está em tela cheia, THE Visualizer SHALL exibir apenas o conteúdo de apresentação, ocultando controles de navegador do sistema operacional quando aplicável.
5. WHEN o usuário pressiona a tecla Esc enquanto o Visualizer está em tela cheia, THE Visualizer SHALL sair do modo de tela cheia.

### Requisito 10: Build Estático e Deploy

**User Story:** Como desenvolvedor, quero gerar um build estático publicável, para que a aplicação seja hospedada no Vercel ou GitHub Pages sem backend.

#### Acceptance Criteria

1. WHEN o comando de build é executado com sucesso, THE Visualizer SHALL gerar o Static_Build na pasta `dist/` composto exclusivamente por artefatos estáticos (arquivos HTML, CSS, JavaScript e assets), sem nenhum arquivo que exija execução no servidor.
2. IF o comando de build falha, THEN THE Visualizer SHALL encerrar com código de saída diferente de zero, exibir uma mensagem de erro indicando a causa da falha e não gerar nem modificar o conteúdo da pasta `dist/`.
3. THE Static_Build SHALL funcionar sem qualquer servidor de aplicação ou serviço de backend, servindo todo o conteúdo por meio de requisições a arquivos estáticos.
4. WHEN o Static_Build é servido a partir de um subcaminho de host (por exemplo, `https://usuario.github.io/repositorio/`), THE Visualizer SHALL carregar todos os recursos (scripts, folhas de estilo, assets e rotas internas) usando caminhos relativos ou configuráveis, sem retornar erro de recurso não encontrado.
5. WHEN o Static_Build é aberto no navegador após o deploy, THE Visualizer SHALL renderizar a interface inicial completamente utilizável em até 3 segundos em uma conexão de 10 Mbps, sem exibir erros no console do navegador.

### Requisito 11: Responsividade da Interface

**User Story:** Como apresentador, quero que a interface se adapte à resolução da projeção, para que a aplicação seja legível em diferentes tamanhos de tela.

#### Acceptance Criteria

1. WHEN a janela de visualização é redimensionada, THE Scene_Renderer SHALL ajustar a proporção (aspect ratio) e as dimensões de renderização da cena 3D para preencher 100% da área da janela disponível, mantendo a proporção da largura pela altura da janela, dentro de 200 milissegundos após o término do redimensionamento.
2. WHILE a largura da janela de visualização é igual ou superior a 1024 pixels, THE UI_Overlay SHALL exibir os controles de navegação, o timer e o indicador de progresso do tour simultaneamente.
3. WHILE a largura da janela de visualização é inferior a 1024 pixels e igual ou superior a 640 pixels, THE UI_Overlay SHALL exibir os controles de navegação e o timer, ocultando o indicador de progresso do tour.
4. WHILE a largura da janela de visualização é inferior a 640 pixels, THE UI_Overlay SHALL exibir apenas os controles de navegação, ocultando o timer e o indicador de progresso do tour.
5. IF a janela de visualização é redimensionada para uma largura ou altura igual ou inferior a 0 pixels, THEN THE Scene_Renderer SHALL suspender a renderização da cena 3D e preservar o estado atual da cena sem alterá-lo, retomando a renderização quando ambas as dimensões forem superiores a 0 pixels.
