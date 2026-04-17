const editor = document.getElementById('editor');
const sourceEditor = document.getElementById('source-editor');
const toolbar = document.getElementById('toolbar');
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('file-input');
const loadFileBtn = document.getElementById('load-file');
const downloadFileBtn = document.getElementById('download-file');
const toggleModeBtn = document.getElementById('toggle-mode');
const toggleModeLabel = toggleModeBtn.querySelector('.toggle-label');
const fontSettingsBtn = document.getElementById('font-settings');
const fontModal = document.getElementById('font-modal');
const closeFontModalBtn = document.getElementById('close-font-modal');
const saveFontSettingsBtn = document.getElementById('save-font-settings');
const resetFontSettingsBtn = document.getElementById('reset-font-settings');

const fontInputs = {
  paragraph: document.getElementById('font-paragraph'),
  h1: document.getElementById('font-h1'),
  h2: document.getElementById('font-h2'),
  h3: document.getElementById('font-h3'),
  h4: document.getElementById('font-h4'),
};
const fontSizeSelect = document.getElementById('font-size');

const FONT_OPTIONS = [
  { group: 'Serif', options: [
    { label: 'Source Serif 4', value: "'Source Serif 4', 'Iowan Old Style', 'Georgia', serif" },
    { label: 'Lora', value: "'Lora', 'Georgia', serif" },
    { label: 'Merriweather', value: "'Merriweather', 'Georgia', serif" },
    { label: 'Playfair Display', value: "'Playfair Display', 'Georgia', serif" },
    { label: 'EB Garamond', value: "'EB Garamond', 'Garamond', 'Georgia', serif" },
    { label: 'Georgia', value: "Georgia, 'Iowan Old Style', serif" },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  ]},
  { group: 'Sans-serif', options: [
    { label: 'Inter', value: "'Inter', ui-sans-serif, system-ui, sans-serif" },
    { label: 'Space Grotesk', value: "'Space Grotesk', ui-sans-serif, sans-serif" },
    { label: 'IBM Plex Sans', value: "'IBM Plex Sans', ui-sans-serif, sans-serif" },
    { label: 'Roboto', value: "'Roboto', ui-sans-serif, sans-serif" },
    { label: 'Nunito', value: "'Nunito', ui-sans-serif, sans-serif" },
    { label: 'Helvetica', value: "Helvetica, Arial, sans-serif" },
    { label: 'Arial', value: "Arial, Helvetica, sans-serif" },
    { label: 'System UI', value: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
  ]},
  { group: 'Monoespaçada', options: [
    { label: 'JetBrains Mono', value: "'JetBrains Mono', ui-monospace, monospace" },
    { label: 'System Mono', value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  ]},
];

const FONT_SIZE_OPTIONS = [14, 15, 16, 17, 18, 19, 20, 21, 22];
const DEFAULT_FONT_SIZE = 17;

function populateFontSelect(selectEl) {
  selectEl.innerHTML = '';
  FONT_OPTIONS.forEach((group) => {
    const og = document.createElement('optgroup');
    og.label = group.group;
    group.options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      o.style.fontFamily = opt.value;
      og.appendChild(o);
    });
    selectEl.appendChild(og);
  });
}

function populateFontSizeSelect() {
  fontSizeSelect.innerHTML = '';
  FONT_SIZE_OPTIONS.forEach((size) => {
    const o = document.createElement('option');
    o.value = String(size);
    o.textContent = `${size} px`;
    fontSizeSelect.appendChild(o);
  });
}

Object.values(fontInputs).forEach(populateFontSelect);
populateFontSizeSelect();

function ensureOption(selectEl, value) {
  const exists = Array.from(selectEl.options).some((o) => o.value === value);
  if (!exists && value) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = 'Personalizada';
    selectEl.insertBefore(o, selectEl.firstChild);
  }
}

const STORAGE_KEY = 'markdown-atelier-content';
const FONT_STORAGE_KEY = 'markdown-atelier-fonts';
const MODE_STORAGE_KEY = 'markdown-atelier-mode';
const WELCOMED_KEY = 'markdown-atelier-welcomed';

let initialLoadShowedGuide = false;

const IS_DEMO = new URLSearchParams(window.location.search).has('demo');
if (IS_DEMO) document.body.classList.add('demo-mode');

const MARKED_OPTS = { mangle: false, headerIds: false, breaks: true };

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
});

if (window.turndownPluginGfm) {
  turndownService.use(window.turndownPluginGfm.gfm);
} else {
  turndownService.addRule('strikethrough', {
    filter: ['s', 'strike', 'del'],
    replacement: (content) => `~~${content}~~`,
  });
  turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
}

try {
  document.execCommand('defaultParagraphSeparator', false, 'p');
} catch (_) {}

let statusTimer = null;
function setStatus(message, transient = true) {
  statusEl.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  if (transient) {
    statusTimer = setTimeout(() => {
      statusEl.textContent = 'Editor pronto.';
    }, 2200);
  }
}

let saveTimer = null;
function saveDraft() {
  if (IS_DEMO) return;
  if (saveTimer) clearTimeout(saveTimer);
  if (currentFile) {
    if (!currentFile.dirty) {
      currentFile.dirty = true;
      renderSidebar();
    }
    saveTimer = setTimeout(async () => {
      try {
        await writeCurrentFile();
      } catch (e) {
        setStatus('Erro ao salvar: ' + e.message);
      }
    }, 600);
  } else {
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, editor.innerHTML);
      setStatus('Rascunho salvo.');
    }, 350);
  }
}

