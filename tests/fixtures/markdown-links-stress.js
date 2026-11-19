import assert from "node:assert/strict";
import { markdownLinks } from "../../scripts/markdown-links.js";

assert.deepEqual(markdownLinks("[".repeat(200000)), []);
