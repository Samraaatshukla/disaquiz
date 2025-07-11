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
  const { signIn } = useAuth();

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
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing in",
        description: error.message
      });
    }
    
    setLoading(false);
  };

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
          />
        </div>
        
        <div className="flex justify-center">
          <Turnstile
            siteKey="0x4AAAAAABj-dtIbGVl6JkpZ"
            onSuccess={setSignInToken}
            onError={() => setSignInToken('')}
            onExpire={() => setSignInToken('')}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <GoogleSignInButton />
    </>
  );
};