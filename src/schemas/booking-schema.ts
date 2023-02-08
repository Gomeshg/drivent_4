import joi from "joi";

const bookingSchema = joi.object({
  roomId: joi.number().integer().min(1).required(),
});

export default bookingSchema;
