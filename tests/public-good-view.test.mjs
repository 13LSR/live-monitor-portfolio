import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createPublicGoodView } from "../app/_lib/public-good-view.ts";

function makeResult(items, displayable = true) {
  return {
    success: true,
    displayable,
    items,
    contacts: null,
    sourceName: "姬长信API",
    sourceApi: "https://api.isoyu.com/gy/api.php",
    cachedAt: "2026-07-10T00:00:00.000Z",
    cacheTtlSeconds: 21600,
    isFallback: false,
    cacheState: "refreshed",
  };
}

function makePerson(id) {
  return {
    id,
    name: `姓名${id}`,
    sex: "",
    birthTime: "",
    lostTime: "2020-01-01",
    childPic: `https://assets.example.com/${id}.jpg`,
    lostPlace: `地点${id}`,
    childFeature: `特征${id}`,
    detailUrl: `https://example.com/${id}`,
  };
}

describe("public-good view model", () => {
  it("suppresses the entire section without displayable real data", () => {
    assert.equal(createPublicGoodView(null, null), null);
    assert.equal(createPublicGoodView(makeResult([], false), null), null);
    assert.equal(createPublicGoodView(makeResult([], true), null), null);
  });

  it("limits selectors to five and exposes only the selected real record", () => {
    const result = makeResult(Array.from({ length: 7 }, (_, index) => makePerson(String(index + 1))));
    const view = createPublicGoodView(result, "3");

    assert.deepEqual(view.people.map((person) => person.id), ["1", "2", "3", "4", "5"]);
    assert.equal(view.selectedPerson.id, "3");
    assert.equal(view.selectedPerson.lostPlace, "地点3");
    assert.equal(view.selectedPerson.detailUrl, "https://example.com/3");
  });
});
