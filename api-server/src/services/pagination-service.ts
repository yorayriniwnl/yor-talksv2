export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export class PaginationService {
  paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    return {
      items: items.slice(start, end),
      page: safePage,
      pageSize: safePageSize,
      total: items.length,
    };
  }
}
