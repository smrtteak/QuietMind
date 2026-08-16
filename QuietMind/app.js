/* ============================================================
   QuietMind — Working concept
   ============================================================ */

/* ============== CONSTANTS ============== */
const STORAGE_KEY = 'quietmind_checkins';
const PIN_KEY = 'quietmind_pin';
const THEME_KEY = 'quietmind_theme';
const FIRST_USE_KEY = 'quietmind_first_use';

const MOOD_LABELS = ['', 'Heavy', 'Quiet', 'Steady', 'Soft', 'Bright'];
const MOOD_EMOJIS = ['', '🌑', '🌫️', '🌤️', '🌸', '☀️'];
const MOOD_COLORS = ['', '#6b6258', '#a89e91', '#d4c5b0', '#e8a491', '#b8c9b1'];

/* ============== STATE ============== */
let currentRange = 30;
let selectedMood = 3;
let pinHash = null;

/* ============== UTILS ============== */
function $(id) { return document.getElementById(id); }

// Simple hash for PIN (NOT cryptographically secure — for prototype use only)
function hashPin(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ============== STORAGE ============== */
function getCheckins() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCheckins(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getFirstUseDate() {
  let date = localStorage.getItem(FIRST_USE_KEY);
  if (!date) {
    date = new Date().toISOString();
    localStorage.setItem(FIRST_USE_KEY, date);
  }
  return new Date(date);
}

function getDaysOfHistory() {
  const firstUse = getFirstUseDate();
  const today = new Date();
  const diff = Math.floor((today - firstUse) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

/* ============== THEME ============== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.theme-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.theme === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
}

/* ============== LOCK SCREEN ============== */
function initLock() {
  pinHash = localStorage.getItem(PIN_KEY);
  const lockScreen = $('lockScreen');
  const pinInput = $('lockPinInput');
  const submitBtn = $('lockSubmit');
  const skipBtn = $('lockSkip');
  const hint = $('lockHint');

  function unlock() {
    lockScreen.classList.add('hidden');
    document.body.classList.remove('locked');
    $('app').style.display = 'block';
    setTimeout(() => {
      loadTodayIfExists();
      renderGraph();
      updateExportSlider();
    }, 100);
  }

  function attemptUnlock() {
    const entered = pinInput.value;
    if (pinHash) {
      if (hashPin(entered) === pinHash) {
        unlock();
      } else {
        hint.textContent = 'Wrong PIN. Try again.';
        hint.classList.add('error');
        pinInput.value = '';
        pinInput.focus();
        setTimeout(() => { hint.classList.remove('error'); }, 1500);
      }
    } else {
      if (entered.length >= 4) {
        localStorage.setItem(PIN_KEY, hashPin(entered));
        pinHash = localStorage.getItem(PIN_KEY);
        unlock();
      } else {
        hint.textContent = 'PIN must be at least 4 digits';
        hint.classList.add('error');
        pinInput.value = '';
        setTimeout(() => {
          hint.classList.remove('error');
          hint.textContent = 'Set a PIN to keep your entries private';
        }, 1500);
      }
    }
  }

  submitBtn.addEventListener('click', attemptUnlock);
  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptUnlock();
  });
  skipBtn.addEventListener('click', () => {
    if (pinHash) {
      hint.textContent = 'PIN is set. Enter it to continue.';
      hint.classList.add('error');
      pinInput.focus();
      return;
    }
    unlock();
  });

  if (pinHash) {
    hint.textContent = 'Enter your PIN';
    skipBtn.style.display = 'none';
  }
  setTimeout(() => pinInput.focus(), 300);
}

/* ============== LOCK BUTTON (in nav) ============== */
$('lockBtn').addEventListener('click', () => {
  if (!pinHash) {
    showToast('No PIN set. Open settings to add one.');
    return;
  }
  $('app').style.display = 'none';
  document.body.classList.add('locked');
  const lockScreen = $('lockScreen');
  lockScreen.classList.remove('hidden');
  $('lockPinInput').value = '';
  $('lockPinInput').focus();
});

/* ============== PARALLAX ============== */
const parallaxItems = document.querySelectorAll('[data-speed]');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  parallaxItems.forEach(el => {
    const speed = parseFloat(el.dataset.speed);
    el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
  });
});

