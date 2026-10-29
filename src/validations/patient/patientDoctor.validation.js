const { z } = require("zod");
const {
  idSchema,
  numberSchema,
  textSchema,
  dateSchema,
  emptyToUndefined,
  paginationFields,
} = require("./patientCommon.validation");

// Unknown query keys (cache busters, etc.) are ignored, not rejected

const doctorIdParamSchema = z.object({
  id: idSchema("Médecin invalide."),
});

const wilayaIdParamSchema = z.object({
  id: idSchema("Wilaya invalide."),
});

const doctorsQuerySchema = z.object({
  specialty_id: emptyToUndefined(idSchema("Spécialité invalide.")),
  wilaya_id: emptyToUndefined(idSchema("Wilaya invalide.")),
  commune_id: emptyToUndefined(idSchema("Commune invalide.")),
  search: emptyToUndefined(
    textSchema({
      min: 1,
      max: 50,
      message: "Recherche invalide (50 caractères max).",
    }),
  ),
  available_today: emptyToUndefined(
    z.enum(["true", "false"], { message: "available_today invalide." }),
  ),
  sort: emptyToUndefined(
    z.enum(["name", "newest"], { message: "Tri invalide." }),
  ),
  ...paginationFields,
});

const slotsQuerySchema = z.object({
  clinic_id: idSchema("Clinique invalide."),
  date: dateSchema(),
});

const availableDaysQuerySchema = z.object({
  clinic_id: idSchema("Clinique invalide."),
});

const nearbyQuerySchema = z.object({
  lat: numberSchema({ min: -90, max: 90, message: "Latitude invalide." }),
  lng: numberSchema({ min: -180, max: 180, message: "Longitude invalide." }),
  radius: emptyToUndefined(
    numberSchema({
      min: 0.1,
      max: 100,
      message: "Rayon invalide (0.1 à 100 km).",
    }),
  ),
  specialty_id: emptyToUndefined(idSchema("Spécialité invalide.")),
});

const suggestionsQuerySchema = z.object({
  q: textSchema({
    min: 2,
    max: 50,
    message: "Recherche invalide (2 à 50 caractères).",
  }),
});

module.exports = {
  doctorIdParamSchema,
  wilayaIdParamSchema,
  doctorsQuerySchema,
  slotsQuerySchema,
  availableDaysQuerySchema,
  nearbyQuerySchema,
  suggestionsQuerySchema,
};
