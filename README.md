<p align="center">
  <img src="img/md-logo.png" alt="MachDown" width="96" />
</p>

<h1 align="center">MachDown</h1>

<p align="center">
  Editor markdown WYSIWYG leve, 100% local — sem servidor, sem build, sem tracking.
</p>

---

## Destaques

- **WYSIWYG + código** — alterne entre visualização rica e markdown puro a qualquer momento, com sincronização de contexto (âncora de scroll).
- **Zero setup** — abra o `index.html` no navegador e está rodando.
- **Autosave local** — rascunho persiste em `localStorage`; nada vai pra servidor.
- **Exportação** — baixe como `.md` com um clique ou `Ctrl + S`.
- **Importação** — abra arquivos `.md` locais via botão *Abrir*.
- **Tipografia customizável** — fontes separadas para parágrafo e cada nível de heading (H1–H4), além de tamanho base. Seletor com prévia no estilo Word.
- **Suporte a GFM** — tabelas, strikethrough e task lists preservadas no round-trip visual ↔ código via `turndown-plugin-gfm`.
- **Dark mode automático** — segue `prefers-color-scheme`.

## Como usar

Basta dar duplo-clique em [`index.html`](index.html) (ou abrir no navegador). Nenhum servidor, dependência ou instalação necessária.

Se preferir servir localmente (para evitar restrições de `file://` em alguns browsers):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Atalhos

| Atalho        | Ação                                   |
|---------------|----------------------------------------|
| `Ctrl + S`    | Exportar markdown                      |
| `Ctrl + B`    | Negrito                                |
| `Ctrl + I`    | Itálico                                |
| `Tab`         | Indentar 2 espaços                     |
| Toggle `Código` | Alternar entre visualização e markdown puro |

## Barra de ferramentas

- **H1 H2 H3** — níveis de título
- **B I S** — negrito, itálico, tachado
- **❝ • 1.** — citação, lista com marcadores, lista numerada
- **`</>` `{}` ↗ 🖼** — código inline, bloco de código, link, imagem
- **⌫** — remover formatação
- **Abrir / Fontes / Código / Exportar .md** — ações globais à direita

## Licença

[PolyForm Noncommercial 1.0.0](LICENSE) — uso pessoal, educacional, pesquisa e projetos sem fins lucrativos são permitidos. Uso comercial ou incorporação em produtos é proibido.
