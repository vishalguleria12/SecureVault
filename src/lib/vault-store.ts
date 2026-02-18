import { create } from 'zustand';

export interface Credential {
  id: string;
  siteName: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  detail: string;
  status: 'success' | 'failure';
}

interface VaultState {
  isAuthenticated: boolean;
  isOTPVerified: boolean;
  isRegistered: boolean;
  masterPasswordHash: string | null;
  salt: string | null;
  credentials: Credential[];
  auditLog: AuditEntry[];
  otpSecret: string;
  isOTPSetup: boolean;
  sessionKeyCreatedAt: number | null;

  setAuthenticated: (v: boolean) => void;
  setOTPVerified: (v: boolean) => void;
  register: (hash: string, salt: string) => void;
  addCredential: (c: Credential) => void;
  updateCredential: (id: string, c: Partial<Credential>) => void;
  removeCredential: (id: string) => void;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  setupOTP: (secret: string) => void;
  resetOTP: () => void;
  setSessionKey: () => void;
  destroySession: () => void;
  logout: () => void;
}

const loadState = () => {
  try {
    const data = localStorage.getItem('vault-state');
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return {};
};

const saved = loadState();

export const useVaultStore = create<VaultState>((set, get) => ({
  isAuthenticated: false,
  isOTPVerified: false,
  isRegistered: !!saved.masterPasswordHash,
  masterPasswordHash: saved.masterPasswordHash || null,
  salt: saved.salt || null,
  credentials: saved.credentials || [],
  auditLog: saved.auditLog || [],
  otpSecret: saved.otpSecret || '',
  isOTPSetup: !!saved.isOTPSetup,
  sessionKeyCreatedAt: null,

  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setOTPVerified: (v) => set({ isOTPVerified: v }),

  register: (hash, salt) => {
    set({ masterPasswordHash: hash, salt, isRegistered: true });
    persist(get());
  },

  setupOTP: (secret) => {
    set({ otpSecret: secret, isOTPSetup: true });
    persist(get());
  },

  resetOTP: () => {
    set({ otpSecret: '', isOTPSetup: false });
    persist(get());
  },

  addCredential: (c) => {
    set((s) => ({ credentials: [...s.credentials, c] }));
    persist(get());
  },

  updateCredential: (id, updates) => {
    set((s) => ({
      credentials: s.credentials.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
    }));
    persist(get());
  },

  removeCredential: (id) => {
    set((s) => ({ credentials: s.credentials.filter((c) => c.id !== id) }));
    persist(get());
  },

  addAuditEntry: (entry) => {
    const newEntry: AuditEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
    set((s) => ({ auditLog: [newEntry, ...s.auditLog].slice(0, 100) }));
    persist(get());
  },

  setSessionKey: () => set({ sessionKeyCreatedAt: Date.now() }),

  destroySession: () => set({ sessionKeyCreatedAt: null, isAuthenticated: false, isOTPVerified: false }),

  logout: () => {
    get().addAuditEntry({ action: 'Logout', detail: 'Session destroyed, keys wiped', status: 'success' });
    set({ isAuthenticated: false, isOTPVerified: false, sessionKeyCreatedAt: null });
  },
}));

function persist(state: VaultState) {
  localStorage.setItem('vault-state', JSON.stringify({
    masterPasswordHash: state.masterPasswordHash,
    salt: state.salt,
    credentials: state.credentials,
    auditLog: state.auditLog,
    otpSecret: state.otpSecret,
    isOTPSetup: state.isOTPSetup,
  }));
}
