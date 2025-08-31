const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateText(prompt, options = {}) {
    try {
      const { temperature = 0.7, maxOutputTokens = 1024 } = options;
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      });
      
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in GeminiService.generateText:', error);
      throw new Error('Failed to generate text with Gemini');
    }
  }

  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error in GeminiService.generateEmbedding:', error);
      throw new Error('Failed to generate embedding with Gemini');
    }
  }

  async chat(messages, options = {}) {
    try {
      const { temperature = 0.7, maxOutputTokens = 1024 } = options;
      const chat = this.model.startChat({
        history: messages.slice(0, -1), // All messages except the last one
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      });

      const result = await chat.sendMessage(messages[messages.length - 1].content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in GeminiService.chat:', error);
      throw new Error('Failed to generate chat response with Gemini');
    }
  }
}

module.exports = new GeminiService();
