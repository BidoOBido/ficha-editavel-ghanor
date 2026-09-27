# Ficha Web de A Lenda de Ghanor

MVP estático da ficha de personagem para publicação via GitHub Pages.

Abra `index.html` em um navegador ou publique a pasta `Ficha Web/` como site estático.

## Recursos

- HTML, CSS e JavaScript puro.
- Salvamento automático em `localStorage`.
- Exportação e importação de JSON.
- Modo edição/visualização.
- Ataques, equipamentos, proficiências e habilidades/magias expansíveis.
- Cálculo automático de 1/2 nível, perícias, Defesa e carga usada.
- Campo de XP opcional, limitado pela tabela de progressão de Tormenta20.
- Dinheiro separado em PB, PP e PO, com total convertido para PP.
- CSS responsivo e folha de impressão.

## Fontes de regras

- **[Ghanor]** A ficha foi estruturada a partir da ficha editável de **A Lenda de Ghanor RPG**, incluindo perícias, atributos, Defesa e a fórmula geral `1/2 nível + atributo + treino + outros`.
- **[Ghanor]** O nível de personagem vai de 1 a 20. O livro de Ghanor indica avanço ao fim de aventuras completadas, sem tabela própria de XP.
- **[Ghanor]** Preços e dinheiro inicial usam PP como referência. Cobre vale 0,1 PP e ouro vale 10 PP; a interface usa o rótulo PB para a moeda menor, conforme convenção da mesa.
- **[Tormenta20]** O campo de XP é um fallback opcional para mesas que desejem controlar experiência numericamente. Ele usa o intervalo da tabela de Tormenta20, de 0 a 190.000 XP.

## Observações do MVP

A ficha PDF original possui uma condição curiosa no JavaScript do campo de Defesa: o atributo só entra no cálculo quando o campo `arm pesa` está marcado como `Yes`. Nesta versão web a opção aparece de forma explícita como **Somar atributo selecionado na Defesa**, para evitar esconder essa decisão do jogador.
