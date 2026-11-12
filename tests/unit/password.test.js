import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
} from "../../server/modules/access/password.js";
test("contraseñas con sal única y verificación sin texto plano", async () => {
  const one = await hashPassword("fictional-password"),
    two = await hashPassword("fictional-password");
  assert.notEqual(one, two);
  assert.ok(!one.includes("fictional-password"));
  assert.equal(await verifyPassword("fictional-password", one), true);
  assert.equal(await verifyPassword("wrong", one), false);
});
