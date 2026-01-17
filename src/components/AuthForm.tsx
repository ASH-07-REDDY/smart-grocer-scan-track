
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle, Mail, Lock, User, Sparkles } from "lucide-react";
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
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const response = await supabase.functions.invoke('send-password-reset', {
        body: { email: sanitizeInput(email.toLowerCase().trim()) }
      });

      if (response.error) {
        throw response.error;
      }

      const { success, error } = response.data;

      if (success) {
        toast({
          title: "Email Sent",
          description: "Password reset instructions have been sent to your email.",
        });
        setShowForgotPassword(false);
      } else {
        throw new Error(error || "Failed to send reset email");
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
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
    setShowForgotPassword(false);
    setValidationErrors([]);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
  };

  return (
    <div className="min-h-screen pantry-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10" />
      
      <Card className="modern-card w-full max-w-lg relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-primary" />
        
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4 shadow-glow">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {showForgotPassword ? "Reset Password" : (isLogin ? "Welcome Back" : "Join Smart Pantry")}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            {showForgotPassword 
              ? "Enter your email to receive reset instructions" 
              : (isLogin 
                ? "Sign in to manage your smart pantry" 
                : "Create your smart pantry account")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {validationErrors.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                <AlertCircle className="w-4 h-4" />
                Please fix the following errors:
              </div>
              <ul className="text-destructive text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="ml-2">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {attemptCount > 0 && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <p className="text-accent-foreground text-sm font-medium">
                {MAX_ATTEMPTS - attemptCount} attempts remaining
              </p>
            </div>
          )}

          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-foreground font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                    maxLength={254}
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading}
                  className="gradient-button flex-1 h-12 rounded-xl font-medium"
                >
                  {forgotPasswordLoading ? "Sending..." : "Send Reset Email"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  className="h-12 px-6 rounded-xl border-border/50"
                >
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                      maxLength={50}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                    maxLength={254}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-11 pr-11 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                    maxLength={128}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-muted/50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must contain: 8+ characters, uppercase, lowercase, number, and special character
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="pl-11 pr-11 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
                      maxLength={128}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-muted/50"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="gradient-button w-full h-12 rounded-xl font-medium text-lg" 
                disabled={loading || attemptCount >= MAX_ATTEMPTS}
              >
                {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>
            </form>
          )}

          {!showForgotPassword && (
            <div className="space-y-4">
              {isLogin && (
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                    disabled={loading}
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}
              
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={toggleMode}
                  className="text-muted-foreground hover:text-foreground text-sm"
                  disabled={loading}
                >
                  {isLogin 
                    ? "Don't have an account? Create one" 
                    : "Already have an account? Sign in"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
