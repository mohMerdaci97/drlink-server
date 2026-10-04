const { z } = require("zod");

const { searchQuerySchema } = require("../shared/common.validation");

const patientListQuerySchema = z
  .object({
    ...searchQuerySchema.shape,
  })
  .strict();

module.exports = {
  patientListQuerySchema,
};
