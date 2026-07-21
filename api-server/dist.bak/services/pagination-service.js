export class PaginationService {
    paginate(items, page, pageSize) {
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
//# sourceMappingURL=pagination-service.js.map