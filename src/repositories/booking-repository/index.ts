import { prisma } from "@/config";

export async function findByUserId(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId,
    },
    include: {
      Room: true,
    },
  });
}

export async function findByBookingId(bookingId: number) {
  return prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      Room: true,
    },
  });
}

export async function findRoom(roomId: number) {
  return prisma.room.findUnique({
    where: {
      id: roomId,
    },
  });
}

export async function create(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
    },
  });
}

export async function update(bookingId: number, roomId: number) {
  return prisma.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      roomId,
    },
    include: {
      Room: true,
    },
  });
}

export async function increaseRoomCapacity(roomId: number) {
  return prisma.room.update({
    where: {
      id: roomId,
    },
    data: {
      capacity: { increment: 1 },
    },
  });
}

export async function decreaseRoomCapacity(roomId: number) {
  return prisma.room.update({
    where: {
      id: roomId,
    },
    data: {
      capacity: { decrement: 1 },
    },
  });
}

const bookingRepository = {
  findByUserId,
  findByBookingId,
  findRoom,
  create,
  update,
  increaseRoomCapacity,
  decreaseRoomCapacity,
};

export default bookingRepository;
