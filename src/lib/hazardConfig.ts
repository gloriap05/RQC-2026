export const hazardConfig = {
  aftershock: {
    proximityKm: 100, // proximity filter radius for aftershocks
    maxEvents: 50, // maximum number of events to consider
    omoriMultiplier: 6, // multiplier when converting omori sum to percent
    opacityDecayHalfLifeHours: 2, // controls opacity decay with age
    radiusScale: 3, // scale factor for marker radius per magnitude
  },
  timeline: {
    // multipliers used for projection models
    fire: { p1: 0.08, p6: 0.25, p24: 0.6 },
    fireReduceByPrecip: { p1: 0.12, p6: 0.35, p24: 0.7 },
    fireSlopeFactor: { p1: 0.03, p6: 0.12, p24: 0.28 },
    flood: { p1: 0.25, p6: 0.6, p24: 1.1 },
    generic: { p1: 0.02, p6: 0.06, p24: 0.12 },
  },
};
