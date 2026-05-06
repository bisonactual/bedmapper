import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

let currentStep = 'camera';
let cameraOpen = false;
let lastPayload = null;
let lastBoardPrint = null;
let generatedBoards = [];
let intrinsicsFrames = 0;
let calibrationFrameSummaries = [];
let boardNameDirty = false;
const MIN_INTRINSICS_FRAMES = 6;
const controlDebounceTimers = new Map();

// ── Stepper ──────────────────────────────────────────────────────────────────
function showStep(name) {
  currentStep = name;
  document.querySelectorAll('.step').forEach(el => el.classList.toggle('active', el.dataset.step === name));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + name));
}

// ── Camera ───────────────────────────────────────────────────────────────────
async function loadBackends() {
  try {
    const backends = await invoke('list_camera_backends');
    const sel = document.getElementById('backendSelect');
    sel.innerHTML = '';
    backends.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.name === 'opencv-msmf'
        ? 'Media Foundation (Windows Camera path)'
        : b.name === 'opencv-dshow'
          ? 'DirectShow (UVC controls)'
          : b.name === 'arducam-sdk'
            ? 'Arducam SDK'
            : b.name === 'opencv-sidecar' ? 'Native Vision Sidecar' : (b.name === 'opencv' ? 'OpenCV' : b.name);
      opt.title = b.description || '';
      opt.disabled = !b.available;
      sel.appendChild(opt);
    });
    if (!sel.value && backends.length) sel.value = backends[0].name;
    if (sel.value) await invoke('select_camera_backend', { backendName: sel.value });
  } catch (e) {
    console.error('Backend load failed:', e);
  }
}

async function refreshCameras() {
  try {
    const backendName = document.getElementById('backendSelect')?.value;
    if (backendName) await invoke('select_camera_backend', { backendName });

    const cameras = await invoke('enumerate_cameras');
    const sel = document.getElementById('cameraSelect');
    sel.innerHTML = '<option value="">— select —</option>';
    cameras.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.index;
      opt.textContent = c.name || `Camera_${c.index}`;
      opt.title = c.device_id || '';
      sel.appendChild(opt);
    });
  } catch (e) { console.error('Enumerate failed:', e); }
}

async function openCamera() {
  const idx = parseInt(document.getElementById('cameraSelect').value);
  if (isNaN(idx)) return;
  const res = document.getElementById('resolutionSelect').value.split('x');
  const width = parseInt(res[0]);
  const height = parseInt(res[1]);
  const fps = parseFloat(document.getElementById('fpsSelect').value);
  const selectedCamera = document.getElementById('cameraSelect').selectedOptions[0]?.textContent || `Camera_${idx}`;
  try {
    const result = await invoke('open_camera', {
      deviceIndex: idx, width, height, fourcc: document.getElementById('formatSelect').value, fps
    });
    cameraOpen = true;
    document.getElementById('openCamBtn').disabled = true;
    document.getElementById('refreshAfBtn').disabled = false;
    document.getElementById('closeCamBtn').disabled = false;
    document.getElementById('previewOff').style.display = 'none';
    document.getElementById('statusCamera').textContent = `Camera: ${selectedCamera} · ${result.actual_width}×${result.actual_height} · ${result.actual_fourcc || '----'} · ${Number(result.actual_fps || 0).toFixed(1)} fps`;
    loadControls();
  } catch (e) { alert('Camera error: ' + e); }
}

async function refreshAutofocus() {
  const button = document.getElementById('refreshAfBtn');
  const status = document.getElementById('statusCamera');
  button.disabled = true;
  const previousStatus = status.textContent;
  status.textContent = `${previousStatus} · autofocus refresh...`;
  try {
    await invoke('refresh_autofocus');
    await loadControls();
    status.textContent = `${previousStatus} · autofocus refreshed`;
  } catch (e) {
    status.textContent = previousStatus;
    alert('Autofocus refresh failed: ' + e);
  } finally {
    button.disabled = !cameraOpen;
  }
}

async function closeCamera() {
  try {
    await invoke('close_camera');
    cameraOpen = false;
    document.getElementById('openCamBtn').disabled = false;
    document.getElementById('refreshAfBtn').disabled = true;
    document.getElementById('closeCamBtn').disabled = true;
    document.getElementById('previewOff').style.display = '';
    document.getElementById('previewImg').src = '';
    document.getElementById('statusCamera').textContent = 'Camera: —';
  } catch (e) { console.error(e); }
}

