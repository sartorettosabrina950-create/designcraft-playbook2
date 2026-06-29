/* DesignCraft Application Script */

// API Endpoint - Relative path since served from the same server
const API_URL = '/api/boards';

// App State
let state = {
  colors: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#f43f5e',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc'
  },
  typography: {
    titleFont: 'Outfit',
    bodyFont: 'Inter',
    titleSize: '2.5rem',
    bodySize: '1rem',
    lineHeight: '1.6'
  },
  card: {
    radius: '16px',
    shadowOpacity: '0.3',
    blur: '12px',
    padding: '24px'
  },
  savedBoards: [],
  isBackendConnected: false
};

// DOM Elements
const elements = {
  // Inputs: Colors
  inputPrimary: document.getElementById('input-color-primary'),
  inputSecondary: document.getElementById('input-color-secondary'),
  inputAccent: document.getElementById('input-color-accent'),
  inputBg: document.getElementById('input-color-bg'),
  inputSurface: document.getElementById('input-color-surface'),
  inputText: document.getElementById('input-color-text'),
  
  // Inputs: Typography
  selectTitleFont: document.getElementById('select-title-font'),
  selectBodyFont: document.getElementById('select-body-font'),
  sliderTitleSize: document.getElementById('slider-title-size'),
  sliderBodySize: document.getElementById('slider-body-size'),
  sliderLineHeight: document.getElementById('slider-line-height'),
  
  // Inputs: Card styles
  sliderRadius: document.getElementById('slider-radius'),
  sliderPadding: document.getElementById('slider-padding'),
  sliderShadow: document.getElementById('slider-shadow'),
  sliderBlur: document.getElementById('slider-blur'),
  
  // Value indicators
  valTitleSize: document.getElementById('val-title-size'),
  valBodySize: document.getElementById('val-body-size'),
  valLineHeight: document.getElementById('val-line-height'),
  valRadius: document.getElementById('val-radius'),
  valPadding: document.getElementById('val-padding'),
  valShadow: document.getElementById('val-shadow'),
  valBlur: document.getElementById('val-blur'),
  
  // Buttons
  btnAnalogous: document.getElementById('btn-generate-analogous'),
  btnComplementary: document.getElementById('btn-generate-complementary'),
  btnTriadic: document.getElementById('btn-generate-triadic'),
  btnCopyCss: document.getElementById('btn-copy-css'),
  btnSaveBoard: document.getElementById('btn-save-board'),
  
  // Custom Card Elements (to verify font styles)
  demoCard: document.getElementById('demo-card'),
  demoCardTitle: document.getElementById('demo-card-title'),
  demoCardText: document.getElementById('demo-card-text'),
  demoCardBadge: document.getElementById('demo-card-badge'),
  demoCardBtn: document.getElementById('demo-card-btn'),
  demoCardSecondaryBtn: document.getElementById('demo-card-secondary-btn'),
  
  // Other UI
  inputBoardName: document.getElementById('input-board-name'),
  boardsContainer: document.getElementById('boards-container'),
  statusIndicator: document.querySelector('.status-indicator'),
  statusText: document.querySelector('.status-text'),
  toast: document.getElementById('toast'),
  valContrastRatio: document.getElementById('val-contrast-ratio'),
  badgeContrastStatus: document.getElementById('badge-contrast-status')
};

