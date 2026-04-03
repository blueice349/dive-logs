import Joi from "joi";

export type DiveLogBase = {
  location: string;
  depth: number;
  duration: number;
  date: string;
};

export type DiveLog = DiveLogBase & {
  id: number;
  userId: number;
};

export const diveLogBaseSchema = Joi.object<DiveLogBase>({
  location: Joi.string().trim().required().label("Location"),
  depth: Joi.number().positive().required().label("Depth"),
  duration: Joi.number().positive().required().label("Duration"),
  date: Joi.string().isoDate().required().label("Date"),
});

export const diveLogSchema = diveLogBaseSchema.append<DiveLog>({
  id: Joi.number().integer().required().label("ID"),
});

export const diveLogs: DiveLog[] = [];
