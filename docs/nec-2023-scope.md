# CalcuVolt NEC 2023 scope

CalcuVolt performs a bounded set of calculations based on NFPA 70-2023. It
does not certify an installation and does not replace the licensed Code, local
amendments, equipment instructions, or an AHJ decision.

## Compliance matrix

| Calculator behavior | NEC 2023 basis | Implementation | Tests |
| --- | --- | --- | --- |
| Copper and aluminum ampacity | Table 310.16 | `src/data/nec.js`, `src/domain/conductors.js` | `test/conductors.test.js` |
| Ambient correction based on 30°C | Table 310.15(B)(1)(1) | `ambientCorrectionFactor()` | `test/conductors.test.js` |
| More than three current-carrying conductors | Table 310.15(C)(1) | `adjustmentFactor()` | `test/derating.test.js` |
| Neutral treatment | 310.15(E) | Explicit `neutralCurrentCarrying` circuit input | `test/derating.test.js` |
| Termination temperature limitation | 110.14(C) | `terminalTemp` and `evaluateWire()` | `test/conductors.test.js` |
| Continuous load at 125% | 210.19(A), 210.20(A), 215.2(A)(1) | `continuous` and `requiredAmpacity` | `test/conductors.test.js` |
| Small conductor OCPD limits | 240.4(D) | `SMALL_CONDUCTOR_OCPD_LIMITS` | `test/conductors.test.js` |
| Raceway fill percentages | Chapter 9 Table 1 | `racewayFillLimit()` | `test/derating.test.js` |
| Raceway and THHN areas | Chapter 9 Tables 4 and 5 | `RACEWAY_TOTAL_AREA`, `areaTHHN` | `test/derating.test.js` |
| Branch/feeder voltage-drop recommendation | 210.19(A) Informational Note and 215.2(A)(2) Informational Note No. 2 | `calculateVoltageDrop()` | `test/voltage-drop.test.js` |

## Required user declarations

Some NEC decisions cannot be inferred from load current alone. CalcuVolt
therefore requires the user to declare:

- conductor material;
- insulation temperature rating;
- equipment termination temperature rating;
- design ambient temperature, including any applicable rooftop adder;
- whether a load is continuous;
- whether a neutral is current carrying under 310.15(E);
- supply configuration and circuit poles;
- equipment grounding conductor count and size for raceway fill.

## Deliberately excluded

The following require additional calculators or project information and are not
claimed as covered:

- Article 220 load calculations and demand factors;
- dwelling service/feeder allowances under 310.12;
- motor, HVAC, transformer, welder, EVSE, marina, emergency-system, fire-pump,
  photovoltaic, energy-storage, or other equipment-specific articles;
- parallel conductors and conductor sets;
- equipment grounding and bonding conductor sizing under Article 250;
- fault current, selective coordination, interrupting ratings, and arc-flash;
- box fill, pull boxes, cable tray, and cable assemblies;
- local amendments and AHJ interpretations;
- approval of conductor types for a location or equipment terminal;
- validation that a selected OCPD or assembly is listed for 100% loading;
- physical panelboard listing constraints beyond slot and phase layout.

## Authoritative references

- [NFPA LiNK — NFPA 70, 2023](https://link.nfpa.org/all-publications/70/2023)
- [NFPA Table 310.16 TIA record](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P06_Log1691_PubCommCirc.pdf)
- [NFPA 2023 NEC second draft correlating report](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_AAC_SD_SCRreport.pdf)
