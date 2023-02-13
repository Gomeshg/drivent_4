import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { Booking, Room, TicketStatus } from "@prisma/client";
import { ReturnBookingWithRooms, ReturnBooking } from "@/protocols";
import { notFoundError, conflictError, forbiddenError } from "@/errors";
import paymentRepository from "@/repositories/payment-repository";

export async function findBooking(userId: number): Promise<ReturnBookingWithRooms> {
  const booking = await bookingRepository.find(userId);
  if (!booking) {
    throw notFoundError();
  }

  return { id: booking.id, Room: booking.Room };
}

export async function createBooking(userId: number, roomId: number): Promise<ReturnBooking> {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw notFoundError();
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
  if (!ticket) {
    throw notFoundError();
  }

  if (ticket.status !== TicketStatus.PAID || !ticket.TicketType.includesHotel || ticket.TicketType.isRemote) {
    throw forbiddenError("It's outside the rules for finalize reservation");
  }

  const payment = await paymentRepository.findPaymentByTicketId(ticket.id);
  if (!payment) {
    throw forbiddenError("It's outside the rules for finalize reservation");
  }

  const room = await bookingRepository.findRoom(roomId);
  if (!room) {
    throw notFoundError();
  }

  if (room.capacity === 0) {
    throw forbiddenError("the room is completely filled");
  }

  await bookingRepository.decreaseRoomCapacity(roomId);

  const booking = await bookingRepository.create(userId, roomId);

  return { bookingId: booking.id };
}

// export async function updateBooking(userId: number, bookingId: number): Promise<Booking> {}

const bookingService = {
  findBooking,
};

export default bookingService;
