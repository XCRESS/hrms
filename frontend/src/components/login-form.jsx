import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import apiClient from "../service/apiClient.js";
import { useState } from "react";   
import singup from "../assets/signupImg.png";
import { useToast } from "@/components/ui/toast.jsx";


export default function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  //for navigation
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log(`Trying to do a login`);
      const data = await apiClient.login(email, password);
      console.log("Login response: ", data);
      if (data.success) {
        sessionStorage.setItem("authToken", data.token);
        navigate("/");
      } else {
        toast({
          id: "login-failed-" + Date.now(),
          variant: "error",
          title: "Login Failed",
          description: data.message || "Invalid credentials. Please try again."
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        id: "login-error-" + Date.now(),
        variant: "error",
        title: "Login Error",
        description: error.message || "Something went wrong. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center justify-center h-screen p-[2rem]">
      <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex flex-col gap-6 py-10">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-muted-foreground text-balance">
                    Login to your Punch-In account
                  </p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="me@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      onClick={() => navigate("/auth/forgotPassword")}
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account? Ask HR to create one for you.
                </div>
              </div>
            </form>
            <div className="bg-muted relative hidden md:block">
              <img
                src= {singup}
                alt="Login-Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.9]"
              />
            </div>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
