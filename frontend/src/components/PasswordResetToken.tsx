import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useResetPasswordWithToken } from "@/hooks/queries";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useToast } from "@/components/ui/toast.jsx";
import { Key, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";

interface PasswordResetTokenProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export default function PasswordResetToken({ className, ...props }: PasswordResetTokenProps) {
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState<boolean>(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const resetPasswordMutation = useResetPasswordWithToken();

  // Get token from URL if provided
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setResetToken(urlToken);
    }
  }, [searchParams]);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!resetToken.trim()) {
      toast({
        title: "Reset Token Required",
        description: "Please enter your reset token",
        type: "error"
      });
      return;
    }

    if (!validatePassword(newPassword)) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters long",
        type: "error"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        type: "error"
      });
      return;
    }

    resetPasswordMutation.mutate(
      { resetToken, newPassword },
      {
        onSuccess: () => {
          toast({
            title: "Password Reset Successful",
            description: "Your password has been reset successfully. You can now login with your new password.",
            type: "success"
          });
          setPasswordResetComplete(true);
        },
        onError: (error: Error) => {
          console.error("Password reset error:", error);
          toast({
            title: "Reset Failed",
            description: error.message || "Unable to reset password. The token may be invalid or expired.",
            type: "error"
          });
        }
      }
    );
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  if (passwordResetComplete) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="mx-auto max-w-sm border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
                  Password Reset Successful
                </h2>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Your password has been successfully reset. You can now login with your new password.
                </p>
              </div>
              <Button
                onClick={handleBackToLogin}
                className="w-full"
              >
                Continue to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="mx-auto max-w-sm">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold">Reset Your Password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your reset token and new password to complete the reset process.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Reset Token:</p>
                  <p className="mt-1">Use the secure token provided by your administrator after your request was approved.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetToken">Reset Token</Label>
                <Input
                  id="resetToken"
                  type="text"
                  placeholder="Enter your reset token"
                  value={resetToken}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setResetToken(e.target.value)}
                  required
                  disabled={resetPasswordMutation.isPending}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    required
                    disabled={resetPasswordMutation.isPending}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                    disabled={resetPasswordMutation.isPending}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending || !resetToken.trim() || !newPassword || !confirmPassword}
              >
                {resetPasswordMutation.isPending ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
