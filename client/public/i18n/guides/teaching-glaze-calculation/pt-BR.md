---
title: Como ensinar o cálculo de esmaltes
lead: 6 sessões para uma turma ou um grupo de estudo, das matérias-primas e das provas triaxiais à fórmula de Seger calculada nos dois sentidos e aos defeitos de esmalte, cada uma com um exemplo resolvido, os passos no Glazecalc, uma folha de exercícios para imprimir e perguntas de conferência.
---

## Sobre este material {#about}

Este material é para quem ensina o cálculo de esmaltes: uma escola, uma turma de ateliê, um grupo de estudo de ceramistas profissionais ou um ceramista que aprende sozinho. Tem seis sessões, e cada uma traz seus objetivos, o que preparar, um exemplo resolvido com matérias-primas reais, como fazer no Glazecalc, uma folha de exercícios e perguntas de conferência.

A ordem das sessões segue um grupo de estudo publicado: o 陶磁器釉薬技術研究会 (grupo de estudo de esmaltes cerâmicos) do Centro de Tecnologia Industrial da Província de Ibaraki, no Japão, que fez seis sessões para 12 jovens ceramistas em 2015 e as relatou em seu relatório de pesquisa. O curso seguinte, na faculdade de cerâmica de Kasama, propôs três tarefas de provas, de 42, 90 e 78 esmaltes, todas queimadas em oxidação e em redução. **O Glazecalc não tem ligação com o centro nem com a faculdade.** Seguimos a ordem do roteiro publicado por eles e o citamos abaixo; o texto, os exemplos e as folhas de exercícios aqui são nossos. Cursos de outros países ensinam os mesmos passos quase na mesma ordem: o SCT305 da Bilecik Şeyh Edebali University, na Turquia, o ART 195 do Glendale Community College, nos EUA, o programa da Renânia-Palatinado para escolas de cerâmica na Alemanha e o artigo de 2006 de 李堅萍 para professores em Taiwan.

Table: As seis sessões
Label: As seis sessões

| Sessão | Assunto                                            | No Glazecalc                                  |
| ------ | -------------------------------------------------- | --------------------------------------------- |
| 1      | Matérias-primas, o que fazem, provas triaxiais     | Matérias-primas, Misturas (triaxial)          |
| 2      | A química: elementos, fórmulas, mols               | A página de uma matéria-prima                 |
| 3      | Ler uma fórmula de Seger, o gráfico sílica–alumina | A calculadora de receitas, o gráfico de Stull |
| 4      | Da receita à fórmula de Seger                      | Como a fórmula de Seger é calculada           |
| 5      | Da fórmula de Seger à receita                      | Calcular para um alvo                         |
| 6      | A massa e os defeitos de esmalte                   | Limites, Comparar                             |

### Como usar

