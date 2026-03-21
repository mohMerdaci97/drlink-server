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
      created_by_doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },

      is_private: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
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

    Clinic.belongsTo(models.Doctor, {
      foreignKey: "created_by_doctor_id",
      as: "Owner",
      constraints: false,
    });
  };

  return Clinic;
};
