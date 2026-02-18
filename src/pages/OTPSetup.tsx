import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Copy, CheckCircle, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useVaultStore } from '@/lib/vault-store';
import { generateOTPSecret, getTOTPUri, verifyTOTP } from '@/lib/crypto';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const OTPSetup = () => {
  const { isAuthenticated, isOTPSetup, setupOTP, addAuditEntry } = useVaultStore();
  const [secret] = useState(() => generateOTPSecret());
  const [otp, setOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    if (isOTPSetup) { navigate('/otp'); }
  }, [isAuthenticated, isOTPSetup, navigate]);

  const otpUri = getTOTPUri(secret);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    if (verifyTOTP(secret, otp)) {
      setVerified(true);
      setError('');
      setupOTP(secret);
      addAuditEntry({ action: '2FA Setup', detail: 'TOTP authenticator configured successfully', status: 'success' });
      setTimeout(() => navigate('/vault'), 1200);
    } else {
      setError('Invalid code. Make sure you scanned the QR code and entered the current code.');
      addAuditEntry({ action: '2FA Setup Failed', detail: 'Invalid TOTP code during setup', status: 'failure' });
      setOtp('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Smartphone className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold text-primary text-glow">Set Up Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-1 text-sm">Scan the QR code with your authenticator app</p>
        </div>

        <Card className="glow-green border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Authenticator Setup</CardTitle>
            <CardDescription>Use Google Authenticator, Authy, or any TOTP app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={otpUri} size={200} />
              </div>
            </div>

            {/* Manual secret */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Or enter this key manually:</p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <code className="text-sm font-mono text-primary flex-1 text-center break-all">{secret}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <CheckCircle className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">Enter the 6-digit code from your app to confirm:</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="bg-muted border-border text-foreground" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {verified && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-primary justify-center">
                <CheckCircle className="w-5 h-5" /> 2FA Configured Successfully!
              </motion.div>
            )}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button onClick={handleVerify} disabled={otp.length < 6 || verified} className="w-full glow-green">
              <Shield className="w-4 h-4 mr-2" /> Verify & Enable 2FA
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OTPSetup;