- Cada sessão dura cerca de 2 horas. As sessões 4 e 5 precisam de calculadoras e de um computador ou celular com o Glazecalc para cada dupla.
- Os exemplos resolvidos usam matérias-primas vendidas no Japão e os números da biblioteca padrão do Glazecalc: 福島長石 (feldspato de Fukushima), carbonato de cálcio{{en: whiting}} (石灰石), um caulim e sílica (珪石). Se você tiver a análise do seu fornecedor, adicione-a na [página Matérias-primas](/material): os números mudam, mas o método não.
- A queima é no SK 8, {{2282 °F; 1250 °C}} nominais. Use o cone em que sua turma queima; [Queimando com cones SK](/guides/firing#sk-cones) explica os números SK.
- Para imprimir uma folha de exercícios ou um mapa de provas, imprima esta página pelo navegador. Salvar receitas, misturas e anotações exige uma conta gratuita.

> [!WARNING]
> As sessões 1, 3 e 6 são trabalho de laboratório: pesar matérias-primas secas e queimar. Antes de alguém pesar qualquer matéria-prima, leia [Os hábitos que mais importam](/guides/safe-mixing#habits). A poeira de esmalte seco é o principal perigo.

## Sessão 1: Matérias-primas e provas triaxiais {#materials}

> [!WARNING]
> Pese as matérias-primas secas com delicadeza, limpe com pano úmido e use uma máscara de proteção respiratória bem ajustada enquanto os pós estiverem secos. Leia antes [O principal perigo: a poeira](/guides/safe-mixing#the-main-hazard) e [Máscaras de proteção respiratória](/guides/safe-mixing#respirators).

### Objetivos

- Nomear os três trabalhos em um esmalte: formador de vidro, fundente{{en: flux}} e estabilizante.
- Classificar 4 matérias-primas comuns pelos óxidos que elas fornecem.
- Montar uma mistura triaxial e ler suas provas como um mapa.

### Preparar

- Um saco de cada: 福島長石, carbonato de cálcio, um caulim e sílica, ou as matérias-primas que sua turma tiver.
- O [mapa de provas triaxial](#tile-maps) abaixo, impresso, e 21 provas por aluno para cada triângulo.
- Provas queimadas de uma triaxial anterior, se você tiver, para passar de mão em mão.

### Exemplo resolvido

A análise de cada matéria-prima, da biblioteca do Glazecalc, dá os óxidos que ela deixa depois da queima. A perda ao fogo (PF){{en: loss on ignition}} é o que se queima e vai embora.

Table: Quatro matérias-primas e o que elas fornecem (porcentagem em peso, da biblioteca)
Label: Quatro matérias-primas

| Matéria-prima                | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |    PF | Sua função                                  |
| ---------------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------------- |
| 福島長石 (feldspato)         | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fundente, com sua própria alumina e sílica  |
| Carbonato de cálcio (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Fundente (cálcio)                           |
| Caulim EPK                   | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Estabilizante: a principal fonte de alumina |
| Sílica (珪石)                |  100 |     – |     – |    – |     – |     – | Formador de vidro                           |

O feldspato sozinho derrete no SK 8 e vira um vidro viscoso; o carbonato de cálcio sozinho não derrete; a sílica sozinha não derrete. Misturados, derretem muito melhor do que qualquer um deles. Uma mistura triaxial mostra onde: o mapa de provas abaixo varia os três de 20% em 20%, com 10% de caulim em todas as provas.

::shops

### No Glazecalc

1. Abra cada matéria-prima na [página Matérias-primas](/material), ou a página pública dela, como [Fukushima Feldspar](/materials/fukushima-feldspar). Anote quais óxidos ela fornece.
2. Faça três receitas: 福島長石 90 com caulim 10, carbonato de cálcio 90 com caulim 10 e sílica 90 com caulim 10. Em [Misturas para provas](/blends), escolha **Triaxial (3 receitas)** e 6 fileiras: 21 provas, o mesmo que o mapa abaixo.
3. Escolha o lote de cada prova e use **Imprimir** para o que deve ser pesado. Depois da queima, salve como receitas, a partir do desenho das provas, as que você gostar.

### Folha de exercícios

Table: Folha de exercícios 1: o que cada matéria-prima fornece
Label: Folha de exercícios 1

| Matéria-prima       | Óxidos que fornece | Formador de vidro, fundente ou estabilizante? | PF (%) |
| ------------------- | ------------------ | --------------------------------------------- | ------ |
| 福島長石            |                    |                                               |        |
| Carbonato de cálcio |                    |                                               |        |
| Caulim              |                    |                                               |        |
| Sílica              |                    |                                               |        |

### Conferência

- Qual matéria-prima fornece a maior parte da alumina, e por que um esmalte precisa dela?
- Por que o canto do triângulo com carbonato de cálcio não derrete sozinho?
- Em que ponto do triângulo suas provas derreteram melhor, e de qual canto esse ponto estava mais perto?

## Sessão 2: A química de que você precisa {#chemistry}

### Objetivos

- Ler uma fórmula química: SiO₂, CaO, Al₂O₃, CaCO₃.
- Calcular uma massa molar a partir das massas atômicas.
- Transformar gramas em mols, e de volta.

### Preparar

- Uma tabela periódica para cada aluno, e calculadoras.
- As massas atômicas da tabela abaixo (os valores-padrão da IUPAC, como o Glazecalc os usa).

### Exemplo resolvido

Table: Massas atômicas usadas aqui (g/mol)
Label: Massas atômicas

| Elemento | Símbolo | Massa atômica |
| -------- | ------- | ------------: |
| Oxigênio | O       |        15,999 |
| Carbono  | C       |        12,011 |
| Sódio    | Na      |         22,99 |
| Alumínio | Al      |        26,982 |
| Silício  | Si      |        28,085 |
| Potássio | K       |        39,098 |
| Cálcio   | Ca      |        40,078 |

Uma fórmula conta átomos. O SiO₂ é um silício e dois oxigênios, então um mol dele pesa 28,085 + 2 × 15,999 = 60,083 g. O Al₂O₃ é 2 × 26,982 + 3 × 15,999 = 101,961 g. O CaO é 56,077 g, e o carbonato de cálcio, CaCO₃, é 100,086 g; a biblioteca do Glazecalc arredonda para 100,08.

Um **mol** é uma contagem, como uma dúzia: o mesmo número de moléculas, sejam quais forem. Mols são gramas ÷ massa molar:

- 25 g de sílica são 25 ÷ 60,083 = 0,416 mol de SiO₂.
- 20 g de carbonato de cálcio são 20 ÷ 100,08 = 0,200 mol. No forno, ele perde o dióxido de carbono (CO₂, 44,009 g/mol) e deixa 0,200 mol de CaO, que pesa 0,200 × 56,077 = 11,2 g. Essa perda é a sua PF: 43,97%.

### No Glazecalc

1. Abra [Carbonato de cálcio](/materials/whiting) e [Sílica](/materials/silica): cada página dá a fórmula e as massas.
2. Confira à mão uma massa molar com a da página.

### Folha de exercícios

Table: Folha de exercícios 2: massa molar e mols
Label: Folha de exercícios 2

| Óxido ou matéria-prima | Fórmula | Massa molar (g/mol) | Gramas | Mols |
| ---------------------- | ------- | ------------------- | ------ | ---- |
| Sílica                 | SiO₂    |                     | 30     |      |
| Alumina                | Al₂O₃   |                     | 10     |      |
| Óxido de cálcio        | CaO     |                     | 5      |      |
| Carbonato de cálcio    | CaCO₃   |                     | 15     |      |

### Conferência

- Quantos gramas pesa um mol de SiO₂, e como se calcula isso?
- Por que 20 g de carbonato de cálcio deixam menos de 20 g no esmalte queimado?
- Por que comparamos os óxidos em mols, e não em gramas?

## Sessão 3: Ler uma fórmula de Seger {#reading-the-formula}

> [!WARNING]
> Colorir um esmalte significa pesar corantes, e alguns exigem mais cuidado do que as matérias-primas da base. Leia antes [Matérias-primas que exigem mais cuidado](/guides/safe-mixing#materials).

### Objetivos

- Ler as três colunas de uma fórmula de Seger (UMF){{en: unity formula}} (ゼーゲル式, a fórmula de Seger): fundentes, estabilizante, formador de vidro.
- Encontrar um esmalte em um gráfico sílica–alumina e saber o que o gráfico pode e o que não pode dizer.
- Colorir um esmalte pronto por etapas e registrar o resultado.

### Preparar

- A fórmula de Seger abaixo, escrita em letras grandes.
- Um esmalte transparente pronto e um corante como o óxido de ferro vermelho{{en: red iron oxide}} (弁柄).

### Exemplo resolvido

O esmalte da sessão 4, 福島長石 45, carbonato de cálcio 20, caulim 10 e sílica 25, tem esta fórmula de Seger (números do Glazecalc, arredondados):

Table: Uma fórmula de Seger em suas três colunas
Label: Uma fórmula de Seger

| Fundentes (RO, R₂O) | Estabilizante (R₂O₃) | Formador de vidro (RO₂) |
| ------------------- | -------------------- | ----------------------- |
| K₂O 0,18            | Al₂O₃ 0,43           | SiO₂ 3,45               |
| Na₂O 0,10           |                      |                         |
| CaO 0,72            |                      |                         |

- Os fundentes somam 1: essa é a regra da fórmula. Cada um dos outros números é mols para cada mol de fundentes.
- A razão sílica/alumina é 3,45 ÷ 0,43, cerca de 8: um esmalte brilhante típico.
- O cálcio é a maior parte do fundente, como na maioria dos esmaltes japoneses de cal (石灰釉).

Um gráfico com a sílica na horizontal e a alumina na vertical coloca cada esmalte como um ponto. Os testes de Seger e o gráfico de Stull de 1912 são desse tipo, e um 釉性状図 projeta nele as provas queimadas de uma turma. A página da calculadora de receitas do Glazecalc desenha o gráfico de Stull, e este esmalte fica na região brilhante dele. As regiões de Stull vêm dos fundentes e da queima dele próprio: uma orientação, não uma previsão. A [grade de provas](#tile-maps) abaixo permite que uma turma desenhe seu próprio gráfico, na sua própria queima.

::stull-chart

Para colorir um esmalte pronto cuja receita você não conhece, o Glazecalc não consegue calcular a fórmula dele. Em vez disso, acrescente o corante por cima dos 100: 100 g do esmalte seco com 1, 2 e 3 g de óxido de ferro, uma prova para cada, queimadas em oxidação e em redução.

### No Glazecalc

1. Na [calculadora de receitas](/recipe), digite a receita acima e leia a **Fórmula de Seger** e o **Gráfico de Stull**.
2. Mude a sílica de 25 para 35 e veja o ponto se mover para a direita.
3. Para uma base cuja receita você tem, faça do corante um acréscimo e use uma mistura linear em [Misturas para provas](/blends) para variá-lo por etapas.

### Folha de exercícios

Table: Folha de exercícios 3: um corante em um esmalte pronto
Label: Folha de exercícios 3

| Prova | Corante (g por 100 g) | Oxidação: aparência | Redução: aparência |
| ----- | --------------------- | ------------------- | ------------------ |
| 1     | 0                     |                     |                    |
| 2     | 1                     |                     |                    |
| 3     | 2                     |                     |                    |
| 4     | 3                     |                     |                    |

### Conferência

- Em uma fórmula de Seger, qual coluna soma 1?
- Qual é a razão sílica/alumina deste esmalte, e o que ela sugere?
- Por que um ponto na região brilhante do gráfico ainda pode dar uma prova fosca no seu forno?

## Sessão 4: Da receita à fórmula de Seger {#recipe-to-formula}

### Objetivos

- Calcular à mão a fórmula de Seger a partir de uma receita.
- Conferi-la com o cálculo do próprio Glazecalc.

### Preparar

- A folha de exercícios 4, as quatro análises da sessão 1 e calculadoras.

### Exemplo resolvido

A receita: 福島長石 45, carbonato de cálcio 20, caulim EPK 10, sílica 25. Considere cada quantidade em gramas. Para cada matéria-prima, gramas × a porcentagem do óxido ÷ 100 ÷ sua massa molar dá os mols dela. A tabela mostra os óxidos principais; o Glazecalc conta também os traços (o ferro e o titânio do caulim, o magnésio do feldspato).

Table: Mols de cada óxido na carga (100 g)
Label: Mols na carga

| Matéria-prima       | Gramas |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ------------------- | -----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石            |     45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Carbonato de cálcio |     20 |      – |      – | 0,1998 |      – |      – |
| Caulim              |     10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Sílica              |     25 |      – |      – |      – |      – | 0,4161 |
| Total               |    100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Os fundentes somam 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnésia) = 0,2847 mol. Divida cada total por esse valor:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Essa é a fórmula da sessão 3.

### No Glazecalc

1. Digite a receita na [calculadora de receitas](/recipe).
2. Abra **Como a fórmula de Seger é calculada**. Ele mostra estes passos com os números desta receita: gramas, os mols de cada óxido em cada matéria-prima, os totais e a divisão pelos fundentes.
3. Compare cada linha com a sua folha de exercícios. Depois mude uma quantidade e calcule só a coluna que ela altera.

### Folha de exercícios

Table: Folha de exercícios 4: da receita à fórmula de Seger
Label: Folha de exercícios 4

| Matéria-prima | Gramas | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------- | ------ | --- | ---- | --- | ----- | ---- |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
|               |        |     |      |     |       |      |
| Total         |        |     |      |     |       |      |
| ÷ fundentes   |        |     |      |     |       |      |

### Conferência

- Por que qualquer tamanho de carga dá a mesma fórmula de Seger?
- Quais óxidos o caulim fornece, e qual deles importa mais aqui?
- Por que a PF do carbonato de cálcio fica de fora da fórmula?

## Sessão 5: Da fórmula de Seger à receita {#formula-to-recipe}

### Objetivos

- Escolher matérias-primas para uma fórmula alvo e calcular quanto de cada uma.
- Usar Calcular para um alvo e dizer quão perto ele chega.

### Preparar

- O alvo abaixo, a folha de exercícios 5 e calculadoras; o Glazecalc com uma conta.

### Exemplo resolvido

O alvo: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ e 4,0 SiO₂. Pegue as matérias-primas nesta ordem, cada uma para o óxido que só ela pode fornecer:

1. **O feldspato, para o potássio e o sódio.** Uma unidade de 福島長石 (536,8 g, o peso que contém um mol de fundentes) fornece 0,94 mol de K₂O e Na₂O. O alvo precisa de 0,3, então 0,3 ÷ 0,94 = 0,319 unidade: 171,4 g. Ele também fornece 0,015 de CaO, 0,328 de Al₂O₃ e 1,865 de SiO₂.
2. **O carbonato de cálcio, para o resto do cálcio.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **O caulim, para o resto da alumina.** 0,4 − 0,328 = 0,072 mol. O caulim EPK contém um mol de Al₂O₃ em 272,6 g, então são 19,6 g, que também fornecem 0,149 de SiO₂.
4. **A sílica, para o resto.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

A carga é de 379,0 g. Em porcentagem: 福島長石 45,2, carbonato de cálcio 18,1, caulim 5,2, sílica 31,5. O feldspato define a razão entre potássio e sódio, então a receita dá 0,195 de K₂O e 0,104 de Na₂O: perto do alvo, mas não exatamente nele.

### No Glazecalc

1. Abra [Calcular para um alvo](/solve), escolha **Uma fórmula de Seger** e digite o alvo.
2. Em **As matérias-primas**, informe 福島長石, carbonato de cálcio, caulim EPK e sílica, e escolha **Calcular**.
3. Ele dá 福島長石 44,9, carbonato de cálcio 18,2, caulim 5,6 e sílica 31,3, e uma tabela de quão perto cada óxido chega. Compare com o seu cálculo à mão: o programa conta todos os traços e encontra o melhor ajuste que as quatro matérias-primas permitem.
4. Use **Abrir como nova receita** e confira na calculadora de receitas.

### Folha de exercícios

Table: Folha de exercícios 5: do alvo à receita
Label: Folha de exercícios 5

| Passo | Matéria-prima | Para qual óxido | Mols necessários | Gramas | Também fornece |
| ----- | ------------- | --------------- | ---------------- | ------ | -------------- |
| 1     |               |                 |                  |        |                |
| 2     |               |                 |                  |        |                |
| 3     |               |                 |                  |        |                |
| 4     |               |                 |                  |        |                |

### Conferência

- Por que o feldspato é calculado primeiro?
- Por que essas quatro matérias-primas não conseguem dar exatamente 0,2 de K₂O e 0,1 de Na₂O?
- O que você acrescentaria às matérias-primas para trazer magnésia?

## Sessão 6: A massa e os defeitos de esmalte {#body-and-defects}

> [!WARNING]
> Um esmalte queimado pode liberar metais em alimentos e bebidas, e pode parecer perfeito enquanto faz isso. Esmaltes com muito bário ou com cobre, e qualquer esmalte com chumbo, podem liberar metais. Só um ensaio de liberação de metais{{en: leach test}} da peça queimada, feito em laboratório, mostra o que ela libera; nenhum cálculo mostra. Leia [Segurança alimentar](/guides/glazing-basics#food-safety) e [Matérias-primas que exigem mais cuidado](/guides/safe-mixing#materials).

### Objetivos

- Medir a retração e a absorção de água de uma massa.
- Nomear os defeitos comuns, suas causas habituais e uma primeira correção.
- Saber quais defeitos tornam uma peça insegura.

### Preparar

- Barras de teste da sua massa, marcadas com 100 mm de distância ainda úmidas, queimadas e não queimadas.
- Provas com defeitos, se você tiver: gretamento, encolhimento do esmalte, furinhos, escorrimento.

### Exemplo resolvido

- **Retração**: (comprimento marcado − comprimento queimado) ÷ comprimento marcado × 100. Marcas a 100 mm de distância que medem 88 mm depois da queima: 12% de retração.
- **Absorção de água**: (peso depois de molhar − peso seco) ÷ peso seco × 100. Uma barra queimada de 50,0 g que pesa 50,6 g depois de molhada: 1,2%.

Table: Defeitos, causas e uma primeira correção na fórmula de Seger
Label: Defeitos

| Defeito                                 | Causa habitual                                   | Uma primeira correção a tentar                                   |
| --------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Gretamento{{en: crazing}}               | O esmalte encolhe mais do que a massa            | Menos K₂O e Na₂O; mais cálcio, magnésia ou boro                  |
| Descascamento{{en: shivering}}          | O esmalte encolhe bem menos do que a massa       | Mais K₂O e Na₂O                                                  |
| Escorrimento                            | Alumina de menos, ou camada grossa demais        | Mais alumina; uma camada mais fina                               |
| Encolhimento do esmalte{{en: crawling}} | Biscoito empoeirado, ou camada grossa que rachou | Limpar o biscoito; uma camada mais fina                          |
| Furinhos (pinholes)                     | Gás cuja marca não se fechou                     | Um patamar na temperatura máxima da queima; uma camada mais fina |

[Acordo massa-esmalte e defeitos](/guides/glazing-basics#fit-and-defects) explica cada um, com o teste da água com gelo para o gretamento. Não use peças com gretamento ou descascamento para alimentos ou bebidas.

::food-limits

### No Glazecalc

1. Na [calculadora de receitas](/recipe), leia o painel **Limites** de um esmalte seu e a expansão calculada dele.
2. Copie a receita, troque parte do feldspato por carbonato de cálcio e compare as duas: para que lado a expansão se moveu?

### Folha de exercícios

Table: Folha de exercícios 6: a massa
Label: Folha de exercícios 6

| Barra | Comprimento marcado (mm) | Comprimento queimado (mm) | Retração (%) | Peso seco (g) | Peso molhado (g) | Absorção (%) |
| ----- | ------------------------ | ------------------------- | ------------ | ------------- | ---------------- | ------------ |
| 1     | 100                      |                           |              |               |                  |              |
| 2     | 100                      |                           |              |               |                  |              |

### Conferência

- Qual defeito vem de um esmalte que encolhe mais do que a massa, e qual é a primeira correção?
- Por que peças com descascamento nunca devem ser usadas com alimentos?
- Um cálculo pode dizer que um esmalte é seguro para alimentos? O que pode?

## Mapas de provas para imprimir {#tile-maps}

### Mapa triaxial: 42 esmaltes

Dois triângulos de 21 provas, a partir da disposição de Misturas com 6 fileiras: a prova 1 no topo (feldspato), a fileira de baixo do carbonato de cálcio (à esquerda) à sílica (à direita). O triângulo II é o triângulo I com 1 g de óxido de ferro vermelho por cima de cada 100 g, o que puxa para o celadon (青磁) na redução. Queimadas em oxidação e em redução, são 84 provas. As quantidades são gramas por 100 g.

Table: Mapa triaxial: 福島長石, carbonato de cálcio e sílica, com 10 de caulim em cada prova
Label: Mapa triaxial

| Prova (I) | Prova (II) | 福島長石 | Carbonato de cálcio | Sílica | Caulim | I ox | I red | II ox | II red |
| --------- | ---------- | -------: | ------------------: | -----: | -----: | ---- | ----- | ----- | ------ |
| 1         | 22         |       90 |                   0 |      0 |     10 |      |       |       |        |
| 2         | 23         |       72 |                  18 |      0 |     10 |      |       |       |        |
| 3         | 24         |       72 |                   0 |     18 |     10 |      |       |       |        |
| 4         | 25         |       54 |                  36 |      0 |     10 |      |       |       |        |
| 5         | 26         |       54 |                  18 |     18 |     10 |      |       |       |        |
| 6         | 27         |       54 |                   0 |     36 |     10 |      |       |       |        |
| 7         | 28         |       36 |                  54 |      0 |     10 |      |       |       |        |
| 8         | 29         |       36 |                  36 |     18 |     10 |      |       |       |        |
| 9         | 30         |       36 |                  18 |     36 |     10 |      |       |       |        |
| 10        | 31         |       36 |                   0 |     54 |     10 |      |       |       |        |
| 11        | 32         |       18 |                  72 |      0 |     10 |      |       |       |        |
| 12        | 33         |       18 |                  54 |     18 |     10 |      |       |       |        |
| 13        | 34         |       18 |                  36 |     36 |     10 |      |       |       |        |
| 14        | 35         |       18 |                  18 |     54 |     10 |      |       |       |        |
| 15        | 36         |       18 |                   0 |     72 |     10 |      |       |       |        |
| 16        | 37         |        0 |                  90 |      0 |     10 |      |       |       |        |
| 17        | 38         |        0 |                  72 |     18 |     10 |      |       |       |        |
| 18        | 39         |        0 |                  54 |     36 |     10 |      |       |       |        |
| 19        | 40         |        0 |                  36 |     54 |     10 |      |       |       |        |
| 20        | 41         |        0 |                  18 |     72 |     10 |      |       |       |        |
| 21        | 42         |        0 |                   0 |     90 |     10 |      |       |       |        |

### Grade de Seger: 24 esmaltes

Todas as provas têm os mesmos fundentes, 0,2 KNaO e 0,8 CaO, vindos de 福島長石 e carbonato de cálcio. A alumina diminui descendo pela grade e a sílica aumenta indo para o lado. As receitas foram calculadas pelo método da sessão 5; a fórmula de Seger de cada uma no Glazecalc fica a até 0,01 da sua alumina e a até 0,06 da sua sílica. Marque cada prova em um gráfico de sílica contra alumina e desenhe suas próprias regiões: fosco, brilhante, subqueimado, escorrido.

Table: Grade de Seger: 0,2 KNaO, 0,8 CaO, porcentagem em peso
Label: Grade de Seger

| Prova | Al₂O₃ | SiO₂ | 福島長石 | Carbonato de cálcio | Caulim | Sílica | Oxidação | Redução |
| ----- | ----: | ---: | -------: | ------------------: | -----: | -----: | -------- | ------- |
| 1     |  0,25 |  2,0 |     46,9 |                32,5 |    3,5 |   17,1 |          |         |
| 2     |  0,25 |  2,5 |     41,8 |                28,9 |    3,1 |   26,2 |          |         |
| 3     |  0,25 |  3,0 |     37,6 |                26,1 |    2,8 |   33,5 |          |         |
| 4     |  0,25 |  3,5 |     34,3 |                23,7 |    2,5 |   39,5 |          |         |
| 5     |  0,25 |  4,0 |     31,4 |                21,7 |    2,3 |   44,5 |          |         |
| 6     |  0,25 |  4,5 |     29,0 |                20,1 |    2,2 |   48,7 |          |         |
| 7     |  0,35 |  2,0 |     44,3 |                30,6 |   13,9 |   11,3 |          |         |
| 8     |  0,35 |  2,5 |     39,6 |                27,4 |   12,4 |   20,5 |          |         |
| 9     |  0,35 |  3,0 |     35,9 |                24,8 |   11,2 |   28,0 |          |         |
| 10    |  0,35 |  3,5 |     32,8 |                22,7 |   10,3 |   34,2 |          |         |
| 11    |  0,35 |  4,0 |     30,2 |                20,9 |    9,5 |   39,5 |          |         |
| 12    |  0,35 |  4,5 |     28,0 |                19,4 |    8,8 |   43,9 |          |         |
| 13    |  0,45 |  2,0 |     41,9 |                29,0 |   23,1 |    6,1 |          |         |
| 14    |  0,45 |  2,5 |     37,7 |                26,1 |   20,8 |   15,4 |          |         |
| 15    |  0,45 |  3,0 |     34,3 |                23,7 |   18,9 |   23,0 |          |         |
| 16    |  0,45 |  3,5 |     31,5 |                21,8 |   17,4 |   29,4 |          |         |
| 17    |  0,45 |  4,0 |     29,1 |                20,1 |   16,0 |   34,8 |          |         |
| 18    |  0,45 |  4,5 |     27,0 |                18,7 |   14,9 |   39,4 |          |         |
| 19    |  0,55 |  2,0 |     39,7 |                27,5 |   31,4 |    1,5 |          |         |
| 20    |  0,55 |  2,5 |     35,9 |                24,9 |   28,4 |   10,8 |          |         |
| 21    |  0,55 |  3,0 |     32,8 |                22,7 |   26,0 |   18,5 |          |         |
| 22    |  0,55 |  3,5 |     30,2 |                20,9 |   23,9 |   25,0 |          |         |
| 23    |  0,55 |  4,0 |     28,0 |                19,4 |   22,1 |   30,5 |          |         |
| 24    |  0,55 |  4,5 |     26,1 |                18,1 |   20,6 |   35,3 |          |         |

O Misturas do Glazecalc faz triângulos e quadrados de 3 a 66 provas, não esta grade; abra qualquer prova como receita na [calculadora de receitas](/recipe) e imprima de lá a lista de pesagem dela.

## Fontes {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): as seis sessões.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: as datas e os assuntos das sessões.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: as tarefas do curso seguinte, de 42, 90 e 78 esmaltes em oxidação e em redução.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): o programa de cálculo do próprio centro.
- Bilecik Şeyh Edebali University, [informações do curso SCT305](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): a fórmula de Seger nas semanas 5, 6 e 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): cálculo de esmaltes para professores de escola em Taiwan.
- Glendale Community College, programa do curso ART 195: a fórmula de Seger nas semanas 5 a 7 de 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: a análise de 福島長石 na biblioteca do Glazecalc.
- IUPAC, massas atômicas padrão, como a química do Glazecalc as usa.
