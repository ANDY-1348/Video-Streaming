
const Joi = require('joi');

// Validate required fields of videos schema
const schema = Joi.object().keys({
  _id: Joi.string().optional(),
  title: Joi.string().min(3).max(30).required(),
  description: Joi.string().min(3).max(30).required(),
  visibility: Joi.string().min(3).max(30).required(),
  category: Joi.string().min(3).max(30).required(),
  recordingDate: Joi.date().required(),
});

const validate = (data) => schema.validate(data);

module.exports = { validate };