/* ============== SCROLL REVEAL ============== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ============== PHONE / CHECK-IN ============== */
const phoneDate = $('phoneDate');
const phoneSubgreeting = $('phoneSubgreeting');
const phoneInput = $('phoneInput');
const phoneSave = $('phoneSave');
const moodSelector = $('moodSelector');

function updatePhoneDate() {
  const now = new Date();
  phoneDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
}
updatePhoneDate();

function highlightMood(m) {
  moodSelector.querySelectorAll('.mood-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.mood) === m);
  });
}

function loadTodayIfExists() {
  const today = new Date().toISOString().split('T')[0];
  const data = getCheckins();
  const entry = data[today];
  if (entry) {
    selectedMood = entry.mood;
    phoneInput.value = entry.note || '';
    highlightMood(entry.mood);
    phoneSave.textContent = 'Update';
    phoneSubgreeting.textContent = 'You already checked in today. Update if you like.';
    phoneSubgreeting.classList.add('done');
  } else {
    phoneInput.value = '';
    highlightMood(3);
    selectedMood = 3;
    phoneSave.textContent = 'Save quietly';
    phoneSubgreeting.textContent = 'Pick what fits today';
    phoneSubgreeting.classList.remove('done');
  }
}

moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMood = parseInt(btn.dataset.mood);
    highlightMood(selectedMood);
  });
});

phoneSave.addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  const data = getCheckins();
  data[today] = {
    mood: selectedMood,
    note: phoneInput.value.trim(),
    timestamp: Date.now()
  };
  saveCheckins(data);
  phoneSave.textContent = '✓ Saved';
  phoneSubgreeting.textContent = 'Saved quietly. See it below.';
  phoneSubgreeting.classList.add('done');
  showToast('Check-in saved 🌿');
  renderGraph();
  updateExportSlider();
  setTimeout(() => { phoneSave.textContent = 'Update'; }, 1500);
});

/* ============== GRAPH ============== */
const graphWrap = $('graphWrap');
const graphEmpty = $('graphEmpty');
const graphTitle = $('graphTitle');
const lineEl = $('graphLine');
const areaEl = $('graphArea');
const pointsGroup = $('graphPoints');
const tooltip = $('graphTooltip');
const insightEl = $('insight');
const insightText = $('insightText');
const insightIcon = $('insightIcon');
const xLabels = $('xLabels');

const yFor = v => 250 - ((v - 1) / 4) * 200;
const xFor = (i, total) => 50 + (i * (700 / Math.max(total - 1, 1)));

