// 创建弹出菜单元素
function createPopupMenu() {
  const menu = document.createElement('div');
  menu.id = 'quote-card-menu';
  menu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 999999;
    display: none;
  `;
  menu.innerHTML = `
    <button id="create-quote-card" style="
      background: #1a73e8;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    ">
      生成金句卡片
    </button>
  `;
  document.body.appendChild(menu);
  return menu;
}

// 获取选中文本
function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

// 获取鼠标位置
function getMousePosition(event) {
  return {
    x: event.clientX,
    y: event.clientY
  };
}

// 显示菜单
function showMenu(x, y) {
  const menu = document.getElementById('quote-card-menu') || createPopupMenu();
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';
}

// 隐藏菜单
function hideMenu() {
  const menu = document.getElementById('quote-card-menu');
  if (menu) {
    menu.style.display = 'none';
  }
}

// 打开扩展弹窗
function openQuoteCardPopup(text) {
  // 发送消息给扩展的popup页面
  chrome.runtime.sendMessage({
    action: 'createQuoteCard',
    text: text
  });
}

// 监听文本选择事件
document.addEventListener('mouseup', (event) => {
  const selectedText = getSelectedText();
  if (selectedText) {
    const { x, y } = getMousePosition(event);
    showMenu(x, y);

    // 绑定按钮点击事件
    const createButton = document.getElementById('create-quote-card');
    if (createButton) {
      createButton.onclick = () => {
        openQuoteCardPopup(selectedText);
        hideMenu();
      };
    }
  } else {
    hideMenu();
  }
});

// 点击页面其他区域时隐藏菜单
document.addEventListener('mousedown', (event) => {
  const menu = document.getElementById('quote-card-menu');
  if (menu && !menu.contains(event.target)) {
    hideMenu();
  }
});

// 滚动时隐藏菜单
document.addEventListener('scroll', () => {
  hideMenu();
});