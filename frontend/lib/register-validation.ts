import { z } from "zod";

// Mirrors backend RegisterBodySchema (auth.schemas.ts). The backend stays the
// source of truth; this only gives the user a precise, fixable message before
// the request is sent.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export type RegisterFields = { email: string; username: string; password: string };
export type RegisterFieldErrors = Partial<RegisterFields>;

// Runs every rule per field and returns the clearest single message for each.
export function validateRegister(values: RegisterFields): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  const { email, username, password } = values;

  if (!email) {
    errors.email = "Email is required.";
  } else if (!z.string().email().safeParse(email).success) {
    errors.email =
      "Email is not valid. It must be in the form name@domain (e.g. you@example.com).";
  } else if (email.length > 255) {
    errors.email = "Email must be 255 characters or fewer.";
  }

  if (!username) {
    errors.username = "Username is required.";
  } else if (username.length < 3 || username.length > 64) {
    errors.username = `Username must be between 3 and 64 characters. Yours is ${username.length}.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    const invalid = [...new Set([...username].filter((c) => !/[a-zA-Z0-9_]/.test(c)))].join(" ");
    errors.username = `Username must be 3–64 characters and use only letters, numbers, and underscores (e.g. rashidi_92). Yours has: ${invalid}.`;
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = `Password must be at least 8 characters. Yours is ${password.length}.`;
  } else if (password.length > 128) {
    errors.password = "Password must be 128 characters or fewer.";
  }

  return errors;
}

// Maps backend ConflictError messages onto the field they belong to.
export function mapApiErrorToField(message: string): { field: keyof RegisterFields; message: string } | null {
  if (/email already in use/i.test(message)) {
    return { field: "email", message: "That email is already in use. Try another or log in." };
  }
  if (/username already taken/i.test(message)) {
    return { field: "username", message: "That username is already taken. Pick a different one." };
  }
  return null;
}
