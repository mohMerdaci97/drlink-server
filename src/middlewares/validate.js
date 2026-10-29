module.exports = (schema, source = "body") => {
  return (req, res, next) => {
    // Body can be missing when the app sends nothing
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      // Field names and messages only
      if (process.env.NODE_ENV !== "production") {
        console.warn("Validation failed:", { source, errors });
      }

      return res.status(400).json({
        success: false,
        message: "Données invalides.",
        errors,
      });
    }

    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    next();
  };
};
