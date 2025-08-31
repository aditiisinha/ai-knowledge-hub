import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ai-knowledge-hub',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  test: {
    port: process.env.PORT || 5001,
    mongoUri: process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/ai-knowledge-hub-test',
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret',
  },
  production: {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  }
};

const envConfig = config[env];

export const {
  port,
  mongoUri,
  jwtSecret,
  geminiApiKey,
  openaiApiKey
} = envConfig;

export default envConfig;
