import app, { init } from "@/app";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import { cleanDb, sleep } from "../helpers";
import { faker } from "@faker-js/faker";
import {
  createUser,
  loginUser,
  createEnrollmentWithAddress,
  createTicketTypeWithHotel,
  createTicketTypeWithOutHotel,
  createTicket,
  createPayment,
  createTicketTypeRemote,
  createHotel,
  createRoomWithHotelId,
  createRoomFilledWithHotelId,
  createBooking,
} from "../factories";
const fourHours = 14400;
const oneSecond = 1;
const fakeRoomId = 38293293829;

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET, { expiresIn: fourHours });

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if the token is expired", async () => {
    const user = await createUser();
    const session = await loginUser(user, oneSecond);
    await sleep(1000);

    const response = await server.get("/booking").set("Authorization", `Bearer ${session.token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("should respond with status 404 if there are no reservation", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 when the reservation was done", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${session.token}`);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: booking.id,
        Room: {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          hotelId: room.hotelId,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        },
      });
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET, { expiresIn: fourHours });

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if the token is expired", async () => {
    const user = await createUser();
    const session = await loginUser(user, oneSecond);
    await sleep(1000);

    const response = await server.post("/booking").set("Authorization", `Bearer ${session.token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("should respond with status 400 if the propertie in body is invalid", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .post("/booking")
        .send({ wrongProperty: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 if the value in body is invalid", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .post("/booking")
        .send({ roomId: "Wrong value" })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 404 if there are no enrollment", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .post("/booking")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 if there are no ticket", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      await createEnrollmentWithAddress(user);

      const response = await server
        .post("/booking")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if the ticket is remote", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .post("/booking")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the ticket not include hotel", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithOutHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .post("/booking")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the payment wasn't made", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .post("/booking")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if the room sent does not exist", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server
        .post("/booking")
        .send({
          roomId: fakeRoomId,
        })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if the room is filled", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const room = await createRoomFilledWithHotelId(hotel.id, "1020");

      const response = await server
        .post("/booking")
        .send({
          roomId: room.id,
        })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 when the reservation was created", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const response = await server
        .post("/booking")
        .send({ roomId: room.id })
        .set("Authorization", `Bearer ${session.token}`);
      expect(response.status).toBe(httpStatus.OK);
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET, { expiresIn: fourHours });

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if the token is expired", async () => {
    const user = await createUser();
    const session = await loginUser(user, oneSecond);
    await sleep(1000);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${session.token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("should respond with status 400 if the params is invalid", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .put("/booking/abc")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 if the propertie in body is invalid", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .put("/booking/1")
        .send({ wrongProperty: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 if the value in body is invalid", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .put("/booking/1")
        .send({ roomId: "Wrong value" })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 404 if there are no enrollment", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);

      const response = await server
        .put("/booking/1")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 if there are no ticket", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      await createEnrollmentWithAddress(user);

      const response = await server
        .put("/booking/1")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if the ticket is remote", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .put("/booking/1")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the ticket not include hotel", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithOutHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .put("/booking/1")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the payment wasn't made", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server
        .put("/booking/1")
        .send({ roomId: fakeRoomId })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if the room sent does not exist", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server
        .put("/booking/1")
        .send({
          roomId: fakeRoomId,
        })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if the room is filled", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);

      const secondRoom = await createRoomFilledWithHotelId(hotel.id, "1020");

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({
          roomId: secondRoom.id,
        })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if the booking does not exist", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      await createBooking(user.id, room.id);

      const response = await server
        .put("/booking/1")
        .send({
          roomId: room.id,
        })
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 when the reservation was updated", async () => {
      const user = await createUser();
      const session = await loginUser(user, fourHours);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

      await createPayment(ticket.id, ticketType.price);
      const hotel = await createHotel();
      const firstRoom = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, firstRoom.id);
      const secondRoom = await createRoomWithHotelId(hotel.id);

      const response = await server
        .put(`/booking/${booking.id}`)
        .send({ roomId: secondRoom.id })
        .set("Authorization", `Bearer ${session.token}`);
      expect(response.status).toBe(httpStatus.OK);
    });
  });
});
