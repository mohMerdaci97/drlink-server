const { AuditLog } = require("../../models");
const { Op, Sequelize } = require("sequelize");

exports.findAll = async ({
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
  const where = {};

  if (action) where.action = action;
  if (role) where.role = role;
  if (status) where.status = status;
  if (userId) where.user_id = userId;
  if (entityType) where.entity_type = entityType;

  if (from || to) {
    where.created_at = {};

    if (from) {
      where.created_at[Op.gte] = new Date(`${from}T00:00:00.000Z`);
    }

    if (to) {
      where.created_at[Op.lte] = new Date(`${to}T23:59:59.999Z`);
    }
  }

  return AuditLog.findAndCountAll({
    where,

    attributes: {
      include: [
        [
          Sequelize.literal(`(
            SELECT u.full_name
            FROM users AS u
            WHERE u.id = "AuditLog"."user_id"
            LIMIT 1
          )`),
          "actor_name",
        ],
      ],
    },

    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],

    limit,
    offset,
  });
};

exports.findById = async (id) => {
  return AuditLog.findByPk(id, {
    attributes: {
      include: [
        [
          Sequelize.literal(`(
            SELECT u.full_name
            FROM users AS u
            WHERE u.id = "AuditLog"."user_id"
            LIMIT 1
          )`),
          "actor_name",
        ],
      ],
    },
  });
};
