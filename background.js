// Tab Deduplicator - Background Script
// When opening a duplicate tab, close the old tab and keep the new one

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  ignoreHash: true,        // Ignore hash (#) in URL
  ignoreSearch: false,     // Ignore query parameters (?) in URL
  showNotification: true,  // Show notifications
  excludedDomains: []      // Excluded domains
};

let settings = { ...DEFAULT_SETTINGS };

// Load settings
async function loadSettings() {
  try {
    const stored = await browser.storage.local.get('settings');
    if (stored.settings) {
      settings = { ...DEFAULT_SETTINGS, ...stored.settings };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    await browser.storage.local.set({ settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Normalize URL (for comparison)
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Ignore hash
    if (settings.ignoreHash) {
      urlObj.hash = '';
    }
    
    // Ignore query parameters
    if (settings.ignoreSearch) {
      urlObj.search = '';
    }
    
    // Remove trailing slash
    let normalized = urlObj.href;
    if (normalized.endsWith('/') && urlObj.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (error) {
    return url;
  }
}

// Check if domain is excluded
function isDomainExcluded(url) {
  try {
    const urlObj = new URL(url);
    return settings.excludedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
  } catch (error) {
    return false;
  }
}

// Check if URL is valid (exclude special pages)
function isValidUrl(url) {
  if (!url) return false;
  
  const invalidPrefixes = [
    'about:',
    'chrome:',
    'moz-extension:',
    'file:',
    'data:',
    'javascript:',
    'blob:'
  ];
  
  return !invalidPrefixes.some(prefix => url.startsWith(prefix));
}

// Find duplicate tab
async function findDuplicateTab(newTab) {
  if (!settings.enabled) return null;
  if (!newTab.url || !isValidUrl(newTab.url)) return null;
  if (isDomainExcluded(newTab.url)) return null;
  
  const normalizedNewUrl = normalizeUrl(newTab.url);
  
  try {
    const allTabs = await browser.tabs.query({});
    
    for (const tab of allTabs) {
      // Skip the new tab itself
      if (tab.id === newTab.id) continue;
      
      // Skip invalid URLs
      if (!tab.url || !isValidUrl(tab.url)) continue;
      
      const normalizedTabUrl = normalizeUrl(tab.url);
      
      if (normalizedTabUrl === normalizedNewUrl) {
        return tab;
      }
    }
  } catch (error) {
    console.error('Failed to find duplicate tab:', error);
  }
  
  return null;
}

// Handle duplicate tab
async function handleDuplicateTab(newTab, oldTab) {
  try {
    // Close the old tab
    await browser.tabs.remove(oldTab.id);
    
    // Show notification
    if (settings.showNotification) {
      showNotification(newTab.url);
    }
    
    console.log(`Closed duplicate tab: ${oldTab.url}`);
  } catch (error) {
    console.error('Failed to handle duplicate tab:', error);
  }
}

// Show notification
function showNotification(url) {
  try {
    // Shorten URL for display
    let displayUrl = url;
    if (url.length > 50) {
      displayUrl = url.substring(0, 47) + '...';
    }
    
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-96.svg'),
      title: 'Tab Deduplicator',
      message: `Closed duplicate tab:\n${displayUrl}`
    });
  } catch (error) {
    // Notification API may not be available, ignore error
    console.log('Unable to show notification');
  }
}

// Listen for tab update events
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when URL changes and loading is complete
  if (changeInfo.url && changeInfo.status === 'complete') {
    const duplicateTab = await findDuplicateTab(tab);
    if (duplicateTab) {
      await handleDuplicateTab(tab, duplicateTab);
    }
  }
});

// Listen for tab created events
browser.tabs.onCreated.addListener(async (tab) => {
  // Wait a short time for URL to load
  setTimeout(async () => {
    try {
      const updatedTab = await browser.tabs.get(tab.id);
      if (updatedTab.url && isValidUrl(updatedTab.url)) {
        const duplicateTab = await findDuplicateTab(updatedTab);
        if (duplicateTab) {
          await handleDuplicateTab(updatedTab, duplicateTab);
        }
      }
    } catch (error) {
      // Tab may have been closed, ignore error
    }
  }, 500);
});

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.action) {
    case 'getSettings':
      return settings;
      
    case 'updateSettings':
      settings = { ...settings, ...message.settings };
      await saveSettings();
      return { success: true };
      
    case 'getStats':
      return await getStats();
      
    case 'scanDuplicates':
      return await scanAllDuplicates();
      
    case 'closeDuplicates':
      return await closeAllDuplicates();
  }
});

// Get statistics
async function getStats() {
  const tabs = await browser.tabs.query({});
  const validTabs = tabs.filter(tab => isValidUrl(tab.url));
  const urlMap = new Map();
  
  validTabs.forEach(tab => {
    const normalizedUrl = normalizeUrl(tab.url);
    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, []);
    }
    urlMap.get(normalizedUrl).push(tab);
  });
  
  let duplicateCount = 0;
  urlMap.forEach(tabList => {
    if (tabList.length > 1) {
      duplicateCount += tabList.length - 1;
    }
  });
  
  return {
    totalTabs: tabs.length,
    duplicateTabs: duplicateCount
  };
}

// Scan all duplicate tabs
async function scanAllDuplicates() {
  const tabs = await browser.tabs.query({});
  const validTabs = tabs.filter(tab => isValidUrl(tab.url) && !isDomainExcluded(tab.url));
  const urlMap = new Map();
  
  validTabs.forEach(tab => {
    const normalizedUrl = normalizeUrl(tab.url);
    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, []);
    }
    urlMap.get(normalizedUrl).push(tab);
  });
  
  const duplicates = [];
  urlMap.forEach((tabList, url) => {
    if (tabList.length > 1) {
      duplicates.push({
        url: url,
        tabs: tabList.map(t => ({ id: t.id, title: t.title })),
        count: tabList.length
      });
    }
  });
  
  return duplicates;
}

// Close all duplicate tabs (keep the newest)
async function closeAllDuplicates() {
  const duplicates = await scanAllDuplicates();
  let closedCount = 0;
  
  for (const dup of duplicates) {
    // Sort by tab id, larger id means newer tab
    const sortedTabs = dup.tabs.sort((a, b) => b.id - a.id);
    
    // Close all tabs except the newest one
    for (let i = 1; i < sortedTabs.length; i++) {
      try {
        await browser.tabs.remove(sortedTabs[i].id);
        closedCount++;
      } catch (error) {
        console.error('Failed to close tab:', error);
      }
    }
  }
  
  return { closedCount };
}

// Initialize
loadSettings();
console.log('Tab Deduplicator started');
