const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DoctorPatient = sequelize.define(
    "DoctorPatient",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      source: {
        type: DataTypes.ENUM("app", "walk_in"),
        allowNull: false,
      },
      added_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "doctor_patients",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return DoctorPatient;
};
