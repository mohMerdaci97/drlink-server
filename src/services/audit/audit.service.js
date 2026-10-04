const { AuditLog } = require("../../models");

exports.log = async ({
  userId = null,
  role = null,
  action,
  entityType = null,
  entityId = null,
  status = "success",
  method = null,
  route = null,
  statusCode = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
  errorCode = null,
}) => {
  try {
    return await AuditLog.create({
      user_id: userId,
      role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      status,
      method,
      route,
      status_code: statusCode,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
      error_code: errorCode,
    });
  } catch (error) {
    // Audit logging must never break the actual business operation.
    console.error("AUDIT_LOG_ERROR:", error.message);

    return null;
  }
};

exports.logRequest = async ({
  req,
  action,
  userId = null,
  role = null,
  entityType = null,
  entityId = null,
  status = "success",
  statusCode = null,
  metadata = null,
  errorCode = null,
}) => {
  return exports.log({
    userId: userId ?? req.user?.id ?? null,
    role: role ?? req.user?.role ?? null,

    action,

    entityType,
    entityId,

    status,
    statusCode,

    method: req.method,
    route: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),

    metadata,
    errorCode,
  });
};