async function loadControls() {
  try {
    const controls = await invoke('get_camera_controls');
    if (!controls) return;
    const panel = document.getElementById('controlsPanel');
    panel.innerHTML = '';
    if (!controls.length) {
      panel.innerHTML = '<div class="info-text">No camera controls reported by this backend.</div>';
      return;
    }
    controls.forEach(c => {
      const div = document.createElement('div');
      div.className = 'control-item' + (c.supported ? '' : ' unsupported');
      if (c.control_type === 'Boolean') {
        div.innerHTML = `<label>${c.name}</label><label><input type="checkbox" ${c.value ? 'checked' : ''} /> ${c.supported ? '' : '(unsupported)'}</label>`;
        div.querySelector('input').addEventListener('change', (e) => invoke('set_auto_control', { controlKey: c.key, enabled: e.target.checked }).catch(console.error));
      } else {
        div.innerHTML = `<label>${c.name} <span>${c.value}</span></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}" ${c.supported ? '' : 'disabled'} />`;
        const slider = div.querySelector('input[type="range"]');
        const span = div.querySelector('span');
        const sendControl = () => {
          invoke('set_camera_control', { controlKey: c.key, value: parseInt(slider.value) }).catch(console.error);
        };
        slider.addEventListener('input', () => {
          span.textContent = slider.value;
          clearTimeout(controlDebounceTimers.get(c.key));
          controlDebounceTimers.set(c.key, setTimeout(sendControl, 200));
        });
        slider.addEventListener('change', sendControl);
      }
      panel.appendChild(div);
    });
  } catch (e) { console.error(e); }
}

// ── Board Generation ─────────────────────────────────────────────────────────
function describeBoard(board) {
  return `${board.name} (${board.config.squares_x}x${board.config.squares_y}, ${board.config.square_length_mm}mm, ${board.config.dictionary_name})`;
}

function selectedPaperSizeMm() {
  const paper = document.getElementById('paperSize')?.value;
  if (paper === 'a4') return { width: 210, height: 297, label: 'A4' };
  if (paper === 'a3') return { width: 297, height: 420, label: 'A3' };
  const width = parseFloat(document.getElementById('paperW')?.value || '0');
  const height = parseFloat(document.getElementById('paperH')?.value || '0');
  return { width, height, label: `${width}x${height}mm` };
}

function suggestedBoardName() {
  const paper = selectedPaperSizeMm();
  const square = parseFloat(document.getElementById('squareSize')?.value || '0');
  const dict = document.getElementById('dictSelect')?.value || 'DICT_4X4_250';
  const fullPage = document.getElementById('fullPage')?.checked ?? false;
  const squareLabel = Number.isFinite(square) && square > 0 ? String(square).replace(/\.0+$/, '') : 'custom';
  return `${paper.label} ${squareLabel}mm ${dict}${fullPage ? ' full-page' : ''} ChArUco`;
}

function updateBoardName(force = false) {
  const input = document.getElementById('boardName');
  if (!input) return;
  if (force || !boardNameDirty || !input.value.trim()) {
    input.value = suggestedBoardName();
  }
}

async function loadGeneratedBoards(selectedId = '') {
  try {
    generatedBoards = await invoke('list_generated_charuco_boards');
    const selects = [
      document.getElementById('boardLibrarySelect'),
      document.getElementById('intrBoardSelect'),
    ].filter(Boolean);

    selects.forEach((select) => {
      const previous = selectedId || select.value;
      select.innerHTML = '';
      if (!generatedBoards.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Generate a board first';
        select.appendChild(opt);
        return;
      }
      generatedBoards.forEach((board) => {
        const opt = document.createElement('option');
        opt.value = board.id;
        opt.textContent = describeBoard(board);
        select.appendChild(opt);
      });
      select.value = generatedBoards.some((board) => board.id === previous)
        ? previous
        : generatedBoards[generatedBoards.length - 1].id;
    });
    syncSelectedBoardForPrint();
  } catch (e) {
    console.error('Board library load failed:', e);
  }
}

function selectedBoard() {
  const id = document.getElementById('boardLibrarySelect')?.value;
  return generatedBoards.find((board) => board.id === id) || null;
}

