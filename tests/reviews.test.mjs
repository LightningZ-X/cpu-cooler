import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = async (name) =>
  JSON.parse(
    await readFile(new URL("../data/reviews/" + name, import.meta.url), "utf8"),
  );
const inventory = await read("51972-videos.json");
const evidence = await read("51972-evidence.json");
test("目录完整性标识与实际采集数量一致，不能以部分目录冒充全量", () => {
  assert.equal(inventory.videos.length, inventory.collectedCount);
  assert.equal(
    new Set(inventory.videos.map((video) => video.bvid)).size,
    inventory.collectedCount,
  );
  assert.equal(
    inventory.publicArchiveComplete,
    inventory.collectedCount === inventory.reportedCount,
  );
  if (!inventory.publicArchiveComplete)
    assert.ok(inventory.failures.length > 0);
});
test("测试条件引用可追溯，不将缺少读数的章节标为实测结果", () => {
  const sourceIds = new Set(evidence.sources.map((source) => source.bvid));
  let count = 0;
  for (const group of evidence.testGroups) {
    assert.ok(sourceIds.has(group.source));
    assert.ok(group.timestamp >= 0);
    assert.ok(group.powerW > 0);
    count += group.results.length;
  }
  assert.equal(evidence.measurementCount, count);
  if (count === 0)
    assert.ok(
      evidence.sources.every(
        (source) => source.status !== "measurements-verified",
      ),
    );
});
test("资料链接均指向原始视频，并保留标题年份与发布年份的区别", () => {
  for (const source of [...inventory.videos, ...evidence.sources]) {
    assert.match(source.bvid, /^BV[0-9A-Za-z]{10}$/);
    assert.equal(source.url, `https://www.bilibili.com/video/${source.bvid}/`);
  }
  const source = evidence.sources.find((s) => s.bvid === "BV1Wm411Q7zV");
  assert.ok(source.title.startsWith("2023"));
  assert.ok(source.publishedAt.startsWith("2024"));
});
