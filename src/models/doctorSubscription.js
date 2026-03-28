const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DoctorSubscription = sequelize.define(
    "DoctorSubscription",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      doctor_id: { type: DataTypes.INTEGER, allowNull: false },
      plan_id: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "expired", "cancelled", "grace"),
        allowNull: false,
        defaultValue: "active",
      },
      starts_at: { type: DataTypes.DATEONLY, allowNull: false },
      expires_at: { type: DataTypes.DATEONLY, allowNull: true },
      grace_ends_at: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT },
    },
    {
      tableName: "doctor_subscriptions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  DoctorSubscription.associate = (models) => {
    DoctorSubscription.belongsTo(models.Doctor, {
      foreignKey: "doctor_id",
      as: "Doctor",
    });
    DoctorSubscription.belongsTo(models.Plan, {
      foreignKey: "plan_id",
      as: "Plan",
    });
    DoctorSubscription.hasMany(models.SubscriptionPayment, {
      foreignKey: "subscription_id",
      as: "Payments",
    });
  };

  return DoctorSubscription;
};
