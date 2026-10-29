const service = require("../../services/assistant/assistantPatient.service");

const assistantPatientController = {
  async createPatient(req, res, next) {
    try {
      const result = await service.createPatient(req.user.id, req.body);

      return res.status(201).json({
        message: "Patient créé avec succès.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  async searchPatients(req, res, next) {
    try {
      const data = await service.searchPatients(req.user.id, req.query.q);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getPatients(req, res, next) {
    try {
      const data = await service.getPatients(req.user.id, req.query);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getPatient(req, res, next) {
    try {
      const data = await service.getPatient(req.user.id, req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async updatePatient(req, res, next) {
    try {
      const patient = await service.updatePatient(
        req.user.id,
        req.params.id,
        req.body,
      );

      return res.status(200).json({
        message: "Patient mis à jour avec succès.",
        patient,
      });
    } catch (error) {
      next(error);
    }
  },

  async removePatientFromMyList(req, res, next) {
    try {
      const result = await service.removePatientFromMyList(
        req.user.id,
        req.params.id,
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getRecentlyAddedPatients(req, res, next) {
    try {
      const data = await service.getRecentlyAddedPatients(req.user.id);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = assistantPatientController;
