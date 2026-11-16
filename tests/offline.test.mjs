import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { loadData, assetUrl, replaceLocation } from "../js/data-loader.js";
const read = (file) =>
  fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("预加载产品与资料数据完整对应JSON源文件", async () => {
  const sandbox = {};
  vm.runInNewContext(await read("js/generated/data.js"), sandbox);
  assert.equal(Object.keys(sandbox.COOLERGUIDE_DATA).length, 4);
  for (const [name, data] of Object.entries(sandbox.COOLERGUIDE_DATA))
    assert.equal(
      JSON.stringify(data),
      JSON.stringify(JSON.parse(await read(name))),
    );
});
test("内嵌数据及资源可用时无需fetch，file历史限制不阻断操作", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.COOLERGUIDE_DATA = {
    "data/test.json": { cpus: [{ id: "test" }] },
  };
  globalThis.COOLERGUIDE_ASSETS = {
    "assets/test.svg": "data:image/svg+xml;base64,PHN2Zy8+",
  };
  globalThis.fetch = () => {
    throw new Error("Network unavailable");
  };
  try {
    assert.equal((await loadData("data/test.json")).cpus[0].id, "test");
    assert.match(assetUrl("assets/test.svg"), /^data:/);
    assert.equal(assetUrl("assets/other.svg"), "assets/other.svg");
    assert.doesNotThrow(() => replaceLocation("#config=test"));
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.COOLERGUIDE_DATA;
    delete globalThis.COOLERGUIDE_ASSETS;
  }
});
test("两页均用defer普通脚本，打包脚本无浏览器模块加载依赖", async () => {
  for (const page of ["index.html", "reviews.html"]) {
    const html = await read(page);
    assert.doesNotMatch(html, /<script[^>]*type="module"/);
    assert.match(html, /defer src="js\/generated\/data.js"/);
    assert.doesNotMatch(html, /href="\.\/"/);
  }
  for (const name of ["app", "reviews"])
    assert.doesNotThrow(() => new vm.Script(requireSource(name)));
  function requireSource(name) {
    return scripts[name];
  }
});
const scripts = {
  app: await read("js/generated/app.js"),
  reviews: await read("js/generated/reviews.js"),
};
test("单文件包含两页及所有图片视频，内嵌JS可解析且站内导航留在本文件", async () => {
  const html = await read("dist/散热器选择指南.html");
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/);
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  for (const source of inline) assert.doesNotThrow(() => new vm.Script(source));
  const dataSandbox = {};
  vm.runInNewContext(
    inline.find((s) => s.startsWith("globalThis.COOLERGUIDE_DATA=")),
    dataSandbox,
  );
  for (const [name, uri] of Object.entries(dataSandbox.COOLERGUIDE_ASSETS)) {
    assert.match(uri, /^data:(image\/|video\/)/);
    assert.deepEqual(
      Buffer.from(uri.split(",")[1], "base64"),
      await fs.readFile(new URL(`../${name}`, import.meta.url)),
    );
  }
  for (const view of ["index", "reviews"]) {
    const links = [
      { getAttribute: () => "reviews.html#verified-tests", href: "" },
      { getAttribute: () => "index.html", href: "" },
    ];
    let rendered = "";
    const context = {
      URL,
      URLSearchParams,
      location: {
        href: `file:///example/guide.html${view === "reviews" ? "?view=reviews" : ""}`,
        search: view === "reviews" ? "?view=reviews" : "",
      },
      document: {
        body: {
          insertAdjacentHTML: (_, html) => {
            rendered = html;
          },
        },
        querySelectorAll: () => links,
      },
      MutationObserver: class {
        observe() {}
      },
    };
    vm.runInNewContext(
      inline.find((s) => s.startsWith("const pages=")),
      context,
    );
    assert.match(
      rendered,
      view === "reviews" ? /id="video-list"/ : /id="config-form"/,
    );
    assert.doesNotMatch(rendered, /\b(?:src|data-video)="(?!data:)/);
    assert.doesNotMatch(rendered, /id="offline-download"/);
    assert.match(links[0].href, /guide\.html\?view=reviews#verified-tests$/);
    assert.match(links[1].href, /guide\.html$/);
  }
});
test("Canvas开场保持用户原始视频素材", async () => {
  const html = await read("index.html");
  assert.match(html, /<canvas[\s\S]*?id="boot-canvas"/);
  assert.match(html, /data-video="assets\/lightningz-gap-cut-v2.mp4"/);
  assert.doesNotMatch(html, /<video/);
});
