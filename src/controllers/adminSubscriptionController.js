const { Op } = require("sequelize");
const {
  Plan,
  DoctorSubscription,
  SubscriptionPayment,
  Doctor,
  User,
  Specialty,
} = require("../models");

// ── PLANS

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({ order: [["price_dzd", "ASC"]] });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, type, price_dzd, duration_days, description } = req.body;
    if (!name || !type)
      return res.status(400).json({ message: "name et type requis." });
    const plan = await Plan.create({
      name,
      type,
      price_dzd,
      duration_days,
      description,
    });
    res.status(201).json(plan);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan introuvable." });
    await plan.update(req.body);
    res.json(plan);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan introuvable." });
    await plan.update({ is_active: false });
    res.json({ message: "Plan désactivé." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── SUBSCRIPTIONS

exports.getAllSubscriptions = async (req, res) => {
  try {
    const subs = await DoctorSubscription.findAll({
      order: [["created_at", "DESC"]],
      include: [
        { model: Plan, as: "Plan" },
        {
          model: Doctor,
          as: "Doctor",
          include: [
            {
              model: User,
              attributes: ["full_name", "phone", "email", "is_active"],
            },
            { model: Specialty, attributes: ["name"] },
          ],
        },
      ],
    });
    res.json(subs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getDoctorSubscription = async (req, res) => {
  try {
    const sub = await DoctorSubscription.findOne({
      where: { doctor_id: req.params.doctorId },
      order: [["created_at", "DESC"]],
      include: [
        { model: Plan, as: "Plan" },
        {
          model: SubscriptionPayment,
          as: "Payments",
          order: [["paid_at", "DESC"]],
          include: [
            { model: User, as: "RecordedBy", attributes: ["full_name"] },
          ],
        },
      ],
    });
    res.json(sub ?? null);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.assignSubscription = async (req, res) => {
  try {
    const {
      doctor_id,
      plan_id,
      starts_at,
      amount_dzd,
      paid_at,
      payment_method,
      reference,
      notes,
    } = req.body;

    if (!doctor_id || !plan_id)
      return res.status(400).json({ message: "doctor_id et plan_id requis." });

    const plan = await Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan introuvable." });

    const start = starts_at ?? new Date().toISOString().slice(0, 10);
    const expiresAt =
      plan.duration_days > 0
        ? (() => {
            const d = new Date(start);
            d.setDate(d.getDate() + plan.duration_days);
            return d.toISOString().slice(0, 10);
          })()
        : null;

    // Cancel any existing active sub
    await DoctorSubscription.update(
      { status: "cancelled" },
      { where: { doctor_id, status: { [Op.in]: ["active", "grace"] } } },
    );

    const sub = await DoctorSubscription.create({
      doctor_id,
      plan_id,
      starts_at: start,
      expires_at: expiresAt,
      status: "active",
      notes,
    });

    // Re-enable doctor if they were disabled
    const doctor = await Doctor.findByPk(doctor_id, {
      include: [{ model: User }],
    });
    if (doctor?.User && !doctor.User.is_active)
      await doctor.User.update({ is_active: true });

    // Record initial payment if provided
    if (amount_dzd != null && paid_at) {
      await SubscriptionPayment.create({
        subscription_id: sub.id,
        doctor_id,
        plan_id,
        amount_dzd,
        paid_at,
        payment_method: payment_method ?? "cash",
        reference,
        notes,
        recorded_by: req.user.id,
      });
    }

    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.renewSubscription = async (req, res) => {
  try {
    const sub = await DoctorSubscription.findByPk(req.params.id, {
      include: [{ model: Plan, as: "Plan" }],
    });
    if (!sub)
      return res.status(404).json({ message: "Abonnement introuvable." });

    const { amount_dzd, paid_at, payment_method, reference, notes } = req.body;

    // Extend from today or from current expiry if still in the future
    const base =
      sub.expires_at && new Date(sub.expires_at) > new Date()
        ? new Date(sub.expires_at)
        : new Date();

    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + sub.Plan.duration_days);

    await sub.update({
      status: "active",
      expires_at: newExpiry.toISOString().slice(0, 10),
      grace_ends_at: null,
    });

    // Re-enable doctor if disabled
    const doctor = await Doctor.findByPk(sub.doctor_id, {
      include: [{ model: User }],
    });
    if (doctor?.User && !doctor.User.is_active)
      await doctor.User.update({ is_active: true });

    // Record payment
    if (amount_dzd != null && paid_at) {
      await SubscriptionPayment.create({
        subscription_id: sub.id,
        doctor_id: sub.doctor_id,
        plan_id: sub.plan_id,
        amount_dzd,
        paid_at,
        payment_method: payment_method ?? "cash",
        reference,
        notes,
        recorded_by: req.user.id,
      });
    }

    res.json({ message: "Abonnement renouvelé.", subscription: sub });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const sub = await DoctorSubscription.findByPk(req.params.id);
    if (!sub)
      return res.status(404).json({ message: "Abonnement introuvable." });
    await sub.update({ status: "cancelled" });
    res.json({ message: "Abonnement annulé." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PAYMENTS

exports.recordPayment = async (req, res) => {
  try {
    const sub = await DoctorSubscription.findByPk(req.params.id);
    if (!sub)
      return res.status(404).json({ message: "Abonnement introuvable." });

    const { amount_dzd, paid_at, payment_method, reference, notes } = req.body;
    if (!amount_dzd || !paid_at)
      return res.status(400).json({ message: "amount_dzd et paid_at requis." });

    const payment = await SubscriptionPayment.create({
      subscription_id: sub.id,
      doctor_id: sub.doctor_id,
      plan_id: sub.plan_id,
      amount_dzd,
      paid_at,
      payment_method: payment_method ?? "cash",
      reference,
      notes,
      recorded_by: req.user.id,
    });
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await SubscriptionPayment.findAll({
      where: { subscription_id: req.params.id },
      order: [["paid_at", "DESC"]],
      include: [{ model: User, as: "RecordedBy", attributes: ["full_name"] }],
    });
    res.json(payments);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const p = await SubscriptionPayment.findByPk(req.params.paymentId);
    if (!p) return res.status(404).json({ message: "Paiement introuvable." });
    await p.destroy();
    res.json({ message: "Paiement supprimé." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
