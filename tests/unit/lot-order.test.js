import test from "node:test";
import assert from "node:assert/strict";
import { lotInput } from "../../server/modules/traceability/domain.js";

test("lot input canonicalizes UUID permutations without mutating the caller", () => {
  const ids = [
    "FFFFFFFF-FFFF-4FFF-8FFF-FFFFFFFFFFFF",
    "10000000-0000-4000-8000-000000000000",
    "20000000-0000-4000-8000-000000000000",
  ];
  const original = [...ids];
  const body = { centerId: ids[0], receiptIds: ids };
  const canonical = lotInput.parse(body);
  assert.deepEqual(canonical.receiptIds, [
    ids[1],
    ids[2],
    ids[0].toLowerCase(),
  ]);
  assert.deepEqual(
    lotInput.parse({ ...body, receiptIds: ids.toReversed() }),
    canonical,
  );
  assert.deepEqual(ids, original);
});
