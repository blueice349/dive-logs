import Joi from "joi";

export const DIVE_TYPES = ["Boat", "Shore", "Wreck", "Cave", "Drift", "Night"] as const;
export type DiveType = (typeof DIVE_TYPES)[number];

export const GAS_MIXES = ["air", "nitrox", "trimix"] as const;
export type GasMix = (typeof GAS_MIXES)[number];
export const CYLINDER_TYPES = ["aluminum", "steel"] as const;
export type CylinderType = (typeof CYLINDER_TYPES)[number];

export type DiveLogBase = {
  location: string;
  depth: number;
  duration: number;
  date: string;
  buddy?: string;
  buddyUserId?: number;
  diveType?: DiveType;
  visibility?: number;
  waterTemp?: number;
  tankStart?: number;
  tankEnd?: number;
  notes?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  wetsuit?: string;
  bcd?: string;
  fins?: string;
  cylinderType?: string;
  cylinderSize?: number;
  gasMix?: string;
  o2Percent?: number;
  certUsed?: string;
  marineLife?: string;
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
  buddyUserId: Joi.number().integer().optional().allow(null, "").label("Buddy User"),
  diveType: Joi.string().valid(...DIVE_TYPES).optional().allow("").label("Dive Type"),
  visibility: Joi.number().positive().optional().allow(null, "").label("Visibility"),
  waterTemp: Joi.number().optional().allow(null, "").label("Water Temp"),
  tankStart: Joi.number().positive().optional().allow(null, "").label("Tank Start"),
  tankEnd: Joi.number().optional().allow(null, "").label("Tank End"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
  rating: Joi.number().integer().min(1).max(5).optional().allow(null, "").label("Rating"),
  lat: Joi.number().optional().allow(null, "").label("Latitude"),
  lng: Joi.number().optional().allow(null, "").label("Longitude"),
  wetsuit: Joi.string().trim().optional().allow("").label("Wetsuit"),
  bcd: Joi.string().trim().optional().allow("").label("BCD"),
  fins: Joi.string().trim().optional().allow("").label("Fins"),
  cylinderType: Joi.string().valid(...CYLINDER_TYPES).optional().allow("").label("Cylinder Type"),
  cylinderSize: Joi.number().positive().optional().allow(null, "").label("Cylinder Size"),
  gasMix: Joi.string().valid(...GAS_MIXES).optional().allow("").label("Gas Mix"),
  o2Percent: Joi.number().min(21).max(100).optional().allow(null, "").label("O2 %"),
  certUsed: Joi.string().trim().optional().allow("").label("Cert Used"),
  marineLife: Joi.string().trim().optional().allow("").label("Marine Life"),
});

export const diveLogSchema = diveLogBaseSchema.append<DiveLog>({
  id: Joi.number().integer().required().label("ID"),
});

export const diveLogs: DiveLog[] = [];
