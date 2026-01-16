import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useRequestPasswordReset } from "@/hooks/queries";
import { useState, FormEvent, ChangeEvent } from "react";
import { useToast } from "@/components/ui/toast.jsx";
import { Key, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

interface PasswordResetFormProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export default function PasswordResetForm({ className, ...props }: PasswordResetFormProps) {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [requestSubmitted, setRequestSubmitted] = useState<boolean>(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const requestResetMutation = useRequestPasswordReset();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    requestResetMutation.mutate(
      { name, email, newPassword: "" }, // Note: This component doesn't collect password
      {
        onSuccess: () => {
          toast({
            title: "Password Reset Request Submitted",
            description: "Your request has been submitted for admin review. You will be contacted once approved.",
            type: "success"
          });
          setRequestSubmitted(true);
        },
        onError: (error: Error) => {
          console.error("Password reset request error:", error);
          toast({
            title: "Request Failed",
            description: error.message || "Unable to submit password reset request. Please try again.",
            type: "error"
          });
        }
      }
    );
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  if (requestSubmitted) {
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
                  Request Submitted Successfully
                </h2>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Your password reset request has been submitted for administrator review.
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>What happens next:</strong>
                </p>
                <ul className="text-sm text-green-600 dark:text-green-400 mt-2 space-y-1 text-left">
                  <li>• An administrator will review your request</li>
                  <li>• If approved, you'll receive a secure reset token</li>
                  <li>• Use the token to set your new password</li>
                </ul>
              </div>
              <Button
                onClick={handleBackToLogin}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
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
              <h1 className="text-2xl font-bold">Password Reset Request</h1>
              <p className="text-sm text-muted-foreground">
                Submit a request to reset your password. An administrator will review and approve your request.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Security Note:</p>
                  <p className="mt-1">Your request will be reviewed by an administrator before approval. Please provide accurate information.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                  disabled={requestResetMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  disabled={requestResetMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={requestResetMutation.isPending || !name.trim() || !email.trim()}
              >
                {requestResetMutation.isPending ? "Submitting Request..." : "Submit Reset Request"}
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
