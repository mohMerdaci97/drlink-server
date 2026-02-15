const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Patient", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    date_of_birth: DataTypes.DATE,
    gender: DataTypes.STRING(10)
  }, {
    tableName: "patients",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  });
};
