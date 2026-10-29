const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
  searchQuerySchema,
} = require("../shared/common.validation");

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const positiveIdSchema = z.coerce
  .number({
    invalid_type_error: "L'identifiant doit être un nombre.",
  })
  .int("L'identifiant doit être un entier.")
  .positive("L'identifiant doit être supérieur à zéro.");

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

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

const optionalEmailSchema = emailSchema.nullable().optional();

// --------------------------------------------------
// Profile
// --------------------------------------------------

const profileUpdateSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long.")
      .optional(),

    phone: algerianPhoneSchema.optional(),

    email: optionalEmailSchema,
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Vous devez fournir au moins un champ à modifier.",
  );

const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "Le mot de passe actuel est obligatoire."),

    new_password: passwordSchema,

    confirm_password: z
      .string()
      .min(1, "La confirmation du mot de passe est obligatoire."),
  })
  .strict()
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Les mots de passe ne correspondent pas.",
  })
  .refine((data) => data.current_password !== data.new_password, {
    path: ["new_password"],
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
  });

const resetPasswordSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z
      .string()
      .min(1, "La confirmation du mot de passe est obligatoire."),
  })
  .strict()
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Les mots de passe ne correspondent pas.",
  });

// --------------------------------------------------
// Appointments
// --------------------------------------------------

const appointmentStatusSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"], {
      message: "Le statut du rendez-vous est invalide.",
    }),
  })
  .strict();

const bookAppointmentSchema = z
  .object({
    patient_id: positiveIdSchema,
    clinic_id: positiveIdSchema,
    appointment_date: dateSchema,
    appointment_time: timeSchema,
  })
  .strict();

const slotsQuerySchema = z
  .object({
    clinic_id: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

// --------------------------------------------------
// Patients
// --------------------------------------------------

const updatePatientSchema = z
  .object({
    // User model uses full_name, not first_name / last_name.
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long.")
      .optional(),

    phone: algerianPhoneSchema.optional(),

    email: optionalEmailSchema,

    // Add other fields here only if they exist in your Patient model.
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Vous devez fournir au moins un champ à modifier.",
  );

const patientSearchSchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, "La recherche ne peut pas dépasser 100 caractères.")
      .default(""),
  })
  .strict();

const patientListQuerySchema = z
  .object({
    ...paginationSchema,

    search: z
      .string()
      .trim()
      .max(100, "La recherche ne peut pas dépasser 100 caractères.")
      .optional()
      .default(""),
  })
  .strict();

const recentPatientsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

const patientIdParamsSchema = z
  .object({
    id: positiveIdSchema,
  })
  .strict();

const appointmentIdParamsSchema = z
  .object({
    id: positiveIdSchema,
  })
  .strict();

module.exports = {
  profileUpdateSchema,
  changePasswordSchema,
  resetPasswordSchema,
  appointmentStatusSchema,
  bookAppointmentSchema,
  updatePatientSchema,
  patientSearchSchema,
  patientListQuerySchema,
  recentPatientsQuerySchema,
  patientIdParamsSchema,
  appointmentIdParamsSchema,
  slotsQuerySchema,
};
