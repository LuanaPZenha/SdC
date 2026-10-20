# Sombras do Contágio

Simulador educativo de gestão de uma epidemia de contato em Maricá, RJ. O jogador conduz o fundo emergencial, a rede de UPAs e Clínicas da Família e a adesão de comerciantes, profissionais de saúde e população até a pesquisa da cura chegar a 100%.

A Apatia é fictícia e se transmite pelo toque. Dengue, chikungunya, SRAG, sarampo, o alerta de poliovírus e a meningite bacteriana entram com as vias que têm na vida real e disputam a mesma rede.

O jogo publicado está em https://sombras-do-contagio.vercel.app. O código fica em https://github.com/LuanaPZenha/SdC. Cada envio para a branch `main` publica de novo na Vercel, no projeto `sombras-do-contagio`.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem `DATABASE_URL`, o conteúdo e as partidas ficam em `data/runtime.json` na máquina local. Esse arquivo não entra no Git. Na Vercel o disco da função não guarda esse arquivo entre instâncias, então a mesma estrutura fica num Blob privado da conta. A capa não informa onde os dados estão guardados.

Para PostgreSQL (Neon, Supabase ou outro), copie `.env.example` para `.env.local` e preencha:

```bash
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
ADMIN_KEY=uma-chave-longa
```

Na primeira conexão o servidor cria as tabelas de `db/schema.sql` e carrega o conteúdo. O arquivo `db/seed.sql` é a mesma carga, para quem quiser inspecionar ou aplicar à mão depois do schema. Gere de novo com `npm run export:sql` sempre que parâmetros, políticas, eventos ou lições mudarem no código.

A capa não leva ao editor de conteúdo. Esse editor só responde se `ADMIN_KEY` estiver definida no ambiente, com pelo menos 12 caracteres. Não há chave padrão, e ela não aparece na página.

## Telas

| Endereço | O que faz |
| --- | --- |
| `/` | Capa. Nome no placar (2 a 24 caracteres) e uma das quatro datas de entrada. |
| `/jogo?partida=` | Sala de situação da partida salva. |
| `/ranking` | Placar global, até 50 gestões encerradas. |

A capa e a sala mostram o nome **Sombras do Contágio** em capitular, com a fonte Cinzel, e o trevo de risco biológico em vermelho à esquerda do nome. O trevo é o símbolo de infecção desenhado no jogo. O restante do texto fica numa fonte de leitura.

Na sala, o topo traz a data (dia da semana, dia e mês, ano e o número do dia da gestão) e três medidores: fundo emergencial, ocupação hospitalar e ordem pública. A ordem pública é a média do apoio de comerciantes, profissionais de saúde e população civil.

Duas abas dividem a sala:

- **Sala.** Mapa de Maricá, boletim da noite, facções, registro e o distrito selecionado.
- **Gestão.** As medidas, no lugar de uma faixa de cartões sobre o mapa. O número depois do nome é quantas estão ativas. Há quatro famílias: Políticas de Saúde, Controle de Fronteiras, Pesquisa e Gestão de Facções.
- **News.** Boletim da noite, dicas, registro e o desfecho do último caso. Cada boletim, notificação ou novidade nova abre um aviso no centro da página, no mesmo papel da sala. O boletim que chega junto de um caso pendente espera a escolha e aparece em seguida.

O botão **Encerrar** fica visível nas duas abas. Ele fica desligado enquanto houver um boletim sem resposta ou a partida já tiver acabado.

## Como jogar

Cada clique em encerrar o dia avança exatamente uma data do calendário. 1º de fevereiro vira 2 de fevereiro, e assim por diante. A data é o meio-dia UTC daquele dia, para o fuso não empurrar o calendário. A maior parte dos dias passa em silêncio. De manhã pode abrir um boletim. A resposta muda verba, contato, leitos ou confiança. O dia só fecha depois da escolha.

Há quatro entradas no calendário de 2026:

| Entrada | Data | O que a cidade tem pela frente |
| --- | --- | --- |
| Fevereiro | 1º de fevereiro | Verão, arboviroses e o Carnaval. |
| Maio | 18 de maio | Semana do aniversário da cidade, em 26 de maio. |
| Agosto | 1º de agosto | Inverno, SRAG e a festa da padroeira. |
| Dezembro | 15 de dezembro | Temporada, Natal, Réveillon e a RJ-106. |

A verba inicial é de R$ 26 milhões fictícios. A receita de base é de R$ 7,5 milhões por dia e cai quando a circulação é restringida. Uma medida sustentada que a receita não cobre é suspensa sozinha. A pesquisa espontânea, sem investimento, anda 0,05 ponto por dia. A pesquisa básica soma 0,4 ponto por dia e custa 1,2 por dia. A intensiva soma 0,7 e custa 2,2. As duas pesquisas não ficam ligadas juntas. Nesse ritmo, uma gestão que contém e pesquisa dura meses. Uma gestão que ignora a crise cai em poucas semanas.

