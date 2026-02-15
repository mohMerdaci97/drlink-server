const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Doctor",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      description: DataTypes.TEXT,
      is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      specialty_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "specialties",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "doctors",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
