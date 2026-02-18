import { motion } from 'framer-motion';
import { Shield, ArrowRight, Lock, Unlock, Key, Clock, FileText, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVaultStore } from '@/lib/vault-store';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const flowSteps = [
  { label: 'User Input', icon: '👤', color: 'cyber-blue', desc: 'Master password entered' },
  { label: 'PBKDF2 Derivation', icon: '⚙️', color: 'cyber-purple', desc: '100K iterations, SHA-256' },
  { label: 'OTP Verification', icon: '🔑', color: 'cyber-yellow', desc: 'TOTP 6-digit code' },
  { label: 'AES-256 Encryption', icon: '🔒', color: 'primary', desc: 'GCM mode, 12-byte IV' },
  { label: 'Secure Vault', icon: '🛡️', color: 'primary', desc: 'Encrypted storage' },
  { label: 'Retrieval & Decrypt', icon: '🔓', color: 'cyber-blue', desc: 'On-demand decryption' },
  { label: 'Memory Wipe', icon: '🧹', color: 'cyber-red', desc: 'Keys destroyed on logout' },
];

const SecurityPanel = () => {
  const { isOTPVerified, auditLog, sessionKeyCreatedAt } = useVaultStore();
  const navigate = useNavigate();

  useEffect(() => { if (!isOTPVerified) navigate('/'); }, [isOTPVerified, navigate]);

  const sessionAge = sessionKeyCreatedAt ? Math.floor((Date.now() - sessionKeyCreatedAt) / 1000) : 0;

  return (
    <div className="min-h-screen cyber-grid">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-primary text-glow">Security Visualization</h1>
          </div>
          <Link to="/vault"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Vault</Button></Link>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl space-y-6">
        {/* Encryption Lifecycle */}
        <Card className="border-primary/20 glow-green">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Encryption Lifecycle (Figure 2)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {flowSteps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-2">
                  <div className="bg-muted border border-border rounded-lg p-3 text-center min-w-[120px] hover:border-primary/50 transition-colors">
                    <p className="text-2xl mb-1">{step.icon}</p>
                    <p className="text-xs font-semibold">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                  {i < flowSteps.length - 1 && <ArrowRight className="w-4 h-4 text-primary/50 shrink-0" />}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Session Key Lifecycle */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> Session Key Lifecycle</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Key Generation', detail: 'PBKDF2 → AES-256 key derived at login', status: 'active' },
                { label: 'Key Usage', detail: `Active for ${sessionAge}s — encrypts/decrypts credentials`, status: 'active' },
                { label: 'Key Destruction', detail: 'Wiped from memory on logout or session timeout', status: 'pending' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
                  className="flex items-center gap-3 bg-muted rounded-lg p-3">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Crypto Summary */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Cryptographic Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  ['Key Derivation', 'PBKDF2-SHA256, 100K iterations'],
                  ['Encryption', 'AES-256-GCM'],
                  ['IV Size', '96 bits (12 bytes)'],
                  ['Salt Size', '128 bits (16 bytes)'],
                  ['2FA Method', 'TOTP (30s window)'],
                  ['Key Storage', 'In-memory only'],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono text-xs text-primary">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Audit Log</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {auditLog.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No events recorded</p>}
              {auditLog.map(entry => (
                <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs py-1.5 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    {entry.status === 'success' ? <CheckCircle className="w-3 h-3 text-primary shrink-0" /> : <XCircle className="w-3 h-3 text-destructive shrink-0" />}
                    <span className="text-muted-foreground shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5 sm:pl-0">
                    <span className="font-semibold shrink-0">{entry.action}</span>
                    <span className="text-muted-foreground truncate">{entry.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SecurityPanel;
