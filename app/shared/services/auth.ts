import { sql, session, AuthError, ForbiddenError, ValidationError } from "@elements/app";

export const MIN_PASSWORD = 8;

export type Role = "customer" | "company";

interface UserRow {
  id: string;
  name: string;
  role: Role;
}

export interface SignupForm {
  name: string;
  email: string;
  address: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function homeFor(role: Role | undefined): string {
  return role === "company" ? "/queue" : "/jobs";
}

/** @rpc */
export function signin(email: string, password: string): string {
  let address = normalizeEmail(email);

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<UserRow>(`
    select id, name, role from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("That email and password don't match.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });

  return homeFor(user.role);
}

/** Company accounts are created by the business, never through signup. */
/** @rpc */
export function signup(form: SignupForm): string {
  let email = normalizeEmail(form.email);
  let name = form.name.trim();
  let address = form.address.trim();
  let errors: Partial<Record<keyof SignupForm, string[]>> = {};

  if (!name) {
    errors.name = ["Enter your name."];
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = ["Enter a valid email address."];
  }

  if (!address) {
    errors.address = ["Enter the address we'll be working at."];
  }

  if (form.password.length < MIN_PASSWORD) {
    errors.password = [`Use at least ${MIN_PASSWORD} characters.`];
  }

  if (!errors.email && !sql(`select 1 from users where email = ${email}`).empty()) {
    errors.email = ["That email already has an account. Sign in instead."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError<SignupForm>(errors);
  }

  let user = sql<{ id: string }>(`
    insert into users (email, name, address, passwordHash, role)
         values (${email}, ${name}, ${address}, crypt(${form.password}, genSalt('bf', 12)), 'customer')
      returning id
  `).firstOrThrow();

  session.login({ userId: user.id, userName: name, role: "customer" });

  return "/jobs";
}

/** @rpc */
export function signout() {
  session.logout();
}

export function requireCompany(): string {
  session.isLoggedInOrThrow();

  if (session.get("role") !== "company") {
    throw new ForbiddenError("Company account required.");
  }

  return session.getOrThrow("userId");
}

export function requireCustomer(): string {
  session.isLoggedInOrThrow();

  if (session.get("role") !== "customer") {
    throw new ForbiddenError("Customer account required.");
  }

  return session.getOrThrow("userId");
}
