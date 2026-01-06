// Options Page Script

const DEFAULT_SETTINGS = {
  enabled: true,
  ignoreHash: true,
  ignoreSearch: false,
  showNotification: true,
  excludedDomains: []
};

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const enabledEl = document.getElementById('enabled');
  const showNotificationEl = document.getElementById('showNotification');
  const ignoreHashEl = document.getElementById('ignoreHash');
  const ignoreSearchEl = document.getElementById('ignoreSearch');
  const excludedDomainsEl = document.getElementById('excludedDomains');
  const saveBtnEl = document.getElementById('saveBtn');
  const resetBtnEl = document.getElementById('resetBtn');
  const statusMessageEl = document.getElementById('statusMessage');
  
  // Load settings
  async function loadSettings() {
    try {
      const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
      
      enabledEl.checked = settings.enabled;
      showNotificationEl.checked = settings.showNotification;
      ignoreHashEl.checked = settings.ignoreHash;
      ignoreSearchEl.checked = settings.ignoreSearch;
      excludedDomainsEl.value = (settings.excludedDomains || []).join('\n');
    } catch (error) {
      console.error('Failed to load settings:', error);
      showStatus('Failed to load settings', 'error');
    }
  }
  
  // Save settings
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
      
      showStatus('✅ Settings saved', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showStatus('Failed to save settings', 'error');
    }
  }
  
  // Reset to default settings
  async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default?')) {
      return;
    }
    
    try {
      await browser.runtime.sendMessage({
        action: 'updateSettings',
        settings: DEFAULT_SETTINGS
      });
      
      await loadSettings();
      showStatus('✅ Reset to default settings', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showStatus('Failed to reset settings', 'error');
    }
  }
  
  // Display status message
  function showStatus(message, type) {
    statusMessageEl.textContent = message;
    statusMessageEl.className = 'status-message ' + type;
    
    setTimeout(() => {
      statusMessageEl.className = 'status-message';
    }, 3000);
  }
  
  // Bind events
  saveBtnEl.addEventListener('click', saveSettings);
  resetBtnEl.addEventListener('click', resetSettings);
  
  // Initial load settings
  await loadSettings();
});
