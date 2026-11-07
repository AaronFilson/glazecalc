---
title: Cómo enseñar el cálculo de esmaltes
lead: 6 sesiones para una clase o un grupo de estudio, desde los materiales y las probetas triaxiales hasta la fórmula Seger (UMF) calculada en los dos sentidos y los defectos del esmalte, cada una con un ejemplo resuelto, los pasos en Glazecalc, una hoja de trabajo para imprimir y preguntas de comprobación.
---

## Acerca de este material {#about}

Este material es para quien enseñe cálculo de esmaltes: una escuela, una clase de taller, un grupo de estudio de ceramistas en activo o una persona que aprende por su cuenta. Tiene seis sesiones, y cada una incluye sus objetivos, lo que hay que preparar, un ejemplo resuelto con materiales reales, cómo hacerlo en Glazecalc, una hoja de trabajo y preguntas de comprobación.

El orden de las sesiones sigue el de un grupo de estudio publicado: el 陶磁器釉薬技術研究会 (grupo de estudio de esmaltes cerámicos) del Centro de Tecnología Industrial de la Prefectura de Ibaraki, en Japón, que dio seis sesiones a 12 jóvenes ceramistas en 2015 y las recogió en su informe de investigación. Su curso posterior en la escuela de cerámica de Kasama propuso tres tareas de probetas de 42, 90 y 78 esmaltes, cada una cocida en oxidación y en reducción. **Glazecalc no tiene relación con el centro ni con la escuela.** Seguimos el orden de su esquema publicado y lo citamos más abajo; el texto, los ejemplos y las hojas de trabajo de aquí son nuestros. Los cursos de otros países enseñan los mismos pasos casi en el mismo orden: el SCT305 de la Universidad Bilecik Şeyh Edebali en Turquía, el ART 195 del Glendale Community College en EE. UU., el programa de Renania-Palatinado para las escuelas de cerámica en Alemania y el artículo de 2006 de 李堅萍 para docentes en Taiwán.

Table: Las seis sesiones
Label: Las seis sesiones

| Sesión | Tema                                                   | En Glazecalc                                   |
| ------ | ------------------------------------------------------ | ---------------------------------------------- |
| 1      | Los materiales, qué hacen, probetas triaxiales         | Materiales, Mezclas para probetas (triaxial)   |
| 2      | La química: elementos, fórmulas, moles                 | La página de un material                       |
| 3      | Leer una fórmula Seger, el gráfico de sílice y alúmina | La calculadora de recetas, el gráfico de Stull |
| 4      | De la receta a la fórmula Seger                        | Cómo se calcula la fórmula Seger               |
| 5      | De la fórmula Seger a la receta                        | Buscar una receta para un objetivo             |
| 6      | La pasta y los defectos del esmalte                    | Límites, Comparar                              |

### Cómo usarlo

