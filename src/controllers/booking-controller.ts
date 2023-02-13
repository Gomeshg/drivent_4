import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares";

import { Booking, Room } from "@prisma/client";
import httpStatus from "http-status";
import bookingService from "@/services/booking-service";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  try {
    const booking = await bookingService.findBooking(userId);
    return res.status(httpStatus.OK).send(booking);
  } catch (err) {
    if (err.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }

    return res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
  }
}
export async function postBooking(req: AuthenticatedRequest, res: Response) {
  return;
}
export async function putBooking(req: AuthenticatedRequest, res: Response) {
  return;
}