function loadDraft() {
  if (!IS_DEMO) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      editor.innerHTML = saved;
      return;
    }
    if (!localStorage.getItem(WELCOMED_KEY)) {
      editor.innerHTML = getWelcomeGuide();
      localStorage.setItem(WELCOMED_KEY, '1');
      initialLoadShowedGuide = true;
      return;
    }
    editor.innerHTML = '';
    return;
  }
  editor.innerHTML = `
      <h1>Engenharia de prompts — guia rápido</h1>
      <p>Um bom prompt é <strong>específico</strong>, <em>orientado a contexto</em> e <s>ambíguo</s> objetivo. Esta página é um laboratório — edite, formate e alterne para <code>Código</code> para ver o markdown por baixo. Nada aqui fica salvo.</p>

      <h2>Princípios</h2>
      <ol>
        <li><strong>Papel e objetivo</strong> — diga à IA quem ela é e o que você quer.</li>
        <li><strong>Contexto suficiente</strong> — dados, restrições e formato de saída.</li>
        <li><strong>Exemplos concretos</strong> — um ou dois bons exemplos valem mais que três parágrafos.</li>
        <li><strong>Verificação</strong> — peça que a IA cheque o próprio trabalho antes de responder.</li>
      </ol>

      <h2>Anatomia de um prompt</h2>
      <p>Uma estrutura que funciona em <b>~80% dos casos</b>:</p>
      <blockquote>
        <p>Você é <em>[papel]</em>. Sua tarefa é <em>[objetivo claro]</em>. Considere <em>[contexto]</em>. Responda no formato <em>[formato]</em>. Se faltar informação, <strong>pergunte antes de supor</strong>.</p>
      </blockquote>

      <h3>Exemplo — revisor de código</h3>
      <pre><code>Você é um revisor sênior de backend Python.
Tarefa: revisar o diff abaixo apontando APENAS
problemas de segurança e performance (ignore estilo).

Formato da resposta:
- Um bullet por problema
- Cada bullet: arquivo:linha — descrição — sugestão

Se não houver nada crítico, responda: "Sem achados."</code></pre>

      <h4>Variação — few-shot</h4>
      <p>Quando o modelo erra o formato, adicione <em>um exemplo de entrada e um de saída esperada</em> logo abaixo das instruções. Custa tokens, paga em previsibilidade.</p>

      <h2>Checklist antes de enviar</h2>
      <ul>
        <li><input type="checkbox" checked disabled /> Papel e objetivo explícitos</li>
        <li><input type="checkbox" checked disabled /> Formato de saída definido</li>
        <li><input type="checkbox" disabled /> Exemplo concreto incluído</li>
        <li><input type="checkbox" disabled /> Critério de "parar e perguntar" claro</li>
      </ul>

      <h2>Quando usar cada técnica</h2>
      <table>
        <thead>
          <tr><th>Objetivo</th><th>Técnica</th><th>Quando usar</th></tr>
        </thead>
        <tbody>
          <tr><td>Precisão factual</td><td>Few-shot + citar fontes</td><td>Pesquisa, documentação</td></tr>
          <tr><td>Raciocínio</td><td>Chain-of-thought</td><td>Problemas complexos</td></tr>
          <tr><td>Formato estrito</td><td>JSON schema + exemplos</td><td>Integrações e pipelines</td></tr>
          <tr><td>Criatividade</td><td>Temperatura alta + prompt aberto</td><td>Brainstorm, ideação</td></tr>
        </tbody>
      </table>

      <h3>Delimitadores salvam vidas</h3>
      <p>Separe instruções do conteúdo do usuário com delimitadores claros — <code>---</code>, blocos de código cercados, ou tags como <code>&lt;context&gt;…&lt;/context&gt;</code>. Reduz prompt injection e foca o modelo.</p>

      <h3>Leitura recomendada</h3>
      <p>Consulte o <a href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview">guia oficial da Anthropic sobre prompt engineering</a> para padrões específicos por modelo.</p>

      <hr />

      <p><em>Esta é uma demo pública. Experimente</em> <strong>Ctrl + B</strong><em>, clique em</em> <strong>Código</strong> <em>na toolbar, e volte para ver o round-trip acontecer.</em></p>
    `;
}

function isInsideEditor() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const node = sel.anchorNode;
  return node && editor.contains(node);
}

function ensureEditorFocus() {
  if (!isInsideEditor()) {
    editor.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.focus();
  }
}

function wrapSelectionWith(tagName) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const wrapper = document.createElement(tagName);
  try {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);
  } catch (_) {}
}

function insertCodeBlock() {
  const sel = window.getSelection();
  const text = sel && sel.toString() ? sel.toString() : '';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = text || 'código';
  pre.appendChild(code);
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(pre);
    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    editor.appendChild(pre);
  }
}

function applyFormat(action) {
  ensureEditorFocus();
  switch (action) {
    case 'h1':
      document.execCommand('formatBlock', false, 'h1');
      break;
    case 'h2':
      document.execCommand('formatBlock', false, 'h2');
      break;
    case 'h3':
      document.execCommand('formatBlock', false, 'h3');
      break;
    case 'bold':
      document.execCommand('bold');
      break;
    case 'italic':
      document.execCommand('italic');
      break;
    case 'strike':
      document.execCommand('strikeThrough');
      break;
    case 'quote':
      document.execCommand('formatBlock', false, 'blockquote');
      break;
    case 'ul':
      document.execCommand('insertUnorderedList');
      break;
    case 'ol':
      document.execCommand('insertOrderedList');
      break;
    case 'code':
      wrapSelectionWith('code');
      break;
    case 'codeblock':
      insertCodeBlock();
      break;
    case 'link': {
      const url = window.prompt('URL do link', 'https://');
      if (url) document.execCommand('createLink', false, url);
      break;
    }
    case 'image': {
      const url = window.prompt('URL da imagem', 'https://');
      if (url) document.execCommand('insertImage', false, url);
      break;
    }
    case 'clear':
      document.execCommand('removeFormat');
      document.execCommand('formatBlock', false, 'p');
      break;
  }
}

toolbar.addEventListener('mousedown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});

toolbar.addEventListener('click', (event) => {
  const btn = event.target.closest('button');
  const action = btn?.dataset?.action;
  if (!action) return;
  applyFormat(action);
  saveDraft();
});

editor.addEventListener('input', saveDraft);

function autoGrowSource() {
  /* no-op: .source-editor now uses internal overflow-y, so its
     height is bounded by the flex container instead of growing to
     fit all content. Kept as a function so existing call sites
     remain valid. */
}

sourceEditor.addEventListener('input', () => {
  const html = marked.parse(sourceEditor.value, MARKED_OPTS);
  editor.innerHTML = html;
  stripInlineFontFamily();
  autoGrowSource();
  saveDraft();
});

window.addEventListener('resize', () => {
  if (currentMode === 'source') autoGrowSource();
});

sourceEditor.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadMarkdown();
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;
    const value = sourceEditor.value;
    sourceEditor.value = value.slice(0, start) + '  ' + value.slice(end);
    sourceEditor.selectionStart = sourceEditor.selectionEnd = start + 2;
    sourceEditor.dispatchEvent(new Event('input'));
  }
});

