import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

test("sends www requests to the apex over https", async () => {
  const response = await worker.fetch(
    new Request("http://www.numisgallery.com/pricing?x=1#notes"),
  );
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://numisgallery.com/pricing?x=1#notes");
});

test("keeps an already-https path", async () => {
  const response = await worker.fetch(new Request("https://www.numisgallery.com/"));
  assert.equal(response.headers.get("location"), "https://numisgallery.com/");
});
