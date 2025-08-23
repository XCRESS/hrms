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
import { Eye, EyeOff, Bug, Copy, AlertTriangle } from "lucide-react";
import DebugUtils from "../utils/debugUtils.js";
import notificationService from "../service/notificationService.js";


export default function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [lastError, setLastError] = useState(null);

  //for navigation
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    try {
      // Log login attempt with debug context
      DebugUtils.logDebugInfo("Login Attempt", {
        email,
        hasPassword: !!password,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      const data = await apiClient.login(email, password);
      
      if (data.success) {
        localStorage.setItem("authToken", data.token);
        
        // Log successful login
        DebugUtils.logDebugInfo("Login Success", {
          email,
          tokenLength: data.token?.length,
          timestamp: new Date().toISOString()
        });
        
        // Auto-subscribe to push notifications
        notificationService.autoSubscribe().then(subscribed => {
          console.log('Push notification auto-subscribe:', subscribed);
        }).catch(error => {
          console.warn('Auto-subscribe failed:', error);
        });
        
        navigate("/");
      } else {
        const errorMessage = data.message || "Invalid credentials. Please try again.";
        setLastError({
          type: 'login_failed',
          message: errorMessage,
          data: data,
          timestamp: new Date().toISOString()
        });

        toast({
          id: "login-failed-" + Date.now(),
          variant: "error",
          title: "Login Failed",
          description: errorMessage
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Enhanced error handling with detailed logging
      const errorDetails = {
        name: error.name,
        message: error.message,
        status: error.status,
        endpoint: error.endpoint,
        timestamp: error.timestamp,
        responseTime: error.responseTime,
        isNetworkError: error.name === 'TypeError' && error.message.includes('Failed to fetch'),
        isServerError: error.status >= 500,
        isAuthError: error.status === 401,
        isValidationError: error.status === 400
      };

      setLastError({
        type: 'login_error',
        message: error.message,
        details: errorDetails,
        timestamp: new Date().toISOString()
      });

      // Log structured error
      DebugUtils.logError("Login", error, {
        email,
        errorDetails
      });

      // Provide specific error messages based on error type
      let title = "Login Error";
      let description = error.message || "Something went wrong. Please try again.";

      if (errorDetails.isNetworkError) {
        title = "Connection Error";
        description = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (errorDetails.isServerError) {
        title = "Server Error";
        description = "The server is currently experiencing issues. Please try again in a few moments.";
      } else if (errorDetails.isAuthError) {
        title = "Authentication Error";
        description = "Invalid email or password. Please check your credentials and try again.";
      } else if (errorDetails.isValidationError) {
        title = "Validation Error";
        description = error.message || "Please check your input and try again.";
      }

      toast({
        id: "login-error-" + Date.now(),
        variant: "error",
        title,
        description
      });
    } finally {
      setLoading(false);
    }
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      lastError,
      loginAttempt: {
        email,
        timestamp: new Date().toISOString()
      },
      ...DebugUtils.getAllDebugInfo()
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      .then(() => {
        toast({
          variant: "success",
          title: "Debug Info Copied",
          description: "Debug information has been copied to clipboard. Please share this with support."
        });
      })
      .catch(() => {
        toast({
          variant: "error", 
          title: "Copy Failed",
          description: "Failed to copy debug information to clipboard."
        });
      });
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
                    Login to your HRMS account
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
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus:outline-none z-10 flex items-center justify-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                
                {/* Debug Section */}
                {lastError && (
                  <div className="space-y-3">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                            Login Issue Detected
                          </h4>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {lastError.message}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowDebugInfo(!showDebugInfo)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex items-center gap-1"
                            >
                              <Bug className="h-3 w-3" />
                              {showDebugInfo ? 'Hide' : 'Show'} Debug Info
                            </button>
                            <button
                              type="button"
                              onClick={copyDebugInfo}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex items-center gap-1"
                            >
                              <Copy className="h-3 w-3" />
                              Copy Debug Info
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {showDebugInfo && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h5 className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">
                          Debug Information
                        </h5>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p><strong>Error Type:</strong> {lastError.type}</p>
                          <p><strong>Timestamp:</strong> {lastError.timestamp}</p>
                          {lastError.details && (
                            <>
                              <p><strong>Status:</strong> {lastError.details.status || 'N/A'}</p>
                              <p><strong>Network Error:</strong> {lastError.details.isNetworkError ? 'Yes' : 'No'}</p>
                              <p><strong>Server Error:</strong> {lastError.details.isServerError ? 'Yes' : 'No'}</p>
                              {lastError.details.responseTime && (
                                <p><strong>Response Time:</strong> {lastError.details.responseTime}ms</p>
                              )}
                            </>
                          )}
                          <p><strong>Browser:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
                          <p><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account? Ask HR to create one for you.
                </div>
              </div>
            </form>
            <div className="bg-muted relative hidden md:block">
              <img
                loading="lazy"
                src= {singup}
                alt="Login-Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.9]"
              />
            </div>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="/privacy-policy">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
