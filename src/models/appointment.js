const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Appointment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    appointment_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled", "completed"),
      allowNull: false
    }
  }, {
    tableName: "appointments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  });
};
