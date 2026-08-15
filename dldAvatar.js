// dldAvatar.js - Avatar Download Module for TikTok Tools

window.TikTokApp = window.TikTokApp || {};
window.TikTokApp.AvatarDownload = window.TikTokApp.AvatarDownload || {};

(function(avatarDownload) {
  'use strict';
  
  console.log('Avatar Download module starting...');
  
  // ==================== CONFIGURATION ====================
  const CONFIG = {
    CONCURRENCY: 5,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    FILENAME_SUFFIX: '.png',
    ZIP_FILENAME: 'avatars',
    TIMEOUT: 30000,
  };
  
  // ==================== STATE ====================
  let isDownloading = false;
  let cancelRequested = false;
  
  // ==================== UTILITY FUNCTIONS ====================
  
  function getFollowBackState() {
    return window.TikTokApp?.FollowBack?.State || null;
  }
  
  function getFollowBackConfig() {
    return window.TikTokApp?.FollowBack?.Config || null;
  }
  
  function sanitizeFilename(username) {
    if (!username) return 'unknown';
    return username
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function getDateStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }
  
  function showToast(message, type = 'info', duration = 3000) {
    const compareDOM = window.TikTokApp?.Compare?.DOM;
    if (compareDOM && typeof compareDOM.toast === 'function') {
      compareDOM.toast(message, type, duration);
      return;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  // ==================== PROGRESS MODAL (hardcoded in HTML) ====================
  
  function showProgressModal() {
    const modal = document.getElementById('avatar-progress-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active'); // if your CSS uses .active for backdrop
      // Reset UI elements
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Cancel Download';
        cancelBtn.style.display = 'block';
      }
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) closeBtn.style.display = 'none';
      const msgEl = document.getElementById('avatar-modal-message');
      if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.className = 'hidden mb-3 p-2 rounded text-xs text-center border'; // reset
      }
    }
  }
  
  function hideProgressModal() {
    const modal = document.getElementById('avatar-progress-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }
  
  function showModalMessage(message, type = 'info') {
    const messageEl = document.getElementById('avatar-modal-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.display = 'block';
      // Apply styling based on type (you can use Tailwind classes here)
      const baseClasses = 'mb-3 p-2 rounded text-xs text-center border';
      let typeClasses = '';
      if (type === 'error') {
        typeClasses = 'bg-red-500/10 text-red-400 border-red-500/30';
      } else if (type === 'success') {
        typeClasses = 'bg-green-500/10 text-green-400 border-green-500/30';
      } else if (type === 'warning') {
        typeClasses = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      } else {
        typeClasses = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      }
      messageEl.className = `${baseClasses} ${typeClasses}`;
    }
  }
  
  function updateProgressModal(downloaded, total, failed, totalSize, message, currentDownloads) {
    const progressText = document.getElementById('avatar-progress-text');
    const progressPercent = document.getElementById('avatar-progress-percent');
    const progressBar = document.getElementById('avatar-progress-bar');
    const downloadedCount = document.getElementById('avatar-downloaded-count');
    const failedCount = document.getElementById('avatar-failed-count');
    const totalSizeEl = document.getElementById('avatar-total-size');
    const currentDownloadsEl = document.getElementById('avatar-current-downloads');
    
    if (progressText) progressText.textContent = message || 'Downloading...';
    if (progressPercent) {
      const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      progressPercent.textContent = percent + '%';
    }
    if (progressBar) {
      const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      progressBar.style.width = percent + '%';
    }
    if (downloadedCount) downloadedCount.textContent = downloaded;
    if (failedCount) failedCount.textContent = failed;
    if (totalSizeEl) totalSizeEl.textContent = formatBytes(totalSize);
    
    if (currentDownloadsEl) {
      if (!currentDownloads || currentDownloads.length === 0) {
        currentDownloadsEl.innerHTML = '<div class="text-center text-slate-500">No active downloads</div>';
      } else {
        currentDownloadsEl.innerHTML = currentDownloads.map(username => 
          `<div class="flex items-center gap-2 p-1 mb-1 bg-slate-800/50 rounded">
            <span class="animate-spin">⏳</span>
            <span>${username}</span>
          </div>`
        ).join('');
      }
    }
  }
  
  // ==================== DATA EXTRACTION ====================
  
  function getEnrichedNotFollowBackData() {
    const state = getFollowBackState();
    if (!state) return null;
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) return null;
    const notFollowed = enriched.filter(item => 
      !item.followBack && 
      item.avatarUrl && 
      item.avatarUrl.startsWith('http')
    );
    if (notFollowed.length === 0) return null;
    return notFollowed.map(item => ({
      username: item.UserName,
      avatarUrl: item.avatarUrl,
      displayName: item.displayName || item.UserName,
      verified: item.verified || false
    }));
  }
  
  function getFilteredRawData() {
    const state = getFollowBackState();
    const config = getFollowBackConfig();
    if (!state || !config) return null;
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) return null;
    const minFollowers = config.get ? config.get('MIN_FOLLOWERS_TO_FILTER') : 10000;
    let filtered = enriched.filter(item => {
      const count = item.followerCount || 0;
      return count >= minFollowers && item.avatarUrl && item.avatarUrl.startsWith('http');
    });
    filtered.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    if (filtered.length === 0) return null;
    return filtered.map(item => ({
      username: item.UserName,
      avatarUrl: item.avatarUrl,
      displayName: item.displayName || item.UserName,
      verified: item.verified || false
    }));
  }
  
  function getCompareFilteredUsers() {
    const table = window.TikTokApp?.Compare?.UI?.Table;
    if (!table) return null;
    let users = table.currentUsers;
    if (!users || users.length === 0) return null;
    users = users.filter(u => u.fetchError !== true);
    if (users.length === 0) return null;
    return users
      .filter(u => u.avatar && u.avatar.startsWith('http') && !u.avatar.includes('placeholder'))
      .map(u => ({
        username: u.username,
        avatarUrl: u.avatar,
        displayName: u.displayName || u.username,
        verified: false
      }));
  }
  
  // ==================== DOWNLOAD FUNCTIONS ====================
  
  async function fetchImage(url, attempts = CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        const response = await fetch(url, {
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit'
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return blob;
      } catch (error) {
        if (i === attempts - 1) throw error;
        await sleep(CONFIG.RETRY_DELAY * (i + 1));
      }
    }
  }
  
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  async function downloadAvatar(userData, stats, activeDownloads) {
    if (cancelRequested) throw new Error('Download cancelled');
    const safeUsername = sanitizeFilename(userData.username);
    const filename = `${safeUsername}${CONFIG.FILENAME_SUFFIX}`;
    activeDownloads.add(userData.username);
    try {
      const blob = await fetchImage(userData.avatarUrl);
      if (cancelRequested) throw new Error('Download cancelled');
      const base64Data = await blobToBase64(blob);
      stats.downloaded++;
      stats.totalSize += blob.size;
      return {
        filename,
        data: base64Data,
        username: userData.username,
        displayName: userData.displayName,
        verified: userData.verified,
        size: blob.size,
        success: true
      };
    } catch (error) {
      if (error.message === 'Download cancelled') throw error;
      stats.failed++;
      console.warn(`Failed to download avatar for ${userData.username}:`, error);
      return {
        filename,
        username: userData.username,
        success: false,
        error: error.message
      };
    } finally {
      activeDownloads.delete(userData.username);
    }
  }
  
  async function processQueue(users, onProgress) {
    const stats = { downloaded: 0, failed: 0, totalSize: 0, cancelled: false };
    const activeDownloads = new Set();
    const results = [];
    const queue = [...users];
    let completed = 0;
    
    const progressInterval = setInterval(() => {
      onProgress(completed, users.length, stats.failed, stats.totalSize, 
        `Downloading... (${completed}/${users.length})`,
        Array.from(activeDownloads));
    }, 500);
    
    const worker = async () => {
      while (queue.length > 0 && !cancelRequested) {
        const user = queue.shift();
        if (!user) break;
        const result = await downloadAvatar(user, stats, activeDownloads);
        results.push(result);
        completed++;
        onProgress(completed, users.length, stats.failed, stats.totalSize,
          `Downloading... (${completed}/${users.length})`,
          Array.from(activeDownloads));
        if (cancelRequested) {
          stats.cancelled = true;
          break;
        }
      }
    };
    
    const workers = [];
    const workerCount = Math.min(CONFIG.CONCURRENCY, users.length);
    for (let i = 0; i < workerCount; i++) workers.push(worker());
    await Promise.all(workers);
    clearInterval(progressInterval);
    return { results, stats, cancelled: stats.cancelled };
  }
  
  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        if (window.JSZip) resolve(window.JSZip);
        else reject(new Error('JSZip failed to initialize'));
      };
      script.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
      document.head.appendChild(script);
      setTimeout(() => reject(new Error('JSZip load timeout')), 10000);
    });
  }
  
  // ==================== DOWNLOAD WRAPPERS ====================
  
  async function downloadAvatars(dataType) {
    if (isDownloading) {
      showToast('Download already in progress', 'warning');
      return;
    }
    showProgressModal();
    updateProgressModal(0, 0, 0, 0, 'Checking for data...', []);
    
    let users = null;
    let sourceName = '';
    if (dataType === 'enriched') {
      sourceName = 'Not FollowBack (Enriched)';
      users = getEnrichedNotFollowBackData();
    } else if (dataType === 'filtered') {
      sourceName = 'Filtered (Raw)';
      users = getFilteredRawData();
    } else {
      sourceName = 'Unknown';
    }
    
    const sourceNameEl = document.getElementById('avatar-source-name');
    if (sourceNameEl) sourceNameEl.textContent = sourceName;
    
    if (!users || users.length === 0) {
      updateProgressModal(0, 0, 0, 0, 'No data available', []);
      showModalMessage('No data available. Please run extraction and fetch profiles first.', 'warning');
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      return;
    }
    
    isDownloading = true;
    cancelRequested = false;
    const totalUsersEl = document.getElementById('avatar-total-users');
    if (totalUsersEl) totalUsersEl.textContent = users.length;
    updateProgressModal(0, users.length, 0, 0, 'Initializing...', []);
    
    try {
      const JSZip = await ensureJSZip();
      updateProgressModal(0, users.length, 0, 0, 'Starting download...', []);
      const { results, stats, cancelled } = await processQueue(users, 
        (completed, total, failed, totalSize, message, currentDownloads) => {
          updateProgressModal(completed, total, failed, totalSize, message, currentDownloads);
        }
      );
      
      if (cancelled) {
        updateProgressModal(0, users.length, stats.failed, stats.totalSize, 'Download cancelled', []);
        showModalMessage('Download cancelled by user.', 'warning');
        const cancelBtn = document.getElementById('avatar-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        const closeBtn = document.getElementById('avatar-close-after-done-btn');
        if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
        return;
      }
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Creating ZIP archive...', []);
      const zip = new JSZip();
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length === 0) throw new Error('No avatars were successfully downloaded');
      
      successfulResults.forEach(result => {
        zip.file(result.filename, result.data, { base64: true });
      });
      
      const metadata = {
        source: sourceName,
        totalUsers: users.length,
        downloaded: stats.downloaded,
        failed: stats.failed,
        timestamp: new Date().toISOString(),
        users: successfulResults.map(r => ({
          username: r.username,
          displayName: r.displayName,
          verified: r.verified,
          file: r.filename,
          size: r.size
        }))
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      
      if (stats.failed > 0) {
        const failedResults = results.filter(r => !r.success);
        const failedReport = failedResults.map(r => `${r.username}: ${r.error}`).join('\n');
        zip.file('failed_downloads.txt', failedReport);
      }
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Generating ZIP file...', []);
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const filename = `${CONFIG.ZIP_FILENAME}_${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${getDateStamp()}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Download complete!', []);
      const successMessage = `Downloaded ${stats.downloaded} avatars (${formatBytes(stats.totalSize)})${stats.failed > 0 ? `, ${stats.failed} failed` : ''}`;
      showModalMessage(successMessage, 'success');
      showToast(successMessage, 'success', 5000);
      
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      
    } catch (error) {
      console.error('Avatar download error:', error);
      updateProgressModal(0, users.length, 0, 0, `Error: ${error.message}`, []);
      showModalMessage(`Download failed: ${error.message}`, 'error');
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      showToast(`Avatar download failed: ${error.message}`, 'error', 8000);
    } finally {
      isDownloading = false;
      cancelRequested = false;
    }
  }
  
  async function downloadCompareFilteredAvatars() {
    if (isDownloading) {
      showToast('Download already in progress', 'warning');
      return;
    }
    const sourceName = 'Compare (Filtered)';
    const users = getCompareFilteredUsers();
    showProgressModal();
    updateProgressModal(0, 0, 0, 0, 'Checking data...', []);
    const sourceNameEl = document.getElementById('avatar-source-name');
    if (sourceNameEl) sourceNameEl.textContent = sourceName;
    
    if (!users || users.length === 0) {
      updateProgressModal(0, 0, 0, 0, 'No data available', []);
      showModalMessage('No Compare data with valid avatars. Run comparison and fetch profiles first.', 'warning');
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      return;
    }
    
    isDownloading = true;
    cancelRequested = false;
    const totalUsersEl = document.getElementById('avatar-total-users');
    if (totalUsersEl) totalUsersEl.textContent = users.length;
    updateProgressModal(0, users.length, 0, 0, 'Initializing...', []);
    
    try {
      const JSZip = await ensureJSZip();
      updateProgressModal(0, users.length, 0, 0, 'Starting download...', []);
      const { results, stats, cancelled } = await processQueue(users, 
        (completed, total, failed, totalSize, message, currentDownloads) => {
          updateProgressModal(completed, total, failed, totalSize, message, currentDownloads);
        }
      );
      
      if (cancelled) {
        updateProgressModal(0, users.length, stats.failed, stats.totalSize, 'Download cancelled', []);
        showModalMessage('Download cancelled by user.', 'warning');
        const cancelBtn = document.getElementById('avatar-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        const closeBtn = document.getElementById('avatar-close-after-done-btn');
        if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
        return;
      }
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Creating ZIP archive...', []);
      const zip = new JSZip();
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length === 0) throw new Error('No avatars were successfully downloaded');
      
      successfulResults.forEach(result => {
        zip.file(result.filename, result.data, { base64: true });
      });
      
      const metadata = {
        source: sourceName,
        totalUsers: users.length,
        downloaded: stats.downloaded,
        failed: stats.failed,
        timestamp: new Date().toISOString(),
        users: successfulResults.map(r => ({
          username: r.username,
          displayName: r.displayName,
          verified: r.verified,
          file: r.filename,
          size: r.size
        }))
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      
      if (stats.failed > 0) {
        const failedResults = results.filter(r => !r.success);
        const failedReport = failedResults.map(r => `${r.username}: ${r.error}`).join('\n');
        zip.file('failed_downloads.txt', failedReport);
      }
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Generating ZIP file...', []);
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const filename = `avatars_${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${getDateStamp()}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Download complete!', []);
      const successMessage = `Downloaded ${stats.downloaded} avatars (${formatBytes(stats.totalSize)})${stats.failed > 0 ? `, ${stats.failed} failed` : ''}`;
      showModalMessage(successMessage, 'success');
      showToast(successMessage, 'success', 5000);
      
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      
    } catch (error) {
      console.error('Compare avatar download error:', error);
      updateProgressModal(0, users.length, 0, 0, `Error: ${error.message}`, []);
      showModalMessage(`Download failed: ${error.message}`, 'error');
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) { closeBtn.style.display = 'block'; closeBtn.textContent = 'Close'; }
      showToast(`Avatar download failed: ${error.message}`, 'error', 8000);
    } finally {
      isDownloading = false;
      cancelRequested = false;
    }
  }
  
  // ==================== PUBLIC API ====================
  avatarDownload.downloadEnrichedAvatars = function() {
    downloadAvatars('enriched');
  };
  avatarDownload.downloadFilteredAvatars = function() {
    downloadAvatars('filtered');
  };
  avatarDownload.downloadCompareFilteredAvatars = function() {
    downloadCompareFilteredAvatars();
  };
  
  // ==================== INITIALIZATION ====================
  function init() {
    console.log('Initializing Avatar Download module...');
    
    // Attach event listeners to the hardcoded buttons
    const bindButtons = function() {
      const enrichedBtn = document.getElementById('download-avatars-enriched');
      if (enrichedBtn) {
        enrichedBtn.addEventListener('click', function(e) {
          e.preventDefault();
          avatarDownload.downloadEnrichedAvatars();
        });
      }
      const filteredBtn = document.getElementById('download-avatars-filtered');
      if (filteredBtn) {
        filteredBtn.addEventListener('click', function(e) {
          e.preventDefault();
          avatarDownload.downloadFilteredAvatars();
        });
      }
      const compareFilteredBtn = document.getElementById('download-compare-avatars-filtered');
      if (compareFilteredBtn) {
        compareFilteredBtn.addEventListener('click', function(e) {
          e.preventDefault();
          avatarDownload.downloadCompareFilteredAvatars();
        });
      }
      
      // Modal close/cancel buttons
      const closeBtn = document.getElementById('avatar-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          hideProgressModal();
        });
      }
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if (isDownloading) {
            cancelRequested = true;
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling...';
          }
        });
      }
      const doneBtn = document.getElementById('avatar-close-after-done-btn');
      if (doneBtn) {
        doneBtn.addEventListener('click', function(e) {
          e.preventDefault();
          hideProgressModal();
        });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindButtons);
    } else {
      bindButtons();
    }
  }
  
  init();
  console.log('Avatar Download module loaded');
  
})(window.TikTokApp.AvatarDownload);
