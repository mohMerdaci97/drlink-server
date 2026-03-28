const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SubscriptionPayment = sequelize.define(
    "SubscriptionPayment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      subscription_id: { type: DataTypes.INTEGER, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER, allowNull: false },
      plan_id: { type: DataTypes.INTEGER, allowNull: false },
      amount_dzd: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paid_at: { type: DataTypes.DATEONLY, allowNull: false },
      payment_method: { type: DataTypes.STRING(50), defaultValue: "cash" },
      reference: { type: DataTypes.STRING(100) },
      notes: { type: DataTypes.TEXT },
      recorded_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "subscription_payments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  SubscriptionPayment.associate = (models) => {
    SubscriptionPayment.belongsTo(models.DoctorSubscription, {
      foreignKey: "subscription_id",
      as: "Subscription",
    });
    SubscriptionPayment.belongsTo(models.Doctor, {
      foreignKey: "doctor_id",
      as: "Doctor",
    });
    SubscriptionPayment.belongsTo(models.Plan, {
      foreignKey: "plan_id",
      as: "Plan",
    });
    SubscriptionPayment.belongsTo(models.User, {
      foreignKey: "recorded_by",
      as: "RecordedBy",
    });
  };

  return SubscriptionPayment;
};
