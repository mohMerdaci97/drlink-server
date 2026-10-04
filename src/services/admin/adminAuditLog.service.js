const repository = require("../../repositories/admin/adminAuditLog.repository");

exports.getAll = async ({
  page,
  limit,
  offset,
  action,
  role,
  status,
  userId,
  entityType,
  from,
  to,
}) => {
  const result = await repository.findAll({
    page,
    limit,
    offset,
    action,
    role,
    status,
    userId,
    entityType,
    from,
    to,
  });

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total: result.count,
      totalPages: Math.ceil(result.count / limit),
    },
  };
};

exports.getOne = async (id) => {
  const auditLog = await repository.findById(id);

  if (!auditLog) {
    const error = new Error("Journal d'audit introuvable.");
    error.status = 404;
    throw error;
  }

  return auditLog;
};
