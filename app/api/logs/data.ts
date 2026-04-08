import Joi from "joi";

export const DIVE_TYPES = ["Boat", "Shore", "Wreck", "Cave", "Drift", "Night"] as const;
export type DiveType = (typeof DIVE_TYPES)[number];

export type DiveLogBase = {
  location: string;
  depth: number;
  duration: number;
  date: string;
  buddy?: string;
  diveType?: string;
  visibility?: number;
  waterTemp?: number;
  tankStart?: number;
  tankEnd?: number;
  notes?: string;
  rating?: number;
};

export type DiveLog = DiveLogBase & {
  id: number;
  userId: number;
  firstName?: string;
  lastName?: string;
};

export const diveLogBaseSchema = Joi.object<DiveLogBase>({
  location: Joi.string().trim().required().label("Location"),
  depth: Joi.number().positive().required().label("Depth"),
  duration: Joi.number().positive().required().label("Duration"),
  date: Joi.string().isoDate().required().label("Date"),
  buddy: Joi.string().trim().optional().allow("").label("Buddy"),
  diveType: Joi.string().trim().optional().allow("").label("Dive Type"),
  visibility: Joi.number().positive().optional().allow(null, "").label("Visibility"),
  waterTemp: Joi.number().optional().allow(null, "").label("Water Temp"),
  tankStart: Joi.number().positive().optional().allow(null, "").label("Tank Start"),
  tankEnd: Joi.number().optional().allow(null, "").label("Tank End"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
  rating: Joi.number().integer().min(1).max(5).optional().allow(null, "").label("Rating"),
});

export const diveLogSchema = diveLogBaseSchema.append<DiveLog>({
  id: Joi.number().integer().required().label("ID"),
});

export const diveLogs: DiveLog[] = [];
