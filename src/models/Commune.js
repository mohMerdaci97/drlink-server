const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const Commune = sequelize.define(
    "Commune",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
      },
      wilaya_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      tableName: "communes",
      timestamps: false,
    },
  );

  Commune.associate = (models) => {
    Commune.belongsTo(models.Wilaya, {
      foreignKey: "wilaya_id",
      as: "wilaya",
    });
  };

  return Commune;
};
