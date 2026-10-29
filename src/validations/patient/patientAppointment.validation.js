const { z } = require("zod");
const {
  idSchema,
  dateSchema,
  timeSchema,
  emptyToUndefined,
  paginationFields,
} = require("./patientCommon.validation");
const { STATUS } = require("../../constants/appointment");

const STATUSES = Object.values(STATUS);

const appointmentIdParamSchema = z.object({
  id: idSchema("Rendez-vous invalide."),
});

// status can be one value or a list: "pending,confirmed"
const listQuerySchema = z.object({
  status: emptyToUndefined(
    z
      .string({ message: "Statut invalide." })
      .refine(
        (value) => value.split(",").every((s) => STATUSES.includes(s.trim())),
        "Statut invalide.",
      ),
  ),
  scope: emptyToUndefined(
    z.enum(["upcoming", "past"], { message: "Filtre invalide." }),
  ),
  ...paginationFields,
});

const createAppointmentSchema = z
  .object({
    doctor_id: idSchema("Médecin invalide."),
    clinic_id: idSchema("Clinique invalide."),
    appointment_date: dateSchema(),
    appointment_time: timeSchema(),
  })
  .strict();

const rescheduleAppointmentSchema = z
  .object({
    appointment_date: dateSchema(),
    appointment_time: timeSchema(),
  })
  .strict();

module.exports = {
  appointmentIdParamSchema,
  listQuerySchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
};
