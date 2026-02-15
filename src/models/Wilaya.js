const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const Wilaya = sequelize.define(
    "Wilaya",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
      },
      code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        unique: true,
      },
      name_ar: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_fr: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "wilayas",
      timestamps: false,
    },
  );

  Wilaya.associate = (models) => {
    Wilaya.hasMany(models.Commune, {
      foreignKey: "wilaya_id",
      as: "communes",
    });
  };

  return Wilaya;
};
