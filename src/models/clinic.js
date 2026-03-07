const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Clinic = sequelize.define(
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

  Clinic.associate = (models) => {
    Clinic.belongsTo(models.Wilaya, {
      foreignKey: "wilaya_id",
      as: "Wilaya",
    });

    Clinic.belongsTo(models.Commune, {
      foreignKey: "commune_id",
      as: "Commune",
    });
  };

  return Clinic;
};
