---
title: Ensinar o cálculo de vidrados
lead: 6 sessões para uma turma ou um grupo de estudo, das matérias-primas e das peças de teste triaxiais à fórmula de Seger calculada nos dois sentidos e aos defeitos do vidrado, cada uma com um exemplo resolvido, os passos no Glazecalc, uma ficha de trabalho para imprimir e perguntas de verificação.
---

## Sobre este material didático {#about}

Este material é para quem ensina o cálculo de vidrados: uma escola, uma turma de atelier, um grupo de estudo de ceramistas profissionais ou quem aprende sozinho. Tem seis sessões, e cada uma tem os seus objetivos, o que preparar, um exemplo resolvido com matérias-primas reais, como o fazer no Glazecalc, uma ficha de trabalho e perguntas de verificação.

A ordem das sessões segue a de um grupo de estudo publicado: o 陶磁器釉薬技術研究会 (grupo de estudo de técnica de vidrados cerâmicos) do Centro de Tecnologia Industrial da Prefeitura de Ibaraki, no Japão, que realizou seis sessões para 12 jovens ceramistas em 2015 e as descreveu no seu relatório de investigação. O curso seguinte, na escola de arte cerâmica de Kasama, propôs três trabalhos de peças de teste, de 42, 90 e 78 vidrados, cada um cozido em oxidação e em redução. **O Glazecalc não tem qualquer ligação ao centro nem à escola.** Seguimos a ordem do seu programa publicado e citamo-lo mais abaixo; o texto, os exemplos e as fichas de trabalho são nossos. Cursos de outros países ensinam os mesmos passos quase pela mesma ordem: o SCT305 da Bilecik Şeyh Edebali University, na Turquia, o ART 195 do Glendale Community College, nos EUA, o programa da Renânia-Palatinado para as escolas de cerâmica, na Alemanha, e o artigo de 2006 de 李堅萍 para professores, em Taiwan.

Table: As seis sessões
Label: As seis sessões

| Sessão | Tema                                                     | No Glazecalc                            |
| ------ | -------------------------------------------------------- | --------------------------------------- |
| 1      | As matérias-primas, o que fazem, peças triaxiais         | Matérias-primas, Misturas (triaxial)    |
| 2      | A química: elementos, fórmulas, moles                    | A página de uma matéria-prima           |
| 3      | Ler uma fórmula de Seger (UMF), o gráfico sílica–alumina | A página da receita, o gráfico de Stull |
| 4      | Da receita à fórmula de Seger                            | Como se calcula a fórmula de Seger      |
| 5      | Da fórmula de Seger à receita                            | Resolver para um objetivo               |
| 6      | A pasta e os defeitos do vidrado                         | Limites, Comparar                       |

### Como usar

