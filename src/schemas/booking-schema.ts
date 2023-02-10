import joi, { ObjectSchema } from "joi";
type BookingBody = {
  roomId: number;
};
type BookingParams = {
  bookingId: number;
};

export const bookingBodySchema: ObjectSchema<BookingBody> = joi.object({
  roomId: joi.number().integer().min(1).required(),
});

export const bookingParamsSchema: ObjectSchema<BookingParams> = joi.object({
  bookingId: joi.number().integer().min(1).required(),
});
