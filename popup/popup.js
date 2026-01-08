// Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const totalTabsEl = document.getElementById('totalTabs');
  const duplicateTabsEl = document.getElementById('duplicateTabs');
  const enableToggle = document.getElementById('enableToggle');
  const scanBtn = document.getElementById('scanBtn');
  const closeAllBtn = document.getElementById('closeAllBtn');
  const duplicatesList = document.getElementById('duplicatesList');
  const optionsLink = document.getElementById('optionsLink');
  
  // Load settings
  async function loadSettings() {
    const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
    enableToggle.checked = settings.enabled;
  }
  
  // Update statistics
  async function updateStats() {
    const stats = await browser.runtime.sendMessage({ action: 'getStats' });
    totalTabsEl.textContent = stats.totalTabs;
    duplicateTabsEl.textContent = stats.duplicateTabs;
    
    // Highlight if there are duplicate tabs
    if (stats.duplicateTabs > 0) {
      duplicateTabsEl.style.color = '#e53935';
    } else {
      duplicateTabsEl.style.color = '#4caf50';
    }
  }
  
  // Display duplicate tabs list
  function showDuplicates(duplicates) {
    duplicatesList.innerHTML = '';
    
    if (duplicates.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-duplicates';
      noResults.textContent = '✨ No duplicate tabs found';
      duplicatesList.appendChild(noResults);
      duplicatesList.classList.add('show');
      return;
    }
    
    duplicates.forEach(dup => {
      const item = document.createElement('div');
      item.className = 'duplicate-item';
      
      // Shorten URL for display
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
      
      const urlDiv = document.createElement('div');
      urlDiv.className = 'duplicate-url';
      urlDiv.title = dup.url;
      urlDiv.textContent = displayUrl;
      
      const countDiv = document.createElement('div');
      countDiv.className = 'duplicate-count';
      countDiv.textContent = `${dup.count} duplicate tabs`;
      
      item.appendChild(urlDiv);
      item.appendChild(countDiv);
      duplicatesList.appendChild(item);
    });
    
    duplicatesList.classList.add('show');
  }
  
  // Toggle enabled state
  enableToggle.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'updateSettings',
      settings: { enabled: enableToggle.checked }
    });
  });
  
  // Scan for duplicate tabs
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning...';
    
    try {
      const duplicates = await browser.runtime.sendMessage({ action: 'scanDuplicates' });
      showDuplicates(duplicates);
      await updateStats();
    } catch (error) {
      console.error('Scan failed:', error);
    }
    
    scanBtn.disabled = false;
    scanBtn.textContent = '🔍 Scan Duplicates';
  });
  
  // Close all duplicate tabs
  closeAllBtn.addEventListener('click', async () => {
    closeAllBtn.disabled = true;
    closeAllBtn.textContent = 'Processing...';
    
    try {
      const result = await browser.runtime.sendMessage({ action: 'closeDuplicates' });

      await updateStats();
      duplicatesList.classList.remove('show');
      duplicatesList.innerHTML = '';

      if (result.closedCount > 0) {
        alert(`Closed ${result.closedCount} duplicate tab(s)`);
      } else {
        alert('No duplicate tabs to close');
      }
    } catch (error) {
      console.error('Close failed:', error);
    }
    
    closeAllBtn.disabled = false;
    closeAllBtn.textContent = '🗑️ Close All Duplicates';
  });
  
  // Open settings page
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
  
  // Initialize
  await loadSettings();
  await updateStats();
});
