const doctorAssistantService = require("../../services/doctor/doctorAssistant.service");

exports.getOne = async (req, res, next) => {
  try {
    const assistant = await doctorAssistantService.getOne(
      req.user.id,
      req.params.id,
    );

    return res.json(assistant);
  } catch (error) {
    next(error);
  }
};

exports.createAssistant = async (req, res, next) => {
  try {
    const result = await doctorAssistantService.create(req.user.id, req.body);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAssistants = async (req, res, next) => {
  try {
    const assistants = await doctorAssistantService.getAll(req.user.id);

    return res.json(assistants);
  } catch (error) {
    next(error);
  }
};

exports.updateAssistant = async (req, res, next) => {
  try {
    const assistant = await doctorAssistantService.update(
      req.user.id,
      req.params.id,
      req.body,
    );

    return res.json({
      message: "Assistant mis à jour avec succès.",
      assistant,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAssistant = async (req, res, next) => {
  try {
    await doctorAssistantService.remove(req.user.id, req.params.id);

    return res.json({
      message: "Assistant supprimé.",
    });
  } catch (error) {
    next(error);
  }
};
