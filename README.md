# Sombras do Contágio

Simulador educativo de gestão de uma epidemia de contato em Maricá, RJ. O jogador conduz o fundo emergencial, a rede de UPAs e Clínicas da Família e a adesão de comerciantes, profissionais de saúde e população até a pesquisa da cura chegar a 100%.

A Apatia é fictícia e se transmite pelo toque. Dengue, chikungunya, SRAG, sarampo, o alerta de poliovírus e a meningite bacteriana entram com as vias que têm na vida real e disputam a mesma rede.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem `DATABASE_URL`, o conteúdo e as partidas ficam em `data/runtime.json`. Para PostgreSQL (Neon, Supabase ou outro), copie `.env.example` para `.env.local` e preencha:

```bash
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
ADMIN_KEY=uma-chave-longa
```

Na primeira conexão o servidor cria as tabelas de `db/schema.sql` e carrega o conteúdo. O arquivo `db/seed.sql` é a mesma carga, para quem quiser inspecionar ou aplicar à mão depois do schema. Gere de novo com `npm run export:sql`.

O painel docente fica em `/admin`. A chave de demonstração é `marica-sdc-2026`.

## Como jogar

Cada clique em encerrar o dia avança exatamente uma data do calendário, de 1º de fevereiro para 2 de fevereiro e assim por diante. Sem data marcada, alguém contaminado pode pegar um ônibus de um bairro para outro. A viagem deixa esse caso no destino e o índice de lá começa a subir. No mesmo espírito, uma ambulância pode sair do hospital do Centro com insumos para a UPA de Inoã, a UPAM Santa Rita ou um posto de saúde. A unidade que recebe abre algumas vagas por três dias. A maior parte dos dias passa em silêncio. Carnaval, aniversário da cidade, festa do Amparo, Natal e as ondas de dengue ou SRAG só abrem boletim dentro da janela real daquele mês. De manhã pode haver um boletim; a resposta muda verba, contato, leitos ou confiança. No painel inferior estão as quatro famílias de medida: políticas de saúde, controle de fronteiras, pesquisa e gestão de facções. Encerrar o dia aplica a receita, o contágio, os óbitos e o avanço da cura.

A gestão cai se a ocupação passar de 100% por dias seguidos, se a ordem pública romper ou se os óbitos passarem do teto. A cura encerra a crise. O placar ordena pelos dias sobrevividos.

Há quatro entradas no calendário de 2026: 1º de fevereiro (Carnaval e arboviroses), 18 de maio (aniversário da cidade, em 26 de maio), 1º de agosto (festa da padroeira e SRAG) e 15 de dezembro (Natal, Réveillon e a RJ-106).

## O que fica no banco

Distritos, facções, políticas, eventos, lições, dicas, parâmetros e fórmulas. O motor lê esses números a cada turno. Incluir um evento "Nova variante" no painel passa a valer no boletim seguinte, sem deploy de regra nova.

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

## Honestidade dos dados

- O contorno do mapa é a malha municipal do IBGE (código 3302700). As lagoas e os bairros vêm do OpenStreetMap. Os vizinhos desenhados ao redor são Niterói, São Gonçalo, Itaboraí, Tanguá, Rio Bonito e Saquarema.
- A população somada dos recortes é 212.703, a estimativa do IBGE para Maricá em 2026. O Censo 2022 contou 197.277. Os oito recortes agrupam bairros reais, mas a população de cada um não é a cifra oficial daquele bairro.
- Os distritos oficiais são Sede, Ponta Negra, Inoã e Itaipuaçu. Itaipuaçu fica a oeste, junto à Serra da Tiririca; Ponta Negra fica a leste, na divisa com Saquarema.
- A data cívica do município é 26 de maio. A festa da padroeira e o Carnaval entram na janela em que a cidade de fato os realiza.
- A capacidade inicial de 180 leitos é didática, não um censo de leitos.
- O alerta de poliovírus é risco de reintrodução por cobertura baixa. O Brasil é área livre; o jogo não declara um surto.
- Verba, pontuação e a curva da Apatia são de simulação.

## Verificação da curva

`npm run sim` roda uma gestão que ignora a crise e outra que contém, pesquisa e responde aos boletins. A omissão precisa perder. A gestão atenta precisa chegar à cura.
