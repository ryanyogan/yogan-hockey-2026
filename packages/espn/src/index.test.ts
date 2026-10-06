import { ReadingSchema } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { takeSkeletonReading } from "./index.ts";

test("every reading is new and matches the site's shape", async () => {
  const first = await takeSkeletonReading();
  const second = await takeSkeletonReading();

  expect(ReadingSchema.safeParse(first).success).toBe(true);
  expect(second.serial).not.toBe(first.serial);
});
