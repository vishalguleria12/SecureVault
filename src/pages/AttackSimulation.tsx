import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Zap, Timer, ArrowLeft, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { measureKeyDerivation } from '@/lib/crypto';
import { Link, useNavigate } from 'react-router-dom';
import { useVaultStore } from '@/lib/vault-store';
import { useEffect } from 'react';

const AttackSimulation = () => {
  const { isOTPVerified } = useVaultStore();
  const navigate = useNavigate();
  const [bruteForceCount, setBruteForceCount] = useState(0);
  const [bruteForceRunning, setBruteForceRunning] = useState(false);
  const [hashComparison, setHashComparison] = useState<{ md5: number; pbkdf2_1k: number; pbkdf2_100k: number } | null>(null);
  const [hashRunning, setHashRunning] = useState(false);

  useEffect(() => { if (!isOTPVerified) navigate('/'); }, [isOTPVerified, navigate]);

  const runBruteForce = async () => {
    setBruteForceRunning(true);
    setBruteForceCount(0);
    for (let i = 0; i < 500; i++) {
      await new Promise(r => setTimeout(r, 10));
      setBruteForceCount(i + 1);
    }
    setBruteForceRunning(false);
  };

  const runHashComparison = async () => {
    setHashRunning(true);
    setHashComparison(null);
    const md5 = 0.02; // Simulated - MD5 is essentially instant
    const pbkdf2_1k = await measureKeyDerivation('test-password', 1000);
    const pbkdf2_100k = await measureKeyDerivation('test-password', 100000);
    setHashComparison({ md5, pbkdf2_1k, pbkdf2_100k });
    setHashRunning(false);
  };

  const maxTime = hashComparison ? Math.max(hashComparison.pbkdf2_100k, 1) : 1;

  return (
    <div className="min-h-screen cyber-grid">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-primary text-glow">Attack Simulation</h1>
          </div>
          <Link to="/vault"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Vault</Button></Link>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl space-y-6">
        {/* Brute Force Demo */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-[hsl(var(--cyber-yellow))]" /> Brute-Force Resistance</CardTitle>
            <CardDescription>Demonstrates how key stretching makes brute-force attacks infeasible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Attempts simulated</span>
                <span className="font-mono text-primary">{bruteForceCount.toLocaleString()} / 500</span>
              </div>
              <Progress value={(bruteForceCount / 500) * 100} className="h-2" />
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-card rounded p-3">
                  <p className="text-muted-foreground">8-char password keyspace</p>
                  <p className="text-lg font-bold font-mono">6.6 × 10¹⁵</p>
                  <p className="text-muted-foreground mt-1">~209 years at 1M/s with PBKDF2</p>
                </div>
                <div className="bg-card rounded p-3">
                  <p className="text-muted-foreground">With 2FA enabled</p>
                  <p className="text-lg font-bold font-mono text-primary">6.6 × 10²¹</p>
                  <p className="text-muted-foreground mt-1">Effectively impossible</p>
                </div>
              </div>
            </div>
            <Button onClick={runBruteForce} disabled={bruteForceRunning} className="glow-green">
              <Play className="w-4 h-4 mr-2" /> {bruteForceRunning ? 'Running...' : 'Run Brute-Force Demo'}
            </Button>
          </CardContent>
        </Card>

        {/* Hash Comparison */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Timer className="w-5 h-5 text-[hsl(var(--cyber-blue))]" /> Hashing Speed Comparison</CardTitle>
            <CardDescription>Compare weak hashing (MD5) vs PBKDF2 key derivation timing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hashComparison && (
              <div className="space-y-3">
                {[
                  { label: 'MD5 (simulated)', time: hashComparison.md5, color: 'bg-destructive' },
                  { label: 'PBKDF2 (1K iterations)', time: hashComparison.pbkdf2_1k, color: 'bg-[hsl(var(--cyber-yellow))]' },
                  { label: 'PBKDF2 (100K iterations)', time: hashComparison.pbkdf2_100k, color: 'bg-primary' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-mono">{item.time.toFixed(2)}ms</span>
                    </div>
                    <div className="h-4 bg-secondary rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max((item.time / maxTime) * 100, 2)}%` }} transition={{ duration: 0.8, delay: i * 0.2 }}
                        className={`h-full ${item.color} rounded-full`} />
                    </div>
                  </motion.div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Higher derivation time = better security. PBKDF2 with 100K iterations makes each guess ~{(hashComparison.pbkdf2_100k / hashComparison.md5).toFixed(0)}× slower than MD5.
                </p>
              </div>
            )}

            {/* Paper statistics */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-semibold mb-3">Research Paper Findings</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">0.5s</p>
                  <p className="text-xs text-muted-foreground">Avg encryption time</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">98%</p>
                  <p className="text-xs text-muted-foreground">Auth success rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Brute-force resistance</p>
                </div>
              </div>
            </div>

            <Button onClick={runHashComparison} disabled={hashRunning} variant="outline" className="glow-blue">
              <Play className="w-4 h-4 mr-2" /> {hashRunning ? 'Measuring...' : 'Run Hash Comparison'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AttackSimulation;
