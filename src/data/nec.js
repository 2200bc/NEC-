export const NEC_DATASET = Object.freeze({
  id: "nfpa-70-2023-calcuvolt",
  edition: "2023",
  status: "scoped-nec-2023",
  scope: [
    "Table 310.16 ampacity for copper and aluminum/copper-clad aluminum, 14 AWG–1000 kcmil",
    "Table 310.15(B)(1)(1) ambient correction based on 30°C",
    "Table 310.15(C)(1) adjustment for current-carrying conductors",
    "310.15(E) user-declared neutral treatment",
    "110.14(C) user-declared termination temperature",
    "210.19(A), 210.20(A), and 215.2(A)(1) continuous-load factor",
    "240.4(D) small-conductor overcurrent limits",
    "Chapter 9 Table 1 raceway fill percentages"
  ],
  references: [
    { label: "NFPA 70, 2023 edition", url: "https://link.nfpa.org/all-publications/70/2023" },
    { label: "NFPA Table 310.16 TIA record", url: "https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P06_Log1691_PubCommCirc.pdf" },
    { label: "NFPA 2023 NEC second draft record", url: "https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_AAC_SD_SCRreport.pdf" }
  ]
});

const wire = (size, cma, areaTHHN, copper, aluminum) =>
  Object.freeze({ size, cma, areaTHHN, ampacity: { copper, aluminum } });

// NFPA 70-2023, Table 310.16. Ampacity values are amperes at 30°C ambient
// with not more than three current-carrying conductors.
// areaTHHN is the Chapter 9 Table 5 approximate area used by the scoped
// raceway-fill calculator.
export const WIRE_TABLE = Object.freeze([
  wire("14 AWG", 4110, 0.0097, { 60: 15, 75: 20, 90: 25 }, null),
  wire("12 AWG", 6530, 0.0133, { 60: 20, 75: 25, 90: 30 }, { 60: 15, 75: 20, 90: 25 }),
  wire("10 AWG", 10380, 0.0211, { 60: 30, 75: 35, 90: 40 }, { 60: 25, 75: 30, 90: 35 }),
  wire("8 AWG", 16510, 0.0366, { 60: 40, 75: 50, 90: 55 }, { 60: 35, 75: 40, 90: 45 }),
  wire("6 AWG", 26240, 0.0507, { 60: 55, 75: 65, 90: 75 }, { 60: 40, 75: 50, 90: 55 }),
  wire("4 AWG", 41740, 0.0824, { 60: 70, 75: 85, 90: 95 }, { 60: 55, 75: 65, 90: 75 }),
  wire("3 AWG", 52620, 0.0973, { 60: 85, 75: 100, 90: 115 }, { 60: 65, 75: 75, 90: 85 }),
  wire("2 AWG", 66360, 0.1158, { 60: 95, 75: 115, 90: 130 }, { 60: 75, 75: 90, 90: 100 }),
  wire("1 AWG", 83690, 0.1562, { 60: 110, 75: 130, 90: 145 }, { 60: 85, 75: 100, 90: 115 }),
  wire("1/0 AWG", 105500, 0.1855, { 60: 125, 75: 150, 90: 170 }, { 60: 100, 75: 120, 90: 135 }),
  wire("2/0 AWG", 133100, 0.2223, { 60: 145, 75: 175, 90: 195 }, { 60: 115, 75: 135, 90: 150 }),
  wire("3/0 AWG", 167800, 0.2679, { 60: 165, 75: 200, 90: 225 }, { 60: 130, 75: 155, 90: 175 }),
  wire("4/0 AWG", 211600, 0.3237, { 60: 195, 75: 230, 90: 260 }, { 60: 150, 75: 180, 90: 205 }),
  wire("250 kcmil", 250000, 0.3970, { 60: 215, 75: 255, 90: 290 }, { 60: 170, 75: 205, 90: 230 }),
  wire("300 kcmil", 300000, 0.4608, { 60: 240, 75: 285, 90: 320 }, { 60: 195, 75: 230, 90: 260 }),
  wire("350 kcmil", 350000, 0.5242, { 60: 260, 75: 310, 90: 350 }, { 60: 210, 75: 250, 90: 280 }),
  wire("400 kcmil", 400000, 0.5863, { 60: 280, 75: 335, 90: 380 }, { 60: 225, 75: 270, 90: 305 }),
  wire("500 kcmil", 500000, 0.7073, { 60: 320, 75: 380, 90: 430 }, { 60: 260, 75: 310, 90: 350 }),
  wire("600 kcmil", 600000, 0.8676, { 60: 350, 75: 420, 90: 475 }, { 60: 285, 75: 340, 90: 385 }),
  wire("700 kcmil", 700000, 0.9887, { 60: 385, 75: 460, 90: 520 }, { 60: 315, 75: 375, 90: 425 }),
  wire("750 kcmil", 750000, 1.0496, { 60: 400, 75: 475, 90: 535 }, { 60: 320, 75: 385, 90: 435 }),
  wire("800 kcmil", 800000, 1.1085, { 60: 410, 75: 490, 90: 555 }, { 60: 330, 75: 395, 90: 445 }),
  wire("900 kcmil", 900000, 1.2311, { 60: 435, 75: 520, 90: 585 }, { 60: 355, 75: 425, 90: 480 }),
  wire("1000 kcmil", 1000000, 1.3478, { 60: 455, 75: 545, 90: 615 }, { 60: 375, 75: 445, 90: 500 })
]);