function renderGraph() {
  const data = getCheckins();
  const days = [];
  const today = new Date();

  for (let i = currentRange - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const entry = data[key];
    days.push({
      date: d,
      key,
      mood: entry ? entry.mood : null,
      note: entry ? entry.note : '',
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  const entries = days.filter(d => d.mood !== null);

  if (entries.length === 0) {
    graphWrap.style.display = 'none';
    insightEl.style.display = 'none';
    graphEmpty.style.display = 'block';
    graphTitle.textContent = `Your last ${currentRange} days`;
    return;
  }

  graphWrap.style.display = 'block';
  graphEmpty.style.display = 'none';
  insightEl.style.display = 'flex';
  graphTitle.textContent = `${entries.length} check-in${entries.length !== 1 ? 's' : ''} · last ${currentRange} days`;

  // X labels
  xLabels.innerHTML = '';
  if (currentRange === 7) {
    days.forEach((d, i) => {
      const x = xFor(i, 7);
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', x); txt.setAttribute('y', 275);
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = d.weekday;
      xLabels.appendChild(txt);
    });
  } else if (currentRange === 30) {
    ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Now'].forEach((label, i) => {
      const x = 50 + i * (700 / 4);
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', x); txt.setAttribute('y', 275);
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = label;
      xLabels.appendChild(txt);
    });
  } else {
    ['Month 1', 'Month 2', 'Month 3', 'Now'].forEach((label, i) => {
      const x = 50 + i * (700 / 3);
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', x); txt.setAttribute('y', 275);
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = label;
      xLabels.appendChild(txt);
    });
  }

  // Build paths from entries only (skip gaps)
  let linePath = '', areaPath = '';
  const points = [];
  entries.forEach((entry, i) => {
    const x = xFor(i, entries.length);
    const y = yFor(entry.mood);
    points.push({ ...entry, x, y, i });
    if (i === 0) {
      linePath += `M ${x} ${y}`;
      areaPath += `M ${x} 250 L ${x} ${y}`;
    } else {
      const prev = points[i - 1];
      const midX = (prev.x + x) / 2;
      linePath += ` C ${midX} ${prev.y}, ${midX} ${y}, ${x} ${y}`;
      areaPath += ` C ${midX} ${prev.y}, ${midX} ${y}, ${x} ${y}`;
    }
  });
  areaPath += ` L ${xFor(entries.length - 1, entries.length)} 250 Z`;

  lineEl.setAttribute('d', linePath);
  areaEl.setAttribute('d', areaPath);

  const lineLen = lineEl.getTotalLength();
  lineEl.style.strokeDasharray = lineLen;
  lineEl.style.strokeDashoffset = lineLen;
  lineEl.style.transition = 'none';
  areaEl.style.opacity = '0';
  requestAnimationFrame(() => {
    lineEl.style.transition = 'stroke-dashoffset 1.2s ease-out';
    lineEl.style.strokeDashoffset = '0';
    areaEl.style.transition = 'opacity 1.2s 0.3s';
    areaEl.style.opacity = '1';
  });

  pointsGroup.innerHTML = '';
  points.forEach(p => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', MOOD_COLORS[p.mood]);
    circle.setAttribute('stroke', 'var(--cream)');
    circle.setAttribute('stroke-width', '2');
    circle.style.cursor = 'pointer';
    circle.style.transition = 'r 0.2s';

    circle.addEventListener('mouseenter', () => {
      circle.setAttribute('r', '8');
      tooltip.style.left = (p.x / 800 * 100) + '%';
      tooltip.style.top = (p.y / 280 * 100) + '%';
      const noteHtml = p.note ? `<br><span style="opacity:0.8">"${escapeHtml(p.note)}"</span>` : '';
      tooltip.innerHTML = `<strong>${p.label}</strong> · ${MOOD_LABELS[p.mood]}${noteHtml}`;
      tooltip.classList.add('show');
    });
    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '5');
      tooltip.classList.remove('show');
    });
    pointsGroup.appendChild(circle);
  });

  generateInsight(entries);
}

function generateInsight(entries) {
  if (entries.length < 3) {
    insightIcon.textContent = '🌱';
    insightText.innerHTML = entries.length === 1
      ? '<strong>Just getting started.</strong> Keep checking in — patterns emerge after a few days.'
      : `<strong>${entries.length} entries so far.</strong> Patterns emerge after about a week.`;
    return;
  }

  const avg = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
  const avgLabel = MOOD_LABELS[Math.round(avg)];
  const avgEmoji = MOOD_EMOJIS[Math.round(avg)];

  if (entries.length >= 7) {
    const byDow = {};
    entries.forEach(e => {
      const dow = e.date.getDay();
      if (!byDow[dow]) byDow[dow] = [];
      byDow[dow].push(e.mood);
    });
    const dowAvgs = Object.entries(byDow)
      .filter(([k, v]) => v.length >= 1)
      .map(([k, v]) => ({ dow: parseInt(k), avg: v.reduce((a, b) => a + b, 0) / v.length, count: v.length }))
      .sort((a, b) => a.avg - b.avg);

    if (dowAvgs.length >= 3) {
      const lowest = dowAvgs[0];
      const highest = dowAvgs[dowAvgs.length - 1];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (lowest.avg < highest.avg - 0.8) {
        insightIcon.textContent = MOOD_EMOJIS[Math.round(highest.avg)];
        insightText.innerHTML = `<strong>Pattern spotted:</strong> ${dayNames[highest.dow]}${highest.dow === lowest.dow ? '' : 's'} tend to feel ${MOOD_LABELS[Math.round(highest.avg)].toLowerCase()}. ${dayNames[lowest.dow]}${lowest.dow === lowest.dow ? '' : 's'} often feel ${MOOD_LABELS[Math.round(lowest.avg)].toLowerCase()}.`;
        return;
      }
    }
  }

  if (entries.length >= 6) {
    const recent = entries.slice(-5);
    const earlier = entries.slice(0, 5);
    const recentAvg = recent.reduce((s, e) => s + e.mood, 0) / recent.length;
    const earlierAvg = earlier.reduce((s, e) => s + e.mood, 0) / earlier.length;
    const diff = recentAvg - earlierAvg;
    if (Math.abs(diff) > 0.5) {
      if (diff > 0) {
        insightIcon.textContent = '🌸';
        insightText.innerHTML = `<strong>Things have been lifting.</strong> Your recent days average ${recentAvg.toFixed(1)}, up from ${earlierAvg.toFixed(1)} earlier.`;
      } else {
        insightIcon.textContent = '🌫️';
        insightText.innerHTML = `<strong>Things have felt heavier lately.</strong> Recent days average ${recentAvg.toFixed(1)}, down from ${earlierAvg.toFixed(1)} earlier.`;
      }
      return;
    }
  }

  insightIcon.textContent = avgEmoji;
  insightText.innerHTML = `<strong>Overall:</strong> ${entries.length} check-ins averaging <strong>${avgLabel.toLowerCase()}</strong> (${avg.toFixed(1)}/5). Keep noticing.`;
}

