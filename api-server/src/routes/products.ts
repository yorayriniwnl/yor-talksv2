import { Router } from "express";
import { ProductController } from "../controllers/product-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { ProductRepository } from "../repositories/product-repository.js";
import { ProductService } from "../services/product-service.js";
import { createProductSchema } from "../validators/product.js";
import { createResponse } from "../utils/response.js";
import { MarketplaceOrderForbiddenError, MarketplaceOrderNotFoundError, MarketplaceRequestError, MarketplaceService } from "../services/marketplace-service.js";
import { PaymentsNotConfiguredError, PaymentProviderError } from "../services/razorpay-service.js";
import { createMarketplaceOrderSchema, marketplaceOrderIdParamSchema, marketplaceProviderOrderIdParamSchema, verifyMarketplacePaymentSchema } from "../validators/marketplace.js";

const router = Router();
const productController = new ProductController(new ProductService(new ProductRepository()));
const marketplaceService = new MarketplaceService();

const paramId = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

router.post("/products", authenticate, validateBody(createProductSchema), productController.create);
router.get("/products", optionalAuthenticate, productController.list);
router.get("/products/orders", authenticate, async (req, res) => {
  try {
    return res.status(200).json(createResponse("Marketplace orders loaded", await marketplaceService.listOrders(req.user!.id)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(createResponse("Marketplace orders could not be loaded", null, {}, ["Internal server error"]));
  }
});
router.post("/products/:id/order", authenticate, validateBody(createMarketplaceOrderSchema), async (req, res) => {
  try {
    const order = await marketplaceService.createOrder({ buyerId: req.user!.id, productId: paramId(req.params.id), ...req.body });
    return res.status(201).json(createResponse("Marketplace payment order created", order));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return res.status(503).json(createResponse("Marketplace payments are unavailable", null, {}, [error.message]));
    if (error instanceof PaymentProviderError) return res.status(502).json(createResponse("Payment provider rejected the marketplace order", null, {}, [error.message]));
    if (error instanceof MarketplaceRequestError) return res.status(400).json(createResponse("Marketplace order could not be created", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Marketplace order could not be created", null, {}, ["Internal server error"]));
  }
});
router.post("/products/orders/:orderId/verify", authenticate, validateParams(marketplaceProviderOrderIdParamSchema), validateBody(verifyMarketplacePaymentSchema), async (req, res) => {
  try {
    const order = await marketplaceService.verifyPayment({ buyerId: req.user!.id, providerOrderId: paramId(req.params.orderId), ...req.body });
    return res.status(200).json(createResponse("Marketplace payment verified", order));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return res.status(503).json(createResponse("Marketplace payments are unavailable", null, {}, [error.message]));
    if (error instanceof PaymentProviderError) return res.status(502).json(createResponse("Marketplace payment verification could not be completed", null, {}, [error.message]));
    if (error instanceof MarketplaceOrderNotFoundError) return res.status(404).json(createResponse("Marketplace payment order not found", null, {}, [error.message]));
    if (error instanceof MarketplaceOrderForbiddenError) return res.status(403).json(createResponse("Marketplace payment is not yours", null, {}, [error.message]));
    if (error instanceof MarketplaceRequestError) return res.status(400).json(createResponse("Marketplace payment verification failed", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Marketplace payment verification failed", null, {}, ["Internal server error"]));
  }
});
router.post("/products/orders/:orderId/cancel", authenticate, validateParams(marketplaceOrderIdParamSchema), async (req, res) => {
  try {
    const order = await marketplaceService.cancelOrder(paramId(req.params.orderId), req.user!.id);
    return res.status(200).json(createResponse("Marketplace order cancelled", order));
  } catch (error) {
    if (error instanceof MarketplaceRequestError) return res.status(400).json(createResponse("Marketplace order could not be cancelled", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Marketplace order could not be cancelled", null, {}, ["Internal server error"]));
  }
});
router.post("/products/orders/:orderId/fulfill", authenticate, validateParams(marketplaceOrderIdParamSchema), async (req, res) => {
  try {
    const order = await marketplaceService.fulfillOrder(paramId(req.params.orderId), req.user!.id);
    return res.status(200).json(createResponse("Marketplace order marked fulfilled", order));
  } catch (error) {
    if (error instanceof MarketplaceRequestError) return res.status(400).json(createResponse("Marketplace order could not be fulfilled", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Marketplace order could not be fulfilled", null, {}, ["Internal server error"]));
  }
});
router.get("/products/:id", optionalAuthenticate, productController.get);
router.post("/products/:id/save", authenticate, productController.toggleSave);
router.delete("/products/:id", authenticate, productController.remove);

export default router;
