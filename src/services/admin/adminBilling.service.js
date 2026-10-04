const subscriptionRepository = require("../../repositories/admin/subscription.repository");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

exports.getPlans = async () => {
  return subscriptionRepository.findAllPlans();
};

exports.createPlan = async (data) => {
  const { name, type, price_dzd, duration_days, description } = data;

  if (!name?.trim() || !type) {
    throw createError("Nom et type requis.", 400);
  }

  return subscriptionRepository.createPlan({
    name: name.trim(),
    type,
    price_dzd,
    duration_days,
    description,
  });
};

exports.updatePlan = async (id, data) => {
  const plan = await subscriptionRepository.findPlanById(id);

  if (!plan) {
    throw createError("Plan introuvable.", 404);
  }

  return subscriptionRepository.updatePlan(plan, data);
};

exports.deletePlan = async (id) => {
  const plan = await subscriptionRepository.findPlanById(id);

  if (!plan) {
    throw createError("Plan introuvable.", 404);
  }

  await subscriptionRepository.updatePlan(plan, {
    is_active: false,
  });

  return {
    message: "Plan désactivé.",
  };
};

exports.getAllSubscriptions = async ({ pagination, filters }) => {
  const result = await subscriptionRepository.findAllSubscriptions({
    pagination,
    filters,
  });

  return {
    data: result.rows,
    total: result.count,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(result.count / pagination.limit),
  };
};

exports.getDoctorSubscription = async (doctorId) => {
  return subscriptionRepository.findLatestDoctorSubscription(doctorId);
};

exports.assignSubscription = async ({
  doctor_id,
  plan_id,
  starts_at,
  amount_dzd,
  paid_at,
  payment_method,
  reference,
  notes,
  recordedBy,
}) => {
  if (!doctor_id || !plan_id) {
    throw createError("doctor_id et plan_id requis.", 400);
  }

  const plan = await subscriptionRepository.findPlanById(plan_id);

  if (!plan) {
    throw createError("Plan introuvable.", 404);
  }

  const start = starts_at ?? new Date().toISOString().slice(0, 10);

  const expiresAt =
    plan.duration_days > 0
      ? calculateExpiration(start, plan.duration_days)
      : null;

  await subscriptionRepository.cancelActiveSubscriptions(doctor_id);

  const subscription = await subscriptionRepository.createSubscription({
    doctor_id,
    plan_id,
    starts_at: start,
    expires_at: expiresAt,
    status: "active",
    notes,
  });

  await subscriptionRepository.activateDoctor(doctor_id);

  if (amount_dzd != null && paid_at) {
    await subscriptionRepository.createPayment({
      subscription_id: subscription.id,
      doctor_id,
      plan_id,
      amount_dzd,
      paid_at,
      payment_method: payment_method ?? "cash",
      reference,
      notes,
      recorded_by: recordedBy,
    });
  }

  return subscription;
};

exports.renewSubscription = async ({
  subscriptionId,
  amount_dzd,
  paid_at,
  payment_method,
  reference,
  notes,
  recordedBy,
}) => {
  const subscription =
    await subscriptionRepository.findByIdWithPlan(subscriptionId);

  if (!subscription) {
    throw createError("Abonnement introuvable.", 404);
  }

  const base =
    subscription.expires_at && new Date(subscription.expires_at) > new Date()
      ? new Date(subscription.expires_at)
      : new Date();

  const newExpiry = new Date(base);

  newExpiry.setDate(newExpiry.getDate() + subscription.Plan.duration_days);

  await subscriptionRepository.updateSubscription(subscription, {
    status: "active",
    expires_at: newExpiry.toISOString().slice(0, 10),
    grace_ends_at: null,
  });

  await subscriptionRepository.activateDoctor(subscription.doctor_id);

  if (amount_dzd != null && paid_at) {
    await subscriptionRepository.createPayment({
      subscription_id: subscription.id,
      doctor_id: subscription.doctor_id,
      plan_id: subscription.plan_id,
      amount_dzd,
      paid_at,
      payment_method: payment_method ?? "cash",
      reference,
      notes,
      recorded_by: recordedBy,
    });
  }

  return {
    message: "Abonnement renouvelé.",
    subscription,
  };
};

exports.cancelSubscription = async (id) => {
  const subscription = await subscriptionRepository.findById(id);

  if (!subscription) {
    throw createError("Abonnement introuvable.", 404);
  }

  await subscriptionRepository.updateSubscription(subscription, {
    status: "cancelled",
  });

  return {
    message: "Abonnement annulé.",
  };
};

exports.recordPayment = async ({
  subscriptionId,
  amount_dzd,
  paid_at,
  payment_method,
  reference,
  notes,
  recordedBy,
}) => {
  const subscription = await subscriptionRepository.findById(subscriptionId);

  if (!subscription) {
    throw createError("Abonnement introuvable.", 404);
  }

  if (!amount_dzd || !paid_at) {
    throw createError("amount_dzd et paid_at requis.", 400);
  }

  return subscriptionRepository.createPayment({
    subscription_id: subscription.id,
    doctor_id: subscription.doctor_id,
    plan_id: subscription.plan_id,
    amount_dzd,
    paid_at,
    payment_method: payment_method ?? "cash",
    reference,
    notes,
    recorded_by: recordedBy,
  });
};

exports.getPayments = async (subscriptionId) => {
  return subscriptionRepository.findPayments(subscriptionId);
};

exports.deletePayment = async (paymentId) => {
  const payment = await subscriptionRepository.findPaymentById(paymentId);

  if (!payment) {
    throw createError("Paiement introuvable.", 404);
  }

  await subscriptionRepository.deletePayment(payment);

  return {
    message: "Paiement supprimé.",
  };
};

const calculateExpiration = (start, durationDays) => {
  const date = new Date(start);

  date.setDate(date.getDate() + durationDays);

  return date.toISOString().slice(0, 10);
};
