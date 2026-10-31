const express = require('express');
const { createItemsController } = require('../controllers/itemsController');

function createItemsRouter(Item) {
  const router = express.Router();

  router.get('/', createItemsController(Item));

  return router;
}

module.exports = createItemsRouter;