let currentMode = 'visual';

const MODE_SYNC_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre';

function stripMarkdownChars(s) {
  return (s || '').replace(/[*_`~\[\]()#>]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function captureVisualAnchor() {
  const sel = window.getSelection();
  let anchorNode = null;
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    anchorNode = sel.anchorNode;
  }
  if (!anchorNode) {
    const rect = editor.getBoundingClientRect();
    const probe = document.elementFromPoint(rect.left + 24, rect.top + 24);
    if (probe && editor.contains(probe)) anchorNode = probe;
  }
  if (!anchorNode) return null;
  let block = anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
  while (block && block !== editor && block.parentElement !== editor) {
    block = block.parentElement;
  }
  if (!block || block === editor) return null;
  const text = (block.textContent || '').trim();
  return text ? text.slice(0, 80) : null;
}

function findOffsetInMarkdown(markdown, needle) {
  const n = stripMarkdownChars(needle);
  if (!n) return -1;
  const map = [];
  let stripped = '';
  let lastSpace = true;
  for (let i = 0; i < markdown.length; i++) {
    const c = markdown[i];
    if (/[*_`~\[\]()#>]/.test(c)) continue;
    if (/\s/.test(c)) {
      if (lastSpace) continue;
      stripped += ' ';
      map.push(i);
      lastSpace = true;
    } else {
      stripped += c.toLowerCase();
      map.push(i);
      lastSpace = false;
    }
  }
  const idx = stripped.indexOf(n);
  if (idx === -1) return -1;
  return map[idx] ?? -1;
}

function getTextareaCaretY(ta, offset) {
  const style = getComputedStyle(ta);
  const mirror = document.createElement('div');
  const props = [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'tabSize', 'textIndent', 'textTransform', 'wordSpacing', 'whiteSpace',
    'wordBreak', 'overflowWrap',
  ];
  for (const p of props) mirror.style[p] = style[p];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.height = 'auto';
  mirror.style.overflow = 'hidden';
  const before = ta.value.slice(0, offset);
  mirror.textContent = before.endsWith('\n') ? before + ' ' : before;
  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const y = marker.offsetTop;
  document.body.removeChild(mirror);
  return y;
}

function flashSourceLine(ta, offset) {
  const highlight = document.getElementById('source-highlight');
  if (!highlight) return;
  const style = getComputedStyle(ta);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const y = getTextareaCaretY(ta, offset);
  highlight.style.top = `${ta.offsetTop + borderTop + y - ta.scrollTop}px`;
  highlight.style.left = `${ta.offsetLeft + padLeft}px`;
  highlight.style.width = `${ta.clientWidth - padLeft - padRight}px`;
  highlight.style.height = `${lineHeight}px`;
  highlight.classList.remove('flash');
  void highlight.offsetWidth;
  highlight.classList.add('flash');
}

function scrollTextareaToOffset(ta, offset) {
  let lineStart = offset;
  while (lineStart > 0 && ta.value[lineStart - 1] !== '\n') lineStart--;
  ta.selectionStart = ta.selectionEnd = lineStart;
  const y = getTextareaCaretY(ta, lineStart);
  const targetScroll = Math.max(0, y - ta.clientHeight / 3);
  ta.scrollTop = targetScroll;
  flashSourceLine(ta, lineStart);
}

function captureSourceAnchor() {
  const value = sourceEditor.value;
  let pos;
  if (document.activeElement === sourceEditor) {
    pos = sourceEditor.selectionStart;
  } else {
    const style = getComputedStyle(sourceEditor);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
    const padTop = parseFloat(style.paddingTop) || 0;
    const topLine = Math.max(0, Math.floor((sourceEditor.scrollTop - padTop) / lineHeight) + 1);
    let line = 0, i = 0;
    while (i < value.length && line < topLine) {
      if (value[i] === '\n') line++;
      i++;
    }
    pos = i;
  }
  let start = pos, end = pos;
  while (start > 0 && value[start - 1] !== '\n') start--;
  while (end < value.length && value[end] !== '\n') end++;
  let snippet = value.slice(start, end).trim();
  if (!snippet) {
    let j = end;
    while (j < value.length) {
      const s = j + 1;
      let e = s;
      while (e < value.length && value[e] !== '\n') e++;
      const ln = value.slice(s, e).trim();
      if (ln) { snippet = ln; break; }
      j = e;
    }
  }
  return snippet ? snippet.slice(0, 80) : null;
}

function scrollEditorToText(text) {
  const n = stripMarkdownChars(text);
  if (!n) return;
  const probe = n.slice(0, Math.min(30, n.length));
  if (!probe) return;
  const blocks = editor.querySelectorAll(MODE_SYNC_BLOCK_SELECTOR);
  for (const block of blocks) {
    const blockText = stripMarkdownChars(block.textContent || '');
    if (blockText && blockText.includes(probe)) {
      const editorRect = editor.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      const offsetWithin = blockRect.top - editorRect.top + editor.scrollTop;
      const target = offsetWithin - editor.clientHeight / 2 + block.offsetHeight / 2;
      editor.scrollTop = Math.max(0, target);
      const range = document.createRange();
      range.selectNodeContents(block);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  }
}

function setMode(next, { persist = true, silent = false } = {}) {
  if (next === currentMode) return;
  if (next === 'source') {
    const anchor = captureVisualAnchor();
    sourceEditor.value = turndownService.turndown(editor.innerHTML).trim();
    document.body.classList.add('mode-source');
    toggleModeBtn.setAttribute('aria-pressed', 'true');
    toggleModeLabel.textContent = 'Visual';
    toggleModeBtn.title = 'Voltar para visualização';
    requestAnimationFrame(() => {
      autoGrowSource();
      sourceEditor.focus();
      if (anchor) {
        const offset = findOffsetInMarkdown(sourceEditor.value, anchor);
        if (offset >= 0) scrollTextareaToOffset(sourceEditor, offset);
      }
    });
  } else {
    const anchor = captureSourceAnchor();
    editor.innerHTML = marked.parse(sourceEditor.value, MARKED_OPTS);
    stripInlineFontFamily();
    document.body.classList.remove('mode-source');
    toggleModeBtn.setAttribute('aria-pressed', 'false');
    toggleModeLabel.textContent = 'Código';
    toggleModeBtn.title = 'Ver código markdown';
    requestAnimationFrame(() => {
      editor.focus();
      if (anchor) scrollEditorToText(anchor);
    });
  }
  currentMode = next;
  if (persist && !IS_DEMO) localStorage.setItem(MODE_STORAGE_KEY, next);
  if (!silent) setStatus(next === 'source' ? 'Modo código markdown.' : 'Modo visual.');
  saveDraft();
}

toggleModeBtn.addEventListener('click', () => {
  setMode(currentMode === 'visual' ? 'source' : 'visual');
});

const BLOCK_TAGS = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre']);

function isBlockEmpty(el) {
  if (!el) return true;
  const text = el.textContent.replace(/[\u200B\uFEFF\u00A0]/g, '').trim();
  return text === '';
}

function innermostBlock(node, stopAt) {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== stopAt && el !== editor) {
    if (el.nodeType === 1 && BLOCK_TAGS.has(el.tagName.toLowerCase())) return el;
    el = el.parentElement;
  }
  return null;
}

function placeCaretAtStart(el) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(el, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertEmptyParagraphAfter(ref) {
  const p = document.createElement('p');
  p.appendChild(document.createElement('br'));
  ref.parentNode.insertBefore(p, ref.nextSibling);
  placeCaretAtStart(p);
  return p;
}

function exitContainerBlock(container, currentInner) {
  if (currentInner && currentInner !== container) currentInner.remove();
  if (isBlockEmpty(container) && container.children.length === 0) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    container.parentNode.replaceChild(p, container);
    placeCaretAtStart(p);
  } else {
    insertEmptyParagraphAfter(container);
  }
}

function handleExitOnEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  let node = sel.anchorNode;
  if (!node || !editor.contains(node)) return false;
  const startEl = node.nodeType === 3 ? node.parentElement : node;

  const li = startEl.closest('li');
  if (li && editor.contains(li) && isBlockEmpty(li)) {
    const list = li.closest('ul, ol');
    if (list && editor.contains(list)) {
      event.preventDefault();
      li.remove();
      insertEmptyParagraphAfter(list);
      if (list.children.length === 0) list.remove();
      return true;
    }
  }

  const bq = startEl.closest('blockquote');
  if (bq && editor.contains(bq)) {
    const inner = innermostBlock(startEl, bq) || bq;
    if (isBlockEmpty(inner)) {
      event.preventDefault();
      exitContainerBlock(bq, inner);
      return true;
    }
  }

  return false;
}