// ==========================================
// 1. Color Math Helpers
// ==========================================

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function hexToHsl(hex) {
  let rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = val => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert a hex color string to its comma-separated RGB equivalent (for color-mix or rgba)
function hexToRgbString(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '0, 0, 0';
}

// ==========================================
// 2. WCAG Contrast Check Formula
// ==========================================

function getLuminance(rgb) {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1.0;
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function updateAccessibilityScore() {
  const ratio = getContrastRatio(state.colors.surface, state.colors.text);
  elements.valContrastRatio.innerText = `${ratio.toFixed(2)}:1`;
  
  const badge = elements.badgeContrastStatus;
  badge.className = 'contrast-badge'; // reset
  
  if (ratio >= 7.0) {
    badge.innerText = 'Pass (AAA)';
    badge.classList.add('pass-aaa');
  } else if (ratio >= 4.5) {
    badge.innerText = 'Pass (AA)';
    badge.classList.add('pass-aa');
  } else {
    badge.innerText = 'Fail (Low)';
    badge.classList.add('fail');
  }
}

// ==========================================
// 3. Apply Custom Design System Variables
// ==========================================

function updateUI() {
  // Update state values from DOM inputs
  state.colors.primary = elements.inputPrimary.value;
  state.colors.secondary = elements.inputSecondary.value;
  state.colors.accent = elements.inputAccent.value;
  state.colors.background = elements.inputBg.value;
  state.colors.surface = elements.inputSurface.value;
  state.colors.text = elements.inputText.value;
  
  state.typography.titleFont = elements.selectTitleFont.value;
  state.typography.bodyFont = elements.selectBodyFont.value;
  state.typography.titleSize = `${elements.sliderTitleSize.value}rem`;
  state.typography.bodySize = `${elements.sliderBodySize.value}rem`;
  state.typography.lineHeight = elements.sliderLineHeight.value;
  
  state.card.radius = `${elements.sliderRadius.value}px`;
  state.card.padding = `${elements.sliderPadding.value}px`;
  state.card.shadowOpacity = elements.sliderShadow.value;
  state.card.blur = `${elements.sliderBlur.value}px`;

  // Write variables directly into document root
  const root = document.documentElement;
  root.style.setProperty('--primary', state.colors.primary);
  root.style.setProperty('--primary-rgb', hexToRgbString(state.colors.primary));
  root.style.setProperty('--secondary', state.colors.secondary);
  root.style.setProperty('--accent', state.colors.accent);
  root.style.setProperty('--bg-color', state.colors.background);
  root.style.setProperty('--surface-color', state.colors.surface);
  root.style.setProperty('--surface-color-rgb', hexToRgbString(state.colors.surface));
  root.style.setProperty('--text-color', state.colors.text);
  
  root.style.setProperty('--title-font', `"${state.typography.titleFont}", sans-serif`);
  root.style.setProperty('--body-font', `"${state.typography.bodyFont}", sans-serif`);
  root.style.setProperty('--title-size', state.typography.titleSize);
  root.style.setProperty('--body-size', state.typography.bodySize);
  root.style.setProperty('--line-height', state.typography.lineHeight);
  
  root.style.setProperty('--card-radius', state.card.radius);
  root.style.setProperty('--card-padding', state.card.padding);
  root.style.setProperty('--card-blur', state.card.blur);
  
  // Shadow depth calculations
  const shadowSpread = Math.round(elements.sliderShadow.value * 80);
  const shadowOpacity = elements.sliderShadow.value;
  root.style.setProperty('--card-shadow', `0 10px ${shadowSpread}px -5px rgba(0, 0, 0, ${shadowOpacity})`);

  // Update text labels
  elements.valTitleSize.innerText = state.typography.titleSize;
  elements.valBodySize.innerText = state.typography.bodySize;
  elements.valLineHeight.innerText = state.typography.lineHeight;
  elements.valRadius.innerText = state.card.radius;
  elements.valPadding.innerText = state.card.padding;
  elements.valShadow.innerText = state.card.shadowOpacity;
  elements.valBlur.innerText = state.card.blur;

  updateAccessibilityScore();
}

// Sync inputs to match current state (used when loading a saved theme)
function syncInputsFromState() {
  elements.inputPrimary.value = state.colors.primary;
  elements.inputSecondary.value = state.colors.secondary;
  elements.inputAccent.value = state.colors.accent;
  elements.inputBg.value = state.colors.background;
  elements.inputSurface.value = state.colors.surface;
  elements.inputText.value = state.colors.text;

  elements.selectTitleFont.value = state.typography.titleFont;
  elements.selectBodyFont.value = state.typography.bodyFont;
  
  elements.sliderTitleSize.value = parseFloat(state.typography.titleSize);
  elements.sliderBodySize.value = parseFloat(state.typography.bodySize);
  elements.sliderLineHeight.value = state.typography.lineHeight;
  
  elements.sliderRadius.value = parseInt(state.card.radius);
  elements.sliderPadding.value = parseInt(state.card.padding);
  elements.sliderShadow.value = state.card.shadowOpacity || state.card.shadow || 0.3;
  elements.sliderBlur.value = parseInt(state.card.blur);

  updateUI();
}

// ==========================================
// 4. Color Palette Generation Rules
// ==========================================

function generatePalette(rule) {
  const baseHex = elements.inputPrimary.value;
  const baseHsl = hexToHsl(baseHex);
  
  let newSecondary = '';
  let newAccent = '';
  let newBg = '';
  let newSurface = '';
  let newText = '#f8fafc'; // light text default
  
  if (rule === 'analogous') {
    // Analogous colors: adjacent hues on the color wheel (e.g. +30 deg, -30 deg)
    newSecondary = hslToHex((baseHsl.h + 30) % 360, baseHsl.s, baseHsl.l);
    newAccent = hslToHex((baseHsl.h - 30 + 360) % 360, baseHsl.s, baseHsl.l);
    
    // Choose nice dark background related to primary hue
    newBg = hslToHex(baseHsl.h, 25, 6);
    newSurface = hslToHex(baseHsl.h, 20, 14);
  } 
  
  else if (rule === 'complementary') {
    // Complementary colors: opposite hues (e.g. +180 deg)
    newSecondary = hslToHex((baseHsl.h + 15) % 360, baseHsl.s, baseHsl.l);
    newAccent = hslToHex((baseHsl.h + 180) % 360, baseHsl.s, baseHsl.l);
    
    // Background based on secondary hue
    newBg = hslToHex((baseHsl.h + 180) % 360, 20, 6);
    newSurface = hslToHex((baseHsl.h + 180) % 360, 15, 14);
  } 
  
  else if (rule === 'triadic') {
    // Triadic colors: three equally spaced hues (e.g. +120 deg, +240 deg)
    newSecondary = hslToHex((baseHsl.h + 120) % 360, baseHsl.s, baseHsl.l);
    newAccent = hslToHex((baseHsl.h + 240) % 360, baseHsl.s, baseHsl.l);
    
    // Dark background matching base hue
    newBg = hslToHex(baseHsl.h, 15, 6);
    newSurface = hslToHex(baseHsl.h, 10, 14);
  }

  // Update inputs
  elements.inputSecondary.value = newSecondary;
  elements.inputAccent.value = newAccent;
  elements.inputBg.value = newBg;
  elements.inputSurface.value = newSurface;
  elements.inputText.value = newText;
  
  updateUI();
  showToast(`Palette generated using ${rule} rules!`);
}

// ==========================================
// 5. Code Exporter
// ==========================================

function copyCssCode() {
  const css = `/* DesignCraft Generated Styles */
:root {
  --primary-color: ${state.colors.primary};
  --secondary-color: ${state.colors.secondary};
  --accent-color: ${state.colors.accent};
  --bg-color: ${state.colors.background};
  --surface-color: ${state.colors.surface};
  --text-color: ${state.colors.text};

  /* Typography Settings */
  --title-font: "${state.typography.titleFont}", sans-serif;
  --body-font: "${state.typography.bodyFont}", sans-serif;
  --title-size: ${state.typography.titleSize};
  --body-size: ${state.typography.bodySize};
  --line-height: ${state.typography.lineHeight};

  /* Component Properties */
  --card-radius: ${state.card.radius};
  --card-padding: ${state.card.padding};
  --card-blur: ${state.card.blur};
  --card-shadow: 0 10px ${Math.round(elements.sliderShadow.value * 80)}px -5px rgba(0, 0, 0, ${state.card.shadowOpacity});
}

/* Card Styling Implementation */
.card-component {
  background-color: rgba(${hexToRgbString(state.colors.surface)}, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(var(--card-blur));
  padding: var(--card-padding);
  color: var(--text-color);
  font-family: var(--body-font);
}

.card-component h2 {
  font-family: var(--title-font);
  font-size: var(--title-size);
  line-height: 1.2;
}
`;

  navigator.clipboard.writeText(css).then(() => {
    showToast('CSS Variables copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function showToast(message) {
  elements.toast.innerText = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
}

// ==========================================
// 6. Backend REST API Integration
// ==========================================

// Check server status and load initial boards
async function initBackendConnection() {
  try {
    // Send a status check request to the API
    const response = await fetch(API_URL);
    if (response.ok) {
      state.isBackendConnected = true;
      elements.statusIndicator.className = 'status-indicator online';
      elements.statusText.innerText = 'Backend Connected';
      console.log('Successfully connected to PowerShell HTTP Backend.');
    } else {
      throw new Error('Server returned error status');
    }
  } catch (err) {
    state.isBackendConnected = false;
    elements.statusIndicator.className = 'status-indicator offline';
    elements.statusText.innerText = 'Offline (Local Storage Mode)';
    console.warn('Backend server not detected. Falling back to LocalStorage.', err);
  }
  
  await fetchBoards();
}

async function fetchBoards() {
  if (state.isBackendConnected) {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        state.savedBoards = await response.json();
      }
    } catch (err) {
      console.error('Failed to fetch from backend API: ', err);
    }
  } else {
    // Read from LocalStorage fallback
    const local = localStorage.getItem('designcraft_boards');
    state.savedBoards = local ? JSON.parse(local) : [];
  }
  
  renderBoardsList();
}

async function saveBoard() {
  const name = elements.inputBoardName.value.trim();
  if (!name) {
    alert('Please enter a name for your moodboard.');
    return;
  }
  
  const payload = {
    name: name,
    colors: state.colors,
    typography: state.typography,
    card: state.card
  };
  
  if (state.isBackendConnected) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const saved = await response.json();
        state.savedBoards.push(saved);
        showToast(`"${name}" saved to db.json!`);
      } else {
        alert('Failed to save design to backend.');
      }
    } catch (err) {
      console.error('Error saving board to API: ', err);
    }
  } else {
    // LocalStorage fallback save
    const newBoard = {
      ...payload,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    state.savedBoards.push(newBoard);
    localStorage.setItem('designcraft_boards', JSON.stringify(state.savedBoards));
    showToast(`"${name}" saved to browser LocalStorage!`);
  }
  
  elements.inputBoardName.value = '';
  await fetchBoards();
}

async function deleteBoard(id) {
  if (state.isBackendConnected) {
    try {
      const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Moodboard deleted from database.');
      } else {
        alert('Failed to delete design from backend.');
      }
    } catch (err) {
      console.error('Error deleting board from API: ', err);
    }
  } else {
    // LocalStorage fallback delete
    state.savedBoards = state.savedBoards.filter(b => b.id !== id);
    localStorage.setItem('designcraft_boards', JSON.stringify(state.savedBoards));
    showToast('Moodboard deleted from LocalStorage.');
  }
  
  await fetchBoards();
}

