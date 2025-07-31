// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createQuoteCard' && request.text) {
    const quoteTextElement = document.getElementById('quoteText');
    if (quoteTextElement) {
      quoteTextElement.value = request.text;
      // 触发input事件以更新预览
      quoteTextElement.dispatchEvent(new Event('input'));
    }
  }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const quoteText = document.getElementById('quoteText');
  const previewCanvas = document.getElementById('previewCanvas');
  const exportBtn = document.getElementById('exportBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const fontBtns = document.querySelectorAll('.font-btn');
  const titleText = document.getElementById('titleText');
  const qrcodeText = document.getElementById('qrcodeText');
  const templateSelect = document.getElementById('templateSelect');

  // 总结按钮点击事件处理
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      try {
        const text = quoteText.value.trim();
        if (!text) {
          alert('请先输入需要总结的文字');
          return;
        }



        summarizeBtn.disabled = true;
        summarizeBtn.textContent = '正在总结...';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          throw new Error('请求超时，请稍后重试');
        }, 30000); // 30秒超时

        try {
          const response = await fetch('http://localhost:3000/api/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `总结请求失败: ${response.status}`);
          }

          const data = await response.json();
          if (!data || !data.summary) {
            throw new Error('返回数据格式错误');
          }

          quoteText.value = data.summary;
          config.text = data.summary;
          await updatePreview();
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('请求超时，请稍后重试');
          }
          throw fetchError;
        }
      } catch (error) {
        console.error('总结失败:', error);
        alert(error.message || '总结生成失败，请稍后重试');
      } finally {
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = 'DeepSeek R1总结';
      }
    });
  } else {
    console.error('总结按钮元素未找到');
  }

  // 画布上下文
  const ctx = previewCanvas.getContext('2d');

  // 背景模板配置
  const backgroundTemplates = {
    plain: {
      apply: (ctx) => {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, config.width, ctx.canvas.height);
      }
    },
    gradient: {
      apply: (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
        gradient.addColorStop(0, hexToRgba(config.backgroundColor, 1)); // 起始颜色为完全不透明的背景色
        gradient.addColorStop(1, shadeColor(config.backgroundColor, 50)); // 结束颜色为背景色的亮色或暗色
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, ctx.canvas.height);
      }
    },
    pattern: {
      apply: (ctx) => {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, config.width, ctx.canvas.height);
        drawPattern();
      }
    }
  };

  // 卡片配置
  const config = {
    width: 400,
    minHeight: 300,
    padding: 40,
    backgroundColor: '#FFFFFF',
    backgroundTemplate: 'plain',
    fontFamily: 'LXGW WenKai',  // 默认使用霞鹜文楷
    fontSize: 24,
    lineHeight: 1.5,
    textColor: '#333333',
    text: '',  // 主文本内容
    title: '',  // 标题
    qrcode: ''  // 二维码内容
  };

  // 字体映射表
  const fontMap = {
    'LXGW WenKai': 'LXGW WenKai',
    'Ma Shan Zheng': 'Ma Shan Zheng',
    'Noto Serif SC': 'Noto Serif SC',
    'Noto Sans SC': 'Noto Sans SC'
  };

  // 将十六进制颜色转换为 RGBA 格式
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
      return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
      return "rgb(" + r + ", " + g + ", " + b + ")";
    }
  }

  // 颜色调整函数
  function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      '#' +
      (0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B))
      .toString(16)
      .slice(1)
    );
  }

  // 初始化画布尺寸和背景
  function initCanvas() {
    previewCanvas.width = config.width;
    previewCanvas.height = config.minHeight;
    
    // 设置画布样式
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.textRendering = 'optimizeLegibility';
  }
  
  // 执行初始化
  async function init() {
    try {
      // 等待字体加载
      await document.fonts.ready;
      
      // 初始化画布
      initCanvas();
      
      // 设置初始文本
      if (quoteText) {
        config.text = quoteText.value;
      }
      
      // 设置初始标题
      if (titleText) {
        config.title = titleText.value;
      }
      
      // 设置初始二维码
      if (qrcodeText) {
        config.qrcode = qrcodeText.value;
      }
      
      // 更新预览
      await updatePreview();
    } catch (error) {
      console.error('初始化失败:', error);
      initCanvas();
    }
  }
  
  // 执行初始化
  init();

  // 检查字体是否加载完成
  async function checkFontLoaded(fontFamily) {
    try {
      await document.fonts.load(`24px "${fontFamily}"`);
      return document.fonts.check(`24px "${fontFamily}"`);
    } catch (error) {
      console.error('字体加载检查失败:', error);
      return false;
    }
  }

  // 绘制纹理图案
  function drawPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 40;
    patternCanvas.height = 40;
    const pctx = patternCanvas.getContext('2d');
    pctx.strokeStyle = hexToRgba(config.backgroundColor, 0.2);
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(0, 40);
    pctx.lineTo(40, 0);
    pctx.stroke();


    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, config.width, ctx.canvas.height);
  }

  // 确保在 updatePreview 中调用 drawPattern
  backgroundTemplates.pattern.apply = (ctx) => {
    drawPattern();
  };

  // 更新预览（使用防抖优化）
  const updatePreview = debounce(async function(force = false) {
    try {
      ctx.save(); // 保存当前画布状态
      let tempDiv = null; // 定义在外部，确保在catch块中也能访问
      // 确保quoteText元素存在并且画布上下文有效
      if (!quoteText || !ctx) {
        console.error('文本输入框元素或画布上下文未找到');
        return;
      }


      const text = config.text || '';
      
      if (!text.trim() && !force) {
        initCanvas();
        return;
      }
      
      // 设置字体
      // 检查自定义字体是否加载完成
      const fontLoaded = await checkFontLoaded(config.fontFamily);
      if (!fontLoaded) {
        console.log('字体加载中，使用默认字体...');
        config.fontFamily = 'LXGW WenKai'; // 回退到默认字体
      }
      
      // 设置文本属性
      ctx.fillStyle = config.textColor;
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.textRendering = 'optimizeLegibility';
      const maxWidth = config.width - config.padding * 2;
      const lines = [];
      let currentLine = '';
      
      // 文本换行处理
      const paragraphs = text.split('\n');
      for (const paragraph of paragraphs) {
        if (paragraph === '') {
          lines.push('');
          continue;
        }
        
        const words = paragraph.split('');
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
          currentLine = '';
        }
      }

      // 计算实际所需高度
      const textHeight = Math.max(lines.length * config.fontSize * config.lineHeight, config.fontSize);
      const canvasHeight = Math.max(config.minHeight, textHeight + config.padding * 2);

      // 重置画布状态并设置基本属性
      console.log('Before setting canvas dimensions:', {
        configWidth: config.width,
        canvasHeight: canvasHeight,
        isConfigWidthFinite: Number.isFinite(config.width),
        isCanvasHeightFinite: Number.isFinite(canvasHeight)
      });

      previewCanvas.width = config.width;
      previewCanvas.height = canvasHeight;

      // 应用选中的背景模板
      const template = backgroundTemplates[config.backgroundTemplate] || backgroundTemplates.plain;
      template.apply(ctx);
      
      // 重新设置文本渲染属性
      ctx.fillStyle = config.textColor;
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.textRendering = 'optimizeLegibility';

      // 计算标题高度
      let titleHeight = 0;
      if (config.title) {
        ctx.font = `bold ${config.fontSize * 1.2}px ${config.fontFamily}`;
        titleHeight = config.fontSize * 1.5;
      }

      // 计算二维码高度
      let qrcodeHeight = 0;
      if (config.qrcode) {
        qrcodeHeight = 100; // 二维码固定高度
      }

      // 计算主文本区域高度和位置
      const contentHeight = lines.length * config.fontSize * config.lineHeight;
      const totalContentHeight = titleHeight + contentHeight + (config.qrcode ? qrcodeHeight + 20 : 0);
      let startY = (canvasHeight - totalContentHeight) / 2;

      // 绘制标题
      if (config.title) {
        ctx.fillStyle = config.textColor;
        ctx.font = `bold ${config.fontSize * 1.2}px ${config.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(config.title, config.width / 2, startY + config.fontSize);
        startY += titleHeight + 20;
      }

      // 绘制主文本
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textAlign = 'left';
      let y = startY;
      for (const line of lines) {
        ctx.fillText(line, config.padding, y + config.fontSize / 2);
        y += config.fontSize * config.lineHeight;
      }

      // 绘制二维码
      if (config.qrcode) {
        try {
          // 创建临时div用于生成二维码
          tempDiv = document.createElement('div');
          tempDiv.style.display = 'none';
          document.body.appendChild(tempDiv);

          // 初始化QRCode，它将在tempDiv内部绘制一个canvas
          console.log('尝试生成二维码，内容:', config.qrcode);
          try {
            new QRCode(tempDiv, {
              text: config.qrcode,
              width: 80,
              height: 80,
              colorDark: config.textColor,
              colorLight: config.backgroundColor,
              correctLevel: QRCode.CorrectLevel.H
            });
            console.log('QRCode对象已创建。');
          } catch (qrInitError) {
            console.error('QRCode初始化失败:', qrInitError);
            throw qrInitError; // 重新抛出错误以便外层捕获
          }

          // 获取QRCode库生成的canvas元素
          const qrCanvasElement = tempDiv.querySelector('canvas');
          if (qrCanvasElement) {
            console.log('成功获取到二维码canvas元素。');
              const qrX = config.width - 100;
              const qrY = canvasHeight - 100;
            ctx.drawImage(qrCanvasElement, qrX, qrY, 80, 80);
          } else {
            console.error('QRCode canvas element not found.');
          }
        } catch (error) {
          console.error('二维码生成失败:', error);
        } finally {
          // 清理临时元素
          if (tempDiv && document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
        }
      }
      
      // 恢复画布状态
      ctx.restore(); // 恢复画布状态
    } catch (error) {
      console.error('预览更新失败:', error);
      initCanvas(); // 发生错误时重置画布
    }
  }, 150); // 减少防抖时间以提高响应速度

  // 文本输入事件处理
  if (quoteText) {
    quoteText.addEventListener('input', debounce(() => {
      try {
        config.text = quoteText.value;
        updatePreview();
      } catch (error) {
        console.error('文本更新失败:', error);
        initCanvas();
      }
    }, 300));
  } else {
    console.error('无法绑定文本输入事件：文本输入框元素未找到');
  }

  // 标题输入事件处理
  if (titleText) {
    titleText.addEventListener('input', debounce(() => {
      try {
        config.title = titleText.value;
        updatePreview();
      } catch (error) {
        console.error('更新预览失败:', error);
        initCanvas();
      }
      ctx.restore(); // 确保在任何情况下都恢复画布状态
    }, 300));
  }

  // 二维码输入事件处理
  if (qrcodeText) {
    qrcodeText.addEventListener('input', debounce(() => {
      try {
        config.qrcode = qrcodeText.value;
        updatePreview();
      } catch (error) {
        console.error('二维码更新失败:', error);
        initCanvas();
      }
    }, 300));
  }

  // 背景颜色选择
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        config.backgroundColor = btn.dataset.color;
        updatePreview();
      } catch (error) {
        console.error('背景颜色更新失败:', error);
        initCanvas();
      }
    });
  });

  // 字体选择
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        config.fontFamily = btn.dataset.font;
        updatePreview();
      } catch (error) {
        console.error('字体更新失败:', error);
        initCanvas();
      }
    });
  });

  // 背景模板选择下拉框
  if (templateSelect) {
    templateSelect.addEventListener('change', () => {
      try {
        config.backgroundTemplate = templateSelect.value;
        // 强制更新预览，即使没有文本内容
        updatePreview(true);
      } catch (error) {
        console.error('背景模板更新失败:', error);
        initCanvas();
      }
    });
  }

  // 导出按钮点击事件处理
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const dataURL = previewCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'quote_card_' + new Date().getTime() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败，请稍后重试');
      }
    });
  }

  // 字体选择
  fontBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const newFont = btn.dataset.font;
        // 先检查字体是否可用
        const fontLoaded = await checkFontLoaded(newFont);
        if (!fontLoaded) {
          throw new Error(`字体 ${newFont} 加载失败`);
        }

        fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        config.fontFamily = newFont;
        updatePreview(true);
      } catch (error) {
        console.error('字体更新失败:', error);
        alert(error.message || '字体切换失败，请稍后重试');
        // 恢复默认字体
        config.fontFamily = 'LXGW WenKai';
        updatePreview(true);
      }
    });
  });

  // 字体大小控制
  const fontSizeInput = document.getElementById('fontSizeInput');
  if (fontSizeInput) {
    fontSizeInput.value = config.fontSize;
    fontSizeInput.addEventListener('input', debounce(() => {
      try {
        const size = parseInt(fontSizeInput.value);
        if (size >= 12 && size <= 72) {
          config.fontSize = size;
          updatePreview();
        }
      } catch (error) {
        console.error('字体大小更新失败:', error);
        initCanvas();
      }
    }, 300));
  }

  // 初始化预览
  updatePreview();
});