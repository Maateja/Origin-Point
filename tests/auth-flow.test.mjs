import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

test("send-otp payload validation supports login, signup, and recovery modes", () => {
  const schema = z.object({
    email: z.string().email().max(254),
    name: z.string().max(160).optional(),
    role: z
      .enum(["student", "industry", "academician", "institution"])
      .optional(),
    mode: z.enum(["signup", "login", "recovery"]).default("login"),
  });

  // Valid login
  const loginPayload = schema.safeParse({ email: "user@example.com", mode: "login" });
  assert.equal(loginPayload.success, true);
  assert.equal(loginPayload.data.mode, "login");

  // Valid recovery
  const recoveryPayload = schema.safeParse({ email: "user@example.com", mode: "recovery" });
  assert.equal(recoveryPayload.success, true);
  assert.equal(recoveryPayload.data.mode, "recovery");

  // Valid signup with role
  const signupPayload = schema.safeParse({
    email: "student@example.com",
    name: "Alex",
    role: "student",
    mode: "signup",
  });
  assert.equal(signupPayload.success, true);
  assert.equal(signupPayload.data.role, "student");

  // Invalid email rejected
  const invalidEmail = schema.safeParse({ email: "not-an-email", mode: "login" });
  assert.equal(invalidEmail.success, false);

  // Invalid mode rejected
  const invalidMode = schema.safeParse({ email: "user@example.com", mode: "unknown" });
  assert.equal(invalidMode.success, false);
});

test("password creation and reset validation schema enforces minimum 8 characters and match", () => {
  const resetSchema = z
    .object({
      password: z.string().min(8, "Password must be at least 8 characters").max(128),
      confirmPassword: z.string().min(8).max(128),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  // Short password rejected
  const shortPass = resetSchema.safeParse({
    password: "short",
    confirmPassword: "short",
  });
  assert.equal(shortPass.success, false);

  // Mismatched password rejected
  const mismatch = resetSchema.safeParse({
    password: "Password123!",
    confirmPassword: "Password456!",
  });
  assert.equal(mismatch.success, false);

  // Valid password accepted
  const valid = resetSchema.safeParse({
    password: "SecurePassword123!",
    confirmPassword: "SecurePassword123!",
  });
  assert.equal(valid.success, true);
});
