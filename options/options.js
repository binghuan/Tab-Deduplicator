// Options Page Script

const DEFAULT_SETTINGS = {
  enabled: true,
  ignoreHash: true,
  ignoreSearch: false,
  showNotification: true,
  excludedDomains: []
};

document.addEventListener('DOMContentLoaded', async () => {
  // 取得 DOM 元素
  const enabledEl = document.getElementById('enabled');
  const showNotificationEl = document.getElementById('showNotification');
  const ignoreHashEl = document.getElementById('ignoreHash');
  const ignoreSearchEl = document.getElementById('ignoreSearch');
  const excludedDomainsEl = document.getElementById('excludedDomains');
  const saveBtnEl = document.getElementById('saveBtn');
  const resetBtnEl = document.getElementById('resetBtn');
  const statusMessageEl = document.getElementById('statusMessage');
  
  // 載入設定
  async function loadSettings() {
    try {
      const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
      
      enabledEl.checked = settings.enabled;
      showNotificationEl.checked = settings.showNotification;
      ignoreHashEl.checked = settings.ignoreHash;
      ignoreSearchEl.checked = settings.ignoreSearch;
      excludedDomainsEl.value = (settings.excludedDomains || []).join('\n');
    } catch (error) {
      console.error('載入設定失敗:', error);
      showStatus('載入設定失敗', 'error');
    }
  }
  
  // 儲存設定
  async function saveSettings() {
    try {
      const excludedDomains = excludedDomainsEl.value
        .split('\n')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);
      
      const settings = {
        enabled: enabledEl.checked,
        showNotification: showNotificationEl.checked,
        ignoreHash: ignoreHashEl.checked,
        ignoreSearch: ignoreSearchEl.checked,
        excludedDomains: excludedDomains
      };
      
      await browser.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
      
      showStatus('✅ 設定已儲存', 'success');
    } catch (error) {
      console.error('儲存設定失敗:', error);
      showStatus('儲存設定失敗', 'error');
    }
  }
  
  // 重置為預設設定
  async function resetSettings() {
    if (!confirm('確定要重置所有設定為預設值嗎？')) {
      return;
    }
    
    try {
      await browser.runtime.sendMessage({
        action: 'updateSettings',
        settings: DEFAULT_SETTINGS
      });
      
      await loadSettings();
      showStatus('✅ 已重置為預設設定', 'success');
    } catch (error) {
      console.error('重置設定失敗:', error);
      showStatus('重置設定失敗', 'error');
    }
  }
  
  // 顯示狀態訊息
  function showStatus(message, type) {
    statusMessageEl.textContent = message;
    statusMessageEl.className = 'status-message ' + type;
    
    setTimeout(() => {
      statusMessageEl.className = 'status-message';
    }, 3000);
  }
  
  // 綁定事件
  saveBtnEl.addEventListener('click', saveSettings);
  resetBtnEl.addEventListener('click', resetSettings);
  
  // 初始載入設定
  await loadSettings();
});
