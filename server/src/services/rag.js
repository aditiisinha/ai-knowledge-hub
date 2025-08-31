const Document = require('../models/Document');
const geminiService = require('./gemini');
const { v4: uuidv4 } = require('uuid');

class RAGService {
  constructor() {
    this.chatSessions = new Map();
  }

  // Initialize a new chat session
  createSession() {
    const sessionId = uuidv4();
    this.chatSessions.set(sessionId, {
      messages: [],
      context: [],
      createdAt: new Date()
    });
    return sessionId;
  }

  // Get relevant documents for a query
  async getRelevantDocuments(query, userId, limit = 3) {
    try {
      // First try semantic search using vector similarity if embeddings exist
      const queryEmbedding = await geminiService.generateEmbedding(query);
      
      // This is a simplified example - in a real app, you'd use a vector database
      // Here we're just doing a text search as a fallback
      const documents = await Document.find({
        $or: [
          { owner: userId },
          { isPublic: true }
        ],
        $text: { $search: query }
      })
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .lean();

      return documents;
    } catch (error) {
      console.error('Error in RAGService.getRelevantDocuments:', error);
      return [];
    }
  }

  // Generate a response using RAG
  async generateResponse(sessionId, userMessage) {
    const session = this.chatSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // Get relevant documents for the user's message
      const relevantDocs = await this.getRelevantDocuments(
        userMessage.content,
        userMessage.userId
      );

      // Format the context from relevant documents
      const context = relevantDocs
        .map(doc => `Document: ${doc.title}\n${doc.content.substring(0, 500)}...`)
        .join('\n\n');

      // Add system message with context
      const systemMessage = {
        role: 'system',
        content: `You are a helpful assistant. Use the following context to answer questions. If you don't know the answer, say so.\n\nContext:\n${context}`
      };

      // Update session context
      session.messages.push({
        role: 'user',
        content: userMessage.content
      });

      // Generate response using Gemini
      const messages = [systemMessage, ...session.messages];
      const response = await geminiService.chat(messages);

      // Save assistant's response to session
      session.messages.push({
        role: 'assistant',
        content: response
      });

      // Keep only the last 10 messages to manage context window
      if (session.messages.length > 10) {
        session.messages = session.messages.slice(-10);
      }

      return {
        response,
        sources: relevantDocs.map(doc => ({
          id: doc._id,
          title: doc.title,
          snippet: doc.content.substring(0, 150) + '...'
        }))
      };
    } catch (error) {
      console.error('Error in RAGService.generateResponse:', error);
      throw new Error('Failed to generate response');
    }
  }

  // Clear a chat session
  clearSession(sessionId) {
    return this.chatSessions.delete(sessionId);
  }
}

module.exports = new RAGService();
