// dldAvatar.js - Avatar Download Module for TikTok Tools

window.TikTokApp = window.TikTokApp || {};
window.TikTokApp.AvatarDownload = window.TikTokApp.AvatarDownload || {};

// dldAvatar.js - Avatar Download Module for TikTok Tools
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
    AUTO_CLOSE_DELAY: 5000, // 5 seconds before auto-close on completion
    ERROR_DISPLAY_TIME: 5000  // 5 seconds to show error messages
  };
  
  // ==================== STATE ====================
  let isDownloading = false;
  let cancelRequested = false;
  let progressModal = null;
  let modalCloseTimeout = null;
  
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
  
  // ==================== PROGRESS MODAL ====================
  
  function createProgressModal() {
    console.log('Creating progress modal...');
    
    // Remove existing modal if any
    const existingModal = document.getElementById('avatar-progress-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'avatar-progress-modal';
    modal.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(4px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 99999 !important;
      pointer-events: auto !important;
    `;
    
    modal.innerHTML = `
      <div style="
        background: #0f1117;
        max-width: 90vw;
        width: 480px;
        max-height: 80vh;
        overflow-y: auto;
        border-radius: 1rem;
        border: 2px solid #6366f1;
        padding: 1.5rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        pointer-events: auto;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #2d2f3e;
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        ">
          <span style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            color: #e2e8f0;
          ">
            <span style="font-size: 1.2rem;">📥</span>
            Avatar Download Progress
          </span>
          <button id="avatar-modal-close" style="
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 1.5rem;
            padding: 0.25rem;
            line-height: 1;
            pointer-events: auto;
          ">×</button>
        </div>
        
        <div style="
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #1e293b;
          border-radius: 0.375rem;
        ">
          Source: <span id="avatar-source-name" style="color: #a78bfa;">Loading...</span>
          <br>
          Total Users: <span id="avatar-total-users">0</span>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.75rem;
            color: #94a3b8;
          ">
            <span id="avatar-progress-text">Preparing...</span>
            <span id="avatar-progress-percent">0%</span>
          </div>
          <div style="
            width: 100%;
            height: 10px;
            background: #1e293b;
            border-radius: 5px;
            overflow: hidden;
          ">
            <div id="avatar-progress-bar" style="
              width: 0%;
              height: 100%;
              background: linear-gradient(to right, #6366f1, #22d3ee);
              transition: width 0.3s ease;
              border-radius: 5px;
            "></div>
          </div>
        </div>
        
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        ">
          <div style="
            background: #1e293b;
            padding: 0.75rem;
            border-radius: 0.5rem;
            text-align: center;
          ">
            <div id="avatar-downloaded-count" style="
              font-size: 1.25rem;
              font-weight: 700;
              color: #10b981;
            ">0</div>
            <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 0.25rem;">Downloaded</div>
          </div>
          <div style="
            background: #1e293b;
            padding: 0.75rem;
            border-radius: 0.5rem;
            text-align: center;
          ">
            <div id="avatar-failed-count" style="
              font-size: 1.25rem;
              font-weight: 700;
              color: #ef4444;
            ">0</div>
            <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 0.25rem;">Failed</div>
          </div>
          <div style="
            background: #1e293b;
            padding: 0.75rem;
            border-radius: 0.5rem;
            text-align: center;
          ">
            <div id="avatar-total-size" style="
              font-size: 1.25rem;
              font-weight: 700;
              color: #3b82f6;
            ">0 KB</div>
            <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 0.25rem;">Total Size</div>
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="
            font-size: 0.7rem;
            color: #94a3b8;
            margin-bottom: 0.5rem;
          ">Current Downloads:</div>
          <div id="avatar-current-downloads" style="
            max-height: 120px;
            overflow-y: auto;
            font-size: 0.7rem;
            color: #e2e8f0;
          ">
            <div style="text-align: center; color: #64748b;">Starting...</div>
          </div>
        </div>
        
        <div id="avatar-modal-message" style="
          display: none;
          margin-bottom: 1rem;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          text-align: center;
        "></div>
        
        <button id="avatar-cancel-btn" style="
          width: 100%;
          padding: 0.75rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          pointer-events: auto;
        ">
          Cancel Download
        </button>
        
        <button id="avatar-close-after-done-btn" style="
          display: none;
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          pointer-events: auto;
        ">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Progress modal created and appended to body');
    
    // Add event listeners immediately
    const closeBtn = modal.querySelector('#avatar-modal-close');
    if (closeBtn) {
      closeBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close button clicked');
        hideProgressModal();
      };
    }
    
    const cancelBtn = modal.querySelector('#avatar-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Cancel button clicked');
        if (isDownloading) {
          cancelRequested = true;
          cancelBtn.disabled = true;
          cancelBtn.textContent = 'Cancelling...';
        }
      };
    }
    
    const closeAfterDoneBtn = modal.querySelector('#avatar-close-after-done-btn');
    if (closeAfterDoneBtn) {
      closeAfterDoneBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        hideProgressModal();
      };
    }
    
    // Prevent clicks on modal background from closing
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        // Don't close when clicking background - user must use close button
        console.log('Clicked modal background - not closing');
      }
    });
    
    progressModal = modal;
    return modal;
  }
  
  function showProgressModal() {
    console.log('Showing progress modal...');
    
    // Clear any existing close timeout
    if (modalCloseTimeout) {
      clearTimeout(modalCloseTimeout);
      modalCloseTimeout = null;
    }
    
    if (!progressModal) {
      progressModal = createProgressModal();
    }
    
    progressModal.style.display = 'flex';
    
    // Reset UI elements
    const cancelBtn = document.getElementById('avatar-cancel-btn');
    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.textContent = 'Cancel Download';
      cancelBtn.style.display = 'block';
    }
    
    const closeAfterDoneBtn = document.getElementById('avatar-close-after-done-btn');
    if (closeAfterDoneBtn) {
      closeAfterDoneBtn.style.display = 'none';
    }
    
    const messageEl = document.getElementById('avatar-modal-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
    
    console.log('Modal display set to flex');
  }
  
  function hideProgressModal() {
    console.log('Hiding progress modal');
    if (progressModal) {
      progressModal.style.display = 'none';
    }
  }
  
  function scheduleModalClose(delay) {
    // Clear any existing timeout
    if (modalCloseTimeout) {
      clearTimeout(modalCloseTimeout);
    }
    
    // Set new timeout
    modalCloseTimeout = setTimeout(() => {
      hideProgressModal();
      modalCloseTimeout = null;
    }, delay);
  }
  
  function showModalMessage(message, type = 'info') {
    const messageEl = document.getElementById('avatar-modal-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.display = 'block';
      
      // Set colors based on type
      if (type === 'error') {
        messageEl.style.background = 'rgba(239, 68, 68, 0.1)';
        messageEl.style.color = '#fca5a5';
        messageEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      } else if (type === 'success') {
        messageEl.style.background = 'rgba(16, 185, 129, 0.1)';
        messageEl.style.color = '#6ee7b7';
        messageEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      } else if (type === 'warning') {
        messageEl.style.background = 'rgba(245, 158, 11, 0.1)';
        messageEl.style.color = '#fcd34d';
        messageEl.style.border = '1px solid rgba(245, 158, 11, 0.3)';
      } else {
        messageEl.style.background = 'rgba(99, 102, 241, 0.1)';
        messageEl.style.color = '#a5b4fc';
        messageEl.style.border = '1px solid rgba(99, 102, 241, 0.3)';
      }
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
    
    if (currentDownloadsEl && currentDownloads) {
      if (currentDownloads.length === 0) {
        currentDownloadsEl.innerHTML = '<div style="text-align: center; color: #64748b;">No active downloads</div>';
      } else {
        currentDownloadsEl.innerHTML = currentDownloads.map(username => 
          `<div style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem;
            margin-bottom: 0.25rem;
            background: #1e293b;
            border-radius: 0.25rem;
          ">
            <span style="animation: spin 1s linear infinite;">⏳</span>
            <span>${username}</span>
          </div>`
        ).join('');
      }
    }
  }
  
  // ==================== DATA EXTRACTION ====================
  
  function getEnrichedNotFollowBackData() {
    const state = getFollowBackState();
    if (!state) {
      return null;
    }
    
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) {
      return null;
    }
    
    const notFollowed = enriched.filter(item => 
      !item.followBack && 
      item.avatarUrl && 
      item.avatarUrl.startsWith('http')
    );
    
    if (notFollowed.length === 0) {
      return null;
    }
    
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
    
    if (!state || !config) {
      return null;
    }
    
    const enriched = state.getEnrichedFollowers ? state.getEnrichedFollowers() : null;
    if (!enriched || enriched.length === 0) {
      return null;
    }
    
    const minFollowers = config.get ? config.get('MIN_FOLLOWERS_TO_FILTER') : 10000;
    let filtered = enriched.filter(item => {
      const count = item.followerCount || 0;
      return count >= minFollowers && item.avatarUrl && item.avatarUrl.startsWith('http');
    });
    
    filtered.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    
    if (filtered.length === 0) {
      return null;
    }
    
    return filtered.map(item => ({
      username: item.UserName,
      avatarUrl: item.avatarUrl,
      displayName: item.displayName || item.UserName,
      verified: item.verified || false
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
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        return blob;
      } catch (error) {
        if (i === attempts - 1) {
          throw error;
        }
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
    if (cancelRequested) {
      throw new Error('Download cancelled');
    }
    
    const safeUsername = sanitizeFilename(userData.username);
    const filename = `${safeUsername}${CONFIG.FILENAME_SUFFIX}`;
    
    activeDownloads.add(userData.username);
    
    try {
      const blob = await fetchImage(userData.avatarUrl);
      
      if (cancelRequested) {
        throw new Error('Download cancelled');
      }
      
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
      if (error.message === 'Download cancelled') {
        throw error;
      }
      
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
    const stats = {
      downloaded: 0,
      failed: 0,
      totalSize: 0,
      cancelled: false
    };
    
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
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }
    
    await Promise.all(workers);
    clearInterval(progressInterval);
    
    return {
      results,
      stats,
      cancelled: stats.cancelled
    };
  }
  
  async function ensureJSZip() {
    if (window.JSZip) {
      return window.JSZip;
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        if (window.JSZip) {
          resolve(window.JSZip);
        } else {
          reject(new Error('JSZip failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
      document.head.appendChild(script);
      
      setTimeout(() => reject(new Error('JSZip load timeout')), 10000);
    });
  }
  
  async function downloadAvatars(dataType) {
    console.log(`downloadAvatars called with type: ${dataType}`);
    
    if (isDownloading) {
      showToast('Download already in progress', 'warning');
      return;
    }
    
    // SHOW MODAL IMMEDIATELY - THIS IS THE KEY
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
    
    // Update source name in modal
    const sourceNameEl = document.getElementById('avatar-source-name');
    if (sourceNameEl) sourceNameEl.textContent = sourceName;
    
    // Check if we have data
    if (!users || users.length === 0) {
      console.log('No data available');
      updateProgressModal(0, 0, 0, 0, 'No data available', []);
      showModalMessage('No data available. Please run extraction and fetch profiles first.', 'warning');
      
      // Hide cancel button, show close button
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.textContent = 'Close';
      }
      
      // DON'T auto-close - let user close manually
      return;
    }
    
    isDownloading = true;
    cancelRequested = false;
    
    // Update total users
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
        
        // Hide cancel button, show close button
        const cancelBtn = document.getElementById('avatar-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        
        const closeBtn = document.getElementById('avatar-close-after-done-btn');
        if (closeBtn) {
          closeBtn.style.display = 'block';
          closeBtn.textContent = 'Close';
        }
        
        return;
      }
      
      updateProgressModal(users.length, users.length, stats.failed, stats.totalSize, 'Creating ZIP archive...', []);
      
      const zip = new JSZip();
      const successfulResults = results.filter(r => r.success);
      
      if (successfulResults.length === 0) {
        throw new Error('No avatars were successfully downloaded');
      }
      
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
      
      // Hide cancel button, show close button
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.textContent = 'Close';
      }
      
    } catch (error) {
      console.error('Avatar download error:', error);
      updateProgressModal(0, users.length, 0, 0, `Error: ${error.message}`, []);
      showModalMessage(`Download failed: ${error.message}`, 'error');
      
      // Hide cancel button, show close button
      const cancelBtn = document.getElementById('avatar-cancel-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      const closeBtn = document.getElementById('avatar-close-after-done-btn');
      if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.textContent = 'Close';
      }
      
      showToast(`Avatar download failed: ${error.message}`, 'error', 8000);
    } finally {
      isDownloading = false;
      cancelRequested = false;
    }
  }
  
  // ==================== COMPARE DATA GETTER ====================

function getCompareFilteredUsers() {
  const table = window.TikTokApp?.Compare?.UI?.Table;
  if (!table) return null;
  let users = table.currentUsers;
  if (!users || users.length === 0) return null;
  
  // Exclude failed fetches
  users = users.filter(u => u.fetchError !== true);
  if (users.length === 0) return null;
  
  // Only include users with a real avatar URL
  return users
    .filter(u => u.avatar && u.avatar.startsWith('http') && !u.avatar.includes('placeholder'))
    .map(u => ({
      username: u.username,
      avatarUrl: u.avatar,
      displayName: u.displayName || u.username,
      verified: false
    }));
}

// ==================== COMPARE DOWNLOAD ====================

async function downloadCompareFilteredAvatars() {
  console.log('downloadCompareFilteredAvatars called');

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

  // ---- Rest identical to downloadAvatars ----
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

    if (successfulResults.length === 0) {
      throw new Error('No avatars were successfully downloaded');
    }

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

    const safeSource = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `avatars_${safeSource}_${getDateStamp()}.zip`;
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
    if (closeBtn) {
      closeBtn.style.display = 'block';
      closeBtn.textContent = 'Close';
    }

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
    console.log('downloadEnrichedAvatars called');
    downloadAvatars('enriched');
  };
  
  avatarDownload.downloadFilteredAvatars = function() {
    console.log('downloadFilteredAvatars called');
    downloadAvatars('filtered');
  };
  
  

avatarDownload.downloadCompareFilteredAvatars = function() {
  downloadCompareFilteredAvatars();
};
  
  // ==================== AUTO-INITIALIZATION ====================
  function addAvatarButtons() {
  console.log('Adding avatar download buttons...');
  
  const downloadSection = document.getElementById('download-section');
  if (!downloadSection) {
    console.error('Download section not found!');
    return;
  }
  
  // Avoid duplicates
  if (document.getElementById('avatar-download-section')) {
    console.log('Avatar download buttons already exist');
    return;
  }
  
  // --- FollowBack Avatar Section ---
  const avatarSection = document.createElement('div');
  avatarSection.id = 'avatar-download-section';
  avatarSection.style.marginBottom = '1.5rem';
  avatarSection.innerHTML = `
    <h3 style="
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.25rem;
    ">
      📥 Avatar Downloads – FollowBack
    </h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <button id="download-avatars-enriched" style="
        background: rgba(147, 51, 234, 0.2);
        border: 1px solid rgba(147, 51, 234, 0.3);
        border-radius: 0.5rem;
        padding: 0.75rem;
        color: #c084fc;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background 0.2s;
      ">
        Not FollowBack (Enriched)
      </button>
      <button id="download-avatars-filtered" style="
        background: rgba(147, 51, 234, 0.2);
        border: 1px solid rgba(147, 51, 234, 0.3);
        border-radius: 0.5rem;
        padding: 0.75rem;
        color: #c084fc;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background 0.2s;
      ">
        Filtered (Raw)
      </button>
    </div>
    <div style="
      margin-top: 0.5rem;
      font-size: 0.6rem;
      color: #64748b;
    ">
      Downloads avatar images as UserName.png in a ZIP folder
    </div>
  `;
  
  // --- Compare Avatar Section (Filtered only) ---
  const compareAvatarSection = document.createElement('div');
  compareAvatarSection.id = 'compare-avatar-download-section';
  compareAvatarSection.style.marginBottom = '1.5rem';
  compareAvatarSection.innerHTML = `
    <h3 style="
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.25rem;
    ">
      📥 Avatar Downloads – Compare
    </h3>
    <div style="display: grid; grid-template-columns: 1fr; gap: 0.5rem;">
      <button id="download-compare-avatars-filtered" style="
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 0.5rem;
        padding: 0.75rem;
        color: #a5b4fc;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background 0.2s;
      ">
        Filtered (Hide Failed)
      </button>
    </div>
    <div style="
      margin-top: 0.5rem;
      font-size: 0.6rem;
      color: #64748b;
    ">
      Downloads avatars from the active Compare list, excluding profiles that failed to fetch.
    </div>
  `;
  
  // Insert both sections at the top of the download container
  const container = downloadSection.querySelector('.h-full') || downloadSection;
  container.prepend(compareAvatarSection); // Compare first
  container.prepend(avatarSection); // Then FollowBack (so FollowBack appears above Compare)
  
  // Bind FollowBack buttons
  const enrichedBtn = document.getElementById('download-avatars-enriched');
  const filteredBtn = document.getElementById('download-avatars-filtered');
  if (enrichedBtn) {
    enrichedBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      avatarDownload.downloadEnrichedAvatars();
    };
  }
  if (filteredBtn) {
    filteredBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      avatarDownload.downloadFilteredAvatars();
    };
  }
  
  // Bind Compare button
  const compareFilteredBtn = document.getElementById('download-compare-avatars-filtered');
  if (compareFilteredBtn) {
    compareFilteredBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      avatarDownload.downloadCompareFilteredAvatars();
    };
  }
}
  
  // Initialize
  function init() {
    console.log('Initializing Avatar Download module...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addAvatarButtons, 1000);
      });
    } else {
      setTimeout(addAvatarButtons, 1000);
    }
    
    // Also add buttons when download tab is clicked
    document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'master-tab-download') {
        setTimeout(addAvatarButtons, 500);
      }
    });
  }
  
  // Start initialization
  init();
  
  console.log('Avatar Download module loaded');
  
})(window.TikTokApp.AvatarDownload);
