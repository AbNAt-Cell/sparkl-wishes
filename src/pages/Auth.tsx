import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Gift, Sparkles, Upload } from "lucide-react";

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
