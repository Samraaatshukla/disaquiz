import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleSignInButton } from './GoogleSignInButton';

export const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signInToken, setSignInToken] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { signIn, resetPassword } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInToken) {
      toast({
        variant: "destructive",
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification"
      });
      return;
    }
    
    setLoading(true);
    
    const { error, isBlocked } = await signIn(email, password);
    
    if (error) {
      setIsBlocked(isBlocked || false);
      toast({
        variant: "destructive",
        title: "Error signing in",
        description: error.message
      });
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address"
      });
      return;
    }

    setLoading(true);
    
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error sending reset email",
        description: error.message
      });
    } else {
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions to reset your password"
      });
      setShowResetPassword(false);
      setIsBlocked(false);
    }
    
    setLoading(false);
  };

  if (showResetPassword) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={() => setShowResetPassword(false)}
        >
          Back to Sign In
        </Button>
      </form>
    );
  }

  return (
    <>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isBlocked}
          />
        </div>
        
        {!isBlocked && (
          <div className="flex justify-center">
            <Turnstile
              siteKey="0x4AAAAAABj-dtIbGVl6JkpZ"
              onSuccess={setSignInToken}
              onError={() => setSignInToken('')}
              onExpire={() => setSignInToken('')}
            />
          </div>
        )}
        
        {isBlocked ? (
          <Button 
            type="button" 
            className="w-full" 
            onClick={() => setShowResetPassword(true)}
            variant="destructive"
          >
            Reset Password to Continue
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
        
        {!isBlocked && (
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full text-sm" 
            onClick={() => setShowResetPassword(true)}
          >
            Forgot Password?
          </Button>
        )}
      </form>
      
      {!isBlocked && <GoogleSignInButton />}
    </>
  );
};