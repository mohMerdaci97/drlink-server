exports.getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 10, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

exports.getPagingData = (result, page, limit) => {
  const { count: totalItems, rows: data } = result;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      limit,
    },
  };
};