Três medidores decidem o fim:

- A cura chega a 100%. A crise encerra e a gestão vence.
- A ocupação passa de 100% por 6 dias seguidos. A rede colapsa.
- A ordem pública fica abaixo de 22 por 4 dias seguidos. A cidade rompe.
- Os óbitos da Apatia passam de 4,5% da população.

O placar ordena por dias sobrevividos, depois por vitória, depois por pontuação e, por último, por menos óbitos. A pontuação soma 15 pontos por dia, 2 por ponto de pesquisa e 300 se houver cura, e tira 0,02 por óbito.

Durante a partida, o codex guarda a lição de cada boletim respondido. Dicas aparecem quando a ocupação, a pesquisa, a cobertura ou uma facção cruzam um limiar.

## Mapa

O contorno é a malha municipal do IBGE, código 3302700. O foco é o município. Lagos e o desenho dos recortes usam o OpenStreetMap. Em volta aparecem Niterói, São Gonçalo, Itaboraí, Tanguá e Saquarema.

Os quatro distritos oficiais são Sede, Ponta Negra, Inoã e Itaipuaçu. A sala joga com oito recortes. A soma das populações é 212.703, a estimativa do IBGE para Maricá em 2026. O Censo 2022 contou 197.277. A população de cada recorte agrupa bairros reais e não é a cifra oficial daquele bairro.

| Recorte | População no jogo |
| --- | --- |
| Centro | 45.000 |
| Itaipuaçu | 41.000 |
| São José do Imbassaí | 30.000 |
| Inoã | 28.000 |
| Ponta Negra | 24.000 |
| Cordeirinho | 16.703 |
| Araçatiba | 15.000 |
| Barra de Maricá | 13.000 |

A cor do recorte acompanha os casos por 10 mil habitantes, numa escala logarítmica. Clicar no recorte abre população, infectados, recuperados e o perfil local (turismo, escolas, entrada, idosos).

O contágio também anda por vizinho, o tempo todo, pela fórmula de importação. O ônibus é o caso visível dessa circulação.

### Ônibus vermelho

Não há data marcada. Num dia, cada recorte com pelo menos um infectado sorteia uma viagem. A chance fica entre 6% e 14% e sobe com o número de casos. A quarentena reduz essa chance. Saem no máximo duas viagens no dia, cada uma com uma pessoa, para um vizinho sorteado. O caso entra no destino e o índice de lá começa a subir. O caso não é descontado da origem: é um contato que se deslocou. Barreira sanitária pode impedir a chegada a um recorte de entrada, como Inoã. No mapa, um micro-ônibus vermelho percorre o arco entre os dois recortes.

### Ambulância branca

Também sem data. Há 11% de chance por dia de sair uma ambulância, e no máximo uma. Ela parte sempre do Hospital Municipal Conde Modesto Leal, no Centro. O destino é sorteado entre unidades reais: UPA de Inoã, UPAM Santa Rita em Itaipuaçu, Posto de Saúde de Ponta Negra, Posto de Saúde de São José, USF Barra e Posto de Saúde de Itaipuaçu. Araçatiba e Cordeirinho não têm posto nessa lista da prefeitura, então a ambulância não inventa um endereço lá. A carga abre 6 leitos por três dias. Não cria leito permanente e não muda os 180 leitos de base. A quarentena não segura a ambulância.

## Calendário de boletins

Feriado e onda sazonal só abrem boletim dentro da janela real. Fora dela o dia segue quieto.

| Boletim | Janela |
| --- | --- |
| Primeiros casos confirmados | Dia 1 da gestão. Isolar ou observar. |
| Carnaval de Maricá | 12 a 21 de fevereiro. |
| Onda de dengue e chikungunya | 18 de fevereiro a 28 de março. |
| Aniversário de Maricá | 23 a 26 de maio. A data cívica é 26 de maio. |
| SRAG de inverno | 10 de junho a 25 de julho. |
| Festa de Nossa Senhora do Amparo | 3 a 15 de agosto. |
| Natal e Réveillon na orla | 20 a 31 de dezembro. |

Outros boletins esperam a cidade amadurecer a crise:

