// Tab Deduplicator - Background Script
// 當開啟重複的標籤頁時，關閉舊的標籤頁並保留新的

// 預設設定
const DEFAULT_SETTINGS = {
  enabled: true,
  ignoreHash: true,        // 忽略 URL 中的 hash (#)
  ignoreSearch: false,     // 忽略 URL 中的查詢參數 (?)
  showNotification: true,  // 顯示通知
  excludedDomains: []      // 排除的網域
};

let settings = { ...DEFAULT_SETTINGS };

// 載入設定
async function loadSettings() {
  try {
    const stored = await browser.storage.local.get('settings');
    if (stored.settings) {
      settings = { ...DEFAULT_SETTINGS, ...stored.settings };
    }
  } catch (error) {
    console.error('載入設定失敗:', error);
  }
}

// 儲存設定
async function saveSettings() {
  try {
    await browser.storage.local.set({ settings });
  } catch (error) {
    console.error('儲存設定失敗:', error);
  }
}

// 標準化 URL（用於比較）
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // 忽略 hash
    if (settings.ignoreHash) {
      urlObj.hash = '';
    }
    
    // 忽略查詢參數
    if (settings.ignoreSearch) {
      urlObj.search = '';
    }
    
    // 移除結尾的斜線
    let normalized = urlObj.href;
    if (normalized.endsWith('/') && urlObj.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (error) {
    return url;
  }
}

// 檢查網域是否被排除
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

// 檢查是否為有效的 URL（排除特殊頁面）
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

// 尋找重複的標籤頁
async function findDuplicateTab(newTab) {
  if (!settings.enabled) return null;
  if (!newTab.url || !isValidUrl(newTab.url)) return null;
  if (isDomainExcluded(newTab.url)) return null;
  
  const normalizedNewUrl = normalizeUrl(newTab.url);
  
  try {
    const allTabs = await browser.tabs.query({});
    
    for (const tab of allTabs) {
      // 跳過新標籤頁本身
      if (tab.id === newTab.id) continue;
      
      // 跳過無效的 URL
      if (!tab.url || !isValidUrl(tab.url)) continue;
      
      const normalizedTabUrl = normalizeUrl(tab.url);
      
      if (normalizedTabUrl === normalizedNewUrl) {
        return tab;
      }
    }
  } catch (error) {
    console.error('尋找重複標籤頁失敗:', error);
  }
  
  return null;
}

// 處理重複標籤頁
async function handleDuplicateTab(newTab, oldTab) {
  try {
    // 關閉舊的標籤頁
    await browser.tabs.remove(oldTab.id);
    
    // 啟動新的標籤頁
    await browser.tabs.update(newTab.id, { active: true });
    
    // 顯示通知
    if (settings.showNotification) {
      showNotification(newTab.url);
    }
    
    console.log(`已關閉重複標籤頁: ${oldTab.url}`);
  } catch (error) {
    console.error('處理重複標籤頁失敗:', error);
  }
}

// 顯示通知
function showNotification(url) {
  try {
    // 縮短 URL 以便顯示
    let displayUrl = url;
    if (url.length > 50) {
      displayUrl = url.substring(0, 47) + '...';
    }
    
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-96.png'),
      title: 'Tab Deduplicator',
      message: `已關閉重複的標籤頁:\n${displayUrl}`
    });
  } catch (error) {
    // 通知 API 可能不可用，忽略錯誤
    console.log('無法顯示通知');
  }
}

// 監聽標籤頁更新事件
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只在 URL 變更且載入完成時處理
  if (changeInfo.url && changeInfo.status === 'complete') {
    const duplicateTab = await findDuplicateTab(tab);
    if (duplicateTab) {
      await handleDuplicateTab(tab, duplicateTab);
    }
  }
});

// 監聽標籤頁建立事件
browser.tabs.onCreated.addListener(async (tab) => {
  // 等待一小段時間讓 URL 載入
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
      // 標籤頁可能已被關閉，忽略錯誤
    }
  }, 500);
});

// 監聽來自 popup 的訊息
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

// 取得統計資訊
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

// 掃描所有重複標籤頁
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

// 關閉所有重複標籤頁（保留最新的）
async function closeAllDuplicates() {
  const duplicates = await scanAllDuplicates();
  let closedCount = 0;
  
  for (const dup of duplicates) {
    // 按照 tab id 排序，id 較大的是較新的
    const sortedTabs = dup.tabs.sort((a, b) => b.id - a.id);
    
    // 關閉除了最新的之外的所有標籤頁
    for (let i = 1; i < sortedTabs.length; i++) {
      try {
        await browser.tabs.remove(sortedTabs[i].id);
        closedCount++;
      } catch (error) {
        console.error('關閉標籤頁失敗:', error);
      }
    }
  }
  
  return { closedCount };
}

// 初始化
loadSettings();
console.log('Tab Deduplicator 已啟動');
