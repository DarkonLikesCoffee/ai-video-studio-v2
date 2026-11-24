import test from "node:test";
import assert from "node:assert/strict";
import { calculateContactSheetLayout, calculateSampleTimestamps, defaultContactSheetOptions, validateContactSheetOptions } from "../scripts/qa-contact-sheet";
test("contact-sheet layout calculates sample count and rows", () => {
  assert.deepEqual(calculateContactSheetLayout(60, defaultContactSheetOptions), { frameCount: 12, rows: 3 });
  assert.deepEqual(calculateContactSheetLayout(61, defaultContactSheetOptions), { frameCount: 13, rows: 4 });
  assert.deepEqual(calculateContactSheetLayout(1, { intervalSeconds: 5, columns: 3, thumbnailWidth: 256 }), { frameCount: 1, rows: 1 });
});
test("contact-sheet options reject invalid values", () => {
  assert.throws(() => validateContactSheetOptions({ intervalSeconds: 0, columns: 4, thumbnailWidth: 320 }), /intervalSeconds/);
  assert.throws(() => validateContactSheetOptions({ intervalSeconds: 5, columns: 13, thumbnailWidth: 320 }), /columns/);
  assert.throws(() => validateContactSheetOptions({ intervalSeconds: 5, columns: 4, thumbnailWidth: 32 }), /thumbnailWidth/);
  assert.throws(() => calculateContactSheetLayout(0, defaultContactSheetOptions), /duration/);
});

test("contact-sheet timestamps match sampled frame intervals", () => {
  assert.deepEqual(calculateSampleTimestamps(47.856, 5), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]);
  assert.deepEqual(calculateSampleTimestamps(1, 5), [0]);
  assert.throws(() => calculateSampleTimestamps(10, 0), /intervalSeconds/);
});
