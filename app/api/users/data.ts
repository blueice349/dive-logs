import Joi from "joi";

export type ProfileValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type PasswordValues = {
  currentPassword: string;
  newPassword: string;
};

export const profileSchema = Joi.object({
  firstName: Joi.string().min(1).required().label("First Name"),
  lastName: Joi.string().min(1).required().label("Last Name"),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .label("Email"),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-().]{7,15}$/)
    .required()
    .label("Phone Number")
    .messages({ "string.pattern.base": "Please enter a valid phone number" }),
});

export const passwordSchema = Joi.object({
  currentPassword: Joi.string().required().label("Current Password"),
  newPassword: Joi.string().min(4).required().label("New Password"),
});
