export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const sort = query.sort || 'created_at';
  const order = query.order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  return { page, limit, sort, order, offset };
}

export function paginatedResponse(rows, total, { page, limit }) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
