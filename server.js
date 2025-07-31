require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('欢迎使用金句卡片生成器API服务');
});

// 验证环境变量
function validateEnvVariables() {
  const requiredVars = {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(`错误：未设置以下必需的环境变量：${missingVars.join(', ')}`);
    process.exit(1);
  }

  return requiredVars;
}

const { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } = validateEnvVariables();

// 验证请求文本
function validateRequestText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('请提供有效的文本内容');
  }
  if (text.length > 5000) {
    throw new Error('文本内容过长，请限制在5000字以内');
  }
  if (text.trim().length === 0) {
    throw new Error('文本内容不能为空');
  }
}

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    try {
      validateRequestText(text);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }
    
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-r1-250120',
      messages: [
        {
          role: 'system',
          content: '使用一个金句总结全文最核心的内容，要求简洁有力，不超过50字。输出内容必须是中文。'
        },
        {
          role: 'user',
          content: text
        }
      ],
      stream: false,
      temperature: 0.6,
      max_tokens: 150,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      timeout: 20000 // 20秒超时，与前端保持一致
    });

    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      throw new Error('API响应格式错误');
    }

    const summary = response.data.choices[0].message.content.trim();
    if (!summary) {
      throw new Error('生成的总结内容为空');
    }

    res.json({ summary });
  } catch (error) {
    console.error('API请求失败:', error);
    
    let statusCode = 500;
    let errorMessage = '总结生成失败，请稍后重试';

    if (error.response) {
      // API返回的错误
      statusCode = error.response.status;
      const apiError = error.response.data?.error;
      if (apiError) {
        if (typeof apiError === 'string') {
          errorMessage = apiError;
        } else if (typeof apiError === 'object' && apiError.message) {
          errorMessage = apiError.message;
        }
      }
      errorMessage = `API错误: ${errorMessage}`;
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      statusCode = 504;
      errorMessage = '请求超时，请稍后重试';
    } else if (error.code === 'ECONNREFUSED') {
      // 连接被拒绝
      statusCode = 503;
      errorMessage = 'API服务暂时不可用，请稍后重试';
    } else {
      // 其他错误
      errorMessage = error.message || errorMessage;
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});