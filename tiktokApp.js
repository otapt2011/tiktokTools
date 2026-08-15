window.addEventListener('error', function(e) {
  console.error('Global error:', e.message);
  // Prevent the browser from showing its own error page (which can cause a reload)
  e.preventDefault();
});

// tiktokApp.js - Unified TikTok Tools (Compare + FollowBack)
window.TikTokApp = window.TikTokApp || {};
window.TikTokApp.Compare = window.TikTokApp.Compare || {};
window.TikTokApp.FollowBack = window.TikTokApp.FollowBack || {};
window.TikTokApp.Shared = window.TikTokApp.Shared || {};
window.TikTokApp.Compare.Config = window.TikTokApp.Compare.Config || {};
window.TikTokApp.Compare.Helpers = window.TikTokApp.Compare.Helpers || {};
window.TikTokApp.Compare.DOM = window.TikTokApp.Compare.DOM || {};
window.TikTokApp.Compare.State = window.TikTokApp.Compare.State || {};
window.TikTokApp.Compare.Services = window.TikTokApp.Compare.Services || {};
window.TikTokApp.Compare.Services.Extractor = window.TikTokApp.Compare.Services.Extractor || {};
window.TikTokApp.Compare.Services.Comparator = window.TikTokApp.Compare.Services.Comparator || {};
window.TikTokApp.Shared.Fetcher = window.TikTokApp.Shared.Fetcher || {};
window.TikTokApp.Shared.APIModal = window.TikTokApp.Shared.APIModal || {};
window.TikTokApp.Compare.UI = window.TikTokApp.Compare.UI || {};
window.TikTokApp.Compare.UI.Core = window.TikTokApp.Compare.UI.Core || {};
window.TikTokApp.Compare.UI.Stats = window.TikTokApp.Compare.UI.Stats || {};
window.TikTokApp.Compare.UI.Files = window.TikTokApp.Compare.UI.Files || {};
window.TikTokApp.Compare.UI.Results = window.TikTokApp.Compare.UI.Results || {};
window.TikTokApp.Compare.UI.Table = window.TikTokApp.Compare.UI.Table || {};
window.TikTokApp.Compare.Download = window.TikTokApp.Compare.Download || {};
window.TikTokApp.FollowBack.Config = window.TikTokApp.FollowBack.Config || {};
window.TikTokApp.FollowBack.Helpers = window.TikTokApp.FollowBack.Helpers || {};
window.TikTokApp.FollowBack.DOM = window.TikTokApp.FollowBack.DOM || {};
window.TikTokApp.FollowBack.State = window.TikTokApp.FollowBack.State || {};
window.TikTokApp.FollowBack.Services = window.TikTokApp.FollowBack.Services || {};
window.TikTokApp.FollowBack.Services.Extraction = window.TikTokApp.FollowBack.Services.Extraction || {};
window.TikTokApp.FollowBack.UI = window.TikTokApp.FollowBack.UI || {};
window.TikTokApp.FollowBack.UI.Core = window.TikTokApp.FollowBack.UI.Core || {};
window.TikTokApp.FollowBack.UI.Extract = window.TikTokApp.FollowBack.UI.Extract || {};
window.TikTokApp.FollowBack.UI.Fetch = window.TikTokApp.FollowBack.UI.Fetch || {};
window.TikTokApp.FollowBack.UI.Settings = window.TikTokApp.FollowBack.UI.Settings || {};
window.TikTokApp.FollowBack.Render = window.TikTokApp.FollowBack.Render || {};
window.TikTokApp.FollowBack.UI.Analytics = window.TikTokApp.FollowBack.UI.Analytics || {};
window.TikTokApp.FollowBack.UI.Buttons = window.TikTokApp.FollowBack.UI.Buttons || {};
window.TikTokApp.Main = window.TikTokApp.Main || {};
window.TikTokApp.FollowBack.Download = window.TikTokApp.FollowBack.Download || {};


// ==================== COMPARE MODULES ====================

// Compare Config
(function(configModule) {
  const DEFAULT_CONFIG = {
    MAX_FILE_SIZE: 500 * 1024 * 1024,
    COMPARISON_CHUNK_SIZE: 1000,
    WORKER_THRESHOLD: 1,
    DATE_LOCALE: 'en-US',
    DATE_FORMAT_OPTIONS: { year: 'numeric', month: 'short', day: 'numeric' },
    TABLE_DATE_FORMAT_OPTIONS: { year: 'numeric', month: 'short' },
    NUMBER_FORMAT_THRESHOLDS: { million: 1e6, thousand: 1e3 },
    SESSION_MAX_ITEMS: 100,
    API_BASE_URL: 'https://tik-proxy.vercel.app',
    API_USER_PATH: '/api/followback',
    API_KEY_STORAGE_KEY: 'myKey',
    API_KEY_HEADER_NAME: 'X-API-Key',
    AUTH_HEADER_NAME: 'Authorization',
    FETCH_CONCURRENCY: 15,
    USE_BATCH_ENDPOINT_THRESHOLD: 100,
    ENCRYPTED_KEY_HEX: '1c766d4af8a1f6d5b83ac9d2c126974d1167311277943869dd6280e1e89b305a9ceffe21b9da80b210d125387306709d27ecf0cbd671ed77b42514498a0bdd80eab60b25bafe7a2a314ae73b'
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  const stored = localStorage.getItem('TikTokApp_Compare_Config');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      if (typeof currentConfig.DATE_FORMAT_OPTIONS === 'string') {
        try { currentConfig.DATE_FORMAT_OPTIONS = JSON.parse(currentConfig.DATE_FORMAT_OPTIONS); } catch (e) {}
      }
    } catch (e) { console.warn('Failed to load compare config', e); }
  }

  function persist() {
    localStorage.setItem('TikTokApp_Compare_Config', JSON.stringify(currentConfig));
  }

  configModule.get = (key) => currentConfig[key];
  configModule.getAll = () => ({ ...currentConfig });
  configModule.set = (key, value) => { currentConfig[key] = value; persist(); };
  configModule.update = (newConfig) => { currentConfig = { ...currentConfig, ...newConfig }; persist(); };
  configModule.reset = () => { currentConfig = { ...DEFAULT_CONFIG }; persist(); };
  configModule.DEFAULT = DEFAULT_CONFIG;
})(window.TikTokApp.Compare.Config);

// Compare Helpers
(function(helpers) {
  const Config = window.TikTokApp.Compare.Config;

  helpers.formatNumber = function(num) {
    if (num === undefined || num === null) return '—';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    const { million, thousand } = Config.get('NUMBER_FORMAT_THRESHOLDS');
    if (n >= million) return (n / million).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= thousand) return (n / thousand).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  };

  helpers.formatDate = function(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const locale = Config.get('DATE_LOCALE');
    const options = Config.get('DATE_FORMAT_OPTIONS');
    return d.toLocaleDateString(locale, options);
  };

  helpers.formatDateShort = function(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const locale = Config.get('DATE_LOCALE');
    const options = Config.get('TABLE_DATE_FORMAT_OPTIONS');
    return d.toLocaleDateString(locale, options);
  };

  helpers.truncate = function(str, max = 50) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  };

  helpers.escapeHtml = function(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  helpers.readFileWithProgress = async function(file, onProgress) {
    const total = file.size;
    const chunks = [];
    let loaded = 0;
    const stream = file.stream();
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      if (onProgress) onProgress({ phase: 'reading', loaded, total, name: file.name, percent: Math.round((loaded / total) * 100) });
    }
    const full = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { full.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(full));
  };

  helpers.extractArray = function(data, path) {
    let current = data;
    for (const key of path) {
      if (current == null || typeof current !== 'object') return [];
      current = current[key];
    }
    return Array.isArray(current) ? current : [];
  };

  helpers.cleanAndDedupe = function(arr) {
    const cleaned = arr.filter(item => {
      if (item == null || typeof item !== 'object') return false;
      const userName = item.UserName;
      return !(userName === null || userName === undefined || userName === '' || userName === 'N/A');
    });
    const seen = new Map();
    const deduped = [];
    for (const item of cleaned) {
      if (!item || !item.UserName) continue;
      const key = item.UserName.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, true);
      deduped.push(item);
    }
    return deduped;
  };

  helpers.buildStats = function(arr, rawLength, label) {
    return {
      label,
      rawLength,
      cleanedLength: arr.length,
      removed: rawLength - arr.length,
      firstObjectKeys: arr.length > 0 && typeof arr[0] === 'object' ? Object.keys(arr[0]) : null,
      sample: arr.slice(0, 2)
    };
  };
})(window.TikTokApp.Compare.Helpers);

// Compare DOM
(function(domModule) {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  domModule.tabBtns = $$('.tab-btn');
  domModule.panes = {
    files: $('#tab-files'),
    results: $('#tab-results'),
    stats: $('#tab-stats'),
    table: $('#tab-table')
  };
  domModule.fileOld = $('#file-old');
  domModule.fileNew = $('#file-new');
  domModule.dropOld = $('#drop-old');
  domModule.dropNew = $('#drop-new');
  domModule.oldFileName = $('#old-file-name');
  domModule.newFileName = $('#new-file-name');
  domModule.oldFileStatus = $('#old-file-status');
  domModule.newFileStatus = $('#new-file-status');
  domModule.extractOldBtn = $('#extract-old-btn');
  domModule.extractNewBtn = $('#extract-new-btn');
  domModule.extractBothBtn = $('#extract-both-btn');
  domModule.compareBtn = $('#compare-btn');
  domModule.viewOldBtn = $('#view-old-btn');
  domModule.viewNewBtn = $('#view-new-btn');
  domModule.clearAllBtn = $('#clear-all-btn');
  domModule.copyExtractBtn = $('#copy-extract-btn');
  domModule.copyStatsBtn = $('#copy-stats-btn');
  domModule.progressBar = $('#extract-progress-bar');
  domModule.progressBarOld = $('#extract-old-progress-bar');
  domModule.progressBarNew = $('#extract-new-progress-bar');
  domModule.progressText = $('#extract-progress-text');
  domModule.extractSummary = $('#extract-summary');
  domModule.extOldCount = $('#ext-old-count');
  domModule.extNewCount = $('#ext-new-count');
  domModule.extRemovedOld = $('#ext-removed-old');
  domModule.extRemovedNew = $('#ext-removed-new');
  domModule.rUnfollowed = $('#r-unfollowed');
  domModule.rNew = $('#r-new');
  domModule.rReturning = $('#r-returning');
  domModule.rExisting = $('#r-existing');
  domModule.rRetention = $('#r-retention');
  domModule.rUnfollowedBadge = $('#r-unfollowed-badge');
  domModule.rNewBadge = $('#r-new-badge');
  domModule.rReturningBadge = $('#r-returning-badge');
  domModule.rExistingBadge = $('#r-existing-badge');
  domModule.unfollowedList = $('#unfollowed-list');
  domModule.newList = $('#new-list');
  domModule.returningList = $('#returning-list');
  domModule.existingList = $('#existing-list');
  domModule.resultEmptyMsg = $('#result-empty-msg');
  domModule.resultSingleMsg = $('#result-single-msg');
  domModule.resultSections = $('#result-sections');
  domModule.stOldRaw = $('#st-old-raw');
  domModule.stOldClean = $('#st-old-clean');
  domModule.stOldRemoved = $('#st-old-removed');
  domModule.stNewRaw = $('#st-new-raw');
  domModule.stNewClean = $('#st-new-clean');
  domModule.stNewRemoved = $('#st-new-removed');
  domModule.stNewAbsent = $('#st-new-absent');
  domModule.stRemovedTotal = $('#st-removed-total');
  domModule.statsSample = $('#stats-sample');
  domModule.footerMemory = $('#footer-memory');
  domModule.footerStatus = $('#footer-status');
  domModule.footerTime = $('#footer-time');
  domModule.dialogOverlay = $('#dialog-overlay');
  domModule.dialogContent = $('#dialog-content');
  domModule.dialogCloseBtn = $('#dialog-close-btn');
  domModule.toastContainer = $('#toast-container');
  domModule.statusText = $('#status-text');
  domModule.statusDot = $('#status-dot');
  domModule.themeToggle = $('#theme-toggle');
  domModule.quickStartMsg = $('#quick-start-msg');
  domModule.downloadSampleBtn = $('#download-sample-btn');
  domModule.filterInputs = $$('.filter-input');
  domModule.tabTable = $('#tab-table');
  domModule.tableBody = $('#table-body');
  domModule.tableCount = $('#table-count');
  domModule.tableEmptyMsg = $('#table-empty-msg');
  domModule.tableLoading = $('#table-loading');
  domModule.fetchProfilesBtn = $('#fetch-profiles-btn');
  domModule.hideFailedBtn = $('#hide-failed-btn');
  domModule.tableListLabel = $('#table-list-label');
  domModule.listTypeBtns = $$('.list-type-btn');

  domModule.toast = function(msg, type = 'info', dur) {
    const isDark = document.documentElement.classList.contains('dark');
    if (dur === undefined) {
      if (type === 'error') dur = 8000;
      else if (type === 'warning') dur = 6000;
      else dur = 2800;
    }
    const icons = {
      success: 'fa-regular fa-circle-check',
      error: 'fa-regular fa-circle-xmark',
      warning: 'fa-regular fa-triangle-exclamation',
      info: 'fa-regular fa-circle-info'
    };
    const el = document.createElement('div');
    el.className = [
      'toast', 'rounded-xl', 'px-3 py-1.5', 'text-xs', 'shadow-2xl',
      'flex items-center gap-2', 'pointer-events-auto', 'max-w-full w-full sm:max-w-sm',
      'cursor-pointer', 'bg-white/90 border border-gray-200 text-gray-800',
      'dark:bg-white/10 dark:border-white/10 dark:text-white/90',
      type === 'success' ? 'border-l-2 border-l-green-500 dark:border-l-green-400' :
      type === 'error' ? 'border-l-2 border-l-red-500 dark:border-l-red-400' :
      type === 'warning' ? 'border-l-2 border-l-yellow-500 dark:border-l-yellow-400' :
      'border-l-2 border-l-blue-500 dark:border-l-blue-400'
    ].join(' ');
    el.innerHTML = `<i class="${icons[type] || icons.info} text-sm"></i><span>${window.TikTokApp.Compare.Helpers.escapeHtml(msg)}</span>`;
    el.addEventListener('click', () => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); });
    domModule.toastContainer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) { el.classList.add('removing'); setTimeout(() => { if (el.parentNode) el.remove(); }, 300); }
    }, dur);
  };

  domModule.showDialog = function(html) {
    domModule.dialogContent.innerHTML = html;
    domModule.dialogOverlay.classList.remove('hidden');
    domModule.dialogOverlay.classList.add('flex');
  };
  domModule.closeDialog = function() {
    domModule.dialogOverlay.classList.add('hidden');
    domModule.dialogOverlay.classList.remove('flex');
  };
  domModule.setStatus = function(t) {
    domModule.statusText.textContent = t;
    domModule.footerStatus.innerHTML = `<i class="fa-regular fa-circle text-[6px] ${
      t === 'ready' ? 'text-green-400' :
      t === 'working' ? 'text-yellow-400 fa-spin' :
      t === 'error' ? 'text-red-400' : 'text-white/30'
    }"></i> ${t}`;
    domModule.statusDot.className = 'fa-regular fa-circle text-[8px] ' + (
      t === 'ready' ? 'text-green-400' :
      t === 'working' ? 'text-yellow-400 fa-spin' :
      t === 'error' ? 'text-red-400' : 'text-white/30'
    );
  };
  domModule.$ = $;
  domModule.$$ = $$;
})(window.TikTokApp.Compare.DOM);

// Compare State
(function(stateModule) {
  const state = {
    files: { old: null, new: null },
    extracted: { arrOld: [], arrNew: [], statsOld: null, statsNew: null },
    comparison: null
  };
  function resetSide(side) {
    if (side === 'old') { state.files.old = null; state.extracted.arrOld = []; state.extracted.statsOld = null; }
    else if (side === 'new') { state.files.new = null; state.extracted.arrNew = []; state.extracted.statsNew = null; }
    state.comparison = null;
  }
  function resetAll() {
    state.files.old = null; state.files.new = null;
    state.extracted.arrOld = []; state.extracted.arrNew = [];
    state.extracted.statsOld = null; state.extracted.statsNew = null;
    state.comparison = null;
  }
  stateModule.get = () => state;
  stateModule.resetSide = resetSide;
  stateModule.resetAll = resetAll;
})(window.TikTokApp.Compare.State);

// Compare Services: Extractor & Comparator (use shared Fetcher later)

// Extractor
(function(extractor) {
  const Helpers = window.TikTokApp.Compare.Helpers;
  const Config = window.TikTokApp.Compare.Config;

  async function processSingle(file, onProgress) {
    if (file.size > Config.get('MAX_FILE_SIZE')) {
      throw new Error(`File too large (max ${Config.get('MAX_FILE_SIZE') / (1024*1024)} MB)`);
    }
    const data = await Helpers.readFileWithProgress(file, onProgress);
    const path = ["Profile And Settings", "Follower", "FansList"];
    let temp = data;
    for (const key of path) {
      if (temp == null || typeof temp !== 'object') {
        throw new Error(`Invalid JSON structure. Expected "${path.join(' → ')}" but missing "${key}".`);
      }
      temp = temp[key];
    }
    if (onProgress) onProgress({ phase: 'processing', text: 'Cleaning & deduplicating...' });
    const raw = Helpers.extractArray(data, path);
    const arr = Helpers.cleanAndDedupe(raw);
    if (onProgress) onProgress({ phase: 'processing_complete' });
    const stats = Helpers.buildStats(arr, raw.length, file.name);
    return { arr, stats };
  }

  async function processBoth(fileOld, fileNew, onProgress) {
    const [resultOld, resultNew] = await Promise.all([
      processSingle(fileOld, onProgress),
      processSingle(fileNew, onProgress)
    ]);
    return {
      arrOld: resultOld.arr,
      arrNew: resultNew.arr,
      statsOld: resultOld.stats,
      statsNew: resultNew.stats
    };
  }

  extractor.processSingle = processSingle;
  extractor.processBoth = processBoth;
})(window.TikTokApp.Compare.Services.Extractor);

// Comparator
(function(comparator) {
  const Config = window.TikTokApp.Compare.Config;

  function compareArrays(arrOld, arrNew, onProgress) {
    return new Promise((resolve) => {
      const chunkSize = Config.get('COMPARISON_CHUNK_SIZE');
      const oldMap = new Map();

      function processChunks(array, chunkSize, itemCallback, onComplete, phase) {
        let index = 0;
        function doChunk() {
          const start = index;
          const end = Math.min(index + chunkSize, array.length);
          for (let i = start; i < end; i++) { itemCallback(array[i], i); }
          index = end;
          if (index < array.length) {
            if (onProgress) onProgress({ phase, processed: index, total: array.length, percent: Math.round((index / array.length) * 100) });
            setTimeout(doChunk, 0);
          } else {
            onComplete();
          }
        }
        doChunk();
      }

      processChunks(
        arrOld,
        chunkSize,
        (item) => { if (item && item.UserName) oldMap.set(item.UserName, item); },
        () => {
          if (onProgress) onProgress({ phase: 'indexed_old', percent: 100 });
          const newFollowers = [];
          const existing = [];
          processChunks(
            arrNew,
            chunkSize,
            (item) => {
              if (!item || !item.UserName) return;
              if (oldMap.has(item.UserName)) {
                const oldItem = oldMap.get(item.UserName);
                existing.push({ UserName: item.UserName, OldDate: oldItem.Date, NewDate: item.Date });
                oldMap.delete(item.UserName);
              } else {
                newFollowers.push(item);
              }
            },
            () => {
              const unfollowed = [];
              for (const [, oldItem] of oldMap) unfollowed.push(oldItem);
              const stable = [];
              const returning = [];
              for (const entry of existing) {
                if (entry.OldDate === entry.NewDate) stable.push(entry);
                else returning.push(entry);
              }
              const result = {
                unfollowed,
                newFollowers,
                existing,
                stable,
                returning,
                summary: {
                  totalOld: arrOld.length,
                  totalNew: arrNew.length,
                  unfollowedCount: unfollowed.length,
                  newCount: newFollowers.length,
                  existingCount: existing.length,
                  stableCount: stable.length,
                  returningCount: returning.length,
                  retentionRate: arrOld.length ? ((existing.length / arrOld.length) * 100).toFixed(2) + '%' : 'N/A'
                }
              };
              if (onProgress) onProgress({ phase: 'complete', percent: 100 });
              resolve(result);
            },
            'comparing'
          );
        },
        'indexing_old'
      );
    });
  }

  comparator.compare = async function(arrOld, arrNew, onProgress) {
  const threshold = Config.get('WORKER_THRESHOLD');
  const useWorker = window.Worker && (arrOld.length > threshold || arrNew.length > threshold);
  
  if (useWorker) {
    return new Promise((resolve, reject) => {
      // Embedded worker script (same as previous worker.js)
      const workerScript = `
        self.onmessage = function(e) {
          const { arrOld, arrNew } = e.data;
          const chunkSize = 1000;

          function reportProgress(phase, percentInPhase) {
            let overall;
            if (phase === 'indexing_old') {
              overall = 20 * (percentInPhase / 100);
            } else if (phase === 'comparing') {
              overall = 20 + 70 * (percentInPhase / 100);
            } else if (phase === 'complete') {
              overall = 100;
            }
            self.postMessage({
              type: 'progress',
              payload: { phase, percent: Math.round(overall) }
            });
          }

          function compareArrays() {
            return new Promise((resolve) => {
              const oldMap = new Map();

              function processChunks(array, chunkSize, itemCallback, onComplete, phase) {
                let index = 0;
                function doChunk() {
                  const start = index;
                  const end = Math.min(index + chunkSize, array.length);
                  for (let i = start; i < end; i++) {
                    itemCallback(array[i], i);
                  }
                  index = end;
                  if (index < array.length) {
                    const percentInPhase = Math.round((index / array.length) * 100);
                    reportProgress(phase, percentInPhase);
                    setTimeout(doChunk, 0);
                  } else {
                    onComplete();
                  }
                }
                doChunk();
              }

              processChunks(
                arrOld,
                chunkSize,
                (item) => {
                  if (item && item.UserName) oldMap.set(item.UserName, item);
                },
                () => {
                  reportProgress('indexed_old', 100);
                  const newFollowers = [];
                  const existing = [];

                  processChunks(
                    arrNew,
                    chunkSize,
                    (item) => {
                      if (!item || !item.UserName) return;
                      if (oldMap.has(item.UserName)) {
                        const oldItem = oldMap.get(item.UserName);
                        existing.push({
                          UserName: item.UserName,
                          OldDate: oldItem.Date,
                          NewDate: item.Date
                        });
                        oldMap.delete(item.UserName);
                      } else {
                        newFollowers.push(item);
                      }
                    },
                    () => {
                      const unfollowed = [];
                      for (const [, oldItem] of oldMap) unfollowed.push(oldItem);
                      const stable = [];
                      const returning = [];
                      for (const entry of existing) {
                        if (entry.OldDate === entry.NewDate) stable.push(entry);
                        else returning.push(entry);
                      }
                      const result = {
                        unfollowed,
                        newFollowers,
                        existing,
                        stable,
                        returning,
                        summary: {
                          totalOld: arrOld.length,
                          totalNew: arrNew.length,
                          unfollowedCount: unfollowed.length,
                          newCount: newFollowers.length,
                          existingCount: existing.length,
                          stableCount: stable.length,
                          returningCount: returning.length,
                          retentionRate: arrOld.length ? ((existing.length / arrOld.length) * 100).toFixed(2) + '%' : 'N/A'
                        }
                      };
                      reportProgress('complete', 100);
                      self.postMessage({ type: 'result', payload: result });
                    },
                    'comparing'
                  );
                },
                'indexing_old'
              );
            });
          }

          compareArrays().catch(err => self.postMessage({ type: 'error', payload: err.message }));
        };
      `;
      
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'progress') {
          if (onProgress) onProgress(data.payload);
        } else if (data.type === 'result') {
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          resolve(data.payload);
        } else if (data.type === 'error') {
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(new Error(data.payload));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(err);
      };
      
      worker.postMessage({ arrOld, arrNew });
    });
  } else {
    return compareArrays(arrOld, arrNew, onProgress);
  }
};

  comparator.compareSync = compareArrays;
})(window.TikTokApp.Compare.Services.Comparator);

// Shared Fetcher
(function(fetcher) {
  const Config = window.TikTokApp.Compare.Config; // use compare config for common API settings
  // Note: FollowBack may have different concurrency, but we can use Compare's for shared fetcher.
  // To keep it simple, we'll use Compare's Config for API settings.
  // If needed, override later.

  function updateProgress(percent, msg) {
    if (window.TikTokApp.Compare.UI.Core && typeof window.TikTokApp.Compare.UI.Core.updateProgress === 'function') {
      window.TikTokApp.Compare.UI.Core.updateProgress(percent, msg);
    } else if (window.TikTokApp.FollowBack.UI && window.TikTokApp.FollowBack.UI.Core && typeof window.TikTokApp.FollowBack.UI.Core.updateProgress === 'function') {
      window.TikTokApp.FollowBack.UI.Core.updateProgress(percent, msg);
    } else {
      const fill = document.getElementById('progressFill') || document.getElementById('extract-progress-bar');
      const span = document.getElementById('progressMsg') || document.getElementById('extract-progress-text');
      if (fill) fill.style.width = percent + '%';
      if (span) span.innerText = msg || '';
    }
  }

  async function fetchProfileFromAPI(username) {
    const apiKey = localStorage.getItem(Config.get('API_KEY_STORAGE_KEY'));
    if (!apiKey) throw new Error(`API key not found. Set localStorage.${Config.get('API_KEY_STORAGE_KEY')}`);
    const url = `${Config.get('API_BASE_URL')}${Config.get('API_USER_PATH')}/${encodeURIComponent(username)}`;
    const response = await fetch(url, {
      headers: {
        [Config.get('API_KEY_HEADER_NAME')]: apiKey,
        [Config.get('AUTH_HEADER_NAME')]: apiKey
      }
    });
    if (response.status === 401) throw new Error('Invalid API key');
    if (!response.ok) {
      let errText = `HTTP ${response.status}`;
      try { const errJson = await response.json(); errText = errJson.error || errText; } catch(e) {}
      throw new Error(errText);
    }
    const json = await response.json();
    if (!json?.data?.userInfo?.user) throw new Error('Invalid API response');
    const user = json.data.userInfo.user;
    const stats = json.data.userInfo.statsV2 || {};
    return {
      userName: user.uniqueId,
      displayName: user.nickname || user.uniqueId,
      avatarUrl: user.avatarMedium,
      followers: stats.followerCount || 0,
      following: stats.followingCount || 0,
      likes: stats.heartCount || 0,
      verified: user.verified || false
    };
  }

  async function fetchBatchFromAPI(usernamesArray) {
    const apiKey = localStorage.getItem(Config.get('API_KEY_STORAGE_KEY'));
    if (!apiKey) throw new Error(`API key not found. Set localStorage.${Config.get('API_KEY_STORAGE_KEY')}`);
    const usernamesParam = usernamesArray.join(',');
    const url = `${Config.get('API_BASE_URL')}${Config.get('API_USER_PATH')}?usernames=${encodeURIComponent(usernamesParam)}`;
    const response = await fetch(url, {
      headers: {
        [Config.get('API_KEY_HEADER_NAME')]: apiKey,
        [Config.get('AUTH_HEADER_NAME')]: apiKey
      }
    });
    if (response.status === 401) throw new Error('Invalid API key');
    if (!response.ok) {
      let errText = `HTTP ${response.status}`;
      try { const errJson = await response.json(); errText = errJson.error || errText; } catch(e) {}
      throw new Error(errText);
    }
    const json = await response.json();
    if (!json.results) throw new Error('Invalid batch response format');
    return json.results;
  }

  fetcher.fetchProfileData = async function(username) {
    return await fetchProfileFromAPI(username);
  };

  fetcher.fetchBatchProfiles = async function(userNamesArray, onProgress) {
  const threshold = Config.get('USE_BATCH_ENDPOINT_THRESHOLD');
  
  // Try batch endpoint first if the list is small enough
  if (userNamesArray.length <= threshold) {
    try {
      const batchResults = await fetchBatchFromAPI(userNamesArray);
      return batchResults.map(r => {
        if (r.success && r.data) {
          const user = r.data.userInfo.user;
          const stats = r.data.userInfo.statsV2 || {};
          return {
            userName: user.uniqueId,
            displayName: user.nickname || user.uniqueId,
            followers: stats.followerCount || 0,
            following: stats.followingCount || 0,
            likes: stats.heartCount || 0,
            avatarUrl: user.avatarMedium,
            verified: user.verified || false
          };
        } else {
          return { userName: r.username, error: r.error || 'Batch fetch failed' };
        }
      });
    } catch (err) {
      console.warn('Batch fetch failed, falling back to concurrent requests', err);
      // Fall through to concurrent method below
    }
  }
  
  // Concurrent method (fallback or for large lists)
  const total = userNamesArray.length;
  const results = new Array(total);
  let completed = 0;
  
  const updateBatchProgress = () => {
    const percent = Math.floor((completed / total) * 100);
    const msg = `Fetched ${completed}/${total} profiles`;
    if (onProgress) {
      onProgress(percent, msg);
    } else {
      updateProgress(percent, msg); // internal fallback (uses global progress, may be Compare's)
    }
  };
  
  const queue = [...userNamesArray.entries()];
  const concurrency = Config.get('FETCH_CONCURRENCY');
  
  const worker = async () => {
    while (queue.length) {
      const [idx, username] = queue.shift();
      try {
        results[idx] = await fetcher.fetchProfileData(username);
      } catch (err) {
        results[idx] = { userName: username, error: err.message };
      } finally {
        completed++;
        updateBatchProgress();
      }
    }
  };
  
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, total); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  
  return results;
};

  fetcher.hasApiKey = () => !!localStorage.getItem(Config.get('API_KEY_STORAGE_KEY'));
})(window.TikTokApp.Shared.Fetcher);

// Shared APIModal
(function(apiModal) {
  const Config = window.TikTokApp.Compare.Config; // use compare config for API settings
  const DOM = window.TikTokApp.Compare.DOM; // for toast

  function hexToBytes(hex) {
    if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    return bytes;
  }
  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function decryptKey(encryptedHex, passcode) {
    if (!passcode || typeof passcode !== 'string') throw new Error('Passcode is required');
    const combined = hexToBytes(encryptedHex);
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey']);
    const aesKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plainBytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext));
    return bytesToHex(plainBytes);
  }
  const ENCRYPTED_KEY_HEX = Config.get('ENCRYPTED_KEY_HEX');

  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'passcodeModal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="modal-container bg-white dark:bg-black/90 border border-gray-200 dark:border-white/20 rounded-2xl p-4 max-w-md w-full shadow-2xl">
        <div class="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2 mb-2">
          <span class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
            <i class="fa-regular fa-lock text-indigo-400"></i> API Key Required
          </span>
          <button id="closePasscodeModalBtn" class="text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60">
            <i class="fa-regular fa-times"></i>
          </button>
        </div>
        <p class="text-xs text-gray-500 dark:text-white/40 mb-3">Enter passcode to decrypt and store your API key.</p>
        <input type="password" id="passcodeInput" class="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/20" placeholder="Passcode" autocomplete="off" />
        <div id="passcodeError" class="text-xs text-red-400 mt-1 hidden"></div>
        <button id="submitPasscodeBtn" class="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
          <i class="fa-regular fa-key mr-1"></i> Unlock
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showError(message) {
    const errorEl = document.getElementById('passcodeError');
    if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
  }
  function openModal() {
  const modal = document.getElementById('passcodeModal') || createModal();
  modal.style.display = 'flex';
  modal.classList.add('active'); // ← ADD THIS
  const input = document.getElementById('passcodeInput');
  if (input) input.focus();
}

function closeModal() {
  const modal = document.getElementById('passcodeModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active'); // ← ADD THIS
    const errorEl = document.getElementById('passcodeError');
    if (errorEl) errorEl.classList.add('hidden');
    const input = document.getElementById('passcodeInput');
    if (input) input.value = '';
  }
}
  
  async function handleUnlock() {
    const passcode = document.getElementById('passcodeInput').value.trim();
    if (!passcode) { showError('Please enter a passcode'); return; }
    const submitBtn = document.getElementById('submitPasscodeBtn');
    submitBtn.disabled = true;
    showError('');
    try {
      const decryptedKey = await decryptKey(ENCRYPTED_KEY_HEX, passcode);
      localStorage.setItem(Config.get('API_KEY_STORAGE_KEY'), decryptedKey);
      console.log('API key successfully stored');
      closeModal();
      if (DOM.toast) DOM.toast('API key stored successfully', 'success');
    } catch (err) {
      console.error('Decryption failed:', err);
      showError('Invalid passcode or corrupted data');
    } finally {
      submitBtn.disabled = false;
    }
  }

  apiModal.showModal = openModal;

  function init() {
    createModal();
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closePasscodeModalBtn') closeModal();
      if (e.target.id === 'submitPasscodeBtn') handleUnlock();
    });
    const storedKey = localStorage.getItem(Config.get('API_KEY_STORAGE_KEY'));
    if (!storedKey) openModal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TikTokApp.Shared.APIModal);

// Core
(function(core) {
  const DOM = window.TikTokApp.Compare.DOM;
  const State = window.TikTokApp.Compare.State;
  function updateProgress(percent, msg) {
    if (DOM.progressBar) DOM.progressBar.style.width = Math.min(100, percent) + '%';
    if (DOM.progressText) DOM.progressText.innerHTML = msg ? window.TikTokApp.Compare.Helpers.escapeHtml(msg) : '';
  }
  function setButtonsEnabled(hasData) {
    const s = State.get();
    const hasOldData = s.extracted.arrOld.length > 0;
    const hasNewData = s.extracted.arrNew.length > 0;
    DOM.compareBtn.disabled = !(hasOldData && hasNewData);
    DOM.viewOldBtn.disabled = !hasOldData;
    DOM.viewNewBtn.disabled = !hasNewData;
  }
  function switchTab(tabId) {
    DOM.tabBtns.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('text-gray-800', isActive);
      btn.classList.toggle('dark:text-white/80', isActive);
      btn.classList.toggle('border-blue-500', isActive);
      btn.classList.toggle('dark:border-blue-400', isActive);
      btn.classList.toggle('text-gray-500', !isActive);
      btn.classList.toggle('dark:text-white/30', !isActive);
      btn.classList.toggle('border-transparent', !isActive);
    });
    Object.entries(DOM.panes).forEach(([key, pane]) => {
      pane.classList.toggle('hidden', 'tab-' + key !== tabId);
    });
  }
  core.updateProgress = updateProgress;
  core.setButtonsEnabled = setButtonsEnabled;
  core.switchTab = switchTab;
})(window.TikTokApp.Compare.UI.Core);

// Stats
(function(statsUI) {
  const DOM = window.TikTokApp.Compare.DOM;
  const State = window.TikTokApp.Compare.State;
  const Helpers = window.TikTokApp.Compare.Helpers;
  function updateStatsTab() {
    const s = State.get();
    const o = s.extracted.statsOld;
    const n = s.extracted.statsNew;
    DOM.stOldRaw.textContent = o ? Helpers.formatNumber(o.rawLength) : '—';
    DOM.stOldClean.textContent = o ? Helpers.formatNumber(o.cleanedLength) : '—';
    DOM.stOldRemoved.textContent = o ? Helpers.formatNumber(o.removed) : '—';
    if (n) {
      DOM.stNewRaw.textContent = Helpers.formatNumber(n.rawLength);
      DOM.stNewClean.textContent = Helpers.formatNumber(n.cleanedLength);
      DOM.stNewRemoved.textContent = Helpers.formatNumber(n.removed);
      DOM.stNewAbsent.classList.add('hidden');
    } else {
      DOM.stNewRaw.textContent = '—';
      DOM.stNewClean.textContent = '—';
      DOM.stNewRemoved.textContent = '—';
      DOM.stNewAbsent.classList.remove('hidden');
    }
    const totalRemoved = (o?.removed || 0) + (n?.removed || 0);
    DOM.stRemovedTotal.textContent = totalRemoved ? Helpers.formatNumber(totalRemoved) : '—';
    let sample = '';
    if (o?.sample?.length) sample += 'Old sample: ' + o.sample.map(i => i.UserName).filter(Boolean).join(', ');
    if (n?.sample?.length) { if (sample) sample += ' | '; sample += 'New sample: ' + n.sample.map(i => i.UserName).filter(Boolean).join(', '); }
    DOM.statsSample.textContent = sample || 'No sample data';
    DOM.footerMemory.textContent = `O:${Helpers.formatNumber(s.extracted.arrOld.length)} N:${Helpers.formatNumber(s.extracted.arrNew.length)}`;
  }
  function init() {
    DOM.copyStatsBtn.addEventListener('click', () => {
      const s = State.get();
      const o = s.extracted.statsOld;
      const n = s.extracted.statsNew;
      const lines = [];
      if (o) lines.push(`Old: ${o.cleanedLength}/${o.rawLength} (removed ${o.removed})`);
      if (n) lines.push(`New: ${n.cleanedLength}/${n.rawLength} (removed ${n.removed})`);
      if (s.comparison) {
        const sum = s.comparison.summary;
        lines.push(`Unfollowed: ${sum.unfollowedCount}, New: ${sum.newCount}, Existing: ${sum.existingCount}, Retention: ${sum.retentionRate}`);
      }
      const text = lines.join('\n');
      if (text) { navigator.clipboard.writeText(text).then(() => DOM.toast('Copied stats', 'success')); }
      else { DOM.toast('No stats to copy', 'warning'); }
    });
    updateStatsTab();
  }
  statsUI.init = init;
  statsUI.updateStatsTab = updateStatsTab;
})(window.TikTokApp.Compare.UI.Stats);

// Files
(function(filesUI) {
  const DOM = window.TikTokApp.Compare.DOM;
  const State = window.TikTokApp.Compare.State;
  const Helpers = window.TikTokApp.Compare.Helpers;
  const Extractor = window.TikTokApp.Compare.Services.Extractor;
  const Core = window.TikTokApp.Compare.UI.Core;
  const StatsUI = window.TikTokApp.Compare.UI.Stats;

  function handleFile(file, key, statusSpan, zone) {
    const s = State.get();
    if (key === 'old') { s.files.old = file; s.extracted.arrOld = []; s.extracted.statsOld = null; }
    else { s.files.new = file; s.extracted.arrNew = []; s.extracted.statsNew = null; }
    s.comparison = null;
    const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
    statusSpan.innerHTML = `<i class="fa-regular fa-file text-[10px]"></i> ${Helpers.escapeHtml(file.name)} (${sizeStr})`;
    zone.classList.add('has-file');
    DOM.quickStartMsg.classList.add('hidden');
    Core.updateProgress(0, 'ready');
    Core.setButtonsEnabled(false);
    StatsUI.updateStatsTab();
    DOM.extOldCount.textContent = Helpers.formatNumber(s.extracted.arrOld.length);
    DOM.extNewCount.textContent = Helpers.formatNumber(s.extracted.arrNew.length);
    DOM.extRemovedOld.textContent = Helpers.formatNumber(s.extracted.statsOld?.removed || 0);
    DOM.extRemovedNew.textContent = Helpers.formatNumber(s.extracted.statsNew?.removed || 0);
    DOM.extractOldBtn.disabled = !s.files.old;
    DOM.extractNewBtn.disabled = !s.files.new;
    DOM.extractBothBtn.disabled = !(s.files.old && s.files.new);
    DOM.footerMemory.textContent = `O:${Helpers.formatNumber(s.extracted.arrOld.length)} N:${Helpers.formatNumber(s.extracted.arrNew.length)}`;
    if (window.TikTokApp.Main) window.TikTokApp.Main.persistSession();
  }

  async function extractSingle(side) {
    const s = State.get();
    const file = side === 'old' ? s.files.old : s.files.new;
    if (!file) return DOM.toast('No file uploaded', 'warning');
    Core.updateProgress(2, `Extracting ${side}...`);
    const btn = side === 'old' ? DOM.extractOldBtn : DOM.extractNewBtn;
    btn.disabled = true;
    try {
      const result = await Extractor.processSingle(file, (p) => {
        if (p.phase === 'reading') Core.updateProgress(p.percent, `Reading ${p.name}... ${p.percent}%`);
        else if (p.phase === 'processing') Core.updateProgress(50, 'Cleaning...');
        else if (p.phase === 'processing_complete') Core.updateProgress(100, 'Done');
      });
      if (side === 'old') { s.extracted.arrOld = result.arr; s.extracted.statsOld = result.stats; }
      else { s.extracted.arrNew = result.arr; s.extracted.statsNew = result.stats; }
      s.comparison = null;
      StatsUI.updateStatsTab();
      DOM.extOldCount.textContent = Helpers.formatNumber(s.extracted.arrOld.length);
      DOM.extNewCount.textContent = Helpers.formatNumber(s.extracted.arrNew.length);
      DOM.extRemovedOld.textContent = Helpers.formatNumber(s.extracted.statsOld?.removed || 0);
      DOM.extRemovedNew.textContent = Helpers.formatNumber(s.extracted.statsNew?.removed || 0);
      DOM.footerMemory.textContent = `O:${Helpers.formatNumber(s.extracted.arrOld.length)} N:${Helpers.formatNumber(s.extracted.arrNew.length)}`;
      Core.setButtonsEnabled(true);
      DOM.toast(`${side} extracted: ${result.arr.length} users`, 'success');
    } catch (e) {
      DOM.toast(`Error: ${e.message}`, 'error');
      Core.updateProgress(0, 'Error');
    } finally {
      btn.disabled = false;
      DOM.extractOldBtn.disabled = !s.files.old;
      DOM.extractNewBtn.disabled = !s.files.new;
      DOM.extractBothBtn.disabled = !(s.files.old && s.files.new);
    }
  }

  async function extractBoth() {
    const s = State.get();
    if (!s.files.old || !s.files.new) return DOM.toast('Both files must be uploaded', 'warning');
    Core.updateProgress(2, 'Extracting both files...');
    DOM.extractBothBtn.disabled = true;
    DOM.extractBothBtn.innerHTML = '<i class="fa-regular fa-spinner fa-spin text-[10px]"></i><span>Extracting...</span>';
    try {
      const result = await Extractor.processBoth(s.files.old, s.files.new, (p) => {
        if (p.phase === 'reading') Core.updateProgress(p.percent, `Reading ${p.name}... ${p.percent}%`);
        else if (p.phase === 'processing') Core.updateProgress(50, 'Cleaning...');
        else if (p.phase === 'processing_complete') Core.updateProgress(90, 'Done');
      });
      s.extracted.arrOld = result.arrOld;
      s.extracted.arrNew = result.arrNew;
      s.extracted.statsOld = result.statsOld;
      s.extracted.statsNew = result.statsNew;
      s.comparison = null;
      StatsUI.updateStatsTab();
      DOM.extOldCount.textContent = Helpers.formatNumber(s.extracted.arrOld.length);
      DOM.extNewCount.textContent = Helpers.formatNumber(s.extracted.arrNew.length);
      DOM.extRemovedOld.textContent = Helpers.formatNumber(s.extracted.statsOld?.removed || 0);
      DOM.extRemovedNew.textContent = Helpers.formatNumber(s.extracted.statsNew?.removed || 0);
      DOM.footerMemory.textContent = `O:${Helpers.formatNumber(s.extracted.arrOld.length)} N:${Helpers.formatNumber(s.extracted.arrNew.length)}`;
      Core.setButtonsEnabled(true);
      DOM.toast(`Both extracted: Old ${result.arrOld.length}, New ${result.arrNew.length}`, 'success');
      Core.updateProgress(100, 'Done');
    } catch (e) {
      DOM.toast(`Error: ${e.message}`, 'error');
      Core.updateProgress(0, 'Error');
    } finally {
      DOM.extractBothBtn.disabled = false;
      DOM.extractBothBtn.innerHTML = '<i class="fa-regular fa-wand-magic-sparkles text-[10px]"></i><span>Extract Both</span>';
    }
  }

  function viewData(side) {
    const s = State.get();
    const arr = side === 'old' ? s.extracted.arrOld : s.extracted.arrNew;
    if (!arr.length) return DOM.toast(`No ${side} data`, 'warning');
    const stats = side === 'old' ? s.extracted.statsOld : s.extracted.statsNew;
    let html = `<div class="text-sm font-medium mb-2">${Helpers.escapeHtml(side.toUpperCase())} (${arr.length} items)</div>`;
    if (stats) html += `<div class="text-xs text-gray-500 dark:text-white/60 mb-2">Raw: ${stats.rawLength} · Cleaned: ${stats.cleanedLength} · Removed: ${stats.removed}</div>`;
    const sample = arr.slice(0, 50);
    const escapedUsernames = sample.map(i => Helpers.escapeHtml(i.UserName || i)).filter(Boolean);
    html += `<div class="text-xs break-all" style="line-height:1.6;">${escapedUsernames.join('<br>')}</div>`;
    if (arr.length > 50) html += `<div class="text-xs text-gray-400 mt-1">… and ${arr.length - 50} more</div>`;
    html += `<div class="flex gap-2 mt-3"><button class="bg-gray-100 border rounded-lg px-3 py-1 text-sm hover:bg-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/20" onclick="window._copyUsernames('${side}')"><i class="fa-regular fa-copy"></i> Copy all</button></div>`;
    DOM.showDialog(html);
    window._copyUsernames = (k) => {
      const arr2 = k === 'old' ? s.extracted.arrOld : s.extracted.arrNew;
      const text = arr2.map(i => i.UserName || i).filter(Boolean).join('\n');
      navigator.clipboard.writeText(text).then(() => DOM.toast(`Copied ${k} usernames`, 'success'));
    };
  }

  function init() {
    const setupDrop = (zone, input, statusSpan, key) => {
      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (f && (f.type === 'application/json' || f.name.endsWith('.json'))) handleFile(f, key, statusSpan, zone);
        else DOM.toast('Please select a JSON file', 'warning');
      });
      input.addEventListener('change', () => { if (input.files.length) handleFile(input.files[0], key, statusSpan, zone); });
    };
    setupDrop(DOM.dropOld, DOM.fileOld, DOM.oldFileStatus, 'old');
    setupDrop(DOM.dropNew, DOM.fileNew, DOM.newFileStatus, 'new');
    DOM.extractOldBtn.addEventListener('click', () => extractSingle('old'));
    DOM.extractNewBtn.addEventListener('click', () => extractSingle('new'));
    DOM.extractBothBtn.addEventListener('click', extractBoth);
    DOM.viewOldBtn.addEventListener('click', () => viewData('old'));
    DOM.viewNewBtn.addEventListener('click', () => viewData('new'));
    DOM.downloadSampleBtn.addEventListener('click', () => {
      const sampleData = { "Profile And Settings": { "Follower": { "FansList": [
        { "UserName": "fan1", "Date": "2025-01-01" },
        { "UserName": "fan2", "Date": "2025-02-01" }
      ]}}};
      const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'sample.json'; a.click(); URL.revokeObjectURL(url);
    });
    DOM.copyExtractBtn.addEventListener('click', () => {
      const s = State.get();
      const text = `Old: ${s.extracted.arrOld.length} (raw ${s.extracted.statsOld?.rawLength||'?'}), New: ${s.extracted.arrNew.length} (raw ${s.extracted.statsNew?.rawLength||'?'}), Removed: ${(s.extracted.statsOld?.removed||0)+(s.extracted.statsNew?.removed||0)}`;
      navigator.clipboard.writeText(text).then(() => DOM.toast('Copied', 'success'));
    });
  }
  filesUI.init = init;
})(window.TikTokApp.Compare.UI.Files);

// Results
(function(resultsUI) {
  const DOM = window.TikTokApp.Compare.DOM;
  const State = window.TikTokApp.Compare.State;
  const Helpers = window.TikTokApp.Compare.Helpers;
  const Comparator = window.TikTokApp.Compare.Services.Comparator;
  const Core = window.TikTokApp.Compare.UI.Core;
  const fullData = { unfollowed: [], newFollowers: [], returning: [], existing: [] };

  function renderResults(result) {
    if (!result) { DOM.resultEmptyMsg.classList.remove('hidden'); DOM.resultSections.classList.add('hidden'); DOM.resultSingleMsg.classList.add('hidden'); return; }
    DOM.resultEmptyMsg.classList.add('hidden'); DOM.resultSingleMsg.classList.add('hidden'); DOM.resultSections.classList.remove('hidden');
    fullData.unfollowed = result.unfollowed || []; fullData.newFollowers = result.newFollowers || []; fullData.returning = result.returning || []; fullData.existing = result.existing || [];
    const s = result.summary;
    DOM.rUnfollowed.textContent = Helpers.formatNumber(s.unfollowedCount);
    DOM.rNew.textContent = Helpers.formatNumber(s.newCount);
    DOM.rReturning.textContent = Helpers.formatNumber(s.returningCount);
    DOM.rExisting.textContent = Helpers.formatNumber(s.existingCount);
    DOM.rRetention.textContent = s.retentionRate || '—';
    DOM.rUnfollowedBadge.textContent = Helpers.formatNumber(s.unfollowedCount);
    DOM.rNewBadge.textContent = Helpers.formatNumber(s.newCount);
    DOM.rReturningBadge.textContent = Helpers.formatNumber(s.returningCount);
    DOM.rExistingBadge.textContent = Helpers.formatNumber(s.existingCount);
    updateList('unfollowed-list', fullData.unfollowed, Infinity);
    updateList('new-list', fullData.newFollowers, Infinity);
    updateList('returning-list', fullData.returning, Infinity);
    updateList('existing-list', fullData.existing, 20);
    DOM.footerMemory.textContent = `O:${Helpers.formatNumber(State.get().extracted.arrOld.length)} N:${Helpers.formatNumber(State.get().extracted.arrNew.length)} | Δ:${Helpers.formatNumber(s.unfollowedCount)} ➕${Helpers.formatNumber(s.newCount)}`;
    Core.setButtonsEnabled(true);
  }
  function updateList(targetId, arr, max) {
    const pre = document.getElementById(targetId);
    if (!pre) return;
    if (!arr?.length) { pre.textContent = '—'; return; }
    const items = arr.slice(0, max).map(item => JSON.stringify(item, null, 2));
    let text = items.join('\n\n');
    if (arr.length > max) text += '\n\n… and ' + Helpers.formatNumber(arr.length - max) + ' more';
    pre.textContent = text;
  }
  function applyFilter(inputEl) {
    const targetId = inputEl.dataset.target;
    let dataArray;
    switch (targetId) {
      case 'unfollowed-list': dataArray = fullData.unfollowed; break;
      case 'new-list': dataArray = fullData.newFollowers; break;
      case 'returning-list': dataArray = fullData.returning; break;
      case 'existing-list': dataArray = fullData.existing; break;
      default: return;
    }
    const filter = inputEl.value.trim().toLowerCase();
    if (!filter) { updateList(targetId, dataArray, targetId === 'existing-list' ? 20 : Infinity); return; }
    const filtered = dataArray.filter(item => item && item.UserName && item.UserName.toLowerCase().includes(filter));
    updateList(targetId, filtered, Infinity);
  }
  async function runComparison() {
    const TableUI = window.TikTokApp.Compare.UI.Table;
    const s = State.get();
    const oldA = s.extracted.arrOld;
    const newA = s.extracted.arrNew;
    if (!oldA.length || !newA.length) return DOM.toast('Need both Old and New data', 'warning');
    Core.updateProgress(2, 'Starting comparison...');
    DOM.compareBtn.disabled = true;
    DOM.compareBtn.innerHTML = '<i class="fa-regular fa-spinner fa-spin text-[10px]"></i><span>Comparing...</span>';
    try {
      const result = await Comparator.compare(oldA, newA, (p) => {
        if (p.phase === 'indexing_old') Core.updateProgress(p.percent, `Indexing old... ${p.percent}%`);
        else if (p.phase === 'comparing') Core.updateProgress(p.percent, `Comparing... ${p.percent}%`);
        else if (p.phase === 'complete') Core.updateProgress(100, 'Done');
      });
      State.get().comparison = result;
      renderResults(result);
      //if (TableUI) {
        //TableUI.refreshTable();
      //}
      Core.switchTab('tab-results');
      DOM.toast(`Done: ${result.summary.unfollowedCount} unfollowed, ${result.summary.newCount} new`, 'success');
    } catch (e) {
      DOM.toast(`Comparison error: ${e.message}`, 'error');
      Core.updateProgress(0, 'Error');
    } finally {
      DOM.compareBtn.disabled = false;
      DOM.compareBtn.innerHTML = '<i class="fa-regular fa-arrow-right-arrow-left text-[10px]"></i><span>Compare</span>';
    }
  }
  function copyList(targetId) {
    const pre = document.getElementById(targetId);
    if (!pre) return;
    const text = pre.textContent;
    if (!text || text === '—') return DOM.toast('Nothing to copy', 'warning');
    navigator.clipboard.writeText(text).then(() => DOM.toast('Copied', 'success'));
  }
  function downloadList(targetId) {
    const pre = document.getElementById(targetId);
    if (!pre) return;
    const text = pre.textContent;
    if (!text || text === '—') return DOM.toast('Nothing to download', 'warning');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${targetId}.txt`; a.click(); URL.revokeObjectURL(url);
    DOM.toast('Downloaded', 'success');
  }
  function init() {
    DOM.compareBtn.addEventListener('click', runComparison);
    DOM.filterInputs.forEach(input => input.addEventListener('input', () => applyFilter(input)));
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-section-btn');
      if (btn) copyList(btn.dataset.target);
      const downloadBtn = e.target.closest('.download-section-btn');
      if (downloadBtn) downloadList(downloadBtn.dataset.target);
    });
  }
  resultsUI.init = init;
  resultsUI.renderResults = renderResults;
  resultsUI.applyFilter = applyFilter;
})(window.TikTokApp.Compare.UI.Results);


// Table
(function(tableUI) {
  const DOM = window.TikTokApp.Compare.DOM;
  const State = window.TikTokApp.Compare.State;
  const Helpers = window.TikTokApp.Compare.Helpers;
  const Fetcher = window.TikTokApp.Shared.Fetcher;
  let currentUsers = [];
  let isFetching = false;
  let showFailed = true;
  let currentListType = 'unfollowed';
  
  
  function buildUserList(comparison, type) {
    if (!comparison) return [];
    let list = [];
    switch (type) {
      case 'unfollowed': list = comparison.unfollowed || []; break;
      case 'new': list = comparison.newFollowers || []; break;
      case 'returning': list = comparison.returning || []; break;
      case 'stable': list = comparison.stable || []; break;
      default: list = [];
    }
    return list.map(item => ({
      username: item.UserName || item.username,
      date: item.Date || item.NewDate || item.OldDate,
      avatar: 'https://via.placeholder.com/32?text=?',
      displayName: item.UserName || item.username,
      followers: '—',
      following: '—',
      likes: '—',
      fetchError: false
    }));
  }

  function renderTable(users) {
    const tbody = DOM.tableBody;
    const emptyMsg = DOM.tableEmptyMsg;
    const countEl = DOM.tableCount;
    const hideBtn = DOM.hideFailedBtn;
    tbody.innerHTML = '';
    if (!users || users.length === 0) {
      emptyMsg.classList.remove('hidden');
      countEl.textContent = '0 users';
      DOM.fetchProfilesBtn.disabled = true;
      hideBtn.classList.add('hidden');
      hideBtn.disabled = true;
      return;
    }
    let displayUsers = users;
    if (!showFailed) displayUsers = users.filter(u => u.fetchError !== true);
    if (displayUsers.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'text-center text-gray-400 dark:text-white/30 py-2';
      td.textContent = 'All rows hidden (toggle to show)';
      tr.appendChild(td);
      tbody.appendChild(tr);
      countEl.textContent = '0 users';
      DOM.fetchProfilesBtn.disabled = false;
      hideBtn.classList.remove('hidden');
      hideBtn.disabled = false;
      emptyMsg.classList.add('hidden');
      return;
    }
    emptyMsg.classList.add('hidden');
    DOM.fetchProfilesBtn.disabled = false;
    countEl.textContent = `${displayUsers.length} users`;
    hideBtn.classList.remove('hidden');
    hideBtn.disabled = false;
    const fragment = document.createDocumentFragment();
    displayUsers.forEach(user => {
      const avatar = user.avatar || 'https://via.placeholder.com/32?text=?';
      const displayName = user.displayName || user.username;
      const handle = `@${user.username}`;
      const followers = Helpers.formatNumber(user.followers) || '—';
      const following = Helpers.formatNumber(user.following) || '—';
      const likes = Helpers.formatNumber(user.likes) || '—';
      const date = user.date ? Helpers.formatDateShort(user.date) : '—';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 dark:hover:bg-white/5 transition';
      const tdAvatar = document.createElement('td');
      tdAvatar.className = 'px-2 py-1';
      const img = document.createElement('img');
      img.src = avatar;
      img.className = 'avatar-img';
      img.alt = 'avatar';
      tdAvatar.appendChild(img);
      tr.appendChild(tdAvatar);
      const tdName = document.createElement('td');
      tdName.className = 'px-2 py-1';
      const divName = document.createElement('div');
      divName.className = 'user-name';
      divName.title = displayName;
      divName.textContent = displayName;
      tdName.appendChild(divName);
      const divHandle = document.createElement('div');
      divHandle.className = 'user-handle';
      divHandle.title = handle;
      divHandle.textContent = handle;
      tdName.appendChild(divHandle);
      tr.appendChild(tdName);
      [followers, following, likes].forEach(stat => {
        const td = document.createElement('td');
        td.className = 'stats-number';
        td.textContent = stat;
        tr.appendChild(td);
      });
      const tdDate = document.createElement('td');
      tdDate.textContent = date;
      tr.appendChild(tdDate);
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  function refreshTable() {
    const s = State.get();
    const comparison = s.comparison;
    if (!comparison) {
      DOM.tableEmptyMsg.classList.remove('hidden');
      DOM.tableBody.innerHTML = '';
      DOM.tableCount.textContent = '0 users';
      DOM.fetchProfilesBtn.disabled = true;
      DOM.hideFailedBtn.classList.add('hidden');
      DOM.hideFailedBtn.disabled = true;
      currentUsers = [];
      showFailed = true;
      DOM.hideFailedBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i> Hide Failed';
      return;
    }
    currentUsers = buildUserList(comparison, currentListType);
    showFailed = true;
    DOM.hideFailedBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i> Hide Failed';
    DOM.hideFailedBtn.classList.add('hidden');
    DOM.hideFailedBtn.disabled = true;
    renderTable(currentUsers);
  }

  async function enrichUsers() {
    if (isFetching) return;
    if (currentUsers.length === 0) { DOM.toast(`No ${currentListType} users to fetch.`, 'warning'); return; }
    if (!Fetcher.hasApiKey()) {
      DOM.toast('API key not found. Please enter your passcode.', 'warning');
      if (window.TikTokApp.Shared.APIModal && typeof window.TikTokApp.Shared.APIModal.showModal === 'function') {
        window.TikTokApp.Shared.APIModal.showModal();
      } else { location.reload(); }
      return;
    }
    isFetching = true;
    DOM.fetchProfilesBtn.disabled = true;
    DOM.tableLoading.classList.remove('hidden');
    DOM.toast(`Fetching profiles for ${currentListType} users...`, 'info', 2000);
    try {
      DOM.fetchProfilesBtn.disabled = true;
      DOM.fetchProfilesBtn.innerHTML = '<i class="fa-regular fa-spinner fa-spin"></i> Fetching...';
      const usernames = currentUsers.map(u => u.username);
     
      const results = await Fetcher.fetchBatchProfiles(usernames, window.TikTokApp.Compare.UI.Core.updateProgress);
      
      const lookup = {};
      results.forEach(r => { if (r && !r.error) lookup[r.userName] = r; });
      currentUsers = currentUsers.map(user => {
        const fetched = lookup[user.username];
        if (fetched && !fetched.error) {
          return { ...user, displayName: fetched.displayName || user.username, avatar: fetched.avatarUrl || 'https://via.placeholder.com/32?text=?', followers: fetched.followers || '—', following: fetched.following || '—', likes: fetched.likes || '—', fetchError: false };
        } else {
          return { ...user, fetchError: true };
        }
      });
      renderTable(currentUsers);
      const successCount = results.filter(r => r && !r.error).length;
      DOM.toast(`Fetched ${successCount} profiles`, 'success');
      const hasFailed = currentUsers.some(u => u.fetchError === true);
      if (hasFailed) { DOM.hideFailedBtn.classList.remove('hidden'); DOM.hideFailedBtn.disabled = false; }
      else { DOM.hideFailedBtn.classList.add('hidden'); DOM.hideFailedBtn.disabled = true; }
    } catch (err) {
      DOM.toast(`Fetch failed: ${err.message}`, 'error');
      DOM.hideFailedBtn.classList.add('hidden');
      DOM.hideFailedBtn.disabled = true;
    } finally {
      isFetching = false;
      DOM.fetchProfilesBtn.disabled = false;
      DOM.tableLoading.classList.add('hidden');
      DOM.fetchProfilesBtn.innerHTML = '<i class="fa-regular fa-cloud-arrow-up"></i> Fetch Profiles';
    }
  }

  function switchListType(type) {
    if (type === currentListType) return;
    currentListType = type;
    DOM.listTypeBtns.forEach(btn => {
      const isActive = btn.dataset.type === type;
      btn.classList.toggle('bg-indigo-500', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('dark:bg-indigo-400', isActive);
      btn.classList.toggle('dark:text-white', isActive);
      btn.classList.toggle('text-gray-600', !isActive);
      btn.classList.toggle('dark:text-white/40', !isActive);
      btn.classList.toggle('hover:bg-gray-200', !isActive);
      btn.classList.toggle('dark:hover:bg-white/10', !isActive);
    });
    DOM.tableListLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    refreshTable();
  }

  function init() {
    DOM.fetchProfilesBtn.addEventListener('click', enrichUsers);
    DOM.hideFailedBtn.addEventListener('click', () => {
      showFailed = !showFailed;
      DOM.hideFailedBtn.innerHTML = showFailed ? '<i class="fa-regular fa-eye-slash"></i> Hide Failed' : '<i class="fa-regular fa-eye"></i> Show All';
      renderTable(currentUsers);
    });
    DOM.listTypeBtns.forEach(btn => btn.addEventListener('click', () => switchListType(btn.dataset.type)));
    refreshTable();
    DOM.hideFailedBtn.disabled = true;
  }
  tableUI.refreshTable = refreshTable;
  tableUI.enrichUsers = enrichUsers;
  tableUI.init = init;
  
Object.defineProperty(tableUI, 'currentListType', {
  get: function() { return currentListType; },
  set: function(val) { currentListType = val; },
  enumerable: true,
  configurable: true
});

Object.defineProperty(tableUI, 'showFailed', {
  get: function() { return showFailed; },
  set: function(val) { showFailed = val; },
  enumerable: true,
  configurable: true
});

Object.defineProperty(tableUI, 'currentUsers', {
  get: function() { return currentUsers; },
  set: function(val) { currentUsers = val; },
  enumerable: true,
  configurable: true
});
  
})(window.TikTokApp.Compare.UI.Table);

// ==================== FOLLOWBACK MODULES ====================

// FollowBack Config
(function(configModule) {
  const DEFAULT_CONFIG = {
    JSON_PATH_TO_FANS: ["Profile And Settings", "Follower", "FansList"],
    FOLLOWING_PATH: ["Profile And Settings", "Following", "Following"],
    EXTRACT_START_INDEX: 0,
    MAX_FOLLOWERS_TO_EXTRACT: 300,
    API_BASE_URL: 'https://tik-proxy.vercel.app',
    API_USER_PATH: '/api/followback',
    API_KEY_STORAGE_KEY: 'myKey',
    API_KEY_HEADER_NAME: 'X-API-Key',
    AUTH_HEADER_NAME: 'Authorization',
    FETCH_CONCURRENCY: 5,
    DEFAULT_AVATAR_URL: 'https://via.placeholder.com/32?text=?',
    MILLION_THRESHOLD: 1e6,
    THOUSAND_THRESHOLD: 1e3,
    DATE_LOCALE: 'en-US',
    DATE_FORMAT_OPTIONS: { year: 'numeric', month: 'short' },
    MIN_FOLLOWERS_TO_FILTER: 10000,
    OWN_USERNAME: '',
    USE_BATCH_ENDPOINT_THRESHOLD: 20,
    DEMO_TABLE_DATA: [
      { avatar: "https://randomuser.me/api/portraits/women/68.jpg", displayName: "Emma Watson", handle: "@emmawatson", followers: "245.3K", following: "1.2K", likes: "45.6K", date: "Sep 2026", followBack: false },
      { avatar: "https://randomuser.me/api/portraits/men/32.jpg", displayName: "Chris Evans", handle: "@chrisevans", followers: "1.2M", following: "3.4K", likes: "230.1K", date: "Mar 2024", followBack: true },
      { avatar: "https://randomuser.me/api/portraits/women/45.jpg", displayName: "Zendaya", handle: "@zendaya", followers: "2.1M", following: "2.1K", likes: "512.3K", date: "Dec 2025", followBack: false },
      { avatar: "https://randomuser.me/api/portraits/men/22.jpg", displayName: "Keanu Reeves", handle: "@keanu", followers: "892.5K", following: "892", likes: "98.4K", date: "Jan 2024", followBack: true },
      { avatar: "https://randomuser.me/api/portraits/women/89.jpg", displayName: "Scarlett Johansson", handle: "@scarlett", followers: "3.4M", following: "4.1K", likes: "890.2K", date: "Aug 2026", followBack: false }
    ]
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  const stored = localStorage.getItem('TikTokApp_FollowBack_Config');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      if (typeof currentConfig.DATE_FORMAT_OPTIONS === 'string') {
        try { currentConfig.DATE_FORMAT_OPTIONS = JSON.parse(currentConfig.DATE_FORMAT_OPTIONS); } catch (e) { currentConfig.DATE_FORMAT_OPTIONS = DEFAULT_CONFIG.DATE_FORMAT_OPTIONS; }
      }
    } catch (e) { console.warn("Failed to load followback config", e); }
  }

  function persistConfig() {
    localStorage.setItem('TikTokApp_FollowBack_Config', JSON.stringify(currentConfig));
  }

  configModule.get = (key) => currentConfig[key];
  configModule.getAll = () => ({ ...currentConfig });
  configModule.set = (key, value) => { currentConfig[key] = value; persistConfig(); };
  configModule.update = (newConfig) => { currentConfig = { ...currentConfig, ...newConfig }; persistConfig(); };
  configModule.reset = () => { currentConfig = { ...DEFAULT_CONFIG }; persistConfig(); };
  configModule.DEFAULT = DEFAULT_CONFIG;
})(window.TikTokApp.FollowBack.Config);

// FollowBack Helpers
(function(helpers) {
  const Config = window.TikTokApp.FollowBack.Config;

  helpers.formatNumber = function(num) {
    if (num === undefined || num === null) return '';
    const n = Number(num);
    if (isNaN(n)) return num;
    const million = Config.get('MILLION_THRESHOLD');
    const thousand = Config.get('THOUSAND_THRESHOLD');
    if (n >= million) return (n / million).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= thousand) return (n / thousand).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  };

  helpers.formatDate = function(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const locale = Config.get('DATE_LOCALE');
    const options = Config.get('DATE_FORMAT_OPTIONS');
    return d.toLocaleDateString(locale, options);
  };

  helpers.normalizeExtractedToTableFormat = function(extractedItem) {
    return {
      avatar: Config.get('DEFAULT_AVATAR_URL'),
      displayName: extractedItem.displayName || extractedItem.UserName || '',
      handle: `@${extractedItem.UserName || ''}`,
      followers: extractedItem.followerCount || '',
      following: extractedItem.followingCount || '',
      likes: extractedItem.heartCount || '',
      date: extractedItem.Date ? helpers.formatDate(extractedItem.Date) : '',
      followBack: extractedItem.followBack || false,
      verified: extractedItem.verified || false
    };
  };

  helpers.parseFormattedNumber = function(value) {
    if (typeof value === 'number') return value;
    if (!value || value === '') return 0;
    const str = String(value).toUpperCase();
    let multiplier = 1;
    const million = Config.get('MILLION_THRESHOLD');
    const thousand = Config.get('THOUSAND_THRESHOLD');
    if (str.endsWith('M')) multiplier = million;
    else if (str.endsWith('K')) multiplier = thousand;
    const num = parseFloat(str.replace(/[KM]$/i, ''));
    return isNaN(num) ? 0 : num * multiplier;
  };

  helpers.parseDateToTimestamp = function(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };
})(window.TikTokApp.FollowBack.Helpers);

// FollowBack DOM
(function(domModule) {
  function get(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`DOM element with id "${id}" not found`);
    return el;
  }

  domModule.fileInput = get('jsonFileInput');
  domModule.fileLabelSpan = get('fileNameDisplay');
  domModule.extractBtn = get('extractBtn');
  domModule.autoExtract = get('autoExtractCheck');
  domModule.customFileBtn = get('customFileBtn');
  domModule.progressFill = get('progressFill');
  domModule.progressMsg = get('progressMsg');
  domModule.renderTableBtn = get('renderTableBtn');
  domModule.fetchProfilesBtn = get('fetchProfilesBtn');
  domModule.extractedJsonPre = get('extractedJsonPre');
  domModule.dialogOverlay = get('customDialog');
  domModule.dialogMsg = get('dialogMessage');
  domModule.closeDialogBtn = get('closeDialogBtn');
  domModule.dialogOkBtn = get('dialogOkBtn');
  domModule.tabJson = get('tabJson');
  domModule.tabSample = get('tabSample');
  domModule.tabConfig = get('tabConfig');
  domModule.tabAnalytics = get('tabAnalytics');
  domModule.tabConfigJson = get('tabConfigJson');
  domModule.tabConfigExtract = get('tabConfigExtract');
  domModule.tabConfigApi = get('tabConfigApi');
  domModule.tabConfigUi = get('tabConfigUi');
  domModule.cfg_jsonPath = get('cfg_jsonPath');
  domModule.cfg_followingPath = get('cfg_followingPath');
  domModule.cfg_startIndex = get('cfg_startIndex');
  domModule.cfg_maxExtract = get('cfg_maxExtract');
  domModule.cfg_apiBase = get('cfg_apiBase');
  domModule.cfg_userPath = get('cfg_userPath');
  domModule.cfg_apiKeyStorageKey = get('cfg_apiKeyStorageKey');
  domModule.cfg_apiKeyHeader = get('cfg_apiKeyHeader');
  domModule.cfg_authHeader = get('cfg_authHeader');
  domModule.cfg_concurrency = get('cfg_concurrency');
  domModule.cfg_defaultAvatar = get('cfg_defaultAvatar');
  domModule.cfg_millionThreshold = get('cfg_millionThreshold');
  domModule.cfg_thousandThreshold = get('cfg_thousandThreshold');
  domModule.cfg_dateLocale = get('cfg_dateLocale');
  domModule.cfg_dateFormat = get('cfg_dateFormat');
  domModule.cfg_minFollowers = get('cfg_minFollowers');
  domModule.cfg_ownUsername = get('cfg_ownUsername');
  domModule.saveConfigBtn = get('saveConfigBtn');
  domModule.resetConfigBtn = get('resetConfigBtn');
  domModule.dynamicTableBody = get('dynamicTableBody');
  domModule.analyticsCards = get('analyticsCards');
  domModule.chartDist = get('chartDist');
  domModule.chartMutual = get('chartMutual');
  domModule.bestCandidatesBody = get('bestCandidatesBody');
  domModule.suspiciousBody = get('suspiciousBody');
})(window.TikTokApp.FollowBack.DOM);

// FollowBack State
(function(stateModule) {
  const state = {
    extractedFollowers: null,
    extractedFollowing: null,
    enrichedFollowers: null,
    notFollowedBack: null
  };
  stateModule.get = () => state;
  stateModule.setExtractedData = (followers, following) => {
    state.extractedFollowers = followers;
    state.extractedFollowing = following;
    state.enrichedFollowers = null;
  };
  stateModule.getExtractedFollowers = () => state.extractedFollowers;
  stateModule.getExtractedFollowing = () => state.extractedFollowing;
  stateModule.setEnrichedFollowers = (followers) => {
    state.enrichedFollowers = followers;
    state.extractedFollowers = followers;
  };
  stateModule.getEnrichedFollowers = () => state.enrichedFollowers;
  stateModule.setNotFollowedBack = function(list){
    state.notFollowedBack = list || null;
  }
  stateModule.getNotFollowedBack = function() {
  return state.notFollowedBack;
}
  
})(window.TikTokApp.FollowBack.State);

// FollowBack Services: Extraction
(function(extraction) {
  const Config = window.TikTokApp.FollowBack.Config;
  const State = window.TikTokApp.FollowBack.State;
  let activeWorker = null;

  extraction.performExtraction = async function(source, sourceType, callbacks) {
    if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
    const { onProgress, onComplete, onError } = callbacks;
    onProgress(2, 'starting worker...');
    const followersPath = Config.get('JSON_PATH_TO_FANS');
    const followingPath = Config.get('FOLLOWING_PATH');
    const startIdx = Config.get('EXTRACT_START_INDEX');
    const maxExtract = Config.get('MAX_FOLLOWERS_TO_EXTRACT');

    const workerScript = `
      self.onmessage = async function(e) {
        const { source, sourceType, followersPath, followingPath, startIdx, maxExtract } = e.data;
        const sendProgress = (percent, msg) => self.postMessage({ type: 'progress', percent, message: msg });
        try {
          let jsonData;
          sendProgress(5, 'loading data...');
          if(sourceType === 'file') {
            const text = await source.text();
            sendProgress(25, 'parsing JSON');
            jsonData = JSON.parse(text);
          } else {
            const resp = await fetch(source);
            if(!resp.ok) throw new Error('HTTP '+resp.status);
            const text = await resp.text();
            sendProgress(25, 'parsing remote JSON');
            jsonData = JSON.parse(text);
          }
          sendProgress(40, 'navigating to FansList...');
          const fansArray = followersPath.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, jsonData);
          if(!Array.isArray(fansArray)) throw new Error('FansList not found or not an array');
          sendProgress(55, \`filtering \${fansArray.length} followers...\`);
          const validFollowers = [];
          for(let i=0; i<fansArray.length; i++) {
            const item = fansArray[i];
            if(item && typeof item.UserName === 'string' && item.Date != null) validFollowers.push({ UserName: item.UserName, Date: item.Date });
            if(i % 15000 === 0 && i>0) sendProgress(55 + Math.floor((i/fansArray.length)*10), \`filtered \${i}/\${fansArray.length} followers\`);
          }
          sendProgress(70, 'sorting followers by date (latest first)');
          validFollowers.sort((a,b) => new Date(b.Date) - new Date(a.Date));
          sendProgress(80, \`taking latest \${maxExtract} followers from index \${startIdx}\`);
          const extractedFollowers = validFollowers.slice(startIdx, startIdx + maxExtract);
          sendProgress(85, 'extracting following list for analytics...');
          const followingArray = followingPath.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, jsonData);
          let followingList = [];
          if(Array.isArray(followingArray)) {
            for(const item of followingArray) {
              const username = typeof item === 'string' ? item : (item.UserName || item.uniqueId);
              if(username) followingList.push(username);
            }
          }
          const followingSet = new Set(followingList);
          for(const follower of extractedFollowers) {
            follower.followBack = followingSet.has(follower.UserName);
          }
          sendProgress(100, 'extraction done');
          self.postMessage({ type: 'result', followers: extractedFollowers, following: followingList });
        } catch(err) {
          self.postMessage({ type: 'error', errorMsg: err.message });
        }
      };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    activeWorker = worker;

    worker.onmessage = (ev) => {
      const data = ev.data;
      if (data.type === 'progress') onProgress(data.percent, data.message);
      else if (data.type === 'result') {
        State.setExtractedData(data.followers, data.following);
        onComplete(data.followers);
        URL.revokeObjectURL(workerUrl);
        activeWorker = null;
      } else if (data.type === 'error') {
        onError(data.errorMsg);
        URL.revokeObjectURL(workerUrl);
        activeWorker = null;
      }
    };
    worker.onerror = (err) => {
      onError('Worker error: ' + err.message);
      URL.revokeObjectURL(workerUrl);
      activeWorker = null;
    };
    worker.postMessage({ source, sourceType, followersPath, followingPath, startIdx, maxExtract });
  };
})(window.TikTokApp.FollowBack.Services.Extraction);

// FollowBack UI modules
// Core
(function(core) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  function showDialog(msg) {
    if (DOM.dialogMsg) DOM.dialogMsg.innerHTML = msg;
    if (DOM.dialogOverlay) DOM.dialogOverlay.classList.add('active');
  }
  function closeDialog() {
    if (DOM.dialogOverlay) DOM.dialogOverlay.classList.remove('active');
  }
  if (DOM.closeDialogBtn) DOM.closeDialogBtn.addEventListener('click', closeDialog);
  if (DOM.dialogOkBtn) DOM.dialogOkBtn.addEventListener('click', closeDialog);
  if (DOM.dialogOverlay) DOM.dialogOverlay.addEventListener('click', (e) => { if (e.target === DOM.dialogOverlay) closeDialog(); });
  function updateProgress(percent, msg) {
    if (DOM.progressFill) DOM.progressFill.style.width = Math.min(100, percent) + '%';
    if (DOM.progressMsg) DOM.progressMsg.innerText = msg || '';
  }
  function updateButtonsState(hasData) {
    if (DOM.renderTableBtn) DOM.renderTableBtn.disabled = !hasData;
    if (DOM.fetchProfilesBtn) DOM.fetchProfilesBtn.disabled = !hasData;
    if (DOM.extractBtn) { DOM.extractBtn.disabled = !hasData; DOM.extractBtn.classList.add('hidden'); }
    if (DOM.fetchProfilesBtn) DOM.fetchProfilesBtn.classList.remove('hidden');
  }
  const panes = { tabJson: DOM.tabJson, tabSample: DOM.tabSample, tabConfig: DOM.tabConfig, tabAnalytics: DOM.tabAnalytics };
  const tabBtns = document.querySelectorAll('#followback-section [data-tab]');
  
  function switchTab(tabId) {
    Object.values(panes).forEach(pane => { if (pane) pane.classList.add('hidden'); });
    if (panes[tabId]) panes[tabId].classList.remove('hidden');
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
  }
  const cpanes = { tabConfigJson: DOM.tabConfigJson, tabConfigExtract: DOM.tabConfigExtract, tabConfigApi: DOM.tabConfigApi, tabConfigUi: DOM.tabConfigUi };
  const tabCBtns = document.querySelectorAll('#followback-section [data-ctab]');
  function switchCTab(tabId) {
    Object.values(cpanes).forEach(pane => { if (pane) pane.classList.add('hidden'); });
    if (cpanes[tabId]) cpanes[tabId].classList.remove('hidden');
    tabCBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-ctab') === tabId));
  }
  tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab'))));
  tabCBtns.forEach(btn => btn.addEventListener('click', () => switchCTab(btn.getAttribute('data-ctab'))));
  core.showDialog = showDialog;
  core.updateProgress = updateProgress;
  core.updateButtonsState = updateButtonsState;
  core.switchTab = switchTab;
  core.switchCTab = switchCTab;
})(window.TikTokApp.FollowBack.UI.Core);

// Extract
(function(extractUI) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  const Core = window.TikTokApp.FollowBack.UI.Core;
  const Extraction = window.TikTokApp.FollowBack.Services.Extraction;
  const State = window.TikTokApp.FollowBack.State;
  
  if (DOM.extractBtn){
    DOM.extractBtn.disabled = true;
}
  function displayExtractedJson(list) {
    if (!DOM.extractedJsonPre) return;
    if (!list || list.length === 0) {
      DOM.extractedJsonPre.innerText = 'No followers extracted.';
      Core.updateButtonsState(false);
      window.TikTokApp.FollowBack.UI.setJsonButtonsEnabled(false);
      State.setNotFollowedBack([]);
      return;
    }
    const notFollowed = list.filter(item => !item.followBack);
    State.setNotFollowedBack(notFollowed);
    
    DOM.extractedJsonPre.innerText = JSON.stringify(list, null, 2);
    Core.updateProgress(100, `Extracted ${list.length} followers`);
    Core.updateButtonsState(true);
    window.TikTokApp.FollowBack.UI.setJsonButtonsEnabled(true);
  }

  async function performExtraction() {
    if (!DOM.fileInput || !DOM.fileInput.files.length) { Core.showDialog('Please select a JSON file.'); return; }
    const source = DOM.fileInput.files[0];
    const sourceType = 'file';
    if (DOM.extractedJsonPre) DOM.extractedJsonPre.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Processing...';
    Core.updateButtonsState(false);
    Core.updateProgress(2, 'starting worker...');
    await Extraction.performExtraction(source, sourceType, {
      onProgress: Core.updateProgress,
      onComplete: (list) => displayExtractedJson(list),
      onError: (errMsg) => {
        Core.showDialog('Extraction failed: ' + errMsg);
        Core.updateProgress(0, 'error');
        if (DOM.extractedJsonPre) DOM.extractedJsonPre.innerText = 'Error: ' + errMsg;
        Core.updateButtonsState(false);
      }
    });
  }

  if (DOM.customFileBtn && DOM.fileInput) DOM.customFileBtn.addEventListener('click', () => DOM.fileInput.click());
  if (DOM.fileInput && DOM.fileLabelSpan) {
    DOM.fileInput.addEventListener('change', () => {
      if (DOM.fileInput.files.length) {
        const name = DOM.fileInput.files[0].name;
        DOM.fileLabelSpan.innerText = name.slice(0, 25) + (name.length > 25 ? '...' : '');
        DOM.extractBtn.disabled = false;
        if (DOM.autoExtract && DOM.autoExtract.checked) performExtraction();
      } else { DOM.fileLabelSpan.innerText = 'upload json';
      DOM.extractBtn.disabled = true;
        
      }
    });
  }
  if (DOM.extractBtn) DOM.extractBtn.addEventListener('click', performExtraction);
  extractUI.performExtraction = performExtraction;
})(window.TikTokApp.FollowBack.UI.Extract);

// Fetch
(function(fetchUI) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  const Core = window.TikTokApp.FollowBack.UI.Core;
  const Helpers = window.TikTokApp.FollowBack.Helpers;
  const Render = window.TikTokApp.FollowBack.Render;
  const State = window.TikTokApp.FollowBack.State;
  const Fetcher = window.TikTokApp.Shared.Fetcher;
  const Config = window.TikTokApp.FollowBack.Config;

  async function fetchAndUpdateAll() {
    const list = State.getExtractedFollowers();
    if (!list || list.length === 0) { Core.showDialog('No extracted data. Please run extraction first.'); return; }
    if (DOM.fetchProfilesBtn) { DOM.fetchProfilesBtn.disabled = true; DOM.fetchProfilesBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
    if (DOM.extractedJsonPre) DOM.extractedJsonPre.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Fetching profiles...';
    try {
      const usernames = list.map(item => item.UserName).filter(u => u);
    
      const fetchedResults = await Fetcher.fetchBatchProfiles(usernames, Core.updateProgress);
      const enrichedList = list.map((item, idx) => {
        const fetched = fetchedResults[idx];
        if (fetched && !fetched.error) {
          return { ...item, followerCount: fetched.followers, followingCount: fetched.following, heartCount: fetched.likes, avatarUrl: fetched.avatarUrl, displayName: fetched.displayName, verified: fetched.verified || false };
        }
        return item;
      });
      State.setEnrichedFollowers(enrichedList);
      const tableData = enrichedList.map(item => ({
        avatar: item.avatarUrl || Config.get('DEFAULT_AVATAR_URL'),
        displayName: item.displayName || '',
        handle: `@${item.UserName}`,
        followers: item.followerCount || '',
        following: item.followingCount || '',
        likes: item.heartCount || '',
        date: Helpers.formatDate(item.Date),
        followBack: item.followBack || false,
        verified: item.verified || false
      }));
      tableData.sort((a, b) => (Helpers.parseFormattedNumber(b.followers) - Helpers.parseFormattedNumber(a.followers)));
      const minFollowers = Config.get('MIN_FOLLOWERS_TO_FILTER');
      const filtered = tableData.filter(item => Helpers.parseFormattedNumber(item.followers) >= minFollowers);
      Render.renderTable(filtered);
      const jsonForPre = filtered.map(({ avatar, ...rest }) => rest);
      if (DOM.extractedJsonPre) DOM.extractedJsonPre.innerText = JSON.stringify(jsonForPre, null, 2);
      window.TikTokApp.FollowBack.UI.setJsonButtonsEnabled(true);
      const successCount = fetchedResults.filter(r => r && !r.error).length;
      Core.showDialog(`Fetched ${successCount} profiles. Table updated (filter ≥ ${minFollowers.toLocaleString()} followers).`);
      Core.switchTab('tabSample');
    } catch (err) {
      console.error(err);
      if (DOM.extractedJsonPre) DOM.extractedJsonPre.innerText = `Error: ${err.message}`;
      Core.showDialog(`Fetch failed: ${err.message}`);
    } finally {
      if (DOM.fetchProfilesBtn) { DOM.fetchProfilesBtn.disabled = false; DOM.fetchProfilesBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
    }
  }
  if (DOM.fetchProfilesBtn) DOM.fetchProfilesBtn.addEventListener('click', fetchAndUpdateAll);
  fetchUI.fetchAndUpdateAll = fetchAndUpdateAll;
})(window.TikTokApp.FollowBack.UI.Fetch);

// Settings
(function(settingsUI) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  const Core = window.TikTokApp.FollowBack.UI.Core;
  const Config = window.TikTokApp.FollowBack.Config;

  function loadConfigToForm() {
    if (DOM.cfg_jsonPath) DOM.cfg_jsonPath.value = Config.get('JSON_PATH_TO_FANS').join(', ');
    if (DOM.cfg_followingPath) DOM.cfg_followingPath.value = Config.get('FOLLOWING_PATH').join(', ');
    if (DOM.cfg_startIndex) DOM.cfg_startIndex.value = Config.get('EXTRACT_START_INDEX');
    if (DOM.cfg_maxExtract) DOM.cfg_maxExtract.value = Config.get('MAX_FOLLOWERS_TO_EXTRACT');
    if (DOM.cfg_apiBase) DOM.cfg_apiBase.value = Config.get('API_BASE_URL');
    if (DOM.cfg_userPath) DOM.cfg_userPath.value = Config.get('API_USER_PATH');
    if (DOM.cfg_apiKeyStorageKey) DOM.cfg_apiKeyStorageKey.value = Config.get('API_KEY_STORAGE_KEY');
    if (DOM.cfg_apiKeyHeader) DOM.cfg_apiKeyHeader.value = Config.get('API_KEY_HEADER_NAME');
    if (DOM.cfg_authHeader) DOM.cfg_authHeader.value = Config.get('AUTH_HEADER_NAME');
    if (DOM.cfg_concurrency) DOM.cfg_concurrency.value = Config.get('FETCH_CONCURRENCY');
    if (DOM.cfg_defaultAvatar) DOM.cfg_defaultAvatar.value = Config.get('DEFAULT_AVATAR_URL');
    if (DOM.cfg_millionThreshold) DOM.cfg_millionThreshold.value = Config.get('MILLION_THRESHOLD');
    if (DOM.cfg_thousandThreshold) DOM.cfg_thousandThreshold.value = Config.get('THOUSAND_THRESHOLD');
    if (DOM.cfg_dateLocale) DOM.cfg_dateLocale.value = Config.get('DATE_LOCALE');
    if (DOM.cfg_dateFormat) DOM.cfg_dateFormat.value = JSON.stringify(Config.get('DATE_FORMAT_OPTIONS'));
    if (DOM.cfg_minFollowers) DOM.cfg_minFollowers.value = Config.get('MIN_FOLLOWERS_TO_FILTER');
    if (DOM.cfg_ownUsername) DOM.cfg_ownUsername.value = Config.get('OWN_USERNAME');
  }

  function saveConfigFromForm() {
    try {
      const newConfig = {
        JSON_PATH_TO_FANS: DOM.cfg_jsonPath ? DOM.cfg_jsonPath.value.split(',').map(s => s.trim()) : [],
        FOLLOWING_PATH: DOM.cfg_followingPath ? DOM.cfg_followingPath.value.split(',').map(s => s.trim()) : [],
        EXTRACT_START_INDEX: DOM.cfg_startIndex ? parseInt(DOM.cfg_startIndex.value, 10) : 0,
        MAX_FOLLOWERS_TO_EXTRACT: DOM.cfg_maxExtract ? parseInt(DOM.cfg_maxExtract.value, 10) : 300,
        API_BASE_URL: DOM.cfg_apiBase ? DOM.cfg_apiBase.value : '',
        API_USER_PATH: DOM.cfg_userPath ? DOM.cfg_userPath.value : '/api/followback',
        API_KEY_STORAGE_KEY: DOM.cfg_apiKeyStorageKey ? DOM.cfg_apiKeyStorageKey.value : '',
        API_KEY_HEADER_NAME: DOM.cfg_apiKeyHeader ? DOM.cfg_apiKeyHeader.value : '',
        AUTH_HEADER_NAME: DOM.cfg_authHeader ? DOM.cfg_authHeader.value : '',
        FETCH_CONCURRENCY: DOM.cfg_concurrency ? parseInt(DOM.cfg_concurrency.value, 10) : 5,
        DEFAULT_AVATAR_URL: DOM.cfg_defaultAvatar ? DOM.cfg_defaultAvatar.value : '',
        MILLION_THRESHOLD: DOM.cfg_millionThreshold ? parseFloat(DOM.cfg_millionThreshold.value) : 1e6,
        THOUSAND_THRESHOLD: DOM.cfg_thousandThreshold ? parseFloat(DOM.cfg_thousandThreshold.value) : 1e3,
        DATE_LOCALE: DOM.cfg_dateLocale ? DOM.cfg_dateLocale.value : 'en-US',
        DATE_FORMAT_OPTIONS: DOM.cfg_dateFormat ? JSON.parse(DOM.cfg_dateFormat.value) : { year: 'numeric', month: 'short' },
        MIN_FOLLOWERS_TO_FILTER: DOM.cfg_minFollowers ? parseInt(DOM.cfg_minFollowers.value, 10) : 10000,
        OWN_USERNAME: DOM.cfg_ownUsername ? DOM.cfg_ownUsername.value.trim() : ''
      };
      Config.update(newConfig);
      Core.showDialog('Settings saved. They will be used for future extractions and fetches.');
    } catch (e) {
      Core.showDialog('Invalid JSON for date format: ' + e.message);
    }
  }

  function resetConfig() {
    Config.reset();
    loadConfigToForm();
    Core.showDialog('Settings reset to defaults.');
  }

  if (DOM.saveConfigBtn) DOM.saveConfigBtn.addEventListener('click', saveConfigFromForm);
  if (DOM.resetConfigBtn) DOM.resetConfigBtn.addEventListener('click', resetConfig);
  loadConfigToForm();
  settingsUI.loadConfigToForm = loadConfigToForm;
  settingsUI.saveConfigFromForm = saveConfigFromForm;
  settingsUI.resetConfig = resetConfig;
})(window.TikTokApp.FollowBack.UI.Settings);

// Render
(function(render) {
  const Helpers = window.TikTokApp.FollowBack.Helpers;
  render.renderTable = function(dataArray) {
    const tbody = document.getElementById('dynamicTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    dataArray.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-index', idx);
      const tdAvatar = document.createElement('td');
      const img = document.createElement('img');
      img.src = row.avatar;
      img.alt = 'avatar';
      img.className = 'avatar-img';
      tdAvatar.appendChild(img);
      tr.appendChild(tdAvatar);
      const tdUser = document.createElement('td');
      const nameDiv = document.createElement('div');
      nameDiv.className = 'user-name';
      nameDiv.title = row.displayName || '';
      nameDiv.textContent = row.displayName || '';
      const handleDiv = document.createElement('div');
      handleDiv.className = 'user-handle';
      handleDiv.title = row.handle || '';
      handleDiv.textContent = row.handle || '';
      tdUser.appendChild(nameDiv);
      tdUser.appendChild(handleDiv);
      tr.appendChild(tdUser);
      const tdFollowers = document.createElement('td');
      tdFollowers.className = 'stats-number';
      tdFollowers.textContent = Helpers.formatNumber(row.followers) || '';
      tr.appendChild(tdFollowers);
      const tdFollowing = document.createElement('td');
      tdFollowing.className = 'stats-number';
      tdFollowing.textContent = Helpers.formatNumber(row.following) || '';
      tr.appendChild(tdFollowing);
      const tdLikes = document.createElement('td');
      tdLikes.className = 'stats-number';
      tdLikes.textContent = Helpers.formatNumber(row.likes) || '';
      tr.appendChild(tdLikes);
      const tdDate = document.createElement('td');
      let dateVal = row.date;
      if (dateVal && typeof dateVal === 'string' && dateVal.includes('-')) dateVal = Helpers.formatDate(dateVal);
      tdDate.textContent = dateVal || '';
      tr.appendChild(tdDate);
      const tdCheck = document.createElement('td');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'table-checkbox';
      chk.checked = !!row.followBack;
      tdCheck.appendChild(chk);
      tr.appendChild(tdCheck);
      tbody.appendChild(tr);
    });
  };
})(window.TikTokApp.FollowBack.Render);

// Analytics
(function(analyticsUI) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  const Core = window.TikTokApp.FollowBack.UI.Core;
  const State = window.TikTokApp.FollowBack.State;
  const Config = window.TikTokApp.FollowBack.Config;
  const Helpers = window.TikTokApp.FollowBack.Helpers;

  let chartDist = null;
  let chartMutual = null;

  function formatNumberShort(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  }

  function renderCards(stats) {
    const container = DOM.analyticsCards;
    if (!container) return;
    container.innerHTML = `
      <div class="grid grid-cols-3 md:grid-cols-4 gap-3">
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-md font-bold text-indigo-300">${stats.totalFollowers}</div>
          <div class="text-xs text-slate-400">Total Followers</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-md font-bold text-emerald-300">${stats.mutual}</div>
          <div class="text-xs text-slate-400">Mutual Followers</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-md font-bold text-amber-300">${stats.nonMutual}</div>
          <div class="text-xs text-slate-400">Not Following Back</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-md font-bold text-cyan-300">${stats.youFollowNonFollowers}</div>
          <div class="text-xs text-slate-400">You Follow (No Return)</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-md font-bold text-purple-300">${Math.round(stats.avgFollowers)}</div>
          <div class="text-xs text-slate-400">Avg Follower Count</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 text-center">
          <div class="text-xl font-bold text-pink-300">${stats.verifiedCount}</div>
          <div class="text-xs text-slate-400">Verified Accounts</div>
        </div>
      </div>
    `;
  }

  function renderCharts(data) {
    const bins = [0, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
    const counts = new Array(bins.length - 1).fill(0);
    data.forEach(f => {
      const val = Helpers.parseFormattedNumber(f.followers);
      for (let i = 0; i < bins.length - 1; i++) {
        if (val >= bins[i] && val < bins[i + 1]) { counts[i]++; return; }
      }
      if (val >= bins[bins.length - 1]) counts[counts.length - 1]++;
    });
    const labels = bins.slice(0, -1).map((b, i) => `${b.toLocaleString()}-${bins[i+1].toLocaleString()}`);

    if (chartDist) chartDist.destroy();
    const ctxDist = document.getElementById('chartDist')?.getContext('2d');
    if (ctxDist) {
      chartDist = new Chart(ctxDist, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Followers', data: counts, backgroundColor: '#6366f1' }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
      });
    }

    const mutual = data.filter(f => f.followBack).length;
    const nonMutual = data.length - mutual;
    if (chartMutual) chartMutual.destroy();
    const ctxMutual = document.getElementById('chartMutual')?.getContext('2d');
    if (ctxMutual) {
      chartMutual = new Chart(ctxMutual, {
        type: 'pie',
        data: { labels: ['Mutual', 'Not Mutual'], datasets: [{ data: [mutual, nonMutual], backgroundColor: ['#10b981', '#f59e0b'] }] },
        options: { responsive: true, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
      });
    }
  }

  function renderBestCandidates(followers) {
    const tbody = DOM.bestCandidatesBody;
    if (!tbody) return;
    const minFollowers = Config.get('MIN_FOLLOWERS_TO_FILTER');
    const candidates = followers.filter(f =>
      !f.followBack && f.followerCount && Helpers.parseFormattedNumber(f.followerCount) >= minFollowers
    ).sort((a, b) => Helpers.parseFormattedNumber(b.followerCount) - Helpers.parseFormattedNumber(a.followerCount));

    tbody.innerHTML = '';
    if (candidates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-400">No candidates found</td></tr>';
      return;
    }
    candidates.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-2 py-1"><img src="${f.avatarUrl || Config.get('DEFAULT_AVATAR_URL')}" class="w-6 h-6 rounded-full"></td>
        <td class="px-2 py-1">${f.displayName || f.UserName}</td>
        <td class="px-2 py-1">${Helpers.formatNumber(f.followerCount)}</td>
        <td class="px-2 py-1"><input type="checkbox" class="table-checkbox candidate-follow" data-username="${f.UserName}"></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderSuspicious(followers) {
    const tbody = DOM.suspiciousBody;
    if (!tbody) return;
    const suspicious = followers.filter(f =>
      f.followingCount && f.followerCount &&
      Helpers.parseFormattedNumber(f.followingCount) > 5000 &&
      Helpers.parseFormattedNumber(f.followerCount) < 100
    ).sort((a, b) => Helpers.parseFormattedNumber(b.followingCount) - Helpers.parseFormattedNumber(a.followingCount));

    tbody.innerHTML = '';
    if (suspicious.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-400">No suspicious accounts detected</td></tr>';
      return;
    }
    suspicious.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-2 py-1"><img src="${f.avatarUrl || Config.get('DEFAULT_AVATAR_URL')}" class="w-6 h-6 rounded-full"></td>
        <td class="px-2 py-1">${f.displayName || f.UserName}</td>
        <td class="px-2 py-1">${Helpers.formatNumber(f.followerCount)}</td>
        <td class="px-2 py-1">${Helpers.formatNumber(f.followingCount)}</td>
        <td class="px-2 py-1"><input type="checkbox" class="table-checkbox suspicious-unfollow" data-username="${f.UserName}"></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function computeStats(followers, followingList) {
    const totalFollowers = followers.length;
    const mutual = followers.filter(f => f.followBack).length;
    const nonMutual = totalFollowers - mutual;
    const ownUsername = Config.get('OWN_USERNAME');
    let youFollowNonFollowers = 0;
    if (ownUsername) {
      const followerUsernames = new Set(followers.map(f => f.UserName));
      youFollowNonFollowers = followingList.filter(u => !followerUsernames.has(u)).length;
    } else {
      youFollowNonFollowers = 'N/A (set username)';
    }
    const followerCounts = followers.map(f => Helpers.parseFormattedNumber(f.followerCount)).filter(v => v > 0);
    const avgFollowers = followerCounts.length ? followerCounts.reduce((a, b) => a + b, 0) / followerCounts.length : 0;
    const verifiedCount = followers.filter(f => f.verified).length;
    return { totalFollowers, mutual, nonMutual, youFollowNonFollowers, avgFollowers, verifiedCount };
  }

  async function refreshAnalytics() {
    const followers = State.getExtractedFollowers();
    const followingList = State.getExtractedFollowing();
    if (!followers || followers.length === 0) {
      Core.showDialog('No extracted data. Please run extraction and fetch profiles first.');
      return;
    }
    const stats = computeStats(followers, followingList || []);
    renderCards(stats);
    renderCharts(followers);
    renderBestCandidates(followers);
    renderSuspicious(followers);
  }

  function init() {
    const tabBtn = document.querySelector('[data-tab="tabAnalytics"]');
    if (tabBtn) {
      tabBtn.addEventListener('click', () => setTimeout(refreshAnalytics, 100));
    }
  }
  init();
  analyticsUI.refreshAnalytics = refreshAnalytics;
})(window.TikTokApp.FollowBack.UI.Analytics);

// Buttons
(function(buttonsUI) {
  const DOM = window.TikTokApp.FollowBack.DOM;
  const Core = window.TikTokApp.FollowBack.UI.Core;
  const copyBtn = document.getElementById('copyJsonBtn');
  const downloadBtn = document.getElementById('downloadJsonBtn');
  function setJsonButtonsEnabled(enabled) {
    if (copyBtn) copyBtn.disabled = !enabled;
    if (downloadBtn) downloadBtn.disabled = !enabled;
  }
  window.TikTokApp.FollowBack.UI.setJsonButtonsEnabled = setJsonButtonsEnabled;
  if (copyBtn) {
    copyBtn.addEventListener('click', async function() {
      const pre = DOM.extractedJsonPre;
      const text = pre?.innerText || '';
      if (!text || text.includes('-- No data yet --') || text.includes('Error')) {
        Core.showDialog('No valid JSON data to copy.');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        Core.showDialog('✅ JSON copied to clipboard!');
      } catch {
        const range = document.createRange();
        range.selectNode(pre);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        Core.showDialog('✅ JSON copied (fallback method).');
      }
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      const pre = DOM.extractedJsonPre;
      const text = pre?.innerText || '';
      if (!text || text.includes('-- No data yet --') || text.includes('Error')) {
        Core.showDialog('No valid JSON data to download.');
        return;
      }
      try {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted_followers.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Core.showDialog('📥 Download started!');
      } catch (err) {
        Core.showDialog('Download failed: ' + err.message);
      }
    });
  }
  setJsonButtonsEnabled(false);
})(window.TikTokApp.FollowBack.UI.Buttons);

(function(download) {
  function downloadJSON(data, filename) {
    if (!data) return false;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  
  function getComparison() {
    try {
      const state = window.TikTokApp?.Compare?.State?.get?.();
      return state?.comparison || null;
    } catch (_) { return null; }
  }
  
  function getTable() {
    return window.TikTokApp?.Compare?.UI?.Table || null;
  }
  
  // ---------- RAW LISTS (individual) ----------
  download.downloadRawUnfollowed = function(filename) {
    const comp = getComparison();
    if (!comp || !comp.unfollowed) return false;
    return downloadJSON(comp.unfollowed, filename || 'raw_unfollowed.json');
  };
  
  download.downloadRawNew = function(filename) {
    const comp = getComparison();
    if (!comp || !comp.newFollowers) return false;
    return downloadJSON(comp.newFollowers, filename || 'raw_new.json');
  };
  
  download.downloadRawReturning = function(filename) {
    const comp = getComparison();
    if (!comp || !comp.returning) return false;
    return downloadJSON(comp.returning, filename || 'raw_returning.json');
  };
  
  download.downloadRawStable = function(filename) {
    const comp = getComparison();
    if (!comp || !comp.stable) return false;
    return downloadJSON(comp.stable, filename || 'raw_stable.json');
  };
  
  // ---------- ACTIVE ENRICHED LISTS ----------
  download.getActiveListType = function() {
    const table = getTable();
    return table?.currentListType ?? null;
  };
  
  download.getShowFailed = function() {
    const table = getTable();
    return table?.showFailed ?? true;
  };
  
  download.getActiveEnriched = function() {
    const table = getTable();
    return table?.currentUsers ?? null;
  };
  
  download.getActiveFiltered = function() {
    const data = download.getActiveEnriched();
    if (!data) return null;
    if (download.getShowFailed()) {
      return data;
    } else {
      return data.filter(item => item.fetchError !== true);
    }
  };
  
  download.downloadActiveEnriched = function(filename) {
    const data = download.getActiveEnriched();
    if (!data || data.length === 0) {
      console.warn('[TikTokApp.Compare.Download] No enriched active data. Fetch profiles first.');
      return false;
    }
    const type = download.getActiveListType() || 'unknown';
    return downloadJSON(data, filename || `active_${type}_enriched.json`);
  };
  
  download.downloadActiveFiltered = function(filename) {
    const data = download.getActiveFiltered();
    if (!data || data.length === 0) {
      console.warn('[TikTokApp.Compare.Download] No filtered active data. Ensure data exists and toggle is applied.');
      return false;
    }
    const type = download.getActiveListType() || 'unknown';
    const suffix = download.getShowFailed() ? '' : '_filtered';
    return downloadJSON(data, filename || `active_${type}${suffix}.json`);
  };
  
  download.downloadActive = download.downloadActiveFiltered;
  
  // ---------- BUTTON BINDING ----------
  function bindButtons() {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.download-btn[data-module="compare"]');
      if (!btn) return;
      const method = btn.dataset.method;
      if (method && typeof download[method] === 'function') {
        download[method]();
      } else {
        console.warn('[TikTokApp.Compare.Download] Method not found:', method);
      }
    });
  }
  
  // ---------- BUTTON STATE MANAGEMENT ----------
  function updateDownloadButtons() {
  const activeType = download.getActiveListType();
  if (!activeType) {
    document.querySelectorAll('.download-btn[data-module="compare"][data-list]').forEach(btn => btn.disabled = true);
    return;
  }
  document.querySelectorAll('.download-btn[data-module="compare"][data-list]').forEach(btn => {
    const list = btn.dataset.list;
    btn.disabled = (list !== activeType);
  });
}
  
  function setupUIListeners() {
    // Observer for download section visibility
    const downloadSection = document.getElementById('download-section');
    if (downloadSection) {
      const observer = new MutationObserver(() => {
        if (!downloadSection.classList.contains('hidden')) {
          updateDownloadButtons();
        }
      });
      observer.observe(downloadSection, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Listen to list-type button clicks in the Compare table
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.list-type-btn');
      if (btn) {
        setTimeout(updateDownloadButtons, 50);
      }
    });
  }
  
  // ---------- INIT ----------
  function init() {
    bindButtons();
    setupUIListeners();
    // Initial update when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateDownloadButtons);
    } else {
      updateDownloadButtons();
    }
  }
  
  init();
  
})(window.TikTokApp.Compare.Download);

(function(download) {
  function downloadJSON(data, filename) {
    if (!data) return false;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  
  function getState() {
    return window.TikTokApp?.FollowBack?.State || null;
  }
  
  function getConfig() {
    return window.TikTokApp?.FollowBack?.Config || null;
  }
  
  function getHelpers() {
    return window.TikTokApp?.FollowBack?.Helpers || null;
  }
  
  // ---------- 1. Raw not‑followed‑back (before fetch) ----------
  download.downloadNotFollowedBack = function(filename) {
    const state = getState();
    if (!state) return false;
    const data = state.getNotFollowedBack ? state.getNotFollowedBack() : null;
    if (!data || data.length === 0) {
      console.warn('[FollowBack.Download] No not-followed-back data. Run extraction first.');
      return false;
    }
    return downloadJSON(data, filename || 'not_followed_back.json');
  };
  
  // ---------- 2. Enriched not‑followed‑back (full, unfiltered) ----------
  download.downloadNotFollowedBackEnriched = function(filename) {
    const state = getState();
    if (!state) return false;
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) {
      console.warn('[FollowBack.Download] No enriched data. Run fetch profiles first.');
      return false;
    }
    const notFollowed = enriched.filter(item => !item.followBack);
    if (notFollowed.length === 0) {
      console.warn('[FollowBack.Download] No not-followed-back users found in enriched data.');
      return false;
    }
    return downloadJSON(notFollowed, filename || 'not_followed_back_enriched.json');
  };
  
  // ---------- 3. Filtered + formatted (matches UI preview) ----------
  download.downloadEnrichedFiltered = function(filename) {
    const state = getState();
    const config = getConfig();
    const helpers = getHelpers();
    if (!state || !config) {
      console.warn('[FollowBack.Download] State or Config not available.');
      return false;
    }
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) {
      console.warn('[FollowBack.Download] No enriched data. Run fetch profiles first.');
      return false;
    }
    
    const minFollowers = config.get ? config.get('MIN_FOLLOWERS_TO_FILTER') : 10000;
    let filtered = enriched.filter(item => {
      const count = item.followerCount || 0;
      return count >= minFollowers;
    });
    filtered.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    
    const tableData = filtered.map(item => ({
      displayName: item.displayName || '',
      handle: `@${item.UserName}`,
      followers: helpers ? helpers.formatNumber(item.followerCount) : item.followerCount,
      following: helpers ? helpers.formatNumber(item.followingCount) : item.followingCount,
      likes: helpers ? helpers.formatNumber(item.heartCount) : item.heartCount,
      date: helpers ? helpers.formatDate(item.Date) : item.Date,
      followBack: item.followBack || false,
      verified: item.verified || false
    }));
    
    return downloadJSON(tableData, filename || 'enriched_filtered_formatted.json');
  };
  
  // ---------- 4. Filtered + raw (unformatted, includes avatar) ----------
  download.downloadEnrichedFilteredRaw = function(filename) {
    const state = getState();
    const config = getConfig();
    if (!state || !config) {
      console.warn('[FollowBack.Download] State or Config not available.');
      return false;
    }
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) {
      console.warn('[FollowBack.Download] No enriched data. Run fetch profiles first.');
      return false;
    }
    
    const minFollowers = config.get ? config.get('MIN_FOLLOWERS_TO_FILTER') : 10000;
    let filtered = enriched.filter(item => {
      const count = item.followerCount || 0;
      return count >= minFollowers;
    });
    filtered.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    
    return downloadJSON(filtered, filename || 'enriched_filtered_raw.json');
  };
  
  // ---------- BUTTON BINDING ----------
  function bindButtons() {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.download-btn[data-module="followback"]');
      if (!btn) return;
      const method = btn.dataset.method;
      if (method && typeof download[method] === 'function') {
        download[method]();
      } else {
        console.warn('[TikTokApp.FollowBack.Download] Method not found:', method);
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
  
})(window.TikTokApp.FollowBack.Download);

// ==================== MAIN INITIALISATION ====================
(function(main) {
  const CompareDOM = window.TikTokApp.Compare.DOM;
  const CompareCore = window.TikTokApp.Compare.UI.Core;
  const CompareFiles = window.TikTokApp.Compare.UI.Files;
  const CompareResults = window.TikTokApp.Compare.UI.Results;
  const CompareStats = window.TikTokApp.Compare.UI.Stats;
  const CompareTable = window.TikTokApp.Compare.UI.Table;
  const CompareState = window.TikTokApp.Compare.State;
  const CompareHelpers = window.TikTokApp.Compare.Helpers;
  const CompareConfig = window.TikTokApp.Compare.Config;
  
  const FollowBackDOM = window.TikTokApp.FollowBack.DOM;
  const FollowBackCore = window.TikTokApp.FollowBack.UI.Core;
  const FollowBackExtract = window.TikTokApp.FollowBack.UI.Extract;
  const FollowBackFetch = window.TikTokApp.FollowBack.UI.Fetch;
  const FollowBackSettings = window.TikTokApp.FollowBack.UI.Settings;
  const FollowBackAnalytics = window.TikTokApp.FollowBack.UI.Analytics;
  const FollowBackRender = window.TikTokApp.FollowBack.Render;
  const FollowBackState = window.TikTokApp.FollowBack.State;
  const FollowBackHelpers = window.TikTokApp.FollowBack.Helpers;
  const FollowBackConfig = window.TikTokApp.FollowBack.Config;
  
  // ========== COMPARE INITIALISATION ==========
 
 function initCompare() {
  CompareFiles.init();
  CompareResults.init();
  CompareStats.init();
  CompareTable.init();
  CompareCore.setButtonsEnabled(false);
  CompareDOM.extractOldBtn.disabled = true;
  CompareDOM.extractNewBtn.disabled = true;
  CompareDOM.extractBothBtn.disabled = true;
  CompareDOM.progressBar.style.width = '0%';
  CompareDOM.progressBarOld.style.width = '0%';
  CompareDOM.progressBarNew.style.width = '0%';
  CompareDOM.progressText.innerHTML = 'ready';
  CompareDOM.setStatus('ready');
  CompareCore.switchTab('tab-files');
  
  // Bind Compare tab buttons
  CompareDOM.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => CompareCore.switchTab(btn.dataset.tab));
  });
}
  
  // ========== FOLLOWBACK INITIALISATION ==========
  function initFollowBack() {
    // Demo table
    const demoData = FollowBackConfig.get('DEMO_TABLE_DATA') || FollowBackConfig.DEFAULT.DEMO_TABLE_DATA;
    FollowBackRender.renderTable(demoData);
    
    // Active tab sync
    const activeTabBtn = document.querySelector('[data-tab].active');
    if (activeTabBtn) {
      const tabId = activeTabBtn.getAttribute('data-tab');
      FollowBackCore.switchTab(tabId);
    } else {
      FollowBackCore.switchTab('tabJson');
    }
    
    // Render extracted data to table button (original functionality)
    function renderExtractedToTable() {
      const list = FollowBackState.getExtractedFollowers();
      if (!list || list.length === 0) {
        FollowBackCore.showDialog('No extracted data. Please run extraction first.');
        return;
      }
      const tableData = list.map(item => FollowBackHelpers.normalizeExtractedToTableFormat(item));
      FollowBackRender.renderTable(tableData);
      FollowBackCore.switchTab('tabSample');
    }
    if (FollowBackDOM.renderTableBtn) {
      FollowBackDOM.renderTableBtn.addEventListener('click', renderExtractedToTable);
    }
  }
  
  // ========== SHARED INITIALISATION ==========
  function initShared() {
    // Compare dialog close
    CompareDOM.dialogCloseBtn.addEventListener('click', () => CompareDOM.closeDialog());
    CompareDOM.dialogOverlay.addEventListener('click', (e) => {
      if (e.target === CompareDOM.dialogOverlay) CompareDOM.closeDialog();
    });
    
    // Compare theme toggle
    if (CompareDOM.themeToggle) {
      CompareDOM.themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        CompareDOM.themeToggle.innerHTML = isDark ? '<i class="fa-regular fa-moon"></i>' : '<i class="fa-regular fa-sun"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
      // Set correct icon on load
      const isDark = document.documentElement.classList.contains('dark');
      CompareDOM.themeToggle.innerHTML = isDark ? '<i class="fa-regular fa-moon"></i>' : '<i class="fa-regular fa-sun"></i>';
    }
    
    // Compare clear all
    CompareDOM.clearAllBtn.addEventListener('click', () => {
      if (!confirm('Clear all comparison data?')) return;
      CompareState.resetAll();
      CompareDOM.oldFileStatus.innerHTML = 'none';
      CompareDOM.newFileStatus.innerHTML = 'none';
      document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('has-file'));
      CompareDOM.fileOld.value = '';
      CompareDOM.fileNew.value = '';
      CompareDOM.progressBar.style.width = '0%';
      CompareDOM.progressBarOld.style.width = '0%';
      CompareDOM.progressBarNew.style.width = '0%';
      CompareDOM.progressText.innerHTML = 'ready';
      CompareDOM.viewOldBtn.disabled = true;
      CompareDOM.viewNewBtn.disabled = true;
      CompareDOM.compareBtn.disabled = true;
      CompareDOM.extractOldBtn.disabled = true;
      CompareDOM.extractNewBtn.disabled = true;
      CompareDOM.extractBothBtn.disabled = true;
      CompareDOM.resultEmptyMsg.classList.remove('hidden');
      CompareDOM.resultSections.classList.add('hidden');
      CompareDOM.resultSingleMsg.classList.add('hidden');
      ['rUnfollowed', 'rNew', 'rReturning', 'rExisting', 'rRetention', 'rUnfollowedBadge', 'rNewBadge', 'rReturningBadge', 'rExistingBadge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = id.includes('Retention') ? '—' : '0';
      });
      ['unfollowed-list', 'new-list', 'returning-list', 'existing-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      CompareDOM.extOldCount.textContent = '0';
      CompareDOM.extNewCount.textContent = '0';
      CompareDOM.extRemovedOld.textContent = '0';
      CompareDOM.extRemovedNew.textContent = '0';
      CompareDOM.footerMemory.textContent = '—';
      CompareStats.updateStatsTab();
      CompareTable.refreshTable();
      localStorage.removeItem('TikTokApp_Compare_State');
      CompareDOM.toast('Cleared', 'info', 1000);
    });
    
    // Clock
    function updateClock() {
      CompareDOM.footerTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 30000);
  }
  
  // ========== SESSION PERSISTENCE (Compare only) ==========
  main.persistSession = function() {
    const s = CompareState.get();
    const sess = {
      files: { oldName: s.files.old?.name, newName: s.files.new?.name },
      extracted: {
        arrOld: s.extracted.arrOld.slice(0, CompareConfig.get('SESSION_MAX_ITEMS')),
        arrNew: s.extracted.arrNew.slice(0, CompareConfig.get('SESSION_MAX_ITEMS')),
        statsOld: s.extracted.statsOld,
        statsNew: s.extracted.statsNew
      },
      comparison: s.comparison
    };
    try { localStorage.setItem('TikTokApp_Compare_State', JSON.stringify(sess)); } catch (e) {}
  };
  
  main.restoreSession = function() {
    try {
      const raw = localStorage.getItem('TikTokApp_Compare_State');
      if (!raw) return false;
      const sess = JSON.parse(raw);
      if (sess.extracted?.arrOld?.length || sess.extracted?.arrNew?.length || sess.comparison) {
        const s = CompareState.get();
        s.extracted.arrOld = sess.extracted.arrOld || [];
        s.extracted.arrNew = sess.extracted.arrNew || [];
        s.extracted.statsOld = sess.extracted.statsOld || null;
        s.extracted.statsNew = sess.extracted.statsNew || null;
        s.comparison = sess.comparison || null;
        if (sess.files) {
          if (sess.files.oldName) CompareDOM.oldFileStatus.innerHTML = `<i class="fa-regular fa-file"></i> ${CompareHelpers.escapeHtml(sess.files.oldName)}`;
          if (sess.files.newName) CompareDOM.newFileStatus.innerHTML = `<i class="fa-regular fa-file"></i> ${CompareHelpers.escapeHtml(sess.files.newName)}`;
        }
        CompareStats.updateStatsTab();
        if (s.comparison) {
          CompareResults.renderResults(s.comparison);
          CompareTable.refreshTable();
        }
        // Update button states based on restored files
        CompareDOM.extractOldBtn.disabled = !s.files.old;
        CompareDOM.extractNewBtn.disabled = !s.files.new;
        CompareDOM.extractBothBtn.disabled = !(s.files.old && s.files.new);
        CompareDOM.viewOldBtn.disabled = s.extracted.arrOld.length === 0;
        CompareDOM.viewNewBtn.disabled = s.extracted.arrNew.length === 0;
        CompareDOM.compareBtn.disabled = !(s.extracted.arrOld.length && s.extracted.arrNew.length);
        CompareDOM.footerMemory.textContent = `O:${CompareHelpers.formatNumber(s.extracted.arrOld.length)} N:${CompareHelpers.formatNumber(s.extracted.arrNew.length)}`;
        CompareDOM.toast('Session restored', 'info', 2000);
        return true;
      }
    } catch (e) {}
    return false;
  };
  
  // ========== FINAL INIT ==========
  function init() {
    initShared();
    initCompare();
    initFollowBack();
    
    // Restore session after modules are ready
    if (main.restoreSession()) {
      // Already updated in restoreSession
    } else {
      // Ensure everything is disabled if no session
      CompareDOM.extractOldBtn.disabled = true;
      CompareDOM.extractNewBtn.disabled = true;
      CompareDOM.extractBothBtn.disabled = true;
      CompareDOM.viewOldBtn.disabled = true;
      CompareDOM.viewNewBtn.disabled = true;
      CompareDOM.compareBtn.disabled = true;
    }
    
    console.log('TikTokApp unified application initialized.');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.TikTokApp.Main);

