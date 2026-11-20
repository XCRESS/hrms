import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router";
import { useConfirmPasswordReset, useRequestPasswordReset } from "@/hooks/queries";
import { useToast } from "@/components/ui/toast.jsx";
import { useState, type FormEvent } from "react";

type ForgotPasswordProps = React.HTMLAttributes<HTMLDivElement>;

const messageOf = (error: unknown) =>
  error instanceof Object && "message" in error && typeof error.message === "string"
    ? error.message
    : "Something went wrong. Please try again.";

export default function ForgotPassword({ className, ...props }: ForgotPasswordProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const requestCode = useRequestPasswordReset();
  const confirmReset = useConfirmPasswordReset();

  const sendCode = () => {
    setError("");
    requestCode.mutate(
      { email },
      {
        onSuccess: (data) => {
          setNotice(data.message || "If an account exists for that email, a reset code is on its way.");
          setStep("code");
        },
        onError: (err) => setError(messageOf(err)),
      }
    );
  };

  const handleEmailSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendCode();
  };

  const handleResetSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    confirmReset.mutate(
      { email, code, newPassword },
      {
        onSuccess: (data) => {
          toast({
            variant: "success",
            title: "Password updated",
            description: data.message || "Sign in with your new password.",
          });
          navigate("/auth/login");
        },
        onError: (err) => setError(messageOf(err)),
      }
    );
  };

  return (
    <div className="flex items-center justify-center h-screen p-[2rem]">
      <div className={cn("flex flex-col gap-6 w-full max-w-md", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Reset your password</h1>
                    <p className="text-muted-foreground text-balance">
                      Enter your work email and we'll send you a 6-digit code.
                    </p>
                  </div>
                  {error && <p role="alert" className="text-destructive text-center text-sm">{error}</p>}
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="me@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={requestCode.isPending}>
                    {requestCode.isPending ? "Sending code..." : "Send code"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Enter your code</h1>
                    <p className="text-muted-foreground text-balance" aria-live="polite">
                      {notice} It was sent to <span className="font-medium text-foreground">{email}</span>.
                    </p>
                  </div>
                  {error && <p role="alert" className="text-destructive text-center text-sm">{error}</p>}
                  <div className="grid gap-3">
                    <Label htmlFor="code">6-digit code</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      className="tracking-[0.3em] font-mono"
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={confirmReset.isPending}>
                    {confirmReset.isPending ? "Updating password..." : "Update password"}
                  </Button>
                  <div className="flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setCode(""); setError(""); }}
                      className="underline-offset-4 hover:underline text-muted-foreground"
                    >
                      Use a different email
                    </button>
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={requestCode.isPending}
                      className="underline-offset-4 hover:underline text-muted-foreground disabled:opacity-50"
                    >
                      {requestCode.isPending ? "Sending..." : "Resend code"}
                    </button>
                  </div>
                </div>
              </form>
            )}
            <p className="pb-6 text-center text-sm">
              Remembered it?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="underline underline-offset-4"
              >
                Back to login
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
