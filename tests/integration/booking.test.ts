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
  createTicket,
  createPayment,
  generateCreditCardData,
  createTicketTypeRemote,
  createHotel,
  createRoomWithHotelId,
  createBooking,
} from "../factories";
const fourHours = 14400;
const oneSecond = 1;

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
      const room = await createRoomWithHotelId(hotel.id);

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

      expect(response.status).toBe(httpStatus.NOT_FOUND);
      // expect(response.status).toEqual({ id: booking.id, room });
    });
  });
});
