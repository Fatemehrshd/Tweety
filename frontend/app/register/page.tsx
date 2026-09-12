"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  validateRegister,
  mapApiErrorToField,
  type RegisterFields,
  type RegisterFieldErrors,
} from "@/lib/register-validation";

export default function RegisterPage() {
  const [values, setValues] = useState<RegisterFields>({ email: "", username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const setValue = (field: keyof RegisterFields, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const errors = validateRegister(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register(values.email, values.username, values.password);
      router.push("/explore");
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = mapApiErrorToField(err.message);
        if (mapped) {
          setFieldErrors((prev) => ({ ...prev, [mapped.field]: mapped.message }));
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-md mx-auto px-4 py-12">
        <Link
          href="/"
          className="block text-center text-2xl font-extrabold tracking-tight text-brand-500 mb-6"
        >
          Tweety
        </Link>
        <div className="card">
          <h1 className="text-2xl font-bold mb-6 text-center">Create an account</h1>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => setValue("email", e.target.value)}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`input ${fieldErrors.email ? "border-red-400" : ""}`}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={values.username}
                onChange={(e) => setValue("username", e.target.value)}
                aria-invalid={fieldErrors.username ? true : undefined}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
                className={`input ${fieldErrors.username ? "border-red-400" : ""}`}
              />
              {fieldErrors.username && (
                <p id="username-error" role="alert" className="mt-1 text-sm text-red-600">
                  {fieldErrors.username}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={values.password}
                onChange={(e) => setValue("password", e.target.value)}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`input ${fieldErrors.password ? "border-red-400" : ""}`}
              />
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="mt-1 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Sign up"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
