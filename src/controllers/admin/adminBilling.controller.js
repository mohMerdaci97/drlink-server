const adminBillingService = require("../../services/admin/adminBilling.service");
const { getPagination } = require("../../helpers/pagination");

exports.getPlans = async (req, res, next) => {
  try {
    const result = await adminBillingService.getPlans();

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.createPlan = async (req, res, next) => {
  try {
    const result = await adminBillingService.createPlan(req.body);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const result = await adminBillingService.updatePlan(
      req.params.id,
      req.body,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deletePlan = async (req, res, next) => {
  try {
    const result = await adminBillingService.deletePlan(
      req.params.id,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await adminBillingService.getAllSubscriptions({
      pagination: {
        page,
        limit,
        offset,
      },

      filters: {
        status: req.query.status,
        search: req.query.search,
      },
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDoctorSubscription = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.getDoctorSubscription(
        req.params.doctorId,
      );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.assignSubscription = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.assignSubscription({
        ...req.body,
        recordedBy: req.user.id,
      });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.renewSubscription = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.renewSubscription({
        subscriptionId: req.params.id,
        ...req.body,
        recordedBy: req.user.id,
      });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.cancelSubscription(
        req.params.id,
      );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.recordPayment({
        subscriptionId: req.params.id,
        ...req.body,
        recordedBy: req.user.id,
      });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const result = await adminBillingService.getPayments(
      req.params.id,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const result =
      await adminBillingService.deletePayment(
        req.params.paymentId,
      );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};