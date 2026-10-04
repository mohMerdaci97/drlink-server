const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },

      // Who performed the action
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Snapshot of the role at the time of the event

      role: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      // What happened
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      // What type of resource was affected

      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      // ID of the affected resource
      entity_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      // Result of the operation
      status: {
        type: DataTypes.ENUM("success", "failure"),
        allowNull: false,
        defaultValue: "success",
      },

      // HTTP information
      method: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },

      route: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Network information
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Additional structured information
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      // Useful for failures
      error_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: false,

      indexes: [
        {
          fields: ["user_id"],
        },
        {
          fields: ["action"],
        },
        {
          fields: ["entity_type", "entity_id"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["created_at"],
        },
        {
          fields: ["role"],
        },
      ],
    },
  );

  return AuditLog;
};
