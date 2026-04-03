import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .label("Email"),
  password: Joi.string().min(4).required().label("Password"),
});

export const authSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .label("Email"),
  password: Joi.string().min(4).required().label("Password"),
  firstName: Joi.string().min(1).required().label("First Name"),
  lastName: Joi.string().min(1).required().label("Last Name"),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-().]{7,15}$/)
    .required()
    .label("Phone Number")
    .messages({ "string.pattern.base": "Please enter a valid phone number" }),
});
