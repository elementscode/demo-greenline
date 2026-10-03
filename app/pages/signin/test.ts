import { test, equal } from "@elements/app";
import { safeNext } from "./index";

test("signin only follows same-site next links", () => {
  equal(safeNext("/jobs/123/pay"), "/jobs/123/pay");
  equal(safeNext("//evil.example"), "");
  equal(safeNext("https://evil.example"), "");
  equal(safeNext(undefined), "");
});
