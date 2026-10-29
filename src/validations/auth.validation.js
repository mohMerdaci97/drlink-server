const { z } = require("zod");

const loginSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^(05|06|07)[0-9]{8}$/, "Numéro de téléphone algérien invalide."),

    password: z
      .string()
      .min(1, "Mot de passe requis.")
      .max(128, "Mot de passe trop long."),

    turnstileToken: z.string().min(1, "Vérification anti-robot requise."),
  })
  .strict();

module.exports = {
  loginSchema,
};
