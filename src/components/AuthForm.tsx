
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { validateEmail, validatePassword, sanitizeInput } from "@/utils/securityValidation";

// Clean up auth state utility
const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const { toast } = useToast();

  // Rate limiting - max 5 attempts per 15 minutes
  const MAX_ATTEMPTS = 5;
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Validate email
    if (!email) {
      errors.push("Email is required");
    } else if (!validateEmail(email)) {
      errors.push("Please enter a valid email address");
    }

    // Validate password
    if (!password) {
      errors.push("Password is required");
    } else if (!isLogin) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // Validate full name for signup
    if (!isLogin) {
      if (!fullName.trim()) {
        errors.push("Full name is required");
      } else if (fullName.trim().length < 2) {
        errors.push("Full name must be at least 2 characters");
      } else if (fullName.trim().length > 50) {
        errors.push("Full name must be less than 50 characters");
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        errors.push("Passwords do not match");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const lastAttempt = localStorage.getItem('lastAuthAttempt');
    const storedAttemptCount = parseInt(localStorage.getItem('authAttemptCount') || '0');

    if (lastAttempt) {
      const timeSinceLastAttempt = now - parseInt(lastAttempt);
      
      if (timeSinceLastAttempt < RATE_LIMIT_WINDOW) {
        if (storedAttemptCount >= MAX_ATTEMPTS) {
          const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastAttempt) / 60000);
          toast({
            title: "Too many attempts",
            description: `Please wait ${remainingTime} minutes before trying again`,
            variant: "destructive",
          });
          return false;
        }
        setAttemptCount(storedAttemptCount);
      } else {
        // Reset counter after rate limit window
        localStorage.removeItem('authAttemptCount');
        localStorage.removeItem('lastAuthAttempt');
        setAttemptCount(0);
      }
    }

    return true;
  };

  const updateRateLimit = () => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    localStorage.setItem('authAttemptCount', newAttemptCount.toString());
    localStorage.setItem('lastAuthAttempt', Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!checkRateLimit()) {
      return;
    }

    setLoading(true);

    try {
      // Clean up any existing auth state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Sign out attempt failed, continuing...');
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      const sanitizedFullName = sanitizeInput(fullName.trim());

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        });
        
        if (error) {
          updateRateLimit();
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });

        // Reset rate limiting on successful login
        localStorage.removeItem('authAttemptCount');
        localStorage.removeItem('lastAuthAttempt');
        
        // Force page reload for clean state
        window.location.href = '/';
      } else {
        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            data: {
              full_name: sanitizedFullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          updateRateLimit();
          throw error;
        }

        toast({
          title: "Success",
          description: "Account created successfully! Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = "An unexpected error occurred";
      
      // Provide user-friendly error messages
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "An account with this email already exists";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please verify your email address before signing in";
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = "Password does not meet security requirements";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setValidationErrors([]);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? "Sign in to your account" : "Sign up for a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
                <AlertCircle className="w-4 h-4" />
                Please fix the following errors:
              </div>
              <ul className="text-red-700 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="ml-2">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {attemptCount > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                {MAX_ATTEMPTS - attemptCount} attempts remaining
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="Enter your full name"
                  maxLength={50}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                maxLength={254}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  maxLength={128}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {!isLogin && (
                <div className="text-xs text-gray-600 mt-1">
                  Password must contain: 8+ characters, uppercase, lowercase, number, and special character
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    placeholder="Confirm your password"
                    maxLength={128}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || attemptCount >= MAX_ATTEMPTS}>
              {loading ? "Loading..." : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={toggleMode}
              className="text-sm"
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