/* ============== GRAPH TABS ============== */
document.querySelectorAll('.graph-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.graph-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentRange = parseInt(tab.dataset.range);
    renderGraph();
  });
});

/* ============== SETTINGS PANEL ============== */
const settingsPanel = $('settingsPanel');
$('settingsBtn').addEventListener('click', () => settingsPanel.classList.add('open'));
$('settingsClose').addEventListener('click', () => settingsPanel.classList.remove('open'));
$('openSettingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  settingsPanel.classList.add('open');
});
settingsPanel.addEventListener('click', (e) => {
  if (e.target === settingsPanel) settingsPanel.classList.remove('open');
});

/* ============== THEME PILLS ============== */
document.querySelectorAll('.theme-pill').forEach(pill => {
  pill.addEventListener('click', () => applyTheme(pill.dataset.theme));
});

$('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'auto';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
});

/* ============== PIN MANAGEMENT ============== */
function updatePinStatus() {
  const status = $('pinStatus');
  const setBtn = $('setPinBtn');
  const removeBtn = $('removePinBtn');
  if (pinHash) {
    status.textContent = 'PIN is set';
    setBtn.style.display = 'none';
    removeBtn.style.display = 'inline-block';
  } else {
    status.textContent = 'No PIN set';
    setBtn.style.display = 'inline-block';
    removeBtn.style.display = 'none';
  }
}

$('setPinBtn').addEventListener('click', () => {
  const newPin = prompt('Enter a PIN (at least 4 digits):');
  if (newPin && newPin.length >= 4) {
    localStorage.setItem(PIN_KEY, hashPin(newPin));
    pinHash = localStorage.getItem(PIN_KEY);
    updatePinStatus();
    showToast('PIN set 🔒');
  } else if (newPin !== null) {
    showToast('PIN must be at least 4 digits');
  }
});

$('removePinBtn').addEventListener('click', () => {
  if (confirm('Remove PIN lock? Your data will remain but anyone with the device can view it.')) {
    localStorage.removeItem(PIN_KEY);
    pinHash = null;
    updatePinStatus();
    showToast('PIN removed');
  }
});

/* ============== EXPORT SLIDER ============== */
const exportSlider = $('exportDays');
const exportValue = $('exportDaysValue');
const exportAvailable = $('exportAvailable');
const exportLimit = $('exportLimit');
const exportBtn = $('exportPdfBtn');

function updateExportSlider() {
  const totalDays = getDaysOfHistory();
  const entries = getCheckins();
  const entryCount = Object.keys(entries).filter(k => entries[k]).length;

  exportSlider.max = Math.max(totalDays, 1);
  if (parseInt(exportSlider.value) > totalDays) {
    exportSlider.value = totalDays;
  }

  const days = parseInt(exportSlider.value);
  exportValue.textContent = days === 1 ? '1 day' : `${days} days`;
  exportAvailable.textContent = entryCount;
  exportLimit.innerHTML = `You've been using QuietMind for <strong>${totalDays}</strong> day${totalDays !== 1 ? 's' : ''}. Slider max is capped at your history.`;

  if (entryCount === 0) {
    exportBtn.disabled = true;
    exportBtn.textContent = 'No check-ins yet';
  } else {
    exportBtn.disabled = false;
    exportBtn.textContent = 'Download PDF';
  }
}

exportSlider.addEventListener('input', updateExportSlider);