function syncSelectedBoardForPrint() {
  const board = selectedBoard();
  document.getElementById('printBoardBtn').disabled = !board || !board.verification_passed;
  lastBoardPrint = board ? {
    id: board.id,
    path: board.path,
    paperWidthMm: board.paper_width_mm,
    paperHeightMm: board.paper_height_mm,
    boardWidthMm: board.board_width_mm,
    boardHeightMm: board.board_height_mm,
  } : null;
}

async function generateBoard() {
  updateBoardName();
  const { width: pw, height: ph } = selectedPaperSizeMm();

  const sq = parseFloat(document.getElementById('squareSize').value);
  const dict = document.getElementById('dictSelect').value;
  const fullPage = document.getElementById('fullPage')?.checked ?? false;

  let sx, sy;
  if (fullPage) {
    // Use max squares that fit with 5mm margin each side
    const usableW = pw - 10;
    const usableH = ph - 10;
    sx = Math.floor(usableW / sq);
    sy = Math.floor(usableH / sq);
  } else {
    sx = Math.floor(pw / sq);
    sy = Math.floor(ph / sq);
  }

  if (sx < 2 || sy < 2) { alert('Paper too small for this square size'); return; }

  const marker = sq * 0.7;
  try {
    const result = await invoke('generate_charuco_board', {
      name: document.getElementById('boardName').value,
      config: { squares_x: sx, squares_y: sy, square_length_mm: sq, marker_length_mm: marker, dictionary_name: dict, legacy_pattern: false },
      paperWidthMm: pw, paperHeightMm: ph, pixelsPerMm: 8.0
    });
    const expectedCorners = (sx - 1) * (sy - 1);
    await loadGeneratedBoards(result.board?.id);
    const svgText = result.svg_path ? ` SVG saved to ${result.svg_path}` : '';
    document.getElementById('boardInfo').textContent = `Generated ${sx}×${sy} squares (${result.width_px}×${result.height_px}px). OpenCV verification: ${result.verification_corner_count}/${expectedCorners} corners ${result.verification_passed ? '✓' : '✗'}. Saved to ${result.path}.${svgText}`;
  } catch (e) { alert('Board generation failed: ' + e); }
}

async function printGeneratedBoard() {
  if (!lastBoardPrint) return;
  let imageSrc;
  try {
    imageSrc = await invoke('get_generated_charuco_board_image', { boardId: lastBoardPrint.id });
  } catch (e) {
    document.getElementById('boardInfo').textContent = 'Print image load failed: ' + e;
    return;
  }

  const frame = document.createElement('iframe');
  frame.className = 'print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.addEventListener('load', () => {
    setTimeout(() => {
      frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 3000);
    }, 150);
  });
  frame.srcdoc = `<!doctype html>
    <html>
      <head>
        <title>Bedmapper ChArUco Board</title>
        <style>
          @page { size: ${lastBoardPrint.paperWidthMm}mm ${lastBoardPrint.paperHeightMm}mm; margin: 0; }
          html, body {
            width: ${lastBoardPrint.paperWidthMm}mm;
            height: ${lastBoardPrint.paperHeightMm}mm;
            margin: 0;
            background: white;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            display: block;
            width: ${lastBoardPrint.boardWidthMm}mm;
            height: ${lastBoardPrint.boardHeightMm}mm;
            image-rendering: crisp-edges;
          }
        </style>
      </head>
      <body><img src="${imageSrc}" /></body>
    </html>`;
  document.body.appendChild(frame);
}

// ── Scanning ─────────────────────────────────────────────────────────────────
async function scanOnce() {
  try {
    const result = await invoke('scan_once', { publish: true });
    lastPayload = result.payload;
    document.getElementById('scanStatus').textContent = `${result.payload.objects.length} objects in ${result.processing_ms}ms`;
    if (result.debug_image_base64) document.getElementById('scanPreview').src = 'data:image/jpeg;base64,' + result.debug_image_base64;
  } catch (e) { alert('Scan failed: ' + e); }
}

