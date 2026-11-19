import { test } from "node:test";
import assert from "node:assert/strict";
import { trustedDockerExecutable } from "../../scripts/docker-executable.js";

const regular = {
  uid: 0,
  mode: 0o100755,
  isFile: () => true,
  isDirectory: () => false,
};
const directory = {
  uid: 0,
  mode: 0o40755,
  isFile: () => false,
  isDirectory: () => true,
};
const linux = (changes = {}) => ({
  platform: "linux",
  realpath: (p) => p,
  stat: (p) => (p === "/usr/bin/docker" ? regular : directory),
  ...changes,
});
test("Docker usa ruta fija aunque PATH apunte a un directorio atacante", () => {
  const oldPath = process.env.PATH;
  try {
    process.env.PATH = "/tmp/attacker-bin";
    assert.equal(trustedDockerExecutable(linux()), "/usr/bin/docker");
  } finally {
    process.env.PATH = oldPath;
  }
});
test("Docker rechaza enlaces redirigidos, propietarios y permisos inseguros", () => {
  const unsafe = [
    linux({ realpath: () => "/tmp/attacker-bin/docker" }),
    linux({ stat: () => ({ ...regular, uid: 1000 }) }),
    linux({
      stat: (p) =>
        p === "/usr/bin/docker" ? { ...regular, mode: 0o100775 } : directory,
    }),
    linux({
      stat: (p) =>
        p === "/usr/bin/docker" ? regular : { ...directory, mode: 0o40777 },
    }),
    linux({
      stat: (p) =>
        p === "/usr/bin/docker" ? { ...regular, mode: 0o100644 } : directory,
    }),
    linux({ stat: () => directory }),
    linux({
      realpath: () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      },
    }),
  ];
  for (const input of unsafe)
    assert.throws(() => trustedDockerExecutable(input));
});
test("Windows requiere ruta canónica, firma/ACL verificadas; no fallback PATH", () => {
  const candidate =
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
  const windows = {
    platform: "win32",
    realpath: (p) => p,
    verifyWindows: () => true,
  };
  assert.equal(trustedDockerExecutable(windows), candidate);
  assert.throws(() =>
    trustedDockerExecutable({ ...windows, verifyWindows: () => false }),
  );
  assert.throws(() =>
    trustedDockerExecutable({
      ...windows,
      realpath: () => "C:\\Users\\Public\\docker.exe",
    }),
  );
  assert.throws(() =>
    trustedDockerExecutable({
      ...windows,
      verifyWindows: () => {
        throw new Error("ACL unavailable");
      },
    }),
  );
  assert.throws(() => trustedDockerExecutable({ platform: "darwin" }));
});
