require('dotenv').config();

const mongoose = require('mongoose');
const createApp = require('./app');

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(mongoUri);

  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
