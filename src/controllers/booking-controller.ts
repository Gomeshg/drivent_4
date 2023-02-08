import { Request, Response } from "express";
import { Booking } from "@prisma/client";

export async function getBooking(req: Request, res: Response): Promise<Booking> {
  return { id: 1, userId: 1, roomId: 1, createdAt: new Date(), updatedAt: new Date() };
}
export async function postBooking(req: Request, res: Response): Promise<void> {
  return;
}
export async function putBooking(req: Request, res: Response): Promise<void> {
  return;
}
