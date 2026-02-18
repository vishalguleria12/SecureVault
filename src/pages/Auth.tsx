import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, UserPlus, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useVaultStore } from '@/lib/vault-store';
import { hashPassword, generateSalt, calculatePasswordStrength } from '@/lib/crypto';

import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const { isRegistered, isOTPSetup, register, masterPasswordHash, salt, setAuthenticated, addAuditEntry } = useVaultStore();
  const [mode, setMode] = useState<'login' | 'register'>(isRegistered ? 'login' : 'register');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [derivationSteps, setDerivationSteps] = useState<string[]>([]);
  const navigate = useNavigate();

  const strength = calculatePasswordStrength(password);

  const showDerivation = async (label: string, delay: number) => {
    setDerivationSteps(prev => [...prev, label]);
    await new Promise(r => setTimeout(r, delay));
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (strength.score < 30) { setError('Password too weak'); return; }
    setLoading(true);
    setDerivationSteps([]);
    setError('');

    await showDerivation('🔑 Generating random salt (16 bytes)...', 500);
    const newSalt = generateSalt();
    await showDerivation('⚙️ Running PBKDF2 with 100,000 iterations...', 800);
    await showDerivation('🔒 Deriving AES-256 key from master password...', 600);
    const hash = await hashPassword(password, newSalt as Uint8Array<ArrayBuffer>);
    await showDerivation('✅ Master key stored securely', 400);

    register(hash, btoa(String.fromCharCode(...newSalt)));
    addAuditEntry({ action: 'Registration', detail: 'Master password registered with PBKDF2-SHA256', status: 'success' });
    setAuthenticated(true);
    setLoading(false);
    navigate('/otp-setup');
  };

  const handleLogin = async () => {
    if (!salt || !masterPasswordHash) return;
    setLoading(true);
    setDerivationSteps([]);
    setError('');

    await showDerivation('🔑 Retrieving stored salt...', 400);
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
    await showDerivation('⚙️ Running PBKDF2 with 100,000 iterations...', 700);
    const hash = await hashPassword(password, saltBytes);
    await showDerivation('🔍 Comparing derived key with stored hash...', 500);

    if (hash === masterPasswordHash) {
      await showDerivation('✅ Authentication successful!', 300);
      setAuthenticated(true);
      addAuditEntry({ action: 'Login', detail: 'Master password verified via PBKDF2', status: 'success' });
      navigate(isOTPSetup ? '/otp' : '/otp-setup');
    } else {
      await showDerivation('❌ Key mismatch - Access denied', 300);
      setError('Invalid master password');
      addAuditEntry({ action: 'Login', detail: 'Failed master password attempt', status: 'failure' });
    }
    setLoading(false);
  };

  const strengthColor = strength.score < 30 ? 'bg-destructive' : strength.score < 60 ? 'bg-[hsl(var(--cyber-yellow))]' : strength.score < 80 ? 'bg-[hsl(var(--cyber-blue))]' : 'bg-primary';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
            <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-glow text-primary">SecureVault</h1>
          <p className="text-muted-foreground mt-2">Password Vault with Two-Factor Authentication</p>
        </div>

        <Card className="glow-green border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === 'register' ? <><UserPlus className="w-5 h-5" /> Create Master Password</> : <><LogIn className="w-5 h-5" /> Enter Master Password</>}
            </CardTitle>
            <CardDescription>
              {mode === 'register' ? 'Set a strong master password to protect your vault' : 'Authenticate with your master password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Master Password</Label>
              <Input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Enter master password" className="bg-muted border-border focus:border-primary" />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm master password" className="bg-muted border-border focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Strength</span>
                    <span className={strength.score < 30 ? 'text-destructive' : strength.score < 60 ? 'text-[hsl(var(--cyber-yellow))]' : 'text-primary'}>{strength.label}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <motion.div className={`h-full ${strengthColor} rounded-full`} initial={{ width: 0 }} animate={{ width: `${strength.score}%` }} />
                  </div>
                  {strength.feedback.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      {strength.feedback.map((f, i) => <li key={i}>• {f}</li>)}
                    </ul>
                  )}
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {derivationSteps.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-primary mb-2">Key Derivation Process (PBKDF2)</p>
                {derivationSteps.map((step, i) => (
                  <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-muted-foreground font-mono">{step}</motion.p>
                ))}
              </motion.div>
            )}

            <Button onClick={mode === 'register' ? handleRegister : handleLogin} disabled={loading || !password} className="w-full glow-green">
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : mode === 'register' ? 'Create Vault' : 'Unlock Vault'}
            </Button>

            {isRegistered && (
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setDerivationSteps([]); }} className="text-sm text-muted-foreground hover:text-primary w-full text-center transition-colors">
                {mode === 'login' ? 'Reset & create new vault' : 'Back to login'}
              </button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
