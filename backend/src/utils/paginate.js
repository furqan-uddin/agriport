/**
 * Helper to paginate Mongoose queries consistently
 * @param {import('mongoose').Model} Model - The Mongoose model
 * @param {Object} queryObj - Mongoose query conditions
 * @param {Object} reqQuery - The req.query object containing page and limit
 * @param {Object} options - Additional query options (sort, populate, select)
 * @returns {Promise<{ docs: Array, pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export const paginate = async (Model, queryObj = {}, reqQuery = {}, options = {}) => {
  const page = Math.max(1, parseInt(reqQuery.page, 10) || 1);
  const limit = Math.max(1, parseInt(reqQuery.limit, 10) || 10);
  const skip = (page - 1) * limit;

  let query = Model.find(queryObj);

  if (options.select) {
    query = query.select(options.select);
  }

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(options.populate);
    }
  }

  if (options.sort) {
    query = query.sort(options.sort);
  } else {
    query = query.sort({ createdAt: -1 });
  }

  const docs = await query.skip(skip).limit(limit);
  const total = await Model.countDocuments(queryObj);

  return {
    docs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