editor.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadMarkdown();
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    document.execCommand('insertText', false, '  ');
    return;
  }
  if (handleExitOnEnter(event)) {
    saveDraft();
  }
});

editor.addEventListener('paste', (event) => {
  const text = event.clipboardData?.getData('text/plain');
  const html = event.clipboardData?.getData('text/html');
  if (html) return;
  if (text != null) {
    event.preventDefault();
    document.execCommand('insertText', false, text);
  }
});

loadFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await flushSaveImmediately();
  currentFile = null;
  renderSidebar();
  updatePageTitle();
  const content = await file.text();
  editor.innerHTML = marked.parse(content, MARKED_OPTS);
  stripInlineFontFamily();
  if (currentMode === 'source') {
    sourceEditor.value = content;
    autoGrowSource();
  }
  saveDraft();
  setStatus(`Carregado: ${file.name}`);
  fileInput.value = '';
});

downloadFileBtn.addEventListener('click', downloadMarkdown);

function downloadMarkdown() {
  const markdown = currentMode === 'source'
    ? sourceEditor.value
    : turndownService.turndown(editor.innerHTML);
  const fileName = currentFile?.name || 'documento.md';
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exportado ${fileName}`);
}

function getDefaultFontSettings() {
  return {
    paragraph: "'Source Serif 4', 'Iowan Old Style', 'Georgia', serif",
    h1: "'Source Serif 4', 'Iowan Old Style', 'Georgia', serif",
    h2: "'Source Serif 4', 'Iowan Old Style', 'Georgia', serif",
    h3: "'Source Serif 4', 'Iowan Old Style', 'Georgia', serif",
    h4: "'Inter', ui-sans-serif, system-ui, sans-serif",
    size: DEFAULT_FONT_SIZE,
  };
}

function loadFontSettings() {
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  if (!saved) return getDefaultFontSettings();
  try {
    return { ...getDefaultFontSettings(), ...JSON.parse(saved) };
  } catch {
    return getDefaultFontSettings();
  }
}

function stripInlineFontFamily() {
  editor.style.fontFamily = '';
  editor.style.fontSize = '';
  editor.querySelectorAll('[style]').forEach((el) => {
    if (el.style.fontFamily) el.style.fontFamily = '';
    if (el.style.fontSize) el.style.fontSize = '';
    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
}

function applyFontSettings(settings) {
  ['paragraph', 'h1', 'h2', 'h3', 'h4'].forEach((key) => {
    if (settings[key]) {
      document.documentElement.style.setProperty(`--font-${key}`, settings[key]);
    }
  });
  const size = Number(settings.size) || DEFAULT_FONT_SIZE;
  document.documentElement.style.setProperty('--font-size-base', `${size}px`);
  stripInlineFontFamily();
}

function populateFontInputs(settings) {
  Object.entries(fontInputs).forEach(([key, selectEl]) => {
    const value = settings[key];
    if (!value) return;
    ensureOption(selectEl, value);
    selectEl.value = value;
  });
  const size = String(Number(settings.size) || DEFAULT_FONT_SIZE);
  ensureOption(fontSizeSelect, size);
  fontSizeSelect.value = size;
}

let fontSettingsSnapshot = null;

function openFontModal() {
  fontSettingsSnapshot = loadFontSettings();
  populateFontInputs(fontSettingsSnapshot);
  fontModal.setAttribute('aria-hidden', 'false');
  fontModal.classList.add('open');
}

function closeFontModal({ revert = true } = {}) {
  if (revert && fontSettingsSnapshot) {
    applyFontSettings(fontSettingsSnapshot);
  }
  fontSettingsSnapshot = null;
  fontModal.setAttribute('aria-hidden', 'true');
  fontModal.classList.remove('open');
}

function saveFontSettings() {
  const defaults = getDefaultFontSettings();
  const newSettings = {
    paragraph: fontInputs.paragraph.value || defaults.paragraph,
    h1: fontInputs.h1.value || defaults.h1,
    h2: fontInputs.h2.value || defaults.h2,
    h3: fontInputs.h3.value || defaults.h3,
    h4: fontInputs.h4.value || defaults.h4,
    size: Number(fontSizeSelect.value) || defaults.size,
  };
  if (!IS_DEMO) localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(newSettings));
  applyFontSettings(newSettings);
  closeFontModal({ revert: false });
  setStatus('Fontes atualizadas.');
}

function resetFontSettings() {
  const defaults = getDefaultFontSettings();
  localStorage.removeItem(FONT_STORAGE_KEY);
  applyFontSettings(defaults);
  populateFontInputs(defaults);
  setStatus('Fontes restauradas.');
}

function livePreview() {
  applyFontSettings({
    paragraph: fontInputs.paragraph.value,
    h1: fontInputs.h1.value,
    h2: fontInputs.h2.value,
    h3: fontInputs.h3.value,
    h4: fontInputs.h4.value,
    size: Number(fontSizeSelect.value) || DEFAULT_FONT_SIZE,
  });
}

Object.values(fontInputs).forEach((sel) => sel.addEventListener('change', livePreview));
fontSizeSelect.addEventListener('change', livePreview);

fontSettingsBtn.addEventListener('click', openFontModal);
closeFontModalBtn.addEventListener('click', closeFontModal);
saveFontSettingsBtn.addEventListener('click', saveFontSettings);
resetFontSettingsBtn.addEventListener('click', resetFontSettings);

fontModal.addEventListener('click', (event) => {
  if (event.target === fontModal) closeFontModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && fontModal.classList.contains('open')) {
    closeFontModal();
  }
});

window.addEventListener('load', () => {
  loadDraft();
  stripInlineFontFamily();
  applyFontSettings(loadFontSettings());
  if (!IS_DEMO) {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === 'source') setMode('source', { persist: false, silent: true });
  }
  if (!initialLoadShowedGuide) saveDraft();
  setStatus(
    IS_DEMO
      ? 'Demo — mexa à vontade.'
      : initialLoadShowedGuide
        ? 'Este guia aparece só no primeiro acesso.'
        : 'Editor pronto.',
    false,
  );
  applySidebarInitialState();
  initFileManager();
});

function getWelcomeGuide() {
  return `
      <h1>Bem-vindo ao MachDown</h1>
      <p>Editor markdown <strong>WYSIWYG</strong>, <em>100% local</em>, sem servidor nem cadastro. Este é um guia rápido pra você se ambientar. Pode editar, apagar ou substituir à vontade — ele <strong>não volta</strong> depois.</p>

      <h2>O editor</h2>
      <p>Escreva como num editor comum. A toolbar acima tem tudo o que você precisa. O botão <strong>Código</strong> alterna entre a visualização rica e o markdown puro — são dois jeitos de ver o mesmo texto.</p>
      <blockquote>
        <p>Selecione esta frase e aperte <strong>Ctrl + B</strong> para deixar em negrito. Depois clique em <strong>Código</strong> na toolbar para ver o markdown equivalente.</p>
      </blockquote>

      <h3>Tipografia</h3>
      <p>O botão <strong>Fontes</strong> abre um painel onde você escolhe a fonte e o tamanho do corpo e de cada nível de título (H1–H4). As preferências ficam salvas entre sessões.</p>

      <h2>Gerenciador de arquivos</h2>
      <p>Clique no ícone de pasta no canto esquerdo da toolbar para abrir a barra lateral. Ela permite trabalhar com múltiplos arquivos <code>.md</code> diretamente do disco.</p>

      <h3>Abrindo uma pasta</h3>
      <ol>
        <li>Clique em <strong>Abrir pasta</strong> (ícone de pasta na sidebar)</li>
        <li>Escolha uma pasta do seu computador</li>
        <li>O navegador pede permissão — conceda uma vez</li>
        <li>Seus <code>.md</code> aparecem na árvore, pastas incluídas</li>
      </ol>
      <p>A pasta é lembrada entre sessões. Se fechar e reabrir o MachDown, basta um clique pra voltar a ela (o browser pede permissão de novo por segurança).</p>

      <h3>Operações na sidebar</h3>
      <table>
        <thead>
          <tr><th>Ícone</th><th>O que faz</th></tr>
        </thead>
        <tbody>
          <tr><td>📄+ <em>Novo arquivo</em></td><td>Cria um <code>.md</code> vazio dentro da pasta selecionada</td></tr>
          <tr><td>📁+ <em>Nova pasta</em></td><td>Cria uma subpasta</td></tr>
          <tr><td>↓ <em>Abrir arquivo</em></td><td>Importa um <code>.md</code> solto (funciona em qualquer navegador)</td></tr>
          <tr><td>📁 <em>Abrir pasta</em></td><td>Escolhe uma pasta do disco</td></tr>
          <tr><td>✕ <em>Fechar pasta</em></td><td>Volta para o modo rascunho</td></tr>
        </tbody>
      </table>
      <p>Clique com o <strong>botão direito</strong> em qualquer arquivo ou pasta da árvore para <em>renomear</em> ou <em>excluir</em>.</p>

      <h3>Como o autosave funciona</h3>
      <ul>
        <li><strong>Com pasta aberta:</strong> cada mudança é salva direto no arquivo do disco. Um ponto laranja aparece ao lado do nome quando há alteração pendente.</li>
        <li><strong>Sem pasta aberta:</strong> o texto vai para o <code>localStorage</code> do navegador — um rascunho persistente que sobrevive a reloads.</li>
      </ul>

      <h3>Compatibilidade entre navegadores</h3>
      <p>O gerenciador de pastas usa a <strong>File System Access API</strong>, hoje disponível no <b>Chrome</b>, <b>Edge</b>, <b>Brave</b> e <b>Arc</b>. No <s>Firefox</s> e <s>Safari</s> a sidebar mostra um aviso — mas você ainda pode usar <em>Abrir arquivo</em> para importar um <code>.md</code> e <em>Exportar .md</em> para salvar.</p>

      <h2>Atalhos</h2>
      <ul>
        <li><strong>Ctrl + S</strong> — exportar o arquivo atual como <code>.md</code></li>
        <li><strong>Ctrl + B</strong> — negrito</li>
        <li><strong>Ctrl + I</strong> — itálico</li>
        <li><strong>Tab</strong> — indenta 2 espaços</li>
      </ul>

      <h2>Privacidade</h2>
      <p>Nada sai do seu navegador. <strong>Sem servidor, sem analytics, sem telemetria, sem cadastro.</strong> Os únicos arquivos remotos carregados são as fontes (Google Fonts) e as bibliotecas <code>marked</code> e <code>turndown</code> — ambas em cache após o primeiro load.</p>

      <hr />

      <h2>Pronto pra começar?</h2>
      <p>Quando terminar de ler, você vai saber:</p>
      <ul>
        <li><input type="checkbox" disabled /> Alternar entre WYSIWYG e código</li>
        <li><input type="checkbox" disabled /> Customizar a tipografia</li>
        <li><input type="checkbox" disabled /> Abrir uma pasta do disco</li>
        <li><input type="checkbox" disabled /> Criar, renomear e excluir arquivos</li>
        <li><input type="checkbox" disabled /> Exportar um arquivo <code>.md</code></li>
      </ul>
      <p>Selecione tudo (<strong>Ctrl + A</strong>) e apague para começar do zero, ou abra uma pasta na sidebar e mergulhe direto nos seus arquivos.</p>
      <blockquote>
        <p><em>Boa escrita é reescrita.</em></p>
      </blockquote>
    `;
}

/* =============================================================
   File manager — File System Access API + IndexedDB persistence
   ============================================================= */

const SIDEBAR_STATE_KEY = 'markdown-atelier-sidebar';
const IDB_NAME = 'machdown-fm';
const IDB_STORE = 'handles';
const IDB_KEY_ROOT = 'root';
const HAS_FSA = !IS_DEMO && typeof window.showDirectoryPicker === 'function';

const sidebarEl = document.getElementById('sidebar');
const sidebarBody = document.getElementById('sidebar-body');
const sidebarFolderName = document.getElementById('sidebar-folder-name');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const openFolderBtn = document.getElementById('sidebar-open-folder');
const closeFolderBtn = document.getElementById('sidebar-close-folder');
const newFileBtn = document.getElementById('sidebar-new-file');
const newFolderBtn = document.getElementById('sidebar-new-folder');
const treeMenu = document.getElementById('tree-menu');

let rootDirHandle = null;
let fileTree = [];
let currentFile = null;
let selectedDirEntry = null;
const expandedPaths = new Set();
let menuTargetEntry = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function updatePageTitle() {
  const base = 'MachDown';
  if (currentFile?.name) {
    document.title = `${base} | ${currentFile.name.replace(/\.md$/i, '')}`;
  } else {
    document.title = base;
  }
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function verifyPermission(handle, mode = 'readwrite') {
  const opts = { mode };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  if ((await handle.requestPermission?.(opts)) === 'granted') return true;
  return false;
}

async function readDir(dirHandle, path = '') {
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;
    const entryPath = path ? `${path}/${name}` : name;
    if (handle.kind === 'directory') {
      const children = await readDir(handle, entryPath);
      entries.push({ name, kind: 'directory', handle, path: entryPath, parent: dirHandle, children });
    } else if (handle.kind === 'file' && /\.md$/i.test(name)) {
      entries.push({ name, kind: 'file', handle, path: entryPath, parent: dirHandle });
    }
  }
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return entries;
}

function findEntryByPath(path, entries = fileTree) {
  if (!path) return null;
  for (const entry of entries) {
    if (entry.path === path) return entry;
    if (entry.children) {
      const found = findEntryByPath(path, entry.children);
      if (found) return found;
    }
  }
  return null;
}

function folderIconSVG() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
}

function fileIconSVG() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function renderSidebar() {
  if (!sidebarBody) return;
  if (!HAS_FSA) {
    sidebarBody.innerHTML = `
      <div class="sidebar-empty sidebar-empty-unsupported">
        <div class="empty-icon" aria-hidden="true">⚠</div>
        <h3>Gerenciador indisponível</h3>
        <p>Seu navegador não suporta acesso direto a pastas locais.</p>
        <p>Use <strong>Abrir</strong> e <strong>Exportar</strong> para trabalhar com um arquivo por vez.</p>
        <p class="empty-hint">Para o recurso completo: Chrome, Edge, Brave ou Arc.</p>
      </div>`;
    return;
  }
  if (!rootDirHandle) {
    sidebarBody.innerHTML = `
      <div class="sidebar-empty">
        <div class="empty-icon" aria-hidden="true">${folderIconSVG()}</div>
        <h3>Nenhuma pasta aberta</h3>
        <p>Abra uma pasta do seu computador para ver e organizar seus <code>.md</code>.</p>
        <button type="button" class="empty-cta" data-action="pick-folder">Abrir pasta</button>
        <p class="empty-hint">Seus arquivos ficam no disco — nada é copiado pra fora.</p>
      </div>`;
    sidebarBody.querySelector('[data-action="pick-folder"]')?.addEventListener('click', pickFolder);
    return;
  }
  if (!fileTree.length) {
    sidebarBody.innerHTML = `
      <div class="sidebar-empty">
        <div class="empty-icon" aria-hidden="true">${fileIconSVG()}</div>
        <h3>Pasta vazia</h3>
        <p>Nenhum arquivo <code>.md</code> aqui ainda.</p>
        <button type="button" class="empty-cta" data-action="new-file">Criar primeiro arquivo</button>
      </div>`;
    sidebarBody.querySelector('[data-action="new-file"]')?.addEventListener('click', createNewFile);
    return;
  }
  const container = document.createElement('div');
  container.className = 'file-tree';
  renderTreeInto(fileTree, container, 0);
  sidebarBody.innerHTML = '';
  sidebarBody.appendChild(container);
}

function renderTreeInto(entries, container, depth) {
  entries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = `tree-node tree-${entry.kind}`;
    row.dataset.path = entry.path;
    row.style.paddingLeft = `${depth * 14 + 8}px`;
    if (entry.kind === 'directory') {
      const expanded = expandedPaths.has(entry.path);
      row.innerHTML = `
        <span class="tree-caret">${expanded ? '▾' : '▸'}</span>
        <span class="tree-icon">${folderIconSVG()}</span>
        <span class="tree-name">${escapeHtml(entry.name)}</span>
      `;
      container.appendChild(row);
      if (expanded && entry.children?.length) {
        renderTreeInto(entry.children, container, depth + 1);
      }
    } else {
      const active = currentFile && currentFile.path === entry.path;
      if (active) row.classList.add('active');
      if (active && currentFile.dirty) row.classList.add('dirty');
      row.innerHTML = `
        <span class="tree-caret"></span>
        <span class="tree-icon">${fileIconSVG()}</span>
        <span class="tree-name">${escapeHtml(entry.name.replace(/\.md$/i, ''))}</span>
        <span class="tree-dirty" aria-hidden="true"></span>
      `;
      container.appendChild(row);
    }
  });
}

function updateFolderUI() {
  if (sidebarFolderName) {
    sidebarFolderName.textContent = rootDirHandle?.name || 'Arquivos';
  }
  const hasFolder = !!rootDirHandle;
  if (newFileBtn) newFileBtn.disabled = !hasFolder || !HAS_FSA;
  if (newFolderBtn) newFolderBtn.disabled = !hasFolder || !HAS_FSA;
  if (openFolderBtn) {
    openFolderBtn.hidden = hasFolder;
    openFolderBtn.disabled = !HAS_FSA;
  }
  if (closeFolderBtn) closeFolderBtn.hidden = !hasFolder;
}

async function pickFolder() {
  if (!HAS_FSA) return;
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await openFolder(handle);
    try { await idbSet(IDB_KEY_ROOT, handle); } catch (_) {}
  } catch (e) {
    if (e.name !== 'AbortError') setStatus('Erro ao abrir pasta: ' + e.message);
  }
}

async function openFolder(handle) {
  rootDirHandle = handle;
  selectedDirEntry = null;
  fileTree = await readDir(handle);
  updateFolderUI();
  renderSidebar();
  setStatus(`Pasta: ${handle.name}`);
}

async function refreshTree() {
  if (!rootDirHandle) return;
  fileTree = await readDir(rootDirHandle);
  renderSidebar();
}

async function closeFolder() {
  await flushSaveImmediately();
  rootDirHandle = null;
  fileTree = [];
  currentFile = null;
  selectedDirEntry = null;
  expandedPaths.clear();
  try { await idbDel(IDB_KEY_ROOT); } catch (_) {}
  updateFolderUI();
  renderSidebar();
  updatePageTitle();
  document.body.classList.remove('sidebar-open');
  toggleSidebarBtn?.setAttribute('aria-pressed', 'false');
  if (!IS_DEMO) localStorage.setItem(SIDEBAR_STATE_KEY, 'closed');
  setStatus('Pasta fechada.');
}

async function openFile(entry) {
  await flushSaveImmediately();
  try {
    const file = await entry.handle.getFile();
    const text = await file.text();
    editor.innerHTML = marked.parse(text, MARKED_OPTS);
    stripInlineFontFamily();
    if (currentMode === 'source') {
      sourceEditor.value = text;
      autoGrowSource();
    }
    currentFile = {
      handle: entry.handle,
      path: entry.path,
      name: entry.name,
      parent: entry.parent,
      dirty: false,
    };
    renderSidebar();
    updatePageTitle();
    setStatus(`Aberto: ${entry.name}`);
  } catch (e) {
    setStatus('Erro ao abrir arquivo: ' + e.message);
  }
}

function getCurrentMarkdown() {
  if (currentMode === 'source') return sourceEditor.value;
  return turndownService.turndown(editor.innerHTML);
}

async function writeCurrentFile() {
  if (!currentFile) return;
  const markdown = getCurrentMarkdown();
  const writable = await currentFile.handle.createWritable();
  await writable.write(markdown);
  await writable.close();
  currentFile.dirty = false;
  renderSidebar();
  setStatus(`Salvo: ${currentFile.name}`);
}

async function flushSaveImmediately() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (currentFile && currentFile.dirty) {
    try { await writeCurrentFile(); } catch (_) {}
  }
}

function resolveParentHandleAndPath() {
  if (selectedDirEntry?.kind === 'directory') {
    return { handle: selectedDirEntry.handle, path: selectedDirEntry.path };
  }
  return { handle: rootDirHandle, path: '' };
}

function sanitizeName(raw) {
  return raw.trim().replace(/[\\/:*?"<>|]/g, '');
}

async function createNewFile() {
  if (!rootDirHandle) return;
  const rawName = prompt('Nome do arquivo (sem extensão):');
  if (!rawName) return;
  const safe = sanitizeName(rawName).replace(/\.md$/i, '');
  if (!safe) { setStatus('Nome inválido.'); return; }
  const fileName = `${safe}.md`;
  const { handle: parent, path: parentPath } = resolveParentHandleAndPath();
  try {
    const fileHandle = await parent.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(`# ${safe}\n\n`);
    await writable.close();
    if (parentPath) expandedPaths.add(parentPath);
    await refreshTree();
    const entryPath = parentPath ? `${parentPath}/${fileName}` : fileName;
    const newEntry = findEntryByPath(entryPath);
    if (newEntry) await openFile(newEntry);
  } catch (e) {
    setStatus('Erro ao criar arquivo: ' + e.message);
  }
}

