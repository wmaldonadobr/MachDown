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
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, editor.innerHTML);
    setStatus('Rascunho salvo.');
  }, 350);
}

function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved.trim()) {
    editor.innerHTML = saved;
  } else {
    editor.innerHTML = `
      <h1>Bem-vindo ao MachDown</h1>
      <p>Um editor markdown WYSIWYG, minimalista e direto. Digite, formate com os botões acima e exporte em <code>.md</code> quando estiver pronto.</p>
      <h2>Começando</h2>
      <ul>
        <li>Use <strong>Ctrl + S</strong> para baixar o arquivo markdown.</li>
        <li>Clique em <em>Abrir</em> para carregar um <code>.md</code> existente.</li>
        <li>Personalize tipografia em <em>Fontes</em>.</li>
      </ul>
      <blockquote>Boa escrita é reescrita.</blockquote>
    `;
  }
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
  sourceEditor.style.height = 'auto';
  sourceEditor.style.height = sourceEditor.scrollHeight + 'px';
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
  highlight.style.top = `${ta.offsetTop + borderTop + y}px`;
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
  const style = getComputedStyle(ta);
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const taRect = ta.getBoundingClientRect();
  const absoluteY = taRect.top + window.scrollY + borderTop + y;
  const target = Math.max(0, absoluteY - window.innerHeight / 3);
  window.scrollTo({ top: target, behavior: 'auto' });
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
      block.scrollIntoView({ block: 'center', behavior: 'auto' });
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
  if (persist) localStorage.setItem(MODE_STORAGE_KEY, next);
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
  const html = editor.innerHTML;
  const markdown = turndownService.turndown(html);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'documento.md';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus('Exportado documento.md');
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
  localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(newSettings));
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
  const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
  if (savedMode === 'source') setMode('source', { persist: false, silent: true });
  saveDraft();
  setStatus('Editor pronto.', false);
});
