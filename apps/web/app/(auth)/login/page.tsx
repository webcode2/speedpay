import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
      <AuthForm mode="login" />
    </main>
  );
}
