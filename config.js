// config.js
require('dotenv').config();

const requireEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k}`);
  return v;
};

module.exports = {
  OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
  PORT: Number(process.env.PORT ?? 3001),
  DATABASE_PATH: process.env.DATABASE_PATH ?? './database.sqlite',
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
  OPENAI_MAX_TOKENS: Number(process.env.OPENAI_MAX_TOKENS ?? 500),
  OPENAI_TEMPERATURE: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
};
