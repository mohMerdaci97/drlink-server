const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Plan = sequelize.define("Plan", {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:         { type: DataTypes.STRING(100), allowNull: false },
    type:         { type: DataTypes.ENUM("free","monthly","annual","custom"), allowNull: false },
    price_dzd:    { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    duration_days:{ type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    description:  { type: DataTypes.TEXT },
    is_active:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: "plans",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  });

  Plan.associate = (models) => {
    Plan.hasMany(models.DoctorSubscription, { foreignKey: "plan_id" });
    Plan.hasMany(models.SubscriptionPayment, { foreignKey: "plan_id" });
  };

  return Plan;
};