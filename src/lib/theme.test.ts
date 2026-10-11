import assert from "node:assert/strict";
import test from "node:test";
import { resolveTextSize, resolveTheme } from "./theme";

test("a saved theme stays in place when the system theme is different", () => {
  assert.equal(resolveTheme("dark", "light", "light"), "dark");
  assert.equal(resolveTheme(null, "contrast", "light"), "contrast");
  assert.equal(resolveTheme(null, null, "dark"), "dark");
  assert.equal(resolveTheme("nope", "", "light"), "light");
});

test("a saved text size stays in place", () => {
  assert.equal(resolveTextSize("xl", "md"), "xl");
  assert.equal(resolveTextSize(null, "lg"), "lg");
  assert.equal(resolveTextSize(null, null), "md");
});
