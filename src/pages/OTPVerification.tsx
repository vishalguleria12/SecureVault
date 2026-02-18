import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useVaultStore } from '@/lib/vault-store';
import { verifyTOTP } from '@/lib/crypto';
import { useNavigate } from 'react-router-dom';

const OTPVerification = () => {
  const { isAuthenticated, otpSecret, setOTPVerified, addAuditEntry, setSessionKey, destroySession } = useVaultStore();
  const [otp, setOtp] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); }
  }, [isAuthenticated, navigate]);

  const handleVerify = () => {
    if (verifyTOTP(otpSecret, otp)) {
      setStatus('success');
      setOTPVerified(true);
      setSessionKey();
      addAuditEntry({ action: 'OTP Verified', detail: `TOTP code accepted after ${attempts + 1} attempt(s)`, status: 'success' });
      setTimeout(() => navigate('/vault'), 1000);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setStatus('failure');
      addAuditEntry({ action: 'OTP Failed', detail: `Invalid OTP attempt #${newAttempts}`, status: 'failure' });
      if (newAttempts >= 3) {
        addAuditEntry({ action: 'Lockout', detail: 'Too many failed OTP attempts, session destroyed', status: 'failure' });
        setTimeout(() => { destroySession(); navigate('/'); }, 1500);
      }
      setOtp('');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold text-primary text-glow">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-1 text-sm">Enter the code from your authenticator app</p>
        </div>

        <Card className="glow-green border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">OTP Verification</CardTitle>
            <CardDescription>Open your authenticator app and enter the current 6-digit code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot key={i} index={i} className="bg-muted border-border text-foreground" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {status === 'success' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-primary justify-center">
                <CheckCircle className="w-5 h-5" /> Access Granted
              </motion.div>
            )}
            {status === 'failure' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-destructive justify-center">
                <AlertTriangle className="w-5 h-5" /> Invalid code. {3 - attempts} attempt(s) remaining.
              </motion.div>
            )}

            <Button onClick={handleVerify} disabled={otp.length < 6 || status === 'success'} className="w-full glow-green">
              Verify Code
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