function loadBoard(id) {
  const board = state.savedBoards.find(b => b.id === id);
  if (!board) return;
  
  // Set app state
  state.colors = { ...board.colors };
  state.typography = { ...board.typography };
  state.card = { ...board.card };
  
  syncInputsFromState();
  showToast(`Loaded palette: "${board.name}"`);
}

// Render the dashboard grid of saved themes
function renderBoardsList() {
  const container = elements.boardsContainer;
  container.innerHTML = '';
  
  if (state.savedBoards.length === 0) {
    container.innerHTML = `<div class="empty-state">No saved moodboards yet. Customize colors and click "Save to Database" above!</div>`;
    return;
  }
  
  state.savedBoards.forEach(board => {
    const card = document.createElement('div');
    card.className = 'board-card';
    
    // Create color palette preview dots
    const colorsDiv = document.createElement('div');
    colorsDiv.className = 'board-card-colors';
    const colorKeys = ['primary', 'secondary', 'accent', 'background', 'surface'];
    colorKeys.forEach(key => {
      const dot = document.createElement('span');
      dot.className = 'color-dot';
      dot.style.backgroundColor = board.colors[key];
      dot.title = `${key}: ${board.colors[key]}`;
      colorsDiv.appendChild(dot);
    });
    
    // Date formatting
    const date = new Date(board.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    card.innerHTML = `
      <h3 class="board-card-title">${board.name}</h3>
      <div class="board-card-typography-info" style="font-size: 0.75rem; color: var(--ui-text-muted);">
        Fonts: ${board.typography.titleFont} / ${board.typography.bodyFont}
      </div>
    `;
    
    // Append colors list
    card.appendChild(colorsDiv);
    
    // Add meta and button actions
    const meta = document.createElement('div');
    meta.className = 'board-card-meta';
    meta.innerHTML = `<span>${date}</span>`;
    
    const actions = document.createElement('div');
    actions.className = 'board-card-actions';
    
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-icon-only';
    loadBtn.innerHTML = '👁️';
    loadBtn.title = 'Load Theme';
    loadBtn.onclick = () => loadBoard(board.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-only btn-delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete Theme';
    deleteBtn.onclick = () => {
      if (confirm(`Are you sure you want to delete "${board.name}"?`)) {
        deleteBoard(board.id);
      }
    };
    
    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);
    meta.appendChild(actions);
    card.appendChild(meta);
    
    container.appendChild(card);
  });
}

// ==========================================
// 7. Event Listeners
// ==========================================

function setupEventListeners() {
  // Input triggers for live updates
  const inputs = [
    elements.inputPrimary,
    elements.inputSecondary,
    elements.inputAccent,
    elements.inputBg,
    elements.inputSurface,
    elements.inputText,
    elements.selectTitleFont,
    elements.selectBodyFont,
    elements.sliderTitleSize,
    elements.sliderBodySize,
    elements.sliderLineHeight,
    elements.sliderRadius,
    elements.sliderPadding,
    elements.sliderShadow,
    elements.sliderBlur
  ];
  
  inputs.forEach(input => {
    input.addEventListener('input', updateUI);
  });
  
  // Palette generators
  elements.btnAnalogous.onclick = () => generatePalette('analogous');
  elements.btnComplementary.onclick = () => generatePalette('complementary');
  elements.btnTriadic.onclick = () => generatePalette('triadic');
  
  // Actions
  elements.btnCopyCss.onclick = copyCssCode;
  elements.btnSaveBoard.onclick = saveBoard;
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateUI();
  initBackendConnection();
});
