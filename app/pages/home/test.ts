import { test, equal } from "@elements/app";
import { homeFor } from "#app/shared/services/auth";

test("home sends each role to its own start page", () => {
  equal(homeFor("company"), "/queue");
  equal(homeFor("customer"), "/jobs");
});
