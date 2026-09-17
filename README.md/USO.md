# Gerador de Slides de Letras

Ferramenta simples para transformar letras de músicas em apresentações PowerPoint (`.pptx`), com fundo de natureza, texto grande e fácil de ler no projetor.

Não é preciso saber programar: basta editar um arquivo de texto e dar dois cliques em **`gerar.bat`**.

---

## O que você precisa

1. **Windows** (recomendado — a fonte *Tw Cen MT* / Twentieth Century já costuma vir instalada)
2. **Python 3** instalado — [download](https://www.python.org/downloads/)  
   Na instalação, marque **"Add Python to PATH"**
3. Esta pasta do projeto

---

## Instalação (só na primeira vez)

1. Abra a pasta do projeto
2. Dê dois cliques em **`instalar.bat`**
3. Espere a mensagem de sucesso

Se preferir pelo terminal (na pasta do projeto):

```bash
python -m pip install -r "README.md/requirements.txt"
```

---

## Como usar

### 1. Crie o arquivo da letra

Na pasta **`letras/`**, crie um arquivo `.txt` (Bloco de Notas serve).

**Formato:**

```text
Título da música
Nome do autor ou artista

Primeira linha da letra
Segunda linha da letra
Terceira linha
...
```

- Linha 1 = **título**
- Linha 2 = **autor**
- Linha em branco
- Depois, a **letra** (uma frase por linha)

Linhas que começam com `#` são comentários e são ignoradas.

### 2. Gere os slides

**Opção A — dois cliques (Windows)**  
Na pasta principal do projeto, abra **`gerar.bat`**.  
Ele processa todos os `.txt` da pasta `letras/`.

**Opção B — terminal** (na pasta principal do projeto):

```bash
python tech/gerar_slides.py
```

Isso gera um `.pptx` para cada letra em `letras/` e salva em **`output/`**.

### 3. Abra o resultado

Os arquivos ficam em:

```text
output/Nome_Da_Musica.pptx
```

Abra no **PowerPoint**, **LibreOffice Impress** ou envie para o Google Drive.

---

## Comandos úteis

| Objetivo | Comando |
|----------|---------|
| Gerar todas as letras da pasta `letras/` | `python tech/gerar_slides.py` |
| Gerar só um arquivo | `python tech/gerar_slides.py letras/minha_musica.txt` |
| Usar um fundo específico | `python tech/gerar_slides.py --fundo assets/backgrounds/natureza_01.jpg` |
| Escolher pasta de saída | `python tech/gerar_slides.py --saida output` |

---

## Regras dos slides (automáticas)

A ferramenta já aplica:

- Fundo de natureza (o mesmo em todos os slides de uma música)
- Fonte **Tw Cen MT**, tamanho **64,5**, negrito, **CAIXA ALTA**
- Primeiro(s) slide(s) com título e autor
- No máximo **2 linhas** por slide
- Linhas longas são quebradas automaticamente
- Texto no **terço superior**, centralizado

---

## Fundos de imagem

Coloque fotos de paisagens em:

```text
assets/backgrounds/
```

Formatos aceitos: `.jpg`, `.jpeg`, `.png`, `.webp`

Se você não escolher um fundo com `--fundo`, a ferramenta escolhe uma imagem dessa pasta (sempre a mesma para o mesmo título).

---

## Google Slides

Se ao abrir no Google Slides a fonte aparecer como **48** em vez de **64,5**, isso é normal: o Google usa um slide menor (10") e redimensiona tudo.

**Como evitar:**

1. No Google Slides: **Arquivo → Configuração da página → Personalizado**
2. Defina **13,333 × 7,5 polegadas**
3. Importe o `.pptx` **depois** de ajustar o tamanho

A fonte *Tw Cen MT* também pode ser substituída no Google se não estiver disponível na sua conta — no PowerPoint local o resultado fica fiel.

---

## Estrutura da pasta

```text
Slide_generator_toll/
├── gerar.bat            ← use isto para gerar os slides
├── instalar.bat         ← use isto na primeira vez
├── letras/              ← coloque as letras aqui (.txt)
├── output/              ← slides gerados (.pptx)
├── assets/
│   └── backgrounds/     ← imagens de fundo
├── README.md/           ← manuais e dependências
│   ├── USO.md           ← este guia
│   ├── script.md
│   └── requirements.txt
└── tech/                ← arquivos técnicos (não precisa abrir)
    ├── gerar_slides.py
    └── instalar.bat
```

---

## Problemas comuns

**“Python não foi encontrado”**  
Reinstale o Python marcando *Add Python to PATH*, ou tente no terminal: `py tech\gerar_slides.py`.

**“Nenhum arquivo de letra encontrado”**  
Confirme que o `.txt` está dentro de `letras/` e não está vazio.

**Texto cortado ou fonte estranha**  
No Windows, a fonte *Tw Cen MT* deve estar instalada (`C:\Windows\Fonts\TCB_____.TTF`). Sem ela, a ferramenta ainda gera o arquivo, mas a medição das quebras fica aproximada.

**Quero refazer uma música**  
Edite o `.txt` em `letras/` e rode `gerar.bat` de novo. O arquivo em `output/` será sobrescrito com o mesmo nome do título.