async function createNewFolder() {
  if (!rootDirHandle) return;
  const rawName = prompt('Nome da pasta:');
  if (!rawName) return;
  const safe = sanitizeName(rawName);
  if (!safe) { setStatus('Nome inválido.'); return; }
  const { handle: parent, path: parentPath } = resolveParentHandleAndPath();
  try {
    await parent.getDirectoryHandle(safe, { create: true });
    if (parentPath) expandedPaths.add(parentPath);
    await refreshTree();
  } catch (e) {
    setStatus('Erro ao criar pasta: ' + e.message);
  }
}

async function renameEntry(entry) {
  if (entry.kind !== 'file') {
    setStatus('Renomear pastas ainda não é suportado.');
    return;
  }
  const currentBare = entry.name.replace(/\.md$/i, '');
  const rawName = prompt(`Renomear "${entry.name}" para:`, currentBare);
  if (!rawName || rawName === currentBare) return;
  const safe = sanitizeName(rawName).replace(/\.md$/i, '');
  if (!safe) { setStatus('Nome inválido.'); return; }
  const newName = `${safe}.md`;
  try {
    const file = await entry.handle.getFile();
    const content = await file.text();
    const newHandle = await entry.parent.getFileHandle(newName, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(content);
    await writable.close();
    await entry.parent.removeEntry(entry.name);
    const wasOpen = currentFile?.path === entry.path;
    await refreshTree();
    if (wasOpen) {
      const newPath = entry.path.replace(/[^/]+$/, newName);
      const newEntry = findEntryByPath(newPath);
      if (newEntry) await openFile(newEntry);
    }
  } catch (e) {
    setStatus('Erro ao renomear: ' + e.message);
  }
}

async function deleteEntry(entry) {
  const ok = confirm(`Excluir "${entry.name}"${entry.kind === 'directory' ? ' e todo o conteúdo' : ''}?`);
  if (!ok) return;
  try {
    await entry.parent.removeEntry(entry.name, { recursive: entry.kind === 'directory' });
    if (currentFile && (currentFile.path === entry.path || currentFile.path.startsWith(entry.path + '/'))) {
      currentFile = null;
      updatePageTitle();
    }
    await refreshTree();
    setStatus('Excluído.');
  } catch (e) {
    setStatus('Erro ao excluir: ' + e.message);
  }
}

function hideTreeMenu() {
  if (treeMenu) {
    treeMenu.hidden = true;
    menuTargetEntry = null;
  }
}

function showTreeMenu(x, y, entry) {
  if (!treeMenu) return;
  menuTargetEntry = entry;
  treeMenu.hidden = false;
  const renameBtn = treeMenu.querySelector('[data-menu-action="rename"]');
  if (renameBtn) renameBtn.disabled = entry.kind !== 'file';
  const rect = treeMenu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  treeMenu.style.left = `${Math.min(x, maxX)}px`;
  treeMenu.style.top = `${Math.min(y, maxY)}px`;
}

function applySidebarInitialState() {
  if (IS_DEMO) return;
  const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
  const open = saved === 'open';
  document.body.classList.toggle('sidebar-open', open);
  toggleSidebarBtn?.setAttribute('aria-pressed', String(open));
}

toggleSidebarBtn?.addEventListener('click', () => {
  const next = !document.body.classList.contains('sidebar-open');
  document.body.classList.toggle('sidebar-open', next);
  toggleSidebarBtn.setAttribute('aria-pressed', String(next));
  if (!IS_DEMO) localStorage.setItem(SIDEBAR_STATE_KEY, next ? 'open' : 'closed');
});

openFolderBtn?.addEventListener('click', pickFolder);
closeFolderBtn?.addEventListener('click', closeFolder);
newFileBtn?.addEventListener('click', createNewFile);
newFolderBtn?.addEventListener('click', createNewFolder);

sidebarBody?.addEventListener('click', async (e) => {
  hideTreeMenu();
  const row = e.target.closest('.tree-node');
  if (!row) return;
  const entry = findEntryByPath(row.dataset.path);
  if (!entry) return;
  if (entry.kind === 'directory') {
    if (expandedPaths.has(entry.path)) expandedPaths.delete(entry.path);
    else expandedPaths.add(entry.path);
    selectedDirEntry = entry;
    renderSidebar();
  } else {
    const parentPath = entry.path.includes('/')
      ? entry.path.split('/').slice(0, -1).join('/')
      : '';
    selectedDirEntry = parentPath ? findEntryByPath(parentPath) : null;
    await openFile(entry);
  }
});

sidebarBody?.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.tree-node');
  if (!row) return;
  const entry = findEntryByPath(row.dataset.path);
  if (!entry) return;
  e.preventDefault();
  showTreeMenu(e.clientX, e.clientY, entry);
});