- Cada sesión dura unas 2 horas. Las sesiones 4 y 5 necesitan calculadoras y, por parejas, un ordenador o un móvil con Glazecalc.
- Los ejemplos resueltos usan materiales que se venden en Japón y las cifras de la biblioteca estándar de Glazecalc: 福島長石 (feldespato de Fukushima), carbonato cálcico{{en: whiting}} (石灰石), un caolín y sílice (珪石). Si tiene el análisis de su proveedor, añádalo en la [página Materiales](/material): los números cambian, pero el método no.
- La cocción es a SK 8, {{2282 °F; 1250 °C}} nominales. Use el cono al que cueza su clase; [Cocción por conos SK](/guides/firing#sk-cones) explica los números SK.
- Para imprimir una hoja de trabajo o un mapa de probetas, imprima esta página desde el navegador. Guardar recetas, mezclas y notas requiere una cuenta gratuita.

> [!WARNING]
> Las sesiones 1, 3 y 6 son trabajo de laboratorio: se pesan materiales secos y se cuece. Antes de que nadie pese un material, lea [Los hábitos que más importan](/guides/safe-mixing#habits). El polvo de esmalte seco es el principal peligro.

## Sesión 1: materiales y probetas triaxiales {#materials}

> [!WARNING]
> Pese los materiales secos con suavidad, limpie en húmedo y lleve un equipo de protección respiratoria bien ajustado mientras los polvos estén secos. Lea primero [El principal peligro: el polvo](/guides/safe-mixing#the-main-hazard) y [Protección respiratoria](/guides/safe-mixing#respirators).

### Objetivos

- Nombrar las tres funciones de un esmalte: formador de vidrio{{en: glass former}}, fundente{{en: flux}} y estabilizante{{en: stabilizer}}.
- Clasificar 4 materiales comunes según los óxidos que aportan.
- Preparar una mezcla triaxial y leer sus probetas como un mapa.

### Preparación

- Un saco de cada uno de 福島長石, carbonato cálcico, un caolín y sílice, o los materiales que tenga su clase.
- El [mapa de probetas triaxial](#tile-maps) de más abajo, impreso, y 21 probetas por estudiante para cada triángulo.
- Probetas cocidas de una mezcla triaxial anterior, si las tiene, para pasarlas entre el grupo.

### Ejemplo resuelto

El análisis de cada material, tomado de la biblioteca de Glazecalc, da los óxidos que quedan tras la cocción. La pérdida al fuego (PF){{en: loss on ignition}} es lo que se quema y se pierde.

Table: Cuatro materiales y lo que aportan (porcentaje en peso, según la biblioteca)
Label: Cuatro materiales

| Material                   | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |    PF | Su función                                         |
| -------------------------- | ---: | ----: | ----: | ---: | ----: | ----: | -------------------------------------------------- |
| 福島長石 (feldespato)      | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fundente, con su propia alúmina y su propia sílice |
| Carbonato cálcico (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Fundente (calcio)                                  |
| EPK Kaolin                 | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Estabilizante: la principal fuente de alúmina      |
| Sílice (珪石)              |  100 |     – |     – |    – |     – |     – | Formador de vidrio                                 |

Solo con feldespato, a SK 8 se funde y forma un vidrio viscoso; el carbonato cálcico solo no se funde; la sílice sola no se funde. Mezclados, se funden mucho mejor que cualquiera de ellos por separado. Una mezcla triaxial muestra dónde: el mapa de probetas de más abajo varía los tres en pasos del ~20 % (18 de 90), con un 10 % de caolín en cada probeta.

::shops

### En Glazecalc

1. Abra cada material en la [página Materiales](/material), o su página pública, como [Fukushima Feldspar](/materials/fukushima-feldspar). Anote qué óxidos aporta.
2. Haga tres recetas: 福島長石 90 con caolín 10, carbonato cálcico 90 con caolín 10 y sílice 90 con caolín 10. En [Mezclas para probetas](/blends), elija **Triaxial (3 recetas)** y 6 filas: 21 probetas, igual que en el mapa de más abajo.
3. Elija la tanda para cada probeta e **Imprimir** lo que hay que pesar. Después de la cocción, guarde como recetas las probetas que le gusten desde el dibujo de las probetas.

### Hoja de trabajo

Table: Hoja de trabajo 1: lo que aporta cada material
Label: Hoja de trabajo 1

| Material          | Óxidos que aporta | ¿Formador de vidrio, fundente o estabilizante? | PF (%) |
| ----------------- | ----------------- | ---------------------------------------------- | ------ |
| 福島長石          |                   |                                                |        |
| Carbonato cálcico |                   |                                                |        |
| Caolín            |                   |                                                |        |
| Sílice            |                   |                                                |        |

### Comprobación

- ¿Qué material aporta la mayor parte de la alúmina, y por qué la necesita un esmalte?
- ¿Por qué el vértice del triángulo con carbonato cálcico no se funde por sí solo?
- ¿En qué zona del triángulo se fundieron mejor sus probetas, y a qué vértice estaba más cerca?

## Sesión 2: la química que necesita {#chemistry}

### Objetivos

- Leer una fórmula química: SiO₂, CaO, Al₂O₃, CaCO₃.
- Calcular una masa molar a partir de las masas atómicas.
- Convertir gramos en moles, y moles en gramos.

### Preparación

- Una tabla periódica para cada estudiante, y calculadoras.
- Las masas atómicas de la tabla de más abajo (los valores estándar de la IUPAC, tal como los usa Glazecalc).

### Ejemplo resuelto

Table: Masas atómicas usadas aquí (g/mol)
Label: Masas atómicas

| Elemento | Símbolo | Masa atómica |
| -------- | ------- | -----------: |
| Oxígeno  | O       |       15,999 |
| Carbono  | C       |       12,011 |
| Sodio    | Na      |        22,99 |
| Aluminio | Al      |       26,982 |
| Silicio  | Si      |       28,085 |
| Potasio  | K       |       39,098 |
| Calcio   | Ca      |       40,078 |

Una fórmula cuenta átomos. El SiO₂ es un silicio y dos oxígenos, así que un mol pesa 28,085 + 2 × 15,999 = 60,083 g. El Al₂O₃ es 2 × 26,982 + 3 × 15,999 = 101,961 g. El CaO pesa 56,077 g, y el carbonato cálcico, CaCO₃, 100,086 g; la biblioteca de Glazecalc lo redondea a 100,08.

Un **mol** es una cantidad de unidades, como una docena: el mismo número de moléculas, sean las que sean. Los moles son gramos ÷ masa molar:

- 25 g de sílice son 25 ÷ 60,083 = 0,416 mol de SiO₂.
- 20 g de carbonato cálcico son 20 ÷ 100,08 = 0,200 mol. En el horno pierde su dióxido de carbono (CO₂, 44,009 g/mol) y deja 0,200 mol de CaO, que pesan 0,200 × 56,077 = 11,2 g. Esa pérdida es su PF: 43,97 %.

### En Glazecalc

1. Abra [Whiting](/materials/whiting) y [Silica](/materials/silica): cada página da la fórmula y sus pesos.
2. Compruebe a mano una masa molar con la de la página.

### Hoja de trabajo

Table: Hoja de trabajo 2: masa molar y moles
Label: Hoja de trabajo 2

| Óxido o material  | Fórmula | Masa molar (g/mol) | Gramos | Moles |
| ----------------- | ------- | ------------------ | ------ | ----- |
| Sílice            | SiO₂    |                    | 30     |       |
| Alúmina           | Al₂O₃   |                    | 10     |       |
| Óxido de calcio   | CaO     |                    | 5      |       |
| Carbonato cálcico | CaCO₃   |                    | 15     |       |

### Comprobación

- ¿Cuántos gramos pesa un mol de SiO₂, y cómo se calcula?
- ¿Por qué 20 g de carbonato cálcico dejan menos de 20 g en el esmalte cocido?
- ¿Por qué comparamos los óxidos por moles y no por gramos?

## Sesión 3: leer una fórmula Seger {#reading-the-formula}

> [!WARNING]
> Colorear un esmalte supone pesar colorantes, y algunos exigen más cuidado que los materiales base. Lea primero [Los materiales que exigen más cuidado](/guides/safe-mixing#materials).

### Objetivos

- Leer las tres columnas de una fórmula Seger (UMF){{en: unity formula}} (ゼーゲル式): fundentes, estabilizante, formador de vidrio.
- Situar un esmalte en un gráfico de sílice y alúmina, y saber qué puede y qué no puede decirle el gráfico.
- Colorear por pasos un esmalte ya preparado y anotar el resultado.

### Preparación

- La fórmula Seger de más abajo, escrita en grande.
- Un esmalte transparente ya preparado y un colorante, como el óxido de hierro rojo (弁柄).

### Ejemplo resuelto

El esmalte de la sesión 4, 福島長石 45, carbonato cálcico 20, caolín 10 y sílice 25, tiene esta fórmula Seger (cifras de Glazecalc, redondeadas):

Table: Una fórmula Seger en sus tres columnas
Label: Una fórmula Seger

| Fundentes (RO, R₂O) | Estabilizante (R₂O₃) | Formador de vidrio (RO₂) |
| ------------------- | -------------------- | ------------------------ |
| K₂O 0,18            | Al₂O₃ 0,43           | SiO₂ 3,45                |
| Na₂O 0,10           |                      |                          |
| CaO 0,72            |                      |                          |

- Los fundentes suman 1: esa es la regla de la fórmula. Cada uno de los demás números son moles por cada mol de fundentes.
- La relación sílice/alúmina es 3,45 ÷ 0,43, unos 8: un esmalte brillante típico.
- El calcio es la mayor parte del fundente, como en la mayoría de los esmaltes japoneses de cal (石灰釉).

Un gráfico con la sílice en horizontal y la alúmina en vertical sitúa cada esmalte como un punto. Las pruebas de Seger y el gráfico de Stull de 1912 son de este tipo, y un 釉性状図 proyecta sobre él las probetas cocidas de una clase. La calculadora de recetas de Glazecalc dibuja el gráfico de Stull, y este esmalte cae en su región brillante. Las regiones de Stull proceden de sus propios fundentes y de su propia cocción: una orientación, no una predicción. La [cuadrícula de probetas](#tile-maps) de más abajo permite a una clase dibujar su propio gráfico con su propia cocción.

::stull-chart

Para colorear un esmalte ya preparado cuya receta no conoce, Glazecalc no puede calcular su fórmula. Añada en su lugar el colorante sobre los 100: 100 g del esmalte seco con 1, 2 y 3 g de óxido de hierro, una probeta de cada, cocidas en oxidación y en reducción.

### En Glazecalc

1. En la [calculadora de recetas](/recipe), introduzca la receta de arriba y lea su **Fórmula Seger** y su **Gráfico de Stull**.
2. Cambie la sílice de 25 a 35 y vea cómo el punto se mueve hacia la derecha.
3. Para una base cuya receta tiene, ponga el colorante como adición y use una mezcla lineal en [Mezclas para probetas](/blends) para variarlo por pasos.

### Hoja de trabajo

Table: Hoja de trabajo 3: un colorante en un esmalte ya preparado
Label: Hoja de trabajo 3

| Probeta | Colorante (g por 100 g) | Oxidación: aspecto | Reducción: aspecto |
| ------- | ----------------------- | ------------------ | ------------------ |
| 1       | 0                       |                    |                    |
| 2       | 1                       |                    |                    |
| 3       | 2                       |                    |                    |
| 4       | 3                       |                    |                    |

### Comprobación

- En una fórmula Seger, ¿qué columna suma 1?
- ¿Cuál es la relación sílice/alúmina de este esmalte, y qué sugiere?
- ¿Por qué un punto de la región brillante del gráfico puede dar aun así una probeta mate en su horno?

## Sesión 4: de la receta a la fórmula Seger {#recipe-to-formula}

### Objetivos

- Calcular a mano una fórmula Seger a partir de una receta.
- Compararla con el propio cálculo de Glazecalc.

### Preparación

- La hoja de trabajo 4, los cuatro análisis de la sesión 1 y calculadoras.

### Ejemplo resuelto

La receta: 福島長石 45, carbonato cálcico 20, caolín EPK 10, sílice 25. Tome cada cantidad como gramos. Para cada material, gramos × el porcentaje del óxido ÷ 100 ÷ su masa molar dan sus moles. La tabla da los óxidos principales; Glazecalc cuenta también las trazas (el hierro y el titanio del caolín, el magnesio del feldespato).

Table: Moles de cada óxido en la tanda (100 g)
Label: Moles en la tanda

| Material          | Gramos |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ----------------- | -----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石          |     45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Carbonato cálcico |     20 |      – |      – | 0,1998 |      – |      – |
| Caolín            |     10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Sílice            |     25 |      – |      – |      – |      – | 0,4161 |
| Total             |    100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Los fundentes suman 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesia) = 0,2847 mol. Divida cada total entre esa cifra:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Esa es la fórmula de la sesión 3.

### En Glazecalc

1. Introduzca la receta en la [calculadora de recetas](/recipe).
2. Abra **Cómo se calcula la fórmula Seger**. Muestra estos pasos con los números de esta receta: los gramos, los moles de cada óxido en cada material, los totales y la división entre los fundentes.
3. Compare cada línea con su hoja de trabajo. Después cambie una cantidad y calcule solo la columna que cambia.

### Hoja de trabajo

Table: Hoja de trabajo 4: de la receta a la fórmula Seger
Label: Hoja de trabajo 4

| Material    | Gramos | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ----------- | ------ | --- | ---- | --- | ----- | ---- |
|             |        |     |      |     |       |      |
|             |        |     |      |     |       |      |
|             |        |     |      |     |       |      |
|             |        |     |      |     |       |      |
| Total       |        |     |      |     |       |      |
| ÷ fundentes |        |     |      |     |       |      |

### Comprobación

- ¿Por qué cualquier tamaño de tanda da la misma fórmula Seger?
- ¿Qué óxidos aporta el caolín, y cuál de ellos importa más aquí?
- ¿Por qué la PF del carbonato cálcico no entra en la fórmula?

## Sesión 5: de la fórmula Seger a la receta {#formula-to-recipe}

### Objetivos

- Elegir materiales para una fórmula objetivo y calcular cuánto hace falta de cada uno.
- Usar Buscar una receta para un objetivo y decir cuánto se acerca.

### Preparación

- El objetivo de más abajo, la hoja de trabajo 5 y calculadoras; Glazecalc con una cuenta.

### Ejemplo resuelto

El objetivo: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ y 4,0 SiO₂. Tome los materiales en este orden, cada uno para el óxido que solo él puede aportar:

1. **El feldespato, para el potasio y el sodio.** Una unidad de 福島長石 (536,8 g, el peso que contiene un mol de fundentes) aporta 0,94 mol de K₂O y Na₂O. El objetivo necesita 0,3, así que 0,3 ÷ 0,94 = 0,319 unidades: 171,4 g. También aporta 0,015 de CaO, 0,328 de Al₂O₃ y 1,865 de SiO₂.
2. **El carbonato cálcico, para el resto del calcio.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **El caolín, para el resto de la alúmina.** 0,4 − 0,328 = 0,072 mol. El caolín EPK contiene un mol de Al₂O₃ en 272,6 g, así que son 19,6 g, que aportan además 0,149 de SiO₂.
4. **La sílice, para el resto.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

La tanda pesa 379,0 g. En porcentaje: 福島長石 45,2, carbonato cálcico 18,1, caolín 5,2, sílice 31,5. El feldespato fija la proporción entre potasio y sodio, así que la receta da 0,195 de K₂O y 0,104 de Na₂O: cerca del objetivo, pero no exactamente.

### En Glazecalc

1. Abra [Buscar una receta para un objetivo](/solve), elija **Una fórmula Seger** y escriba el objetivo.
2. En **Los materiales**, indique 福島長石, carbonato cálcico, caolín EPK y sílice, y elija **Calcular**.
3. Da 福島長石 44,9, carbonato cálcico 18,2, caolín 5,6 y sílice 31,3, y una tabla de cuánto se acerca cada óxido. Compárelo con su cálculo a mano: el programa cuenta todas las trazas y busca el mejor ajuste que permiten los cuatro materiales.
4. **Abrir como receta nueva** y compruébela en la calculadora de recetas.

### Hoja de trabajo

Table: Hoja de trabajo 5: del objetivo a la receta
Label: Hoja de trabajo 5

| Paso | Material | Para qué óxido | Moles necesarios | Gramos | También aporta |
| ---- | -------- | -------------- | ---------------- | ------ | -------------- |
| 1    |          |                |                  |        |                |
| 2    |          |                |                  |        |                |
| 3    |          |                |                  |        |                |
| 4    |          |                |                  |        |                |

### Comprobación

- ¿Por qué se calcula primero el feldespato?
- ¿Por qué estos cuatro materiales no pueden dar exactamente 0,2 de K₂O y 0,1 de Na₂O?
- ¿Qué añadiría a los materiales para aportar magnesia?

## Sesión 6: la pasta y los defectos del esmalte {#body-and-defects}

> [!WARNING]
> Un esmalte cocido puede ceder metales a los alimentos y las bebidas, y puede tener un aspecto perfecto mientras lo hace. Los esmaltes con mucho bario o con cobre, y cualquier esmalte con plomo, pueden ceder metales. Solo un ensayo de cesión de metales{{en: leach test}} de laboratorio hecho a la pieza cocida muestra lo que libera; ningún cálculo puede hacerlo. Lea [Seguridad alimentaria](/guides/glazing-basics#food-safety) y [Los materiales que exigen más cuidado](/guides/safe-mixing#materials).

### Objetivos

- Medir la contracción y la absorción de agua de una pasta.
- Nombrar los defectos comunes, sus causas habituales y un primer remedio.
- Saber qué defectos hacen que una pieza no sea segura.

### Preparación

- Barras de prueba de su pasta, con marcas a 100 mm de distancia hechas en húmedo, cocidas y sin cocer.
- Probetas con defectos, si las tiene: cuarteado, recogido, pinchados, escurrido.

### Ejemplo resuelto

- **Contracción**: (longitud marcada − longitud cocida) ÷ longitud marcada × 100. Unas marcas a 100 mm que miden 88 mm tras la cocción: contracción del 12 %.
- **Absorción de agua**: (peso tras el remojo − peso seco) ÷ peso seco × 100. Una barra cocida de 50,0 g que pesa 50,6 g tras el remojo: 1,2 %.

Table: Defectos, causas y un primer remedio en la fórmula Seger
Label: Defectos

| Defecto     | Causa habitual                                       | Un primer remedio que probar                                |
| ----------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Cuarteado   | El esmalte se contrae más que la pasta               | Menos K₂O y Na₂O; más calcio, magnesia o boro               |
| Desconchado | El esmalte se contrae mucho menos que la pasta       | Más K₂O y Na₂O                                              |
| Escurrido   | Muy poca alúmina, o una capa demasiado gruesa        | Más alúmina; una capa más fina                              |
| Recogido    | Bizcocho con polvo, o una capa gruesa que se agrietó | Limpiar el bizcocho; una capa más fina                      |
| Pinchados   | Gas cuyas marcas no llegaron a cerrarse              | Un mantenimiento a la temperatura máxima; una capa más fina |

[Acoplamiento esmalte-pasta y defectos](/guides/glazing-basics#fit-and-defects) explica cada uno, con la prueba del agua helada para el cuarteado. No use piezas cuarteadas ni desconchadas para comida ni bebida.

::food-limits

### En Glazecalc

1. En la [calculadora de recetas](/recipe), lea el panel **Límites** de un esmalte suyo y su dilatación calculada.
2. Copie la receta, cambie parte del feldespato por carbonato cálcico y compare las dos: ¿hacia dónde se movió la dilatación?

### Hoja de trabajo

Table: Hoja de trabajo 6: la pasta
Label: Hoja de trabajo 6

| Barra | Longitud marcada (mm) | Longitud cocida (mm) | Contracción (%) | Peso seco (g) | Peso tras el remojo (g) | Absorción (%) |
| ----- | --------------------- | -------------------- | --------------- | ------------- | ----------------------- | ------------- |
| 1     | 100                   |                      |                 |               |                         |               |
| 2     | 100                   |                      |                 |               |                         |               |

### Comprobación

- ¿Qué defecto produce un esmalte que se contrae más que su pasta, y cuál es un primer remedio?
- ¿Por qué no se deben usar nunca para alimentos las piezas desconchadas?
- ¿Puede un cálculo decirle que un esmalte es seguro para los alimentos? ¿Qué puede decírselo?

## Mapas de probetas para imprimir {#tile-maps}

### Mapa triaxial: 42 esmaltes

Dos triángulos de 21 probetas, con la disposición de Mezclas para probetas con 6 filas: la probeta 1 arriba (feldespato) y la fila de abajo del carbonato cálcico (a la izquierda) a la sílice (a la derecha). El triángulo II es el triángulo I con 1 g de óxido de hierro rojo añadido sobre cada 100 g, que en reducción vira hacia el celadón (青磁). Cocidas en oxidación y en reducción, son 84 probetas. Las cantidades son gramos por cada 100 g.

Table: Mapa triaxial: 福島長石, carbonato cálcico y sílice, con 10 de caolín en cada probeta
Label: Mapa triaxial

| Probeta (I) | Probeta (II) | 福島長石 | Carbonato cálcico | Sílice | Caolín | I oxid. | I red. | II oxid. | II red. |
| ----------- | ------------ | -------: | ----------------: | -----: | -----: | ------- | ------ | -------- | ------- |
| 1           | 22           |       90 |                 0 |      0 |     10 |         |        |          |         |
| 2           | 23           |       72 |                18 |      0 |     10 |         |        |          |         |
| 3           | 24           |       72 |                 0 |     18 |     10 |         |        |          |         |
| 4           | 25           |       54 |                36 |      0 |     10 |         |        |          |         |
| 5           | 26           |       54 |                18 |     18 |     10 |         |        |          |         |
| 6           | 27           |       54 |                 0 |     36 |     10 |         |        |          |         |
| 7           | 28           |       36 |                54 |      0 |     10 |         |        |          |         |
| 8           | 29           |       36 |                36 |     18 |     10 |         |        |          |         |
| 9           | 30           |       36 |                18 |     36 |     10 |         |        |          |         |
| 10          | 31           |       36 |                 0 |     54 |     10 |         |        |          |         |
| 11          | 32           |       18 |                72 |      0 |     10 |         |        |          |         |
| 12          | 33           |       18 |                54 |     18 |     10 |         |        |          |         |
| 13          | 34           |       18 |                36 |     36 |     10 |         |        |          |         |
| 14          | 35           |       18 |                18 |     54 |     10 |         |        |          |         |
| 15          | 36           |       18 |                 0 |     72 |     10 |         |        |          |         |
| 16          | 37           |        0 |                90 |      0 |     10 |         |        |          |         |
| 17          | 38           |        0 |                72 |     18 |     10 |         |        |          |         |
| 18          | 39           |        0 |                54 |     36 |     10 |         |        |          |         |
| 19          | 40           |        0 |                36 |     54 |     10 |         |        |          |         |
| 20          | 41           |        0 |                18 |     72 |     10 |         |        |          |         |
| 21          | 42           |        0 |                 0 |     90 |     10 |         |        |          |         |

### Cuadrícula Seger: 24 esmaltes

Todas las probetas tienen los mismos fundentes, 0,2 de KNaO y 0,8 de CaO, aportados por 福島長石 y carbonato cálcico. La alúmina aumenta de una fila a otra hacia abajo en la cuadrícula, y la sílice aumenta de una columna a otra hacia la derecha. Las recetas se calcularon con el método de la sesión 5; la fórmula Seger de cada una según Glazecalc se desvía como máximo 0,01 en la alúmina y 0,06 en la sílice. Marque cada probeta en un gráfico de sílice frente a alúmina y dibuje sus propias regiones: mate, brillante, poco cocido, escurrido.

Table: Cuadrícula Seger: 0,2 KNaO, 0,8 CaO, porcentaje en peso
Label: Cuadrícula Seger

| Probeta | Al₂O₃ | SiO₂ | 福島長石 | Carbonato cálcico | Caolín | Sílice | Oxidación | Reducción |
| ------- | ----: | ---: | -------: | ----------------: | -----: | -----: | --------- | --------- |
| 1       |  0,25 |  2,0 |     46,9 |              32,5 |    3,5 |   17,1 |           |           |
| 2       |  0,25 |  2,5 |     41,8 |              28,9 |    3,1 |   26,2 |           |           |
| 3       |  0,25 |  3,0 |     37,6 |              26,1 |    2,8 |   33,5 |           |           |
| 4       |  0,25 |  3,5 |     34,3 |              23,7 |    2,5 |   39,5 |           |           |
| 5       |  0,25 |  4,0 |     31,4 |              21,7 |    2,3 |   44,5 |           |           |
| 6       |  0,25 |  4,5 |     29,0 |              20,1 |    2,2 |   48,7 |           |           |
| 7       |  0,35 |  2,0 |     44,3 |              30,6 |   13,9 |   11,3 |           |           |
| 8       |  0,35 |  2,5 |     39,6 |              27,4 |   12,4 |   20,5 |           |           |
| 9       |  0,35 |  3,0 |     35,9 |              24,8 |   11,2 |   28,0 |           |           |
| 10      |  0,35 |  3,5 |     32,8 |              22,7 |   10,3 |   34,2 |           |           |
| 11      |  0,35 |  4,0 |     30,2 |              20,9 |    9,5 |   39,5 |           |           |
| 12      |  0,35 |  4,5 |     28,0 |              19,4 |    8,8 |   43,9 |           |           |
| 13      |  0,45 |  2,0 |     41,9 |              29,0 |   23,1 |    6,1 |           |           |
| 14      |  0,45 |  2,5 |     37,7 |              26,1 |   20,8 |   15,4 |           |           |
| 15      |  0,45 |  3,0 |     34,3 |              23,7 |   18,9 |   23,0 |           |           |
| 16      |  0,45 |  3,5 |     31,5 |              21,8 |   17,4 |   29,4 |           |           |
| 17      |  0,45 |  4,0 |     29,1 |              20,1 |   16,0 |   34,8 |           |           |
| 18      |  0,45 |  4,5 |     27,0 |              18,7 |   14,9 |   39,4 |           |           |
| 19      |  0,55 |  2,0 |     39,7 |              27,5 |   31,4 |    1,5 |           |           |
| 20      |  0,55 |  2,5 |     35,9 |              24,9 |   28,4 |   10,8 |           |           |
| 21      |  0,55 |  3,0 |     32,8 |              22,7 |   26,0 |   18,5 |           |           |
| 22      |  0,55 |  3,5 |     30,2 |              20,9 |   23,9 |   25,0 |           |           |
| 23      |  0,55 |  4,0 |     28,0 |              19,4 |   22,1 |   30,5 |           |           |
| 24      |  0,55 |  4,5 |     26,1 |              18,1 |   20,6 |   35,3 |           |           |

Mezclas para probetas, de Glazecalc, crea triángulos y cuadrados de 3 a 66 probetas, no esta cuadrícula; abra cualquier probeta como receta en la [calculadora de recetas](/recipe) e imprima desde allí su lista de pesada.

## Fuentes {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): las seis sesiones.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: las fechas y los temas de las sesiones.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: las tareas del curso posterior, con 42, 90 y 78 esmaltes en oxidación y en reducción.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): el programa de cálculo del propio centro.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): la fórmula Seger en las semanas 5, 6 y 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): el cálculo de esmaltes para docentes de escuela en Taiwán.
- Glendale Community College, ART 195 course outline: la fórmula Seger en las semanas 5 a 7 de 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: el análisis de 福島長石 en la biblioteca de Glazecalc.
- IUPAC, masas atómicas estándar, tal como las usa la química de Glazecalc.