| Boletim | Quando pode abrir |
| --- | --- |
| Sarampo nas escolas de Inoã | Depois do dia 28, se a cobertura de rotina estiver abaixo de 86%. |
| Alerta de risco de poliovírus | Depois do dia 55, se a cobertura estiver abaixo de 72%. Não declara surto. O Brasil é área livre de pólio; o alerta é risco de reintrodução. |
| Meningite em terminal de ônibus | Depois do dia 40, cerca de 3,5% ao dia, com 28 dias de intervalo. |
| Onda de desinformação | Depois do dia 21, cerca de 3,5% ao dia, com 28 dias de intervalo. |
| Nova variante | Depois do dia 45, cerca de 3% ao dia, com 40 dias de intervalo. |
| Foco novo pela RJ-106 | Depois do dia 20, cerca de 4% ao dia, com 21 dias de intervalo. |
| Colapso das equipes | Apoio da saúde abaixo de 36, repetível, 18 dias de intervalo. |
| O comércio abre por conta própria | Comércio abaixo de 34 e quarentena acima de 0,35. Intervalo de 16 dias. |
| Pânico depois dos óbitos | Mais de 6 óbitos no dia. Intervalo de 14 dias. |
| Resistência ao passaporte sanitário | Passaporte ativo e população civil abaixo de 42. Intervalo de 16 dias. |

No Carnaval, não intervir deixa a aglomeração em 2,2 por 9 dias, acima do dobro do contato. Barreiras deixam a festa continuar e a multidão sobe pouco.

Arboviroses ocupam 24 leitos de janeiro a abril e em dezembro. A SRAG ocupa 28 leitos em junho, julho e agosto. Essa pressão entra na ocupação mesmo sem caso novo de Apatia.

## Medidas

Medida instantânea gasta verba uma vez. Medida sustentada cobra todo dia enquanto estiver ligada e pode ser suspensa. Algumas se excluem: as duas quarentenas e as duas pesquisas.

**Políticas de Saúde.** Abrir leitos de campanha, contratar e reter equipes, triagem dedicada a idosos, kits contra o toque, vacinação de bloqueio e mutirão contra o Aedes.

**Controle de Fronteiras.** Quarentena parcial, quarentena rígida, barreiras na RJ-106, suspender aulas presenciais e restrição da temporada.

**Pesquisa.** Pesquisa básica, pesquisa intensiva e sequenciar amostras.

**Gestão de Facções.** Campanha pública, combater a desinformação, compensar o comércio, adicional para as equipes e passaporte sanitário.

A cobertura vacinal inicial é 62%. Ela não protege contra a Apatia. Ela decide se sarampo ou pólio encontram suscetível na mesma equipe. Abaixo de 28 de apoio, os profissionais reduzem a capacidade efetiva para 72%. Abaixo de 30, o comércio faz a quarentena vazar. Abaixo de 28, a população em pânico aumenta o contato.

## O que fica no banco

Distritos, facções, políticas, eventos, lições, dicas, parâmetros e fórmulas. O motor lê esses números a cada turno. Incluir um evento no painel passa a valer no boletim seguinte, sem deploy de regra nova. O botão de restaurar no painel recarrega o catálogo que está no código, e preserva partidas e placar.

As fórmulas editáveis são a força de infecção, os casos novos, os óbitos, a receita, o avanço da cura, a ocupação e a pontuação. Elas aceitam `+ - * /`, parênteses e as funções `min`, `max`, `clamp`, `abs`, `sqrt`, `round` e `exp`. Os parâmetros viram variáveis com o mesmo nome (`beta`, `baseLethality`, `overloadLethality` e os demais).

Chaves de efeito usadas por políticas e escolhas:

| Chave | Efeito |
| --- | --- |
| budget | variação imediata da verba, em milhões fictícios |
| capacity | leitos; permanente, ou temporário se houver durationDays |
| research | avanço imediato da cura |
| researchDaily | avanço diário enquanto o modificador durar |
| vaccine | pontos de cobertura de rotina |
| lethalityAdd | soma à letalidade de quem tem leito |
| factions / factionsDaily | variação imediata ou diária por facção |
| infect | casos novos por id de bairro |
| deaths | óbitos imediatos da crise |
| cancelPolicies | ids de políticas sustentadas a suspender |
| durationDays | duração dos efeitos temporais |
| income | variação diária da receita |
| betaAdd / betaMult | soma ou multiplicador da taxa de contato |
| protection | redução do toque por kits |
| quarantine / barriers | intensidade da restrição e das barreiras |
| tourism / mobility | fluxo de visitantes e circulação |
| schoolClosure | 1 suspende o efeito escolar |
| elderlyRisk | gravidade extra em bairros mais idosos |
| gathering | multiplicador de aglomeração |
| passport | 1 enquanto o passaporte está ativo |
| surgeBeds | leitos ocupados por outras síndromes |

