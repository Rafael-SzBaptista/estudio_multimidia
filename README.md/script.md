# Specs do gerador de slides

Ferramenta de terminal que lê letras em `letras/*.txt` e gera PPTX em `output/`.

Código em `tech/gerar_slides.py`. Guia completo em `README.md/USO.md`.

## Processo

1. O usuário cria um arquivo `.txt` em `letras/` (título, autor, letra).
2. Executa `gerar.bat` (ou `python tech/gerar_slides.py`) na pasta raiz do projeto.
3. Cada arquivo de letra vira um PPTX único em `output/`.

## Especificações dos slides

1. Plano de fundo: imagem de natureza (pasta `assets/backgrounds/`). Mesma imagem em todos os slides do arquivo.
2. Fonte: Twentieth Century (`Tw Cen MT`), tamanho 64.5, negrito, caixa alta.
3. Primeiro(s) slide(s): título e autor.
4. Máximo de 2 linhas visuais por slide; linhas longas são quebradas automaticamente.
5. Texto no terço superior, centralizado horizontalmente.
