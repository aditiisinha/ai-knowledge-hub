const Document = require('../models/Document');
const geminiService = require('./gemini');

class EmbeddingService {
  constructor() {
    this.embeddingCache = new Map();
  }

  // Generate or retrieve embedding for text
  async getEmbedding(text) {
    try {
      // Check cache first
      const cacheKey = this._generateCacheKey(text);
      if (this.embeddingCache.has(cacheKey)) {
        return this.embeddingCache.get(cacheKey);
      }

      // Generate new embedding
      const embedding = await geminiService.generateEmbedding(text);
      
      // Cache the result
      this.embeddingCache.set(cacheKey, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Error in EmbeddingService.getEmbedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Update document embeddings
  async updateDocumentEmbeddings(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Generate embedding for the document content
      const embedding = await this.getEmbedding(document.content);
      
      // Update the document with the new embedding
      document.embeddings = embedding;
      await document.save();
      
      return document;
    } catch (error) {
      console.error('Error in EmbeddingService.updateDocumentEmbeddings:', error);
      throw new Error('Failed to update document embeddings');
    }
  }

  // Find similar documents using vector similarity
  async findSimilarDocuments(query, userId, limit = 5, minSimilarity = 0.7) {
    try {
      // Get query embedding
      const queryEmbedding = await this.getEmbedding(query);
      
      // This is a simplified example - in a real app, you'd use a vector database
      // Here we're just doing a text search as a fallback
      const documents = await Document.find({
        $or: [
          { owner: userId },
          { isPublic: true }
        ]
      })
      .limit(limit * 2) // Get more results to account for similarity filtering
      .lean();

      // Calculate cosine similarity for each document
      const documentsWithSimilarity = documents.map(doc => {
        if (!doc.embeddings || doc.embeddings.length === 0) {
          return { ...doc, similarity: 0 };
        }
        const similarity = this._cosineSimilarity(queryEmbedding, doc.embeddings);
        return { ...doc, similarity };
      });

      // Filter by minimum similarity and sort
      return documentsWithSimilarity
        .filter(doc => doc.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in EmbeddingService.findSimilarDocuments:', error);
      return [];
    }
  }

  // Calculate cosine similarity between two vectors
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * (vecB[i] || 0), 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Generate a cache key for text
  _generateCacheKey(text) {
    return text.length <= 100 ? text : text.substring(0, 50) + text.length + text.slice(-50);
  }
}

module.exports = new EmbeddingService();
