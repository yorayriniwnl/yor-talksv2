import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { ProductRepository } from "../repositories/product-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ProductService } from "../services/product-service.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("marketplace saves are private, viewer-scoped, and toggleable", async () => {
  const userRepository = new UserRepository();
  const seller = await createTestUser(userRepository);
  const buyer = await createTestUser(userRepository);
  const service = new ProductService(new ProductRepository());
  const product = await service.createProduct({
    sellerId: seller.id,
    title: "Handmade control surface",
    description: "A durable control surface for live creators.",
    price: 2499,
    images: ["https://example.test/product.jpg"],
    category: "hardware",
    condition: "new",
  });

  const saved = await service.toggleSave(product.id, buyer.id);
  assert.deepEqual(saved?.savedBy, [buyer.id]);
  assert.deepEqual((await service.getProduct(product.id, seller.id))?.savedBy, []);

  const unsaved = await service.toggleSave(product.id, buyer.id);
  assert.deepEqual(unsaved?.savedBy, []);
});
