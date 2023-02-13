import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { Booking, Room, TicketStatus } from "@prisma/client";
import { ReturnBookingWithRooms, ReturnBooking } from "@/protocols";
import { notFoundError, conflictError, forbiddenError } from "@/errors";
import paymentRepository from "@/repositories/payment-repository";

export async function findBooking(userId: number): Promise<ReturnBookingWithRooms> {
  const booking = await bookingRepository.findByUserId(userId);
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

  if (!ticket.TicketType.includesHotel || ticket.TicketType.isRemote) {
    throw forbiddenError("An face-to-face ticket or included hotel is required to make a reservation");
  }

  const payment = await paymentRepository.findPaymentByTicketId(ticket.id);
  if (!payment) {
    throw forbiddenError("Payment not made");
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

export async function updateBooking(userId: number, roomId: number, bookingId: number): Promise<ReturnBooking> {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw notFoundError();
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
  if (!ticket) {
    throw notFoundError();
  }

  if (!ticket.TicketType.includesHotel || ticket.TicketType.isRemote) {
    throw forbiddenError("An face-to-face ticket or included hotel is required to make a reservation");
  }

  const payment = await paymentRepository.findPaymentByTicketId(ticket.id);
  if (!payment) {
    throw forbiddenError("Payment not made");
  }

  const room = await bookingRepository.findRoom(roomId);
  if (!room) {
    throw notFoundError();
  }

  if (room.capacity === 0) {
    throw forbiddenError("the room is completely filled");
  }

  let booking = await bookingRepository.findByBookingId(bookingId);
  if (!booking) {
    throw notFoundError();
  }

  await bookingRepository.increaseRoomCapacity(booking.Room.id);

  booking = await bookingRepository.update(bookingId, roomId);

  await bookingRepository.decreaseRoomCapacity(roomId);

  return { bookingId: booking.id };
}

const bookingService = {
  findBooking,
  createBooking,
  updateBooking,
};

export default bookingService;
