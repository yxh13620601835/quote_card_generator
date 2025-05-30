// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const quoteText = document.getElementById('quoteText');
  const previewCanvas = document.getElementById('previewCanvas');
  const exportBtn = document.getElementById('exportBtn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const fontBtns = document.querySelectorAll('.font-btn');

  // 画布上下文
  const ctx = previewCanvas.getContext('2d');

  // 卡片配置
  const config = {
    width: 400,
    minHeight: 300,
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'system-ui',  // 使用系统默认字体
    fontSize: 24,
    lineHeight: 1.5,
    textColor: '#333333'
  };

  // 字体映射表
  const fontMap = {
    '黑体': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',  // 系统黑体
    '楷体': '"KaiTi", "楷体", "STKaiti", "华文楷体"'  // 多个楷体字体名称，确保兼容性
  };

  // 初始化画布尺寸和背景
  function initCanvas() {
    previewCanvas.width = config.width;
    previewCanvas.height = config.minHeight;
    // 设置画布背景
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    // 设置画布样式
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.textRendering = 'optimizeLegibility';
    // 确保预览区域背景完全覆盖
    previewCanvas.style.backgroundColor = config.backgroundColor;
    previewCanvas.style.margin = '0';
    previewCanvas.style.padding = '0';
    previewCanvas.style.display = 'block';
  }
  
  // 执行初始化
  initCanvas();
  
  // 确保字体加载并初始化预览
  async function initPreview() {
    await document.fonts.ready;
    if (quoteText && quoteText.value.trim()) {
      await updatePreview();
    }
  }
  
  // 执行初始化预览
  initPreview();

  // 检查字体是否加载完成
  async function checkFontLoaded(fontFamily) {
    try {
      const testString = '测试文字';
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // 设置字体并测量文本
      context.font = `24px ${fontFamily}`;
      const metrics = context.measureText(testString);
      
      // 如果能成功测量文本，说明字体可用
      return metrics.width > 0;
    } catch (error) {
      console.error('字体加载检查失败:', error);
      return false;
    }
  }

  // 更新预览（使用防抖优化）
  const updatePreview = debounce(async function(force = false, useDefaultFont = true) {
    try {
      // 确保quoteText元素存在并且画布上下文有效
      if (!quoteText || !ctx) {
        console.error('文本输入框元素或画布上下文未找到');
        return;
      }
      // 更新预览区域的背景色
      previewCanvas.style.backgroundColor = config.backgroundColor;

      const text = quoteText.value.trim();
      
      if (!text && !force) {
        initCanvas();
        return;
      }
      
      // 设置字体
      if (!useDefaultFont) {
        // 检查自定义字体是否加载完成
        const fontLoaded = await checkFontLoaded(config.fontFamily);
        if (!fontLoaded) {
          console.log('字体加载中，使用默认字体...');
          config.fontFamily = fontMap['黑体'];
        }
      } else {
        config.fontFamily = fontMap['黑体'];
      }
      
      // 设置文本属性
      ctx.fillStyle = config.textColor;
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.textRendering = 'optimizeLegibility';
      const maxWidth = config.width - config.padding * 2;
      const words = text.split('');
      const lines = [];
      let currentLine = '';
      
      // 文本换行处理
      for (const word of words) {
        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine !== '') {
        lines.push(currentLine);
      }

      // 计算实际所需高度
      const textHeight = Math.max(lines.length * config.fontSize * config.lineHeight, config.fontSize);
      const canvasHeight = Math.max(config.minHeight, textHeight + config.padding * 2);

      // 重置画布状态并设置基本属性
      previewCanvas.width = config.width;
      previewCanvas.height = canvasHeight;
      
      // 设置背景（确保完全覆盖）
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.style.backgroundColor = config.backgroundColor;
      
      // 重新设置文本渲染属性
      ctx.fillStyle = config.textColor;
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.textRendering = 'optimizeLegibility';

      // 计算文本起始位置（垂直居中）
      const startY = (canvasHeight - textHeight) / 2 + config.fontSize / 2;
      
      // 绘制文本
      let y = startY;
      for (const line of lines) {
        ctx.fillText(line, config.padding, y);
        y += config.fontSize * config.lineHeight;
      }
      
      // 恢复画布状态
      ctx.restore();
    } catch (error) {
      console.error('预览更新失败:', error);
      initCanvas(); // 发生错误时重置画布
    }
  }, 150) // 减少防抖时间以提高响应速度

  // 防抖函数
  function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 文本输入事件处理
  if (quoteText) {
    quoteText.addEventListener('input', () => {
      requestAnimationFrame(() => {
        updatePreview();
      });
    });

    // 初始加载时如果有文本则更新预览
    if (quoteText.value.trim()) {
      updatePreview();
    }
  } else {
    console.error('无法绑定文本输入事件：文本输入框元素未找到');
  }

  // 背景颜色选择
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      config.backgroundColor = btn.dataset.color;
      // 如果有文本内容则更新预览，否则只更新背景
      if (quoteText.value.trim()) {
        updatePreview();
      } else {
        initCanvas();
      }
    });
  });

  // 字体选择
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const selectedFont = btn.dataset.font;
      config.fontFamily = fontMap[selectedFont] || selectedFont;
      // 仅在有文本内容时更新预览，使用自定义字体
      if (quoteText.value.trim()) {
        updatePreview(false, false);
      }
    });
  });

  // 导出图片
  exportBtn.addEventListener('click', async () => {
    try {
      exportBtn.disabled = true;
      exportBtn.textContent = '导出中...';

      // 获取画布数据
      const dataUrl = previewCanvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      // 生成文件名
      const date = new Date();
      const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
      const filename = `quote_card_${timestamp}.png`;

      // 触发下载
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      exportBtn.textContent = '导出成功！';
      setTimeout(() => {
        exportBtn.disabled = false;
        exportBtn.textContent = '导出图片';
      }, 2000);
    } catch (error) {
      console.error('导出失败：', error);
      exportBtn.textContent = '导出失败';
      setTimeout(() => {
        exportBtn.disabled = false;
        exportBtn.textContent = '导出图片';
      }, 2000);
    }
  });

  // 初始化预览
  updatePreview();
});