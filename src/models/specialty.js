const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Specialty", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: "specialties",
    timestamps: false
  });
};
