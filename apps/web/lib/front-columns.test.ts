import { expect, test } from "vitest";
import { column, columns } from "../components/dashboard/front";

const has = (classes: string, name: string) => classes.split(" ").includes(name);

test("a row of stories has a column for each, three at most, between two ink rules", () => {
  expect(has(columns(3), "md:grid-cols-3")).toBe(true);
  expect(has(columns(2), "md:grid-cols-2")).toBe(true);
  expect(has(columns(5), "md:grid-cols-3")).toBe(true);
  expect(columns(1)).not.toContain("grid-cols");
  for (const count of [1, 2, 3, 5]) expect(columns(count)).toContain("border-rule border-y");
});

test("a hairline parts two columns, and the row's ends are the page's own margins", () => {
  const [first, middle, last] = [column(0, 3), column(1, 3), column(2, 3)];
  expect(has(first, "md:border-l") || has(first, "md:pl-6")).toBe(false);
  expect(has(first, "md:pr-6")).toBe(true);
  expect(has(middle, "md:border-l") && has(middle, "md:pl-6") && has(middle, "md:pr-6")).toBe(true);
  expect(has(last, "md:border-l") && has(last, "md:pl-6")).toBe(true);
  expect(has(last, "md:pr-6")).toBe(false);
  // One story alone has no neighbour to be parted from.
  expect(column(0, 1)).not.toMatch(/md:(border-l|pl-6|pr-6)/);
  // Two share the row between them.
  expect(has(column(1, 2), "md:pr-6")).toBe(false);
});

test("on a phone each column after the first is under a hairline, as is a second row at a desk", () => {
  expect(has(column(0, 3), "max-md:border-t")).toBe(false);
  expect(has(column(1, 3), "max-md:border-t")).toBe(true);
  expect(has(column(2, 5), "md:border-t")).toBe(false);
  const fourth = column(3, 5);
  expect(has(fourth, "md:border-t")).toBe(true);
  expect(has(fourth, "md:border-l")).toBe(false);
});
