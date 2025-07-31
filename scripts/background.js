// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createQuoteCard') {
    // 打开扩展弹窗
    chrome.action.openPopup();
    
    // 延迟发送消息，确保popup页面已加载
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'createQuoteCard',
        text: request.text
      });
    }, 500);
  }
});