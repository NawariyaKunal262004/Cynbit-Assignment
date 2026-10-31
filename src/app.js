const express = require('express');
const Item = require('./models/item');
const createItemsRouter = require('./routes/itemsRoutes');
const configureSecurity = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');

function createApp(itemModel = Item) {
  const app = express();

  configureSecurity(app);
  app.use('/api/items', createItemsRouter(itemModel));
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found.'
    });
  });
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
