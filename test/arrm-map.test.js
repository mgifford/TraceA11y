import test from "node:test";
import assert from "node:assert/strict";

import { findRelatedArrmTasks, getArrmOwnerSignals } from "../src/arrm-map.js";

const arrmTasks = [
  {
    id: "INP-001",
    idPrefix: "INP",
    wcagSc: "1.3.1",
    level: "A",
    task: "Ensure form controls are correctly labeled",
    mainRole: "Developer",
    primaryOwnership: "Developer",
    secondaryOwnership: "Content Author",
    contributor: "",
    mappedOwners: ["Developer", "Content Author"]
  },
  {
    id: "FRM-004",
    idPrefix: "FRM",
    wcagSc: "3.3.2",
    level: "A",
    task: "Provide instructions for required fields",
    mainRole: "Content Author",
    primaryOwnership: "Content Author",
    secondaryOwnership: "Developer",
    contributor: "",
    mappedOwners: ["Content Author", "Developer"]
  },
  {
    id: "CSS-001",
    idPrefix: "CSS",
    wcagSc: "1.4.3",
    level: "AA",
    task: "Sufficient color contrast",
    mainRole: "Themer / Visual Designer",
    primaryOwnership: "Themer / Visual Designer",
    secondaryOwnership: "Developer",
    contributor: "",
    mappedOwners: ["Themer / Visual Designer", "Developer"]
  }
];

test("findRelatedArrmTasks prefers owner-matching candidates when available", () => {
  const issue = { ruleId: "aria-allowed-attr" };

  const tasks = findRelatedArrmTasks(issue, "Developer", arrmTasks, 10);

  assert.ok(tasks.length >= 1);
  assert.ok(tasks.every((task) => ["INP", "FRM"].includes(task.idPrefix)));
  assert.ok(tasks.every((task) => task.mappedOwners.length === 0 || task.mappedOwners.includes("Developer")));
});

test("getArrmOwnerSignals aggregates owner evidence for mapped task prefixes", () => {
  const issue = { ruleId: "aria-valid-attr" };

  const signals = getArrmOwnerSignals(issue, arrmTasks, 10);

  assert.equal(signals.Developer, 2);
  assert.equal(signals["Content Author"], 2);
  assert.equal(signals["Themer / Visual Designer"], undefined);
});
