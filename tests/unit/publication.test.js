import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicDto,
  publicUrl,
  contentHash,
} from "../../server/modules/publication/domain.js";
const dto = {
  lotCode: "VV-DEMO-001",
  stages: [
    { stage: "harvest", date: "2026-01-02", description: "Cosecha ficticia." },
  ],
};
test("contrato público acepta solo la lista permitida y fechas reales", () => {
  assert.deepEqual(publicDto.parse(dto), dto);
  for (const field of [
    "contact",
    "finance",
    "password",
    "actorId",
    "note",
    "qualityResult",
  ]) {
    assert.equal(
      publicDto.safeParse({ ...dto, [field]: "privado" }).success,
      false,
    );
    assert.equal(
      publicDto.safeParse({
        ...dto,
        stages: [{ ...dto.stages[0], [field]: "privado" }],
      }).success,
      false,
    );
  }
  for (const date of ["2026-02-30", "2999-01-01", "ayer"])
    assert.equal(
      publicDto.safeParse({ ...dto, stages: [{ ...dto.stages[0], date }] })
        .success,
      false,
    );
  assert.equal(contentHash(dto), contentHash(publicDto.parse(dto)));
});
test("QR usa URL configurada y rechaza Host arbitrario, credenciales y HTTP productivo", () => {
  const id = crypto.randomUUID();
  assert.equal(
    publicUrl("https://public.example.test", id, true),
    "https://public.example.test/q/" + id,
  );
  for (const base of [
    undefined,
    "javascript:alert(1)",
    "https://user:pass@example.test",
    "https://example.test/?secret=1",
    "https://example.test/#x",
    "https://example.test/path",
  ])
    assert.throws(() => publicUrl(base, id));
  assert.throws(() => publicUrl("http://example.test", id, true));
});