treeMenu?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.menuAction;
  const entry = menuTargetEntry;
  hideTreeMenu();
  if (!entry) return;
  if (action === 'rename') await renameEntry(entry);
  else if (action === 'delete') await deleteEntry(entry);
});

document.addEventListener('click', (e) => {
  if (treeMenu && !treeMenu.hidden && !treeMenu.contains(e.target)) hideTreeMenu();
});
document.addEventListener('scroll', hideTreeMenu, true);
window.addEventListener('resize', hideTreeMenu);

async function initFileManager() {
  if (IS_DEMO) return;
  updateFolderUI();
  renderSidebar();
  if (!HAS_FSA) return;
  try {
    const saved = await idbGet(IDB_KEY_ROOT);
    if (!saved) return;
    if ((await saved.queryPermission?.({ mode: 'readwrite' })) === 'granted') {
      await openFolder(saved);
    } else {
      renderNeedsReopen(saved);
    }
  } catch (_) {
    try { await idbDel(IDB_KEY_ROOT); } catch (_) {}
  }
}

function renderNeedsReopen(handle) {
  if (!sidebarBody) return;
  sidebarBody.innerHTML = `
    <div class="sidebar-empty">
      <div class="empty-icon" aria-hidden="true">🔒</div>
      <h3>Permissão necessária</h3>
      <p>Reabrir a pasta <code>${escapeHtml(handle.name)}</code> para continuar.</p>
      <button type="button" class="empty-cta" data-action="resume">Conceder acesso</button>
      <p class="empty-hint">Por segurança, o browser pede confirmação a cada sessão.</p>
    </div>`;
  sidebarBody.querySelector('[data-action="resume"]')?.addEventListener('click', async () => {
    if (await verifyPermission(handle)) {
      await openFolder(handle);
    } else {
      setStatus('Permissão negada.');
    }
  });
}
