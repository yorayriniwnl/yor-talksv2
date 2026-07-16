import assert from "node:assert/strict";
import { test } from "node:test";
import { PaginationService } from "../services/pagination-service.js";

test("pagination service slices items correctly", () => {
  const paginationService = new PaginationService();
  const result = paginationService.paginate([1, 2, 3, 4], 2, 2);

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items, [3, 4]);
  assert.equal(result.total, 4);
});
