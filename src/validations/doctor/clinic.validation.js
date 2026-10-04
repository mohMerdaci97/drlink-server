const { z } = require("zod");

const {
  algerianPhoneSchema,
  searchQuerySchema,
} = require("../shared/common.validation");

const coordinateSchema = z.coerce.number().finite();

const createClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom du cabinet est requis.")
      .max(150, "Le nom du cabinet est trop long."),

    address: z
      .string()
      .trim()
      .min(2, "L'adresse est requise.")
      .max(255, "L'adresse est trop longue."),

    phone: algerianPhoneSchema.nullable().optional(),

    wilaya_id: z.coerce.number().int().positive("La wilaya est invalide."),

    commune_id: z.coerce.number().int().positive("La commune est invalide."),

    latitude: coordinateSchema
      .min(-90, "Latitude invalide.")
      .max(90, "Latitude invalide.")
      .nullable()
      .optional(),

    longitude: coordinateSchema
      .min(-180, "Longitude invalide.")
      .max(180, "Longitude invalide.")
      .nullable()
      .optional(),
  })
  .strict();

const updateClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom du cabinet est invalide.")
      .max(150, "Le nom du cabinet est trop long.")
      .optional(),

    address: z
      .string()
      .trim()
      .min(2, "L'adresse est invalide.")
      .max(255, "L'adresse est trop longue.")
      .optional(),

    phone: algerianPhoneSchema.nullable().optional(),

    latitude: coordinateSchema
      .min(-90, "Latitude invalide.")
      .max(90, "Latitude invalide.")
      .nullable()
      .optional(),

    longitude: coordinateSchema
      .min(-180, "Longitude invalide.")
      .max(180, "Longitude invalide.")
      .nullable()
      .optional(),
  })
  .strict();

const createScheduleSchema = z
  .object({
    day_of_week: z.enum(
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      {
        message: "Jour invalide.",
      },
    ),

    start_time: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "L'heure de début doit être au format HH:MM.",
      ),

    end_time: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "L'heure de fin doit être au format HH:MM.",
      ),
  })
  .strict()
  .refine((data) => data.start_time < data.end_time, {
    message: "L'heure de fin doit être supérieure à l'heure de début.",
    path: ["end_time"],
  });

const updateScheduleSchema = z
  .object({
    day_of_week: z
      .enum(
        [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        {
          message: "Jour invalide.",
        },
      )
      .optional(),

    start_time: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "L'heure de début doit être au format HH:MM.",
      )
      .optional(),

    end_time: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "L'heure de fin doit être au format HH:MM.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
      }

      return true;
    },
    {
      message: "L'heure de fin doit être supérieure à l'heure de début.",
      path: ["end_time"],
    },
  );

const availableClinicQuerySchema = z
  .object({
    ...searchQuerySchema.shape,
  })
  .strict();

module.exports = {
  createClinicSchema,
  updateClinicSchema,
  createScheduleSchema,
  updateScheduleSchema,
  availableClinicQuerySchema,
};
