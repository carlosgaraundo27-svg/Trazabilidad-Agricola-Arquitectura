import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { markdownLinks } from "../../scripts/markdown-links.js";

test("enlaces Markdown mantienen el alcance del comprobador existente", () => {
  for (const [source, expected] of [
    ["[a](one.md) y [b](two.md#section)", ["one.md", "two.md#section"]],
    ["![foto](img.png) [](empty-label.md)", ["img.png", "empty-label.md"]],
    ["[texto] roto ](not-a-link) [bien](ok.md)", ["ok.md"]],
    ["[a]() [b](b.md)", ["b.md"]],
    ["[[interno](inside.md)", ["inside.md"]],
    [
      "[a](https://example.test/path) [sin destino]",
      ["https://example.test/path"],
    ],
    ["[a](ruta(con-parentesis).md)", ["ruta(con-parentesis"]],
    ["[a](sin-cierre", []],
  ])
    assert.deepEqual(markdownLinks(source), expected);
});

test("etiquetas sin cerrar no bloquean la comprobación de enlaces", async () => {
  const script = fileURLToPath(
    new URL("../fixtures/markdown-links-stress.js", import.meta.url),
  );
  await promisify(execFile)(process.execPath, [script], {
    timeout: 2000,
    windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" },
  });
});