- Cada sessão dura cerca de 2 horas. As sessões 4 e 5 precisam de calculadoras e de um computador ou telemóvel com o Glazecalc para cada dupla.
- Os exemplos resolvidos usam matérias-primas vendidas no Japão e os valores da biblioteca padrão do Glazecalc: 福島長石 (feldspato Fukushima), carbonato de cálcio (石灰石){{en: whiting}}, um caulino e sílica (珪石). Use a análise do seu fornecedor, se a tiver: acrescente-a na [página Matérias-primas](/material); os números mudam, mas o método não.
- A cozedura é ao SK 8, {{2282 °F; 1250 °C}} nominais. Use o cone ao qual a turma coze; [Cozer com cones SK](/guides/firing#sk-cones) explica os números SK.
- Para imprimir uma ficha de trabalho ou um mapa de peças de teste, imprima esta página a partir do navegador. Para guardar receitas, misturas e notas é preciso uma conta gratuita.

> [!WARNING]
> As sessões 1, 3 e 6 são trabalho de laboratório: pesar matérias-primas secas e cozer. Antes de alguém pesar uma matéria-prima, leia [Os hábitos que mais importam](/guides/safe-mixing#habits). A poeira de vidrado seco é o principal perigo.

## Sessão 1: matérias-primas e peças de teste triaxiais {#materials}

> [!WARNING]
> Pese as matérias-primas secas com cuidado, limpe a húmido e use uma máscara de proteção respiratória bem ajustada enquanto os pós estiverem secos. Leia primeiro [O principal perigo: a poeira](/guides/safe-mixing#the-main-hazard) e [Máscaras de proteção respiratória](/guides/safe-mixing#respirators).

### Objetivos

- Nomear as três funções num vidrado: formador de vidro, fundente{{en: flux}} e estabilizante.
- Classificar 4 matérias-primas comuns pelos óxidos que trazem.
- Montar uma mistura triaxial e ler as suas peças de teste como um mapa.

### Preparação

- Um saco de cada: 福島長石, carbonato de cálcio, caulino e sílica, ou as matérias-primas que a turma tiver.
- O [mapa triaxial de peças de teste](#tile-maps) abaixo, impresso, e 21 peças de teste por estudante para cada triângulo.
- Peças de teste cozidas de um triaxial anterior, se as tiver, para passar de mão em mão.

### Exemplo resolvido

A análise de cada matéria-prima, da biblioteca do Glazecalc, indica os óxidos que deixa após a cozedura. A perda ao fogo (PF) é o que se queima.

Table: Quatro matérias-primas e o que trazem (percentagem em peso, da biblioteca)
Label: Quatro matérias-primas

| Matéria-prima                | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |    PF | Função                                       |
| ---------------------------- | ---: | ----: | ----: | ---: | ----: | ----: | -------------------------------------------- |
| 福島長石 (feldspato)         | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fundente, com a sua própria alumina e sílica |
| Carbonato de cálcio (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Fundente (cálcio)                            |
| Caulino EPK                  | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Estabilizante: a principal fonte de alumina  |
| Sílica (珪石)                |  100 |     – |     – |    – |     – |     – | Formador de vidro                            |

Sozinho, o feldspato funde ao SK 8 num vidro viscoso; o carbonato de cálcio sozinho não funde; a sílica sozinha não funde. Misturados, fundem muito melhor do que qualquer um deles. Uma mistura triaxial mostra onde: o mapa de peças de teste abaixo varia os três em passos de ~20% (18 em 90), com 10% de caulino em cada peça.

::shops

### No Glazecalc

1. Abra cada matéria-prima na [página Matérias-primas](/material) ou na sua página pública, como [Feldspato Fukushima](/materials/fukushima-feldspar). Anote os óxidos que ela traz.
2. Faça três receitas: 福島長石 90 com caulino 10, carbonato de cálcio 90 com caulino 10 e sílica 90 com caulino 10. Em [Misturas](/blends), escolha **Triaxial (3 receitas)** e 6 filas: 21 peças de teste, as mesmas do mapa abaixo.
3. Escolha o lote para cada peça de teste e use **Imprimir** para obter o que pesar. Depois da cozedura, guarde como receitas as peças de que gostar, a partir do desenho das peças.

### Ficha de trabalho

Table: Ficha de trabalho 1: o que cada matéria-prima traz
Label: Ficha de trabalho 1

| Matéria-prima       | Óxidos que traz | Formador de vidro, fundente ou estabilizante? | PF (%) |
| ------------------- | --------------- | --------------------------------------------- | ------ |
| 福島長石            |                 |                                               |        |
| Carbonato de cálcio |                 |                                               |        |
| Caulino             |                 |                                               |        |
| Sílica              |                 |                                               |        |

### Verificação

- Que matéria-prima traz a maior parte da alumina, e porque é que um vidrado precisa dela?
- Porque é que o vértice do carbonato de cálcio do triângulo não funde sozinho?
- Em que ponto do triângulo as suas peças de teste fundiram melhor, e de que vértice estava mais perto?

## Sessão 2: a química de que precisa {#chemistry}

### Objetivos

- Ler uma fórmula química: SiO₂, CaO, Al₂O₃, CaCO₃.
- Calcular uma massa molar a partir de massas atómicas.
- Converter gramas em moles, e vice-versa.

### Preparação

- Uma tabela periódica para cada estudante, e calculadoras.
- As massas atómicas da tabela abaixo (os valores padrão da IUPAC, como o Glazecalc os usa).

### Exemplo resolvido

Table: Massas atómicas usadas aqui (g/mol)
Label: Massas atómicas

| Elemento | Símbolo | Massa atómica |
| -------- | ------- | ------------: |
| Oxigénio | O       |        15,999 |
| Carbono  | C       |        12,011 |
| Sódio    | Na      |         22,99 |
| Alumínio | Al      |        26,982 |
| Silício  | Si      |        28,085 |
| Potássio | K       |        39,098 |
| Cálcio   | Ca      |        40,078 |

Uma fórmula conta átomos. SiO₂ é um silício e dois oxigénios, por isso uma mole pesa 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ é 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO é 56,077 g, e o carbonato de cálcio, CaCO₃, é 100,086 g; a biblioteca do Glazecalc arredonda-o para 100,08.

Uma **mole** é uma contagem, como uma dúzia: o mesmo número de moléculas, sejam quais forem. As moles são gramas ÷ massa molar:

- 25 g de sílica são 25 ÷ 60,083 = 0,416 mol de SiO₂.
- 20 g de carbonato de cálcio são 20 ÷ 100,08 = 0,200 mol. No forno, perde o dióxido de carbono (CO₂, 44,009 g/mol) e deixa 0,200 mol de CaO, que pesa 0,200 × 56,077 = 11,2 g. Essa perda é a sua PF: 43,97%.

### No Glazecalc

1. Abra [Carbonato de cálcio](/materials/whiting) e [Sílica](/materials/silica): cada página indica a fórmula e os seus pesos.
2. Confirme uma massa molar à mão com a da página.

### Ficha de trabalho

Table: Ficha de trabalho 2: massa molar e moles
Label: Ficha de trabalho 2

| Óxido ou matéria-prima | Fórmula | Massa molar (g/mol) | Gramas | Moles |
| ---------------------- | ------- | ------------------- | ------ | ----- |
| Sílica                 | SiO₂    |                     | 30     |       |
| Alumina                | Al₂O₃   |                     | 10     |       |
| Óxido de cálcio        | CaO     |                     | 5      |       |
| Carbonato de cálcio    | CaCO₃   |                     | 15     |       |

### Verificação

- Quantos gramas pesa uma mole de SiO₂, e como se calcula?
- Porque é que 20 g de carbonato de cálcio deixam menos de 20 g no vidrado cozido?
- Porque é que se comparam os óxidos em moles e não em gramas?

## Sessão 3: ler a fórmula de Seger {#reading-the-formula}

> [!WARNING]
> Colorir um vidrado implica pesar corantes, alguns dos quais exigem mais cuidado do que as matérias-primas da base. Leia primeiro [Matérias-primas que exigem mais cuidado](/guides/safe-mixing#materials).

### Objetivos

- Ler as três colunas de uma fórmula de Seger (UMF){{en: unity formula}} (ゼーゲル式): fundentes, estabilizante, formador de vidro.
- Encontrar um vidrado num gráfico sílica–alumina e saber o que o gráfico pode e não pode dizer.
- Colorir um vidrado pronto por passos e registar o resultado.

### Preparação

- A fórmula de Seger abaixo, escrita em tamanho grande.
- Um vidrado transparente pronto e um corante, como o óxido de ferro vermelho{{en: red iron oxide}} (弁柄).

### Exemplo resolvido

O vidrado da sessão 4, 福島長石 45, carbonato de cálcio 20, caulino 10 e sílica 25, tem esta fórmula de Seger (valores do Glazecalc, arredondados):

Table: Uma fórmula de Seger nas suas três colunas
Label: Uma fórmula de Seger

| Fundentes (RO, R₂O) | Estabilizante (R₂O₃) | Formador de vidro (RO₂) |
| ------------------- | -------------------- | ----------------------- |
| K₂O 0,18            | Al₂O₃ 0,43           | SiO₂ 3,45               |
| Na₂O 0,10           |                      |                         |
| CaO 0,72            |                      |                         |

- Os fundentes somam 1: é a regra da fórmula. Cada um dos outros números são moles por cada mole de fundentes.
- A relação sílica/alumina é 3,45 ÷ 0,43, cerca de 8: um vidrado brilhante típico.
- O cálcio é a maior parte do fundente, como na maioria dos vidrados japoneses de cal (石灰釉).

Um gráfico com a sílica na horizontal e a alumina na vertical coloca cada vidrado como um ponto. Os testes de Seger e o gráfico de Stull de 1912 são deste tipo, e um 釉性状図 marca nele as peças de teste cozidas da própria turma. A página da receita do Glazecalc desenha o gráfico de Stull, e este vidrado fica na sua região brilhante. As regiões de Stull vêm dos seus próprios fundentes e da sua cozedura: um guia, não uma previsão. A [grelha de peças de teste](#tile-maps) abaixo permite que uma turma desenhe o seu próprio gráfico, com a sua própria cozedura.

::stull-chart

Num vidrado pronto cuja receita não conhece, o Glazecalc não consegue calcular a fórmula. Para o colorir, acrescente antes o corante por cima dos 100: 100 g do vidrado seco com 1, 2 e 3 g de óxido de ferro, uma peça de teste para cada, cozidas em oxidação e em redução.

### No Glazecalc

1. Na [página da receita](/recipe), introduza a receita acima e leia a **Fórmula de Seger** e o **Gráfico de Stull**.
2. Altere a sílica de 25 para 35 e veja o ponto deslocar-se para a direita.
3. Para uma base de que tenha a receita, faça do corante uma adição e use um teste em linha{{en: line blend}} (uma fila de testes em que uma matéria-prima varia aos passos) em [Misturas](/blends) para o variar por passos.

### Ficha de trabalho

Table: Ficha de trabalho 3: um corante num vidrado pronto
Label: Ficha de trabalho 3

| Peça de teste | Corante (g por 100 g) | Oxidação: aspeto | Redução: aspeto |
| ------------- | --------------------- | ---------------- | --------------- |
| 1             | 0                     |                  |                 |
| 2             | 1                     |                  |                 |
| 3             | 2                     |                  |                 |
| 4             | 3                     |                  |                 |

### Verificação

- Numa fórmula de Seger, que coluna soma 1?
- Qual é a relação sílica/alumina deste vidrado, e o que sugere?
- Porque é que um ponto na região brilhante do gráfico pode, ainda assim, dar uma peça de teste mate no seu forno?

## Sessão 4: da receita à fórmula de Seger {#recipe-to-formula}

### Objetivos

- Calcular à mão uma fórmula de Seger a partir de uma receita.
- Compará-la com o cálculo do próprio Glazecalc.

### Preparação

- A ficha de trabalho 4, as quatro análises da sessão 1 e calculadoras.

### Exemplo resolvido

A receita: 福島長石 45, carbonato de cálcio 20, caulino EPK 10, sílica 25. Considere cada quantidade em gramas. Para cada matéria-prima, gramas × percentagem do óxido ÷ 100 ÷ a sua massa molar dá as suas moles. A tabela indica os óxidos principais; o Glazecalc conta também os vestígios (o ferro e o titânio do caulino, o magnésio do feldspato).

Table: Moles de cada óxido no lote (100 g)
Label: Moles no lote

| Matéria-prima       | Gramas |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ------------------- | -----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石            |     45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Carbonato de cálcio |     20 |      – |      – | 0,1998 |      – |      – |
| Caulino             |     10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Sílica              |     25 |      – |      – |      – |      – | 0,4161 |
| Total               |    100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Os fundentes somam 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnésia) = 0,2847 mol. Divida cada total por esse valor:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

É a fórmula da sessão 3.

### No Glazecalc

1. Introduza a receita na [página da receita](/recipe).
2. Abra **Como se calcula a fórmula de Seger**. Mostra estes passos com os números desta receita: gramas, as moles de cada óxido em cada matéria-prima, os totais e a divisão pelos fundentes.
3. Compare cada linha com a sua ficha de trabalho. Depois altere uma quantidade e calcule apenas a coluna que ela altera.

### Ficha de trabalho

Table: Ficha de trabalho 4: da receita à fórmula de Seger
Label: Ficha de trabalho 4

| Matéria-prima | Gramas | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------- | ------ | --- | ---- | --- | ----- | ---- |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
| Total         |        |     |      |     |       |      |
| ÷ fundentes   |        |     |      |     |       |      |

### Verificação

- Porque é que qualquer tamanho de lote dá a mesma fórmula de Seger?
- Que óxidos traz o caulino, e qual deles importa mais aqui?
- Porque é que a PF do carbonato de cálcio fica fora da fórmula?

## Sessão 5: da fórmula de Seger à receita {#formula-to-recipe}

### Objetivos

- Escolher matérias-primas para uma fórmula pretendida e calcular a quantidade de cada uma.
- Usar «Resolver para um objetivo» e dizer a que distância do objetivo fica o resultado.

### Preparação

- O objetivo abaixo, a ficha de trabalho 5 e calculadoras; o Glazecalc com uma conta.

### Exemplo resolvido

O objetivo: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ e 4,0 SiO₂. Tome as matérias-primas por esta ordem, cada uma para o óxido que só ela pode trazer:

1. **O feldspato, para o potássio e o sódio.** Uma unidade de 福島長石 (536,8 g, o peso que contém uma mole de fundentes) traz 0,94 mol de K₂O e Na₂O. O objetivo precisa de 0,3, portanto 0,3 ÷ 0,94 = 0,319 unidades: 171,4 g. Traz também 0,015 de CaO, 0,328 de Al₂O₃ e 1,865 de SiO₂.
2. **O carbonato de cálcio, para o resto do cálcio.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **O caulino, para o resto da alumina.** 0,4 − 0,328 = 0,072 mol. O caulino EPK contém uma mole de Al₂O₃ em 272,6 g, portanto 19,6 g, que traz também 0,149 de SiO₂.
4. **A sílica, para o resto.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

O lote tem 379,0 g. Em percentagem: 福島長石 45,2, carbonato de cálcio 18,1, caulino 5,2, sílica 31,5. O feldspato fixa a relação entre o potássio e o sódio, por isso a receita dá 0,195 de K₂O e 0,104 de Na₂O: perto do objetivo, mas não exatamente nele.

### No Glazecalc

1. Abra [Resolver para um objetivo](/solve), escolha **Uma fórmula de Seger** e escreva o objetivo.
2. Em **As matérias-primas**, indique 福島長石, carbonato de cálcio, caulino EPK e sílica, e escolha **Resolver**.
3. Dá 福島長石 44,9, carbonato de cálcio 18,2, caulino 5,6 e sílica 31,3, e uma tabela da distância a que fica cada óxido. Compare-a com o seu cálculo à mão: o programa conta todos os óxidos em vestígios e encontra o melhor ajuste que as quatro matérias-primas permitem.
4. Use **Abrir como nova receita** e verifique-a na página da receita.

### Ficha de trabalho

Table: Ficha de trabalho 5: do objetivo à receita
Label: Ficha de trabalho 5

| Passo | Matéria-prima | Para que óxido | Moles necessárias | Gramas | Também traz |
| ----- | ------------- | -------------- | ----------------- | ------ | ----------- |
| 1     |               |                |                   |        |             |
| 2     |               |                |                   |        |             |
| 3     |               |                |                   |        |             |
| 4     |               |                |                   |        |             |

### Verificação

- Porque é que o feldspato é calculado primeiro?
- Porque é que estas quatro matérias-primas não podem dar exatamente 0,2 K₂O e 0,1 Na₂O?
- O que se acrescentaria às matérias-primas para trazer magnésia?

## Sessão 6: a pasta e os defeitos do vidrado {#body-and-defects}

> [!WARNING]
> Um vidrado cozido pode libertar metais para os alimentos e as bebidas, e pode parecer perfeito enquanto o faz. Os vidrados com muito bário ou com cobre, e qualquer vidrado com chumbo, podem libertar metais. Só um ensaio laboratorial de libertação de metais{{en: leach test}} da peça cozida mostra o que ela liberta; nenhum cálculo o mostra. Leia [Segurança alimentar](/guides/glazing-basics#food-safety) e [Matérias-primas que exigem mais cuidado](/guides/safe-mixing#materials).

### Objetivos

- Medir a retração e a absorção de água de uma pasta.
- Nomear os defeitos mais comuns, as suas causas habituais e uma primeira correção.
- Saber que defeitos tornam as peças inseguras.

### Preparação

- Barras de teste da sua pasta, marcadas com 100 mm de intervalo enquanto húmidas, cozidas e por cozer.
- Peças de teste com defeitos, se as tiver: fendilhamento, recolhimento do vidrado, picado, escorrimento.

### Exemplo resolvido

- **Retração**: (comprimento marcado − comprimento após a cozedura) ÷ comprimento marcado × 100. Marcas a 100 mm de distância que medem 88 mm após a cozedura: retração de 12%.
- **Absorção de água**: (peso após embeber − peso seco) ÷ peso seco × 100. Uma barra cozida de 50,0 g que pesa 50,6 g após embeber: 1,2%.

Table: Defeitos, causas e uma primeira correção na fórmula de Seger
Label: Defeitos

| Defeito                 | Causa habitual                                   | Uma primeira correção a experimentar                 |
| ----------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Fendilhamento           | O vidrado retrai mais do que a pasta             | Menos K₂O e Na₂O; mais cálcio, magnésia ou boro      |
| Descasque do vidrado    | O vidrado retrai muito menos do que a pasta      | Mais K₂O e Na₂O                                      |
| Escorrimento            | Pouca alumina, ou camada demasiado espessa       | Mais alumina; uma camada mais fina                   |
| Recolhimento do vidrado | Chacota com pó, ou uma camada espessa que fendeu | Limpar a chacota; uma camada mais fina               |
| Picado                  | Gás que não chegou a fechar-se                   | Um patamar no topo da cozedura; uma camada mais fina |

[Acordo pasta-vidrado e defeitos](/guides/glazing-basics#fit-and-defects) explica cada um, com o teste da água gelada para o fendilhamento. Não use peças com fendilhamento ou com descasque do vidrado para alimentos ou bebidas.

::food-limits

### No Glazecalc

1. Na [página da receita](/recipe), leia o painel **Limites** de um vidrado seu e a sua dilatação calculada.
2. Copie a receita, troque parte do feldspato por carbonato de cálcio e compare as duas: em que sentido se moveu a dilatação?

### Ficha de trabalho

Table: Ficha de trabalho 6: a pasta
Label: Ficha de trabalho 6

| Barra | Comprimento marcado (mm) | Comprimento após cozedura (mm) | Retração (%) | Peso seco (g) | Peso após embeber (g) | Absorção (%) |
| ----- | ------------------------ | ------------------------------ | ------------ | ------------- | --------------------- | ------------ |
| 1     | 100                      |                                |              |               |                       |              |
| 2     | 100                      |                                |              |               |                       |              |

### Verificação

- Que defeito vem de um vidrado que retrai mais do que a pasta, e qual é uma primeira correção?
- Porque é que uma peça com descasque do vidrado nunca pode ser usada para alimentos?
- Um cálculo pode dizer se um vidrado é seguro para alimentos? E o que pode?

## Mapas de peças de teste para imprimir {#tile-maps}

### Mapa triaxial: 42 vidrados

Dois triângulos de 21 peças de teste, a partir da disposição das Misturas com 6 filas: a peça 1 no topo (feldspato), a fila de baixo do carbonato de cálcio (à esquerda) à sílica (à direita). O triângulo II é o triângulo I com 1 g de óxido de ferro vermelho por cada 100 g, que tende para celadon (青磁) em redução. Cozidas em oxidação e em redução, são 84 peças de teste. As quantidades são gramas por 100 g.

Table: Mapa triaxial: 福島長石, carbonato de cálcio e sílica, com 10 de caulino em cada peça
Label: Mapa triaxial

| Peça (I) | Peça (II) | 福島長石 | Carbonato de cálcio | Sílica | Caulino | I oxid. | I red. | II oxid. | II red. |
| -------- | --------- | -------: | ------------------: | -----: | ------: | ------- | ------ | -------- | ------- |
| 1        | 22        |       90 |                   0 |      0 |      10 |         |        |          |         |
| 2        | 23        |       72 |                  18 |      0 |      10 |         |        |          |         |
| 3        | 24        |       72 |                   0 |     18 |      10 |         |        |          |         |
| 4        | 25        |       54 |                  36 |      0 |      10 |         |        |          |         |
| 5        | 26        |       54 |                  18 |     18 |      10 |         |        |          |         |
| 6        | 27        |       54 |                   0 |     36 |      10 |         |        |          |         |
| 7        | 28        |       36 |                  54 |      0 |      10 |         |        |          |         |
| 8        | 29        |       36 |                  36 |     18 |      10 |         |        |          |         |
| 9        | 30        |       36 |                  18 |     36 |      10 |         |        |          |         |
| 10       | 31        |       36 |                   0 |     54 |      10 |         |        |          |         |
| 11       | 32        |       18 |                  72 |      0 |      10 |         |        |          |         |
| 12       | 33        |       18 |                  54 |     18 |      10 |         |        |          |         |
| 13       | 34        |       18 |                  36 |     36 |      10 |         |        |          |         |
| 14       | 35        |       18 |                  18 |     54 |      10 |         |        |          |         |
| 15       | 36        |       18 |                   0 |     72 |      10 |         |        |          |         |
| 16       | 37        |        0 |                  90 |      0 |      10 |         |        |          |         |
| 17       | 38        |        0 |                  72 |     18 |      10 |         |        |          |         |
| 18       | 39        |        0 |                  54 |     36 |      10 |         |        |          |         |
| 19       | 40        |        0 |                  36 |     54 |      10 |         |        |          |         |
| 20       | 41        |        0 |                  18 |     72 |      10 |         |        |          |         |
| 21       | 42        |        0 |                   0 |     90 |      10 |         |        |          |         |

### Grelha de Seger: 24 vidrados

Todas as peças de teste têm os mesmos fundentes, 0,2 KNaO e 0,8 CaO, de 福島長石 e carbonato de cálcio. A alumina varia ao longo das linhas da grelha e a sílica ao longo das colunas. As receitas foram calculadas pelo método da sessão 5; a fórmula de Seger de cada uma, no Glazecalc, fica a menos de 0,01 da sua alumina e a menos de 0,06 da sua sílica. Marque cada peça de teste num gráfico de sílica em função da alumina e desenhe as suas próprias regiões: mate, brilhante, subcozido, com escorrimento.

Table: Grelha de Seger: 0,2 KNaO, 0,8 CaO, percentagem em peso
Label: Grelha de Seger

| Peça | Al₂O₃ | SiO₂ | 福島長石 | Carbonato de cálcio | Caulino | Sílica | Oxidação | Redução |
| ---- | ----: | ---: | -------: | ------------------: | ------: | -----: | -------- | ------- |
| 1    |  0,25 |  2,0 |     46,9 |                32,5 |     3,5 |   17,1 |          |         |
| 2    |  0,25 |  2,5 |     41,8 |                28,9 |     3,1 |   26,2 |          |         |
| 3    |  0,25 |  3,0 |     37,6 |                26,1 |     2,8 |   33,5 |          |         |
| 4    |  0,25 |  3,5 |     34,3 |                23,7 |     2,5 |   39,5 |          |         |
| 5    |  0,25 |  4,0 |     31,4 |                21,7 |     2,3 |   44,5 |          |         |
| 6    |  0,25 |  4,5 |     29,0 |                20,1 |     2,2 |   48,7 |          |         |
| 7    |  0,35 |  2,0 |     44,3 |                30,6 |    13,9 |   11,3 |          |         |
| 8    |  0,35 |  2,5 |     39,6 |                27,4 |    12,4 |   20,5 |          |         |
| 9    |  0,35 |  3,0 |     35,9 |                24,8 |    11,2 |   28,0 |          |         |
| 10   |  0,35 |  3,5 |     32,8 |                22,7 |    10,3 |   34,2 |          |         |
| 11   |  0,35 |  4,0 |     30,2 |                20,9 |     9,5 |   39,5 |          |         |
| 12   |  0,35 |  4,5 |     28,0 |                19,4 |     8,8 |   43,9 |          |         |
| 13   |  0,45 |  2,0 |     41,9 |                29,0 |    23,1 |    6,1 |          |         |
| 14   |  0,45 |  2,5 |     37,7 |                26,1 |    20,8 |   15,4 |          |         |
| 15   |  0,45 |  3,0 |     34,3 |                23,7 |    18,9 |   23,0 |          |         |
| 16   |  0,45 |  3,5 |     31,5 |                21,8 |    17,4 |   29,4 |          |         |
| 17   |  0,45 |  4,0 |     29,1 |                20,1 |    16,0 |   34,8 |          |         |
| 18   |  0,45 |  4,5 |     27,0 |                18,7 |    14,9 |   39,4 |          |         |
| 19   |  0,55 |  2,0 |     39,7 |                27,5 |    31,4 |    1,5 |          |         |
| 20   |  0,55 |  2,5 |     35,9 |                24,9 |    28,4 |   10,8 |          |         |
| 21   |  0,55 |  3,0 |     32,8 |                22,7 |    26,0 |   18,5 |          |         |
| 22   |  0,55 |  3,5 |     30,2 |                20,9 |    23,9 |   25,0 |          |         |
| 23   |  0,55 |  4,0 |     28,0 |                19,4 |    22,1 |   30,5 |          |         |
| 24   |  0,55 |  4,5 |     26,1 |                18,1 |    20,6 |   35,3 |          |         |

As Misturas do Glazecalc fazem triângulos e quadrados de 3 a 66 peças de teste, não esta grelha; abra qualquer peça de teste como receita na [página da receita](/recipe) e imprima daí a sua lista de pesagem.

## Fontes {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): as seis sessões.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: as datas e os temas das sessões.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: os trabalhos de 42, 90 e 78 vidrados em oxidação e em redução do curso seguinte.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): o programa de cálculo do próprio centro.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): a fórmula de Seger nas semanas 5, 6 e 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): cálculo de vidrados para professores em Taiwan.
- Glendale Community College, ART 195 course outline: a fórmula de Seger nas semanas 5 a 7 de 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: a análise de 福島長石 na biblioteca do Glazecalc.
- IUPAC, massas atómicas padrão, tal como a química do Glazecalc as usa.
