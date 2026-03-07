const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "DoctorClinic",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "doctors",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      clinic_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "clinics",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      day_of_week: {
        type: DataTypes.ENUM(
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ),
        allowNull: false,
      },

      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "doctor_clinics",
      timestamps: false,

      indexes: [
        {
          unique: true,
          fields: ["doctor_id", "clinic_id", "day_of_week"],
        },
      ],
    },
  );
};