Gatilhos de evento: `calendar` dentro do mês e do dia, `random` com chance diária, `metric` (`gt`, `lt`, `gte`, `lte`) e `all` para combinar. Métricas: `day`, `occupancy`, `order`, `vaccine`, `research`, `deathsToday`, `quarantine`, `passport`, `gathering`, `infected`, `faction.comerciantes`, `faction.saude`, `faction.civil`.

O conteúdo editável — parâmetros, fórmulas, políticas, eventos, lições, dicas e bairros — fica fora da capa. A validação recusa fórmula insegura, id repetido e efeito desconhecido.

## Lições fixas

O codex começa com oito textos: a Apatia é fictícia; isolamento não é quarentena; imunidade coletiva; eliminação não é erradicação; a letalidade também é da rede; três vias e a mesma rede; infodemia e hesitação; o recorte de Maricá. Cada escolha de boletim pode acrescentar a lição daquela resposta.

## O que o sistema já incorpora

Estas são as atualizações que estão no jogo publicado, em cima do simulador inicial.

- **Mapa real de Maricá.** O município inteiro, no estilo de um mapa de epidemia, com os oito recortes jogáveis e os vizinhos nomeados.
- **Calendário dia a dia.** Uma data visível no topo, no boletim e no botão. Encerrar avança um dia, não uma temporada.
- **Ritmo de meses.** A taxa de contato da Apatia, a gravidade, a receita e a pesquisa foram alongadas para a partida atenta chegar à cura por volta do quarto mês, e para a omissão cair em poucas semanas, com feriados nas datas reais.
- **Boletins na época certa.** Carnaval, aniversário, Amparo, temporada, dengue e SRAG só disparam na janela do calendário. Sarampo, pólio, meningite, desinformação, variante e RJ-106 esperam o dia mínimo e, quando é o caso, um sorteio.
- **Ônibus do contaminado.** Viagem aleatória, sem cota diária e sem data, de um recorte com caso para um vizinho. O micro-ônibus vermelho desenha o caminho e o caso entra no destino.
- **Ambulância de insumos.** Saída aleatória do hospital do Centro para uma UPA ou um posto real, com leitos extras por três dias.
- **Título e sala.** O nome usa a serifada Cormorant Garamond; a interface, a Outfit. O fundo é uma sala escura, com filete de latão, e o papel claro fica nos dossiês. A marca e a fonte de outro jogo não entram no repositório.
- **Símbolo de infecção.** O trevo vermelho fica ao lado do nome na capa e na sala. O nome da sala continua em uma linha.
- **Aba Gestão.** As quatro famílias de medidas saíram da vista do mapa. Encerrar o dia continua à mão.
- **Aba News.** Boletim, registro e novidades ficam juntos. Uma notícia nova abre um popup no estilo da sala.
- **Ícones das abas.** Ao lado do nome: Sala tem o mapa-múndi, Gestão a prancheta com a engrenagem e News o jornal.
- **Publicação.** Projeto novo na Vercel, ligado a este repositório. Partidas e placar do site ficam no Blob privado. A capa não mostra o editor nem chave nenhuma.

## Honestidade dos dados

- O contorno do mapa é a malha municipal do IBGE (código 3302700). As lagoas e os bairros vêm do OpenStreetMap.
- A população somada dos recortes é 212.703, a estimativa do IBGE para Maricá em 2026. O Censo 2022 contou 197.277. Os oito recortes agrupam bairros reais, mas a população de cada um não é a cifra oficial daquele bairro.
- Os distritos oficiais são Sede, Ponta Negra, Inoã e Itaipuaçu. Itaipuaçu fica a oeste, junto à Serra da Tiririca; Ponta Negra fica a leste, na divisa com Saquarema.
- A data cívica do município é 26 de maio. A festa da padroeira e o Carnaval entram na janela em que a cidade de fato os realiza.
- A capacidade inicial de 180 leitos é didática, não um censo de leitos. O hospital, as UPAs e os postos nomeados no jogo existem; a ambulância não cria unidade onde a prefeitura não lista posto.
- O alerta de poliovírus é risco de reintrodução por cobertura baixa. O Brasil é área livre; o jogo não declara um surto.
- Verba, pontuação e a curva da Apatia são de simulação.

## Verificação da curva

`npm run sim` roda três sementes (Ana, Bruno e Caio). Em cada uma, uma gestão que ignora a crise precisa perder em até 200 dias, e uma gestão que contém, pesquisa e responde aos boletins precisa chegar à cura. A gestão atenta segura quarentena parcial enquanto há muitos infectados, ocupação alta ou aglomeração, abre leitos quando a ocupação passa de metade e usa a janela de vacinação no começo. O ensaio para aos 320 dias.

Autores: 
Amanda Nick - Líder do Projeto

Bruno Barral - FullStack

Luana Zenha - Full Stack

Renan Monteiro - Análise e Requisitos
