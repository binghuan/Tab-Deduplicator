// Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // 取得 DOM 元素
  const totalTabsEl = document.getElementById('totalTabs');
  const duplicateTabsEl = document.getElementById('duplicateTabs');
  const enableToggle = document.getElementById('enableToggle');
  const scanBtn = document.getElementById('scanBtn');
  const closeAllBtn = document.getElementById('closeAllBtn');
  const duplicatesList = document.getElementById('duplicatesList');
  const optionsLink = document.getElementById('optionsLink');
  
  // 載入設定
  async function loadSettings() {
    const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
    enableToggle.checked = settings.enabled;
  }
  
  // 更新統計資訊
  async function updateStats() {
    const stats = await browser.runtime.sendMessage({ action: 'getStats' });
    totalTabsEl.textContent = stats.totalTabs;
    duplicateTabsEl.textContent = stats.duplicateTabs;
    
    // 如果有重複標籤頁，高亮顯示
    if (stats.duplicateTabs > 0) {
      duplicateTabsEl.style.color = '#e53935';
    } else {
      duplicateTabsEl.style.color = '#4caf50';
    }
  }
  
  // 顯示重複標籤頁列表
  function showDuplicates(duplicates) {
    duplicatesList.innerHTML = '';
    
    if (duplicates.length === 0) {
      duplicatesList.innerHTML = '<div class="no-duplicates">✨ 沒有發現重複的標籤頁</div>';
      duplicatesList.classList.add('show');
      return;
    }
    
    duplicates.forEach(dup => {
      const item = document.createElement('div');
      item.className = 'duplicate-item';
      
      // 縮短 URL 顯示
      let displayUrl = dup.url;
      try {
        const urlObj = new URL(dup.url);
        displayUrl = urlObj.hostname + urlObj.pathname;
        if (displayUrl.length > 40) {
          displayUrl = displayUrl.substring(0, 37) + '...';
        }
      } catch (e) {
        if (displayUrl.length > 40) {
          displayUrl = displayUrl.substring(0, 37) + '...';
        }
      }
      
      item.innerHTML = `
        <div class="duplicate-url" title="${dup.url}">${displayUrl}</div>
        <div class="duplicate-count">${dup.count} 個重複標籤頁</div>
      `;
      
      duplicatesList.appendChild(item);
    });
    
    duplicatesList.classList.add('show');
  }
  
  // 切換啟用狀態
  enableToggle.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'updateSettings',
      settings: { enabled: enableToggle.checked }
    });
  });
  
  // 掃描重複標籤頁
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '掃描中...';
    
    try {
      const duplicates = await browser.runtime.sendMessage({ action: 'scanDuplicates' });
      showDuplicates(duplicates);
      await updateStats();
    } catch (error) {
      console.error('掃描失敗:', error);
    }
    
    scanBtn.disabled = false;
    scanBtn.textContent = '🔍 掃描重複頁面';
  });
  
  // 關閉所有重複標籤頁
  closeAllBtn.addEventListener('click', async () => {
    closeAllBtn.disabled = true;
    closeAllBtn.textContent = '處理中...';
    
    try {
      const result = await browser.runtime.sendMessage({ action: 'closeDuplicates' });
      
      if (result.closedCount > 0) {
        alert(`已關閉 ${result.closedCount} 個重複標籤頁`);
      } else {
        alert('沒有需要關閉的重複標籤頁');
      }
      
      await updateStats();
      duplicatesList.classList.remove('show');
    } catch (error) {
      console.error('關閉失敗:', error);
    }
    
    closeAllBtn.disabled = false;
    closeAllBtn.textContent = '🗑️ 關閉所有重複';
  });
  
  // 開啟設定頁面
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
  
  // 初始化
  await loadSettings();
  await updateStats();
});
