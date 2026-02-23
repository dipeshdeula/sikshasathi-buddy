import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const demoAccounts = [
    { label: 'Teacher', email: 'sita@siksha.np', password: 'teacher123' },
    { label: 'Student', email: 'student1@siksha.np', password: 'student123' },
    { label: 'Parent', email: 'parent@siksha.np', password: 'parent123' },
    { label: 'Admin', email: 'admin@siksha.np', password: 'admin123' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      const user = JSON.parse(localStorage.getItem('siksha_user') || '{}');
      navigate(`/${user.role}`);
    } else {
      toast({ title: 'Login failed', description: 'Invalid email or password', variant: 'destructive' });
    }
  };

  const quickLogin = async (em: string, pw: string) => {
    setLoading(true);
    const ok = await login(em, pw);
    setLoading(false);
    if (ok) {
      const user = JSON.parse(localStorage.getItem('siksha_user') || '{}');
      navigate(`/${user.role}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to SikshaSathi</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@siksha.np" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick demo login:</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(a => (
                <Button key={a.label} variant="outline" size="sm" onClick={() => quickLogin(a.email, a.password)} disabled={loading}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
