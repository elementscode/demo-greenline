import { test, assert, equal, session, sql } from "@elements/app";
import { signup, signin } from "#app/shared/services/auth";
import { fixture, thrown } from "#app/shared/testing/fixtures";

test("signup", async () => {
  test("creates a customer and signs them in", async () => {
    let home = signup({ name: "Ada Lovelace", email: " Ada@Example.com ", address: "9 Lane", password: "longenough" });

    equal(home, "/jobs");
    equal(session.get("role"), "customer");

    let row = sql<{ email: string; role: string }>(`select email, role from users where email = 'ada@example.com'`).firstOrThrow();
    equal(row.role, "customer");
  });

  test("rejects a short password and missing fields together", async () => {
    let fields: string[] = [];

    try {
      signup({ name: "", email: "nope", address: "", password: "short" });
    } catch (err: any) {
      fields = Object.keys(err.errors ?? {}).sort();
    }

    equal(fields, ["address", "email", "name", "password"]);
  });

  test("rejects an email that already has an account", async () => {
    signup({ name: "Ada", email: "ada@example.com", address: "9 Lane", password: "longenough" });
    session.logout();

    let message = "";

    try {
      signup({ name: "Ada 2", email: "ADA@example.com", address: "9 Lane", password: "longenough" });
    } catch (err: any) {
      message = err.errors?.email?.[0] ?? "";
    }

    assert(message.includes("already"), `expected a duplicate email error, got "${message}"`);
  });
});

test("signin", async () => {
  test("sends company users to the queue", async () => {
    let f = fixture();
    let email = sql<{ email: string }>(`select email from users where id = ${f.company}`).firstOrThrow().email;

    equal(signin(email, "password1"), "/queue");
    equal(session.get("role"), "company");
  });

  test("refuses a wrong password without saying which part was wrong", async () => {
    let f = fixture();
    let email = sql<{ email: string }>(`select email from users where id = ${f.alice}`).firstOrThrow().email;

    equal(await thrown(() => signin(email, "wrong-password")), "That email and password don't match.");
    assert(!session.isLoggedIn());
  });
});
