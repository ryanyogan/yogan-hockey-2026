// Written by `pnpm team-marks` (scripts/team-marks.ts). Do not edit by hand.
import type { TeamMarkEntry } from "./team-mark";

/** The teams with a mark in `public/team-marks/`, by ESPN's team id. */
export const TEAM_MARKS: Record<string, TeamMarkEntry> = {
  1: { v: "85e93ec9", dark: true }, // BOS
  2: { v: "ebb65973", dark: false }, // BUF
  3: { v: "cd7907ad", dark: false }, // CGY
  4: { v: "68ff7df3", dark: false }, // CHI
  5: { v: "373e370d", dark: true }, // DET
  6: { v: "25d755cb", dark: false }, // EDM
  7: { v: "c7a38b52", dark: false }, // CAR
  8: { v: "a54c708f", dark: true }, // LA
  9: { v: "c6ce1921", dark: true }, // DAL
  10: { v: "2288c70a", dark: false }, // MTL
  11: { v: "21bae07f", dark: false }, // NJ
  12: { v: "741bb4bf", dark: false }, // NYI
  13: { v: "3cbec6ef", dark: false }, // NYR
  14: { v: "f5de1be9", dark: false }, // OTT
  15: { v: "fd429ba8", dark: false }, // PHI
  16: { v: "1ddf1716", dark: false }, // PIT
  17: { v: "73e3c355", dark: false }, // COL
  18: { v: "e077dad4", dark: false }, // SJ
  19: { v: "65fb0025", dark: true }, // STL
  20: { v: "89b95512", dark: true }, // TB
  21: { v: "b0a72ff2", dark: true }, // TOR
  22: { v: "b47d024e", dark: true }, // VAN
  23: { v: "53e50590", dark: true }, // WSH
  25: { v: "abd55e00", dark: false }, // ANA
  26: { v: "a1b78988", dark: true }, // FLA
  27: { v: "7b64337b", dark: false }, // NSH
  28: { v: "ecdfd90a", dark: false }, // WPG
  29: { v: "2dc3b58c", dark: false }, // CBJ
  30: { v: "3f10e69f", dark: false }, // MIN
  37: { v: "1b50fce1", dark: false }, // VGK
  124292: { v: "6037eefa", dark: false }, // SEA
  129764: { v: "c4c5ca81", dark: false }, // UTAH
};
