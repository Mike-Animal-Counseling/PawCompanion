export function ok(res, data, meta) {
  return res.json(meta ? { data, meta } : { data });
}

export function created(res, data, meta) {
  return res.status(201).json(meta ? { data, meta } : { data });
}

export function noContent(res) {
  return res.status(204).end();
}

export function paginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
  };
}

export function parsePagination(query, { defaultPageSize = 12, maxPageSize = 48 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(query.pageSize) || defaultPageSize));
  return { page, pageSize, skip: (page - 1) * pageSize, limit: pageSize };
}
