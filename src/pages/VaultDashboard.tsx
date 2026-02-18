import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Eye, EyeOff, Copy, Trash2, Edit2, Lock, Unlock, LogOut, Key, BarChart3, Cpu, RefreshCw, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useVaultStore, Credential } from '@/lib/vault-store';
import { deriveKey, encrypt, decrypt, generateSalt } from '@/lib/crypto';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const VaultDashboard = () => {
  const { isOTPVerified, credentials, addCredential, updateCredential, removeCredential, addAuditEntry, salt, logout, sessionKeyCreatedAt, resetOTP } = useVaultStore();
  const navigate = useNavigate();
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Form state
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password generator
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  useEffect(() => {
    if (!isOTPVerified) navigate('/');
  }, [isOTPVerified, navigate]);

  const generatePassword = () => {
    let chars = '';
    if (genLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (genUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genNumbers) chars += '0123456789';
    if (genSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    const arr = new Uint32Array(genLength);
    crypto.getRandomValues(arr);
    for (let i = 0; i < genLength; i++) result += chars[arr[i] % chars.length];
    setPassword(result);
  };

  const getKey = async () => {
    if (!salt) return null;
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
    // In real app, we'd cache the derived key. For demo, re-derive from a stored session key
    return deriveKey('demo-session-key', saltBytes);
  };

  const handleAdd = async () => {
    const key = await getKey();
    if (!key) return;
    const { ciphertext, iv } = await encrypt(password, key);
    const cred: Credential = {
      id: crypto.randomUUID(),
      siteName, username,
      encryptedPassword: ciphertext, iv,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    addCredential(cred);
    addAuditEntry({ action: 'Add Credential', detail: `Added ${siteName} (AES-256-GCM encrypted)`, status: 'success' });
    toast.success('Credential encrypted and stored');
    resetForm();
    setShowAddDialog(false);
  };

  const handleReveal = async (cred: Credential) => {
    if (revealedIds.has(cred.id)) {
      setRevealedIds(prev => { const n = new Set(prev); n.delete(cred.id); return n; });
      return;
    }
    setDecryptingId(cred.id);
    const key = await getKey();
    if (!key) return;
    try {
      const plain = await decrypt(cred.encryptedPassword, cred.iv, key);
      await new Promise(r => setTimeout(r, 600)); // animation delay
      setDecryptedPasswords(prev => ({ ...prev, [cred.id]: plain }));
      setRevealedIds(prev => new Set(prev).add(cred.id));
      addAuditEntry({ action: 'Decrypt', detail: `Decrypted password for ${cred.siteName}`, status: 'success' });
    } catch {
      toast.error('Decryption failed');
    }
    setDecryptingId(null);
  };

  const handleDelete = (cred: Credential) => {
    removeCredential(cred.id);
    addAuditEntry({ action: 'Delete Credential', detail: `Removed ${cred.siteName}`, status: 'success' });
    toast.success('Credential removed');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleExport = () => {
    const data = localStorage.getItem('vault-state');
    if (!data) { toast.error('No vault data to export'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditEntry({ action: 'Export Backup', detail: 'Vault data exported as encrypted JSON file', status: 'success' });
    toast.success('Backup downloaded');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (!parsed.masterPasswordHash || !parsed.credentials) {
            toast.error('Invalid backup file');
            return;
          }
          localStorage.setItem('vault-state', JSON.stringify(parsed));
          addAuditEntry({ action: 'Import Backup', detail: `Restored ${parsed.credentials?.length || 0} credentials from backup`, status: 'success' });
          toast.success('Backup restored! Reloading...');
          setTimeout(() => window.location.reload(), 1000);
        } catch {
          toast.error('Failed to parse backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const resetForm = () => { setSiteName(''); setUsername(''); setPassword(''); };

  const sessionAge = sessionKeyCreatedAt ? Math.floor((Date.now() - sessionKeyCreatedAt) / 1000) : 0;

  return (
    <div className="min-h-screen cyber-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-4 gap-2">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-primary text-glow">SecureVault</h1>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full hidden sm:inline">🔒 Encrypted</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 px-2 text-xs"><Download className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Backup</span></Button>
            <Button variant="ghost" size="sm" onClick={handleImport} className="h-8 px-2 text-xs"><Upload className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Restore</span></Button>
            <Link to="/security">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"><BarChart3 className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Security</span></Button>
            </Link>
            <Link to="/attack-sim">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"><Cpu className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Attack Sim</span></Button>
            </Link>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => {
              resetOTP();
              addAuditEntry({ action: 'Reset 2FA', detail: 'TOTP authenticator reset by user', status: 'success' });
              toast.success('2FA has been reset. You will set it up again on next login.');
              logout();
              navigate('/');
            }}>
              <RefreshCw className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Reset 2FA</span>
            </Button>
            <div className="text-xs text-muted-foreground mx-1 hidden sm:block">
              <Key className="w-3 h-3 inline mr-1" />Session: {sessionAge}s
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 px-2 text-xs"><LogOut className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Logout</span></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Credentials', value: credentials.length, icon: Lock },
            { label: 'Encryption', value: 'AES-256-GCM', icon: Shield },
            { label: 'Session Key', value: 'Active', icon: Key },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-8 h-8 text-primary/60" />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add credential */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Credential Vault</h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="glow-green"><Plus className="w-4 h-4 mr-2" /> Add Credential</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add New Credential</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="e.g., GitHub" className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Username / Email</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="user@example.com" className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-muted" />
                    <Button variant="outline" onClick={generatePassword} size="sm">Generate</Button>
                  </div>
                </div>
                {/* Generator options */}
                <div className="bg-muted rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Password Generator</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-16">Length: {genLength}</span>
                    <Slider value={[genLength]} onValueChange={v => setGenLength(v[0])} min={8} max={64} step={1} className="flex-1" />
                  </div>
                  <div className="flex gap-4 text-xs">
                    {[
                      { label: 'A-Z', checked: genUpper, set: setGenUpper },
                      { label: 'a-z', checked: genLower, set: setGenLower },
                      { label: '0-9', checked: genNumbers, set: setGenNumbers },
                      { label: '!@#', checked: genSymbols, set: setGenSymbols },
                    ].map(o => (
                      <label key={o.label} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={o.checked} onCheckedChange={v => o.set(!!v)} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={!siteName || !username || !password} className="w-full glow-green">
                  <Lock className="w-4 h-4 mr-2" /> Encrypt & Store
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Credentials list */}
        <div className="space-y-3">
          <AnimatePresence>
            {credentials.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No credentials stored yet. Add your first one!</p>
              </motion.div>
            )}
            {credentials.map(cred => (
              <motion.div key={cred.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} layout>
                <Card className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{cred.siteName}</h3>
                          {revealedIds.has(cred.id) ?
                            <Unlock className="w-3 h-3 text-[hsl(var(--cyber-yellow))]" /> :
                            <Lock className="w-3 h-3 text-primary" />
                          }
                        </div>
                        <p className="text-sm text-muted-foreground">{cred.username}</p>
                        <div className="mt-2 font-mono text-sm">
                          {decryptingId === cred.id ? (
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-[hsl(var(--cyber-blue))]">
                              Decrypting...
                            </motion.span>
                          ) : revealedIds.has(cred.id) ? (
                            <span className="text-primary">{decryptedPasswords[cred.id]}</span>
                          ) : (
                            <span className="text-muted-foreground">{'•'.repeat(16)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleReveal(cred)}>
                          {revealedIds.has(cred.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        {revealedIds.has(cred.id) && (
                          <Button variant="ghost" size="icon" onClick={() => handleCopy(decryptedPasswords[cred.id])}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cred)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default VaultDashboard;
