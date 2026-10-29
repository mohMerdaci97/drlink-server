const service = require("../../services/assistant/assistantAppointment.service");

const assistantAppointmentController = {
  async getMyClinics(req, res, next) {
    try {
      const data = await service.getMyClinics(req.user.id);

      return res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getTodaysAppointments(req, res, next) {
    try {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Algiers",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const data = await service.getTodaysAppointments(req.user.id, today);

      return res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getAppointmentsByDate(req, res, next) {
    try {
      const data = await service.getAppointmentsByDate(
        req.user.id,
        req.query.date,
      );

      return res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async updateAppointmentStatus(req, res, next) {
    try {
      const data = await service.updateAppointmentStatus(
        req.user.id,
        req.params.id,
        req.body.status,
      );

      return res.status(200).json({
        message: "Statut du rendez-vous mis à jour avec succès.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAvailableSlots(req, res, next) {
    try {
      const { clinic_id, date } = req.query;

      const data = await service.getAvailableSlots(
        req.user.id,
        clinic_id,
        date,
      );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  },

  async bookAppointmentForPatient(req, res, next) {
    try {
      const data = await service.bookAppointmentForPatient(
        req.user.id,
        req.body,
      );

      return res.status(201).json({
        message: "Rendez-vous créé avec succès.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = assistantAppointmentController;
