const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Assistant",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      last_active_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "assistants",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
