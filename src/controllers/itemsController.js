function createItemsController(Item) {
  return async function getItems(req, res, next) {
    try {
      const pageValue = req.query.page === undefined ? '1' : req.query.page;
      const limitValue = req.query.limit === undefined ? '10' : req.query.limit;
      const page = Number(pageValue);
      const limit = Number(limitValue);

      if (
        typeof pageValue !== 'string' ||
        typeof limitValue !== 'string' ||
        !/^\d+$/.test(pageValue) ||
        !/^\d+$/.test(limitValue) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Page must be a positive number and limit must be between 1 and 100.'
        });
      }

      const skip = (page - 1) * limit;

      if (!Number.isSafeInteger(skip)) {
        return res.status(400).json({
          success: false,
          message: 'Page number is too large.'
        });
      }

      const [items, totalItems] = await Promise.all([
        Item.find({})
          .select('title summary thumbnail createdAt')
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit),
        Item.countDocuments({})
      ]);

      res.status(200).json({
        success: true,
        data: items,
        meta: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createItemsController };
