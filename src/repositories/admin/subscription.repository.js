const { Op } = require("sequelize");

const {
  Plan,
  DoctorSubscription,
  SubscriptionPayment,
  Doctor,
  User,
  Specialty,
} = require("../../models");

exports.findAllPlans = async () => {
  return Plan.findAll({
    order: [["price_dzd", "ASC"]],
  });
};

exports.findPlanById = async (id) => {
  return Plan.findByPk(id);
};

exports.createPlan = async (data) => {
  return Plan.create(data);
};

exports.updatePlan = async (plan, data) => {
  return plan.update(data);
};

exports.findAllSubscriptions = async ({ pagination, filters = {} }) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search?.trim()) {
    const matchingUsers = await User.findAll({
      where: {
        full_name: {
          [Op.iLike]: `%${filters.search.trim()}%`,
        },
      },
      attributes: ["id"],
    });

    const userIds = matchingUsers.map((user) => user.id);

    const matchingDoctors = await Doctor.findAll({
      where: {
        user_id: {
          [Op.in]: userIds,
        },
      },
      attributes: ["id"],
    });

    const doctorIds = matchingDoctors.map((doctor) => doctor.id);

    where.doctor_id = {
      [Op.in]: doctorIds,
    };
  }

  return DoctorSubscription.findAndCountAll({
    where,

    limit: pagination.limit,
    offset: pagination.offset,

    distinct: true,

    order: [["created_at", "DESC"]],

    include: [
      {
        model: Plan,
        as: "Plan",
      },

      {
        model: Doctor,
        as: "Doctor",

        include: [
          {
            model: User,
            attributes: ["full_name", "phone", "email", "is_active"],
          },

          {
            model: Specialty,
            attributes: ["name"],
          },
        ],
      },

      {
        model: SubscriptionPayment,
        as: "Payments",

        order: [["paid_at", "DESC"]],

        include: [
          {
            model: User,
            as: "RecordedBy",
            attributes: ["full_name"],
          },
        ],
      },
    ],
  });
};

exports.findLatestDoctorSubscription = async (doctorId) => {
  return DoctorSubscription.findOne({
    where: {
      doctor_id: doctorId,
    },

    order: [["created_at", "DESC"]],

    include: [
      {
        model: Plan,
        as: "Plan",
      },

      {
        model: SubscriptionPayment,
        as: "Payments",

        order: [["paid_at", "DESC"]],

        include: [
          {
            model: User,
            as: "RecordedBy",
            attributes: ["full_name"],
          },
        ],
      },
    ],
  });
};

exports.findById = async (id) => {
  return DoctorSubscription.findByPk(id);
};

exports.findByIdWithPlan = async (id) => {
  return DoctorSubscription.findByPk(id, {
    include: [
      {
        model: Plan,
        as: "Plan",
      },
    ],
  });
};

exports.cancelActiveSubscriptions = async (doctorId) => {
  return DoctorSubscription.update(
    {
      status: "cancelled",
    },

    {
      where: {
        doctor_id: doctorId,

        status: {
          [Op.in]: ["active", "grace"],
        },
      },
    },
  );
};

exports.createSubscription = async (data) => {
  return DoctorSubscription.create(data);
};

exports.updateSubscription = async (subscription, data) => {
  return subscription.update(data);
};

exports.activateDoctor = async (doctorId) => {
  const doctor = await Doctor.findByPk(doctorId, {
    include: [
      {
        model: User,
      },
    ],
  });

  if (doctor?.User && !doctor.User.is_active) {
    await doctor.User.update({
      is_active: true,
    });
  }

  return doctor;
};

exports.createPayment = async (data) => {
  return SubscriptionPayment.create(data);
};

exports.findPayments = async (subscriptionId) => {
  return SubscriptionPayment.findAll({
    where: {
      subscription_id: subscriptionId,
    },

    order: [["paid_at", "DESC"]],

    include: [
      {
        model: User,
        as: "RecordedBy",
        attributes: ["full_name"],
      },
    ],
  });
};

exports.findPaymentById = async (paymentId) => {
  return SubscriptionPayment.findByPk(paymentId);
};

exports.deletePayment = async (payment) => {
  return payment.destroy();
};
