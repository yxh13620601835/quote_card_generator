# 网页金句卡片生成器

一个简单的网页工具，可以将文本内容转换为精美的卡片图片，支持自定义样式和AI文本总结功能。

## 功能特点

- 支持文本输入和编辑
- AI文本总结（基于DeepSeek API）
- 自定义背景颜色和模板
- 多种字体选择
- 字体大小调整
- 支持添加标题
- 支持生成二维码
- 图片导出功能

## 环境要求

- Node.js >= 14.0.0
- NPM >= 6.0.0

## 安装步骤

1. 克隆项目到本地：
   ```bash
   git clone [项目地址]
   cd 网页金句卡片生成器
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置环境变量：
   - 复制`.env.example`文件并重命名为`.env`
   - 在`.env`文件中填入你的DeepSeek API密钥

4. 启动服务器：
   ```bash
   npm start
   ```

## 使用说明

1. 在文本框中输入或粘贴想要制作成卡片的文字
2. 可以点击「DeepSeek R1总结」按钮对文本进行AI总结
3. 选择喜欢的背景模板和颜色
4. 选择合适的字体和字号
5. 可以添加标题和二维码
6. 点击「导出图片」按钮保存卡片

## 注意事项

- 文本长度限制为5000字
- AI总结功能需要配置有效的DeepSeek API密钥
- 导出的图片为PNG格式

## 技术栈

- 前端：原生JavaScript、HTML5 Canvas
- 后端：Node.js、Express
- API：DeepSeek API
- 字体：LXGW WenKai、Ma Shan Zheng等

## 开源协议

MIT License