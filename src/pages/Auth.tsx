import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Gift, Sparkles, Upload, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupAvatarUploading, setSignupAvatarUploading] = useState(false);
  const [signupAvatarUrl, setSignupAvatarUrl] = useState("");
  const [signupTempPath, setSignupTempPath] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is admin and redirect accordingly
        const role = session.user?.app_metadata?.role;
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate full name is provided
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName.trim(), 
            avatar_url: signupAvatarUrl || null
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Auto-login: user is logged in immediately (email confirmation disabled)
        toast.success("Account created successfully!");

        // If we uploaded a temporary avatar, finalize it via the Edge Function
        if (signupTempPath) {
          try {
            const { data: fnData, error: fnError } = await supabase.functions.invoke("finalize-avatar-upload", {
              body: { temp_path: signupTempPath },
            });
            if (fnError) throw fnError;
            if (fnData && (fnData.public_url || fnData.publicUrl)) {
              setSignupAvatarUrl(fnData.public_url || fnData.publicUrl);
            }
            setSignupTempPath(null);
            localStorage.removeItem("pendingAvatarTempPath");
          } catch (err: any) {
            console.error("Finalize avatar upload failed:", err);
            toast.error("Warning: failed to finalize avatar. You can retry from your profile.");
          }
        }

        // Clear local UI state and navigate
        setSignupAvatarUrl("");
        setUploadProgress(0);
        navigate("/dashboard");
      } else if (data.user && !data.session) {
        // Email confirmation is enabled
        toast.success("Account created! Please check your email to verify.");
        if (signupTempPath) {
          try {
            localStorage.setItem("pendingAvatarTempPath", signupTempPath);
          } catch (e) {
            console.warn("Could not persist pending avatar path", e);
          }
        }
        setUploadProgress(0);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error("An unexpected error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      e.target.value = '';
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      e.target.value = '';
      return;
    }
    
    setSignupAvatarUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `temp/${Date.now()}_${Math.random().toString(36).substr(2,9)}.${ext}`;
      
      // Simulate progress updates (0-90% during upload)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + Math.random() * 30;
          return next > 90 ? 90 : next;
        });
      }, 200);
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      clearInterval(progressInterval);
      setUploadProgress(90);
      // if upload fails, clear temp path and throw
      if (uploadError) {
        console.error("Upload error:", uploadError);
        setSignupTempPath(null);
        throw new Error(uploadError.message || 'Failed to upload avatar');
      }
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setSignupAvatarUrl(data.publicUrl);
      setUploadProgress(100);
      toast.success('Avatar uploaded successfully');
      // remember temp path for finalize
      setSignupTempPath(fileName);
      
      // Reset progress after success
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err:any) {
      console.error("Avatar upload error:", err);
      const errorMsg = err?.message || 'Unknown error occurred';
      toast.error('Failed to upload avatar: ' + errorMsg);
      setUploadProgress(0);
      setSignupTempPath(null);
    } finally {
      setSignupAvatarUploading(false);
      e.target.value = '';
    }
  };

  // finalize any pending avatar when a user signs in
  const finalizePendingAvatar = async () => {
    const pending = localStorage.getItem('pendingAvatarTempPath');
    if (!pending) return;
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('finalize-avatar-upload', {
        body: { temp_path: pending },
      });
      if (fnError) throw fnError;
      if (fnData && (fnData.public_url || fnData.publicUrl)) {
        setSignupAvatarUrl(fnData.public_url || fnData.publicUrl);
      }
      localStorage.removeItem('pendingAvatarTempPath');
    } catch (err) {
      console.error('Failed to finalize pending avatar:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(error.message);
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else if (data.session) {
      // finalize any pending avatar uploads after sign in
      try {
        await finalizePendingAvatar();
      } catch (err) {
        console.error('Pending avatar finalize error on sign in:', err);
      }
      // Check if user is admin and redirect accordingly
      const role = data.session.user?.app_metadata?.role;
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setShowResetPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-hero mb-4 shadow-glow">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Sparkl Wishes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Create beautiful wishlists for life's celebrations
          </p>
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle>{showResetPassword ? "Reset Password" : "Welcome"}</CardTitle>
            <CardDescription>
              {showResetPassword 
                ? "Enter your email to receive a password reset link" 
                : "Sign in or create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setShowResetPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full shadow-elegant" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        or continue with
                      </span>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Continue with Google
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-sm text-muted-foreground"
                      onClick={() => setShowResetPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Profile Photo (optional)</Label>
                      {signupAvatarUrl ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                          <img src={signupAvatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">✓ Photo uploaded</p>
                            <button 
                              type="button"
                              onClick={() => setSignupAvatarUrl('')}
                              className="text-xs text-primary hover:underline mt-1"
                            >
                              Change photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleSignupAvatarUpload} 
                            disabled={signupAvatarUploading}
                            className="cursor-pointer"
                          />
                          {signupAvatarUploading && uploadProgress > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Upload className="w-4 h-4" />
                                  <span>Uploading...</span>
                                </div>
                                <span className="text-xs font-medium text-primary">{Math.round(uploadProgress)}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-2" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full shadow-elegant" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        or continue with
                      </span>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Sign up with Google
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