/* ============== PDF EXPORT ============== */
exportBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const days = parseInt(exportSlider.value);
  const entries = getCheckins();
  const today = new Date();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Cover
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(28);
  doc.setTextColor(58, 53, 48);
  doc.text('QuietMind', margin, 100);

  doc.setFontSize(14);
  doc.setTextColor(107, 98, 88);
  doc.text(`Your last ${days} day${days !== 1 ? 's' : ''}`, margin, 125);

  doc.setFontSize(10);
  doc.setTextColor(168, 158, 145);
  const exportDate = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(`Exported ${exportDate}`, margin, 145);

  // Summary stats
  let y = 200;
  doc.setFontSize(13);
  doc.setTextColor(58, 53, 48);
  doc.text('Summary', margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(107, 98, 88);

  const rangeEntries = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (entries[key]) rangeEntries.push({ date: d, ...entries[key] });
  }

  if (rangeEntries.length > 0) {
    const avg = rangeEntries.reduce((s, e) => s + e.mood, 0) / rangeEntries.length;
    const avgLabel = MOOD_LABELS[Math.round(avg)];
    const lines = [
      `Total check-ins: ${rangeEntries.length} of ${days} days`,
      `Average mood: ${avgLabel} (${avg.toFixed(1)} of 5)`,
      `Highest: ${MOOD_LABELS[Math.max(...rangeEntries.map(e => e.mood))]}`,
      `Lowest: ${MOOD_LABELS[Math.min(...rangeEntries.map(e => e.mood))]}`,
    ];
    lines.forEach(line => {
      doc.text(line, margin, y);
      y += 16;
    });
  } else {
    doc.text('No check-ins in this range.', margin, y);
    y += 16;
  }

  // Entries
  y += 30;
  doc.setFontSize(13);
  doc.setTextColor(58, 53, 48);
  doc.text('Daily entries', margin, y);
  y += 24;

  if (rangeEntries.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(168, 158, 145);
    doc.setFont('helvetica', 'italic');
    doc.text('Nothing logged in this range — and that\'s okay.', margin, y);
  } else {
    doc.setFont('helvetica', 'normal');
    rangeEntries.sort((a, b) => b.date - a.date).forEach(entry => {
      if (y > pageHeight - 100) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(11);
      doc.setTextColor(58, 53, 48);
      doc.setFont('helvetica', 'bold');
      const dateLabel = entry.date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
      doc.text(dateLabel, margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 98, 88);
      const moodLine = `${MOOD_EMOJIS[entry.mood]} ${MOOD_LABELS[entry.mood]}`;
      doc.text(moodLine, margin, y);
      y += 16;

      if (entry.note) {
        doc.setTextColor(58, 53, 48);
        const wrapped = doc.splitTextToSize(`"${entry.note}"`, contentWidth - 10);
        wrapped.forEach(line => {
          if (y > pageHeight - 60) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 14;
        });
      }
      y += 12;

      // Divider
      doc.setDrawColor(220, 215, 205);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;
    });
  }

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(168, 158, 145);
    doc.text(`QuietMind · Page ${i} of ${pageCount}`, margin, pageHeight - 30);
    doc.text('Private · For your eyes only', pageWidth - margin - 150, pageHeight - 30);
  }

  const filename = `quietmind-${today.toISOString().split('T')[0]}-${days}days.pdf`;
  doc.save(filename);
  showToast(`PDF downloaded · ${rangeEntries.length} entries`);
});

/* ============== JSON EXPORT / IMPORT ============== */
$('exportJsonBtn').addEventListener('click', () => {
  const data = getCheckins();
  if (Object.keys(data).length === 0) {
    showToast('No data to export yet');
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quietmind-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported your data');
});

$('importJsonBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      const current = getCheckins();
      const merged = { ...current, ...imported };
      saveCheckins(merged);
      loadTodayIfExists();
      renderGraph();
      updateExportSlider();
      showToast(`Imported ${Object.keys(imported).length} entries`);
    } catch {
      showToast('Could not read file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('clearBtn').addEventListener('click', () => {
  const data = getCheckins();
  if (Object.keys(data).length === 0) {
    showToast('No data to clear');
    return;
  }
  if (confirm('Clear all check-ins? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FIRST_USE_KEY);
    loadTodayIfExists();
    renderGraph();
    updateExportSlider();
    showToast('All data cleared');
  }
});

/* ============== INIT ============== */
initTheme();
updatePinStatus();
initLock();
