import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { getBooking, postBooking, putBooking } from "@/controllers";
const bookingRouter = Router();

bookingRouter.get("/", authenticateToken, getBooking);
bookingRouter.post("/", authenticateToken, postBooking);
bookingRouter.put("/:bookindId", authenticateToken, putBooking);

export { bookingRouter };
