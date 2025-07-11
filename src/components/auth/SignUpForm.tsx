import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleSignInButton } from './GoogleSignInButton';

export const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpToken, setSignUpToken] = useState('');
  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpToken) {
      toast({
        variant: "destructive",
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification"
      });
      return;
    }
    
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing up",
        description: error.message
      });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link to complete your registration."
      });
    }
    
    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="flex justify-center">
          <Turnstile
            siteKey="0x4AAAAAABj-dtIbGVl6JkpZ"
            onSuccess={setSignUpToken}
            onError={() => setSignUpToken('')}
            onExpire={() => setSignUpToken('')}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      
      <GoogleSignInButton />
    </>
  );
};