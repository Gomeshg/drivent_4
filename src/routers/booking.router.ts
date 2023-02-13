import { Router } from "express";
import { authenticateToken, validateBody, validateParams } from "@/middlewares";
import { getBooking, postBooking, putBooking } from "@/controllers";
import { bookingBodySchema, bookingParamsSchema } from "@/schemas/booking-schema";
import { ObjectSchema } from "joi";

const bookingRouter = Router();

bookingRouter.get("/", authenticateToken, getBooking);
bookingRouter.post("/", authenticateToken, validateBody(bookingBodySchema), postBooking);
bookingRouter.put(
  "/:bookingId",
  authenticateToken,
  validateParams(bookingParamsSchema),
  validateBody(bookingBodySchema),
  putBooking,
);

export { bookingRouter };
