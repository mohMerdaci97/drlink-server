const { z } = require("zod");

// Biggest value of a PostgreSQL INTEGER column
const MAX_INT = 2147483647;

const toNumber = (value) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

exports.emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

exports.numberSchema = ({
  min,
  max,
  integer = false,
  message = "Nombre invalide.",
} = {}) => {
  let schema = z.number({ message });

  if (integer) schema = schema.int(message);
  if (min !== undefined) schema = schema.min(min, message);
  if (max !== undefined) schema = schema.max(max, message);

  return z.preprocess(toNumber, schema);
};

exports.idSchema = (message = "Identifiant invalide.") =>
  exports.numberSchema({ integer: true, min: 1, max: MAX_INT, message });

exports.textSchema = ({ min = 1, max = 255, message = "Texte invalide." } = {}) =>
  z.string({ message }).trim().min(min, message).max(max, message);

// Real calendar date: YYYY-MM-DD
exports.dateSchema = (message = "Date invalide (AAAA-MM-JJ).") =>
  z
    .string({ message })
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, message);

// HH:mm (24h)
exports.timeSchema = (message = "Heure invalide (HH:mm).") =>
  z.string({ message }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, message);

exports.phoneSchema = z
  .string({ message: "Numéro de téléphone requis." })
  .trim()
  .regex(/^(05|06|07)[0-9]{8}$/, "Numéro de téléphone algérien invalide.");

exports.emailSchema = z
  .string({ message: "Email requis." })
  .trim()
  .toLowerCase()
  .max(255, "Email trop long.")
  .email("Email invalide.");

// New password: bcrypt only reads the first 72 bytes
exports.newPasswordSchema = z
  .string({ message: "Mot de passe requis." })
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Mot de passe trop long (72 octets maximum).",
  );

// Existing password (login, confirmation): no strength rules
exports.currentPasswordSchema = z
  .string({ message: "Mot de passe requis." })
  .min(1, "Mot de passe requis.")
  .max(128, "Mot de passe trop long.");

exports.refreshTokenSchema = z
  .string({ message: "Jeton de session invalide." })
  .min(1, "Jeton de session invalide.")
  .max(256, "Jeton de session invalide.");

exports.paginationFields = {
  page: exports
    .numberSchema({ integer: true, min: 1, max: 10000, message: "Page invalide." })
    .default(1),
  limit: exports
    .numberSchema({
      integer: true,
      min: 1,
      max: 50,
      message: "Limite invalide (1 à 50).",
    })
    .default(10),
};