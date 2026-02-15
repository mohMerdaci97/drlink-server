const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Clinic",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      wilaya_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      commune_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING(20),
      },
    },
    {
      tableName: "clinics",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
