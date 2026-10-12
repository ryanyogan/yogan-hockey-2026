import { expect, it } from "vitest";
import { ordinal } from "./ordinal";

it("ends a place as it is said", () => {
  expect([1, 2, 3, 4, 8].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "8th"]);
});

it("ends the teens in th, and the twenties as the units are", () => {
  expect([11, 12, 13, 21, 22, 23, 32].map(ordinal)).toEqual([
    "11th",
    "12th",
    "13th",
    "21st",
    "22nd",
    "23rd",
    "32nd",
  ]);
});
