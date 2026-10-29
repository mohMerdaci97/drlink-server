
const { z } = require("zod");

const idSchema = z.coerce
  .number()
  .int("L'identifiant doit être un entier.")
  .positive("Identifiant invalide.");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format AAAA-MM-JJ.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "La date indiquée n'est pas valide.");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "L'heure doit être au format HH:mm.");

const appointmentStatusSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"], {
      message: "Statut de rendez-vous invalide.",
    }),
  })
  .strict();

const bookAppointmentSchema = z
  .object({
    patient_id: idSchema,
    appointment_date: dateSchema,
    appointment_time: timeSchema,
    clinic_id: idSchema,
  })
  .strict();

const appointmentIdParamsSchema = z
  .object({
    id: idSchema,
  })
  .strict();

const slotsQuerySchema = z
  .object({
    clinic_id: idSchema,
    date: dateSchema,
  })
  .strict();

const appointmentsQuerySchema = z
  .object({
    date: dateSchema.optional(),
  })
  .strict();

module.exports = {
  appointmentStatusSchema,
  bookAppointmentSchema,
  appointmentIdParamsSchema,
  slotsQuerySchema,
  appointmentsQuerySchema,
};
