import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router";
import apiClient from "../service/apiClient.js";
import { useState } from "react";   
import loginImg from "../assets/login.png";


export default function SignupForm({ className, ...props }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

//for navigation
const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  
  try {
    console.log(`Trying to do a singup`);
    const data = await apiClient.signup(name, email, password);
    console.log("Signup response: ", data);
    if (data.success) {
      navigate("/auth/login");
    } else {
      setError(data.message || "Signup failed");
    }
  } catch (error) {
  } finally {
    setLoading(false);
  }

  //Make an API call to backend with data
  // get reponse from backend
  // take action based on response
};
  return (
    <div className="flex items-center justify-center h-screen p-[2rem]">
      <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex flex-col gap-6 py-10">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Admin only</h1>
                  <p className="text-muted-foreground text-balance">
                    Create new user for Punch-In account
                  </p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="name">name</Label>
                  <Input
                    id="name"
                    type="name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
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
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">
                  {loading ? "signing....." : "signup"}
                </Button>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                </div>
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <span onClick={() => navigate("/auth/login")} className="underline underline-offset-4 cursor-pointer">
                    login
                  </span>
                </div>
              </div>
            </form>
            <div className="bg-muted relative hidden md:block">
              <img
                src= {loginImg}
                alt="signup-Image"
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