export const AMBIENT_CORRECTION_30C = Object.freeze([
  { maxC: 10, factors: { 60: 1.29, 75: 1.20, 90: 1.15 } },
  { maxC: 15, factors: { 60: 1.22, 75: 1.15, 90: 1.12 } },
  { maxC: 20, factors: { 60: 1.15, 75: 1.11, 90: 1.08 } },
  { maxC: 25, factors: { 60: 1.08, 75: 1.05, 90: 1.04 } },
  { maxC: 30, factors: { 60: 1.00, 75: 1.00, 90: 1.00 } },
  { maxC: 35, factors: { 60: 0.91, 75: 0.94, 90: 0.96 } },
  { maxC: 40, factors: { 60: 0.82, 75: 0.88, 90: 0.91 } },
  { maxC: 45, factors: { 60: 0.71, 75: 0.82, 90: 0.87 } },
  { maxC: 50, factors: { 60: 0.58, 75: 0.75, 90: 0.82 } },
  { maxC: 55, factors: { 60: 0.41, 75: 0.67, 90: 0.76 } },
  { maxC: 60, factors: { 60: null, 75: 0.58, 90: 0.71 } },
  { maxC: 65, factors: { 60: null, 75: 0.47, 90: 0.65 } },
  { maxC: 70, factors: { 60: null, 75: 0.33, 90: 0.58 } },
  { maxC: 75, factors: { 60: null, 75: null, 90: 0.50 } },
  { maxC: 80, factors: { 60: null, 75: null, 90: 0.41 } },
  { maxC: 85, factors: { 60: null, 75: null, 90: 0.29 } }
]);

export const SMALL_CONDUCTOR_OCPD_LIMITS = Object.freeze({
  copper: { "14 AWG": 15, "12 AWG": 20, "10 AWG": 30 },
  aluminum: { "12 AWG": 15, "10 AWG": 25 }
});

export const STANDARD_OCPD_RATINGS = Object.freeze([
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175,
  200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000
]);

// Total internal areas in square inches. The fill engine applies the Chapter 9
// Table 1 percentage (53% for one, 31% for two, 40% for more than two).
export const RACEWAY_TOTAL_AREA = Object.freeze({
  EMT: { "0.5": 0.304, "0.75": 0.533, "1": 0.864, "1.25": 1.496, "1.5": 2.036, "2": 3.356, "2.5": 5.858, "3": 8.846, "3.5": 11.545, "4": 14.753 },
  "PVC-40": { "0.5": 0.285, "0.75": 0.508, "1": 0.832, "1.25": 1.453, "1.5": 1.986, "2": 3.291, "2.5": 4.695, "3": 7.268, "3.5": 9.737, "4": 12.554 },
  IMC: { "0.5": 0.342, "0.75": 0.586, "1": 0.959, "1.25": 1.647, "1.5": 2.225, "2": 3.630, "2.5": 5.135, "3": 7.922, "3.5": 10.584, "4": 13.631 },
  RMC: { "0.5": 0.314, "0.75": 0.549, "1": 0.887, "1.25": 1.526, "1.5": 2.071, "2": 3.408, "2.5": 4.866, "3": 7.499, "3.5": 10.010, "4": 12.882 },
  ENT: { "0.5": 0.264, "0.75": 0.459, "1": 0.750, "1.25": 1.290, "1.5": 1.744, "2": 2.828 }
});

export const SUPPLY_SYSTEMS = Object.freeze({
  "single-120-240": { label: "1φ · 120/240 V", phases: 1, lineNeutral: 120, lineLine: 240 },
  "single-120-208": { label: "1φ Network · 120/208 V", phases: 1, lineNeutral: 120, lineLine: 208 },
  "three-120-208": { label: "3φ Wye · 120/208 V", phases: 3, lineNeutral: 120, lineLine: 208 },
  "three-277-480": { label: "3φ Wye · 277/480 V", phases: 3, lineNeutral: 277, lineLine: 480 }
});
