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
- CSS responsivo e folha de impressão.

## Fontes de regras

- **[Ghanor]** A ficha foi estruturada a partir da ficha editável de **A Lenda de Ghanor RPG**, incluindo perícias, atributos, Defesa e a fórmula geral `1/2 nível + atributo + treino + outros`.
- **[Tormenta20]** Nenhuma regra exclusiva de Tormenta20 foi incorporada neste MVP. Campos genéricos como `Outros` existem para comportar ajustes da mesa ou fallback identificado no futuro.

## Observações do MVP

A ficha PDF original possui uma condição curiosa no JavaScript do campo de Defesa: o atributo só entra no cálculo quando o campo `arm pesa` está marcado como `Yes`. Nesta versão web a opção aparece de forma explícita como **Somar atributo selecionado na Defesa**, para evitar esconder essa decisão do jogador.