// ── Tramming Target Generator ─────────────────────────────────────────────────
const CALIBRATION_SHEET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <defs>
    <style>
      .fine { stroke: #cfcfcf; stroke-width: 0.18; }
      .major { stroke: #8a8a8a; stroke-width: 0.32; }
      .axis { stroke: #111; stroke-width: 0.55; }
      .diag { stroke: #111; stroke-width: 0.35; stroke-dasharray: 2 1.5; }
      .border { fill: none; stroke: #111; stroke-width: 0.55; }
      .text { font-family: Arial, Helvetica, sans-serif; fill: #111; }
      .small { font-size: 3.2px; }
      .body { font-size: 3.7px; }
      .title { font-size: 6px; font-weight: 700; }
      .label { font-size: 3px; fill: #333; }
    </style>
  </defs>

  <rect x="0" y="0" width="210" height="297" fill="white"/>
  <text x="5" y="8" class="text title">Camera perpendicular tramming sheet</text>
  <text x="5" y="14" class="text body">Print at 100% scale. Do not use fit-to-page. Check the 100 mm reference before use.</text>

  <g id="grid" transform="translate(5 20)">
    <rect x="0" y="0" width="200" height="200" class="border"/>
    <g class="fine">
      ${Array.from({ length: 19 }, (_, i) => {
        const p = (i + 1) * 10;
        if (p % 50 === 0 || p === 100) return '';
        return `<line x1="${p}" y1="0" x2="${p}" y2="200"/><line x1="0" y1="${p}" x2="200" y2="${p}"/>`;
      }).join('')}
    </g>
    <g class="major">
      <line x1="50" y1="0" x2="50" y2="200"/>
      <line x1="150" y1="0" x2="150" y2="200"/>
      <line x1="0" y1="50" x2="200" y2="50"/>
      <line x1="0" y1="150" x2="200" y2="150"/>
    </g>
    <line x1="100" y1="0" x2="100" y2="200" class="axis"/>
    <line x1="0" y1="100" x2="200" y2="100" class="axis"/>
    <line x1="0" y1="0" x2="200" y2="200" class="diag"/>
    <line x1="200" y1="0" x2="0" y2="200" class="diag"/>
    <rect x="75" y="75" width="50" height="50" class="major" fill="none"/>
    <rect x="50" y="50" width="100" height="100" class="major" fill="none"/>
    <rect x="25" y="25" width="150" height="150" class="major" fill="none"/>
    <circle cx="100" cy="100" r="12.5" fill="none" class="axis"/>
    <circle cx="100" cy="100" r="5" fill="none" class="axis"/>
    <line x1="92" y1="100" x2="108" y2="100" class="axis"/>
    <line x1="100" y1="92" x2="100" y2="108" class="axis"/>
    <line x1="10" y1="192" x2="110" y2="192" class="axis"/>
    <line x1="10" y1="188" x2="10" y2="196" class="axis"/>
    <line x1="110" y1="188" x2="110" y2="196" class="axis"/>
    <text x="43" y="187" class="text label">100 mm check</text>
    <text x="3" y="-2" class="text label">200 x 200 mm camera tram grid</text>
    <text x="95" y="98" class="text label">CENTER</text>
  </g>

  <g transform="translate(5 230)">
    <text x="0" y="0" class="text title">Quick tramming procedure</text>
    <text x="0" y="8" class="text body">1. Tape this sheet flat to the copy stand base or a flat board.</text>
    <text x="0" y="15" class="text body">2. Set the camera height around 800-900 mm if that frames the whole grid cleanly.</text>
    <text x="0" y="22" class="text body">3. Center the camera so the crosshair sits near the image center.</text>
    <text x="0" y="29" class="text body">4. Adjust tilt until opposite grid edges look equally long and the diagonals cross at center.</text>
    <text x="0" y="36" class="text body">5. Rotate the camera until the 100 mm centerlines are horizontal/vertical in the preview.</text>
    <text x="0" y="43" class="text body">6. Lock the mount, then refocus and avoid changing zoom, focus, or resolution afterwards.</text>
    <text x="0" y="50" class="text body">7. This gets the camera mechanically close; software calibration still handles the final perspective.</text>
    <text x="0" y="61" class="text small">Tip: Perpendicular is good, but repeatable is more important. If the camera moves, recalibrate.</text>
  </g>
</svg>`;

function printCalibrationSheet() {
  const frame = document.createElement('iframe');
  frame.className = 'print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.addEventListener('load', () => {
    setTimeout(() => {
      frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 3000);
    }, 100);
  });
  frame.srcdoc = `<!doctype html>
    <html>
      <head>
        <title>Bedmapper Calibration Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 210mm; height: 297mm; margin: 0; background: white; }
          svg { display: block; width: 210mm; height: 297mm; }
        </style>
      </head>
      <body>${CALIBRATION_SHEET_SVG}</body>
    </html>`;
  document.body.appendChild(frame);
}

// ── Intrinsics Calibration ───────────────────────────────────────────────────
function updateIntrinsicsFrameCount(count = intrinsicsFrames) {
  intrinsicsFrames = count;
  document.getElementById('intrFrameCount').textContent =
    `${intrinsicsFrames} frame${intrinsicsFrames === 1 ? '' : 's'} captured. Need ${MIN_INTRINSICS_FRAMES} minimum; 10-12 recommended.`;
  document.getElementById('computeIntrBtn').disabled = intrinsicsFrames < MIN_INTRINSICS_FRAMES;
}

function formatNumber(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function formatError(summary) {
  const px = summary.reprojection_error_px;
  const mm = summary.approx_error_mm;
  if (typeof mm === 'number') return `${formatNumber(mm, 2)} mm (${formatNumber(px, 2)} px)`;
  if (typeof px === 'number') return `${formatNumber(px, 2)} px`;
  return 'Not computed';
}

function renderCalibrationFrames(summaries = calibrationFrameSummaries) {
  calibrationFrameSummaries = summaries || [];
  const body = document.getElementById('intrFramesBody');
  if (!body) return;

  if (!calibrationFrameSummaries.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-cell">No calibration frames captured yet.</td></tr>';
    return;
  }

  body.innerHTML = calibrationFrameSummaries.map((frame) => {
    const flags = frame.flags?.length ? frame.flags.join(', ') : '—';
    const coverage = frame.expected_corner_count
      ? `${frame.corner_count}/${frame.expected_corner_count}`
      : `${frame.corner_count}`;
    return `<tr>
      <td>${frame.frame_index}</td>
      <td>${frame.board_name}</td>
      <td>${coverage}</td>
      <td>${formatError(frame)}</td>
      <td><span class="quality-badge ${frame.quality_level}">${frame.quality_label}</span></td>
      <td>${flags}</td>
      <td class="table-actions">
        <button class="btn-sm" data-action="view-frame" data-frame="${frame.frame_index}">View</button>
        <button class="btn-sm danger" data-action="delete-frame" data-frame="${frame.frame_index}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function updateCalibrationSummary(result = null) {
  const meanEl = document.getElementById('intrMeanError');
  const maxEl = document.getElementById('intrMaxError');
  const scaleEl = document.getElementById('intrScale');
  if (!meanEl || !maxEl || !scaleEl) return;

  if (!result) {
    meanEl.textContent = '—';
    maxEl.textContent = '—';
    scaleEl.textContent = 'Define bed area';
    return;
  }

  meanEl.textContent = result.approx_mean_error_mm != null
    ? `${formatNumber(result.approx_mean_error_mm, 2)} mm`
    : `${formatNumber(result.mean_frame_error_px, 2)} px`;
  maxEl.textContent = result.approx_max_error_mm != null
    ? `${formatNumber(result.approx_max_error_mm, 2)} mm`
    : `${formatNumber(result.max_frame_error_px, 2)} px`;
  scaleEl.textContent = result.px_per_mm
    ? `${formatNumber(result.px_per_mm, 2)} px/mm`
    : 'Define bed area';
}

async function loadIntrinsicsFrames() {
  try {
    const summaries = await invoke('list_intrinsics_calibration_frames');
    updateIntrinsicsFrameCount(summaries.length);
    renderCalibrationFrames(summaries);
  } catch (e) {
    console.error('Frame list failed:', e);
  }
}

async function captureIntrinsicsFrame() {
  const resultEl = document.getElementById('intrResult');
  const button = document.getElementById('captureIntrBtn');
  const boardId = document.getElementById('intrBoardSelect').value;
  if (!boardId) {
    resultEl.textContent = 'Generate and select the board visible in this capture first.';
    return;
  }
  button.disabled = true;
  resultEl.textContent = 'Capturing calibration frame... hold the board steady.';

  try {
    const result = await invoke('capture_intrinsics_frame', { boardId });
    updateIntrinsicsFrameCount(result.total_frames);
    await loadIntrinsicsFrames();
    if (result.accepted) {
      resultEl.textContent = `Accepted frame ${result.total_frames} using ${result.board_name}: detected ${result.corner_count}/${result.expected_corner_count} ChArUco corners.`;
    } else {
      resultEl.textContent = result.rejection_reason || `Rejected frame: detected ${result.corner_count} ChArUco corners.`;
    }
  } catch (e) {
    resultEl.textContent = 'Capture failed: ' + e;
  } finally {
    button.disabled = false;
  }
}

async function computeIntrinsics() {
  const resultEl = document.getElementById('intrResult');
  const button = document.getElementById('computeIntrBtn');
  button.disabled = true;
  resultEl.textContent = 'Computing camera intrinsics...';

  try {
    const result = await invoke('compute_intrinsics_calibration');
    updateCalibrationSummary(result);
    renderCalibrationFrames(result.frame_summaries);
    const mmText = result.approx_mean_error_mm != null
      ? ` Approx mean error: ${formatNumber(result.approx_mean_error_mm, 2)} mm; max frame: ${formatNumber(result.approx_max_error_mm, 2)} mm.`
      : ' Define the bed area to convert pixel error into approximate mm error.';
    resultEl.textContent = `Intrinsics saved. Used ${result.frames_used} frames. OpenCV RMS: ${result.reprojection_error.toFixed(4)} px. Mean frame fit: ${formatNumber(result.mean_frame_error_px, 2)} px; max: ${formatNumber(result.max_frame_error_px, 2)} px.${mmText}`;
  } catch (e) {
    resultEl.textContent = 'Compute failed: ' + e;
  } finally {
    button.disabled = intrinsicsFrames < MIN_INTRINSICS_FRAMES;
  }
}

async function clearIntrinsicsFrames() {
  await invoke('clear_intrinsics_calibration_frames').catch(console.error);
  updateIntrinsicsFrameCount(0);
  renderCalibrationFrames([]);
  updateCalibrationSummary(null);
  document.getElementById('intrResult').textContent = 'Calibration frames cleared.';
}

async function viewIntrinsicsFrame(frameIndex) {
  try {
    const src = await invoke('view_intrinsics_calibration_frame', { frameIndex });
    document.getElementById('frameModalTitle').textContent = `Calibration Frame ${frameIndex}`;
    document.getElementById('frameModalImg').src = src;
    document.getElementById('frameModal').hidden = false;
  } catch (e) {
    document.getElementById('intrResult').textContent = 'Could not load frame: ' + e;
  }
}

async function deleteIntrinsicsFrame(frameIndex) {
  try {
    const summaries = await invoke('delete_intrinsics_calibration_frame', { frameIndex });
    updateIntrinsicsFrameCount(summaries.length);
    renderCalibrationFrames(summaries);
    updateCalibrationSummary(null);
    document.getElementById('intrResult').textContent = `Deleted frame ${frameIndex}. Recompute intrinsics to refresh quality estimates.`;
  } catch (e) {
    document.getElementById('intrResult').textContent = 'Delete failed: ' + e;
  }
}

function closeFrameModal() {
  document.getElementById('frameModal').hidden = true;
  document.getElementById('frameModalImg').src = '';
}

// ── Tramming Overlay ─────────────────────────────────────────────────────────
function drawTramOverlay() {
  const canvas = document.getElementById('tramCanvas');
  const wrap = document.getElementById('tramPreviewWrap');
  if (!canvas || !wrap) return;

  const w = wrap.offsetWidth;
  const h = wrap.offsetHeight;
  if (w < 10 || h < 10) return;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const showGrid = document.getElementById('showGrid')?.checked ?? true;
  const showCross = document.getElementById('showCrosshair')?.checked ?? true;
  const divisions = parseInt(document.getElementById('gridDivisions')?.value || '20');
  const gridSize = Math.min(w, h) * 0.82;
  const x0 = (w - gridSize) / 2;
  const y0 = (h - gridSize) / 2;
  const x1 = x0 + gridSize;
  const y1 = y0 + gridSize;
  const cx = w / 2;
  const cy = h / 2;

  const line = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };

  const rectCentered = (sizeRatio) => {
    const size = gridSize * sizeRatio;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  };

  // Grid
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, gridSize, gridSize);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.42)';
    ctx.lineWidth = 1;
    for (let i = 1; i < divisions; i++) {
      const p = i / divisions;
      const isMajor = i % Math.max(1, Math.round(divisions / 4)) === 0;
      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 212, 255, 0.42)';
      ctx.lineWidth = isMajor ? 2 : 1;
      const x = x0 + gridSize * p;
      const y = y0 + gridSize * p;
      line(x, y0, x, y1);
      line(x0, y, x1, y);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    line(x0, y0, x1, y1);
    line(x1, y0, x0, y1);
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)';
    ctx.lineWidth = 2;
    rectCentered(0.25);
    rectCentered(0.5);
    rectCentered(0.75);
  }

  // Crosshair
  if (showCross) {
    const outer = gridSize * 0.0625;
    const inner = gridSize * 0.025;
    const arm = gridSize * 0.14;
    const gap = gridSize * 0.025;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 7;
    line(cx - arm, cy, cx - gap, cy);
    line(cx + gap, cy, cx + arm, cy);
    line(cx, cy - arm, cx, cy - gap);
    line(cx, cy + gap, cx, cy + arm);
    ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 48, 48, 0.98)';
    ctx.lineWidth = 3;
    line(cx - arm, cy, cx - gap, cy);
    line(cx + gap, cy, cx + arm, cy);
    line(cx, cy - arm, cx, cy - gap);
    line(cx, cy + gap, cx, cy + arm);
    ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 48, 48, 1)';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  getCurrentWindow().onCloseRequested((event) => {
    const shouldQuit = window.confirm('Quit Bedmapper? Any unsaved workflow progress may be lost.');
    if (!shouldQuit) event.preventDefault();
  });

  // Stepper
  document.querySelectorAll('.step').forEach(el => el.addEventListener('click', () => showStep(el.dataset.step)));

  // Camera
  document.getElementById('backendSelect').addEventListener('change', async (e) => {
    await invoke('select_camera_backend', { backendName: e.target.value }).catch(console.error);
    refreshCameras();
  });
  document.getElementById('refreshCamBtn').addEventListener('click', refreshCameras);
  document.getElementById('openCamBtn').addEventListener('click', openCamera);
  document.getElementById('refreshAfBtn').addEventListener('click', refreshAutofocus);
  document.getElementById('closeCamBtn').addEventListener('click', closeCamera);

  // Board
  document.getElementById('paperSize').addEventListener('change', (e) => {
    document.getElementById('customPaperFields').style.display = e.target.value === 'custom' ? '' : 'none';
    updateBoardName();
  });
  document.getElementById('boardName').addEventListener('input', () => {
    boardNameDirty = true;
  });
  ['paperW', 'paperH', 'squareSize', 'dictSelect', 'fullPage'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updateBoardName());
    if (el) el.addEventListener('change', () => updateBoardName());
  });
  updateBoardName(true);
  document.getElementById('genBoardBtn').addEventListener('click', generateBoard);
  document.getElementById('printBoardBtn').addEventListener('click', printGeneratedBoard);
  document.getElementById('boardLibrarySelect').addEventListener('change', syncSelectedBoardForPrint);

  // Scan
  document.getElementById('scanOnceBtn').addEventListener('click', scanOnce);

  // Intrinsics
  updateIntrinsicsFrameCount(0);
  document.getElementById('captureIntrBtn').addEventListener('click', captureIntrinsicsFrame);
  document.getElementById('computeIntrBtn').addEventListener('click', computeIntrinsics);
  document.getElementById('clearIntrBtn').addEventListener('click', clearIntrinsicsFrames);
  document.getElementById('intrFramesBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const frameIndex = parseInt(button.dataset.frame, 10);
    if (button.dataset.action === 'view-frame') viewIntrinsicsFrame(frameIndex);
    if (button.dataset.action === 'delete-frame') deleteIntrinsicsFrame(frameIndex);
  });
  document.getElementById('frameModalClose').addEventListener('click', closeFrameModal);
  document.getElementById('frameModalCloseBtn').addEventListener('click', closeFrameModal);

  // Tramming
  document.getElementById('printTramTarget').addEventListener('click', printCalibrationSheet);

  // Camera frame listener
  listen('camera:frame', (event) => {
    const src = 'data:image/jpeg;base64,' + event.payload;
    document.getElementById('previewImg').src = src;
    if (currentStep === 'tramming') {
      document.getElementById('tramPreview').src = src;
      drawTramOverlay();
    }
    if (currentStep === 'intrinsics') document.getElementById('intrPreview').src = src;
    if (currentStep === 'bed') document.getElementById('bedPreview').src = src;
    if (currentStep === 'test') document.getElementById('testPreview').src = src;
    if (currentStep === 'scan') document.getElementById('scanPreview').src = src;
  });

  listen('camera:error', (event) => {
    alert('Camera error: ' + event.payload);
    closeCamera();
  });

  loadBackends().then(refreshCameras);
  loadGeneratedBoards();
  loadIntrinsicsFrames();
});
