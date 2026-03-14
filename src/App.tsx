import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  getDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Transaction, TransactionCategory, TransactionType } from './types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Mic, 
  LogOut, 
  FileText, 
  Receipt,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { parseVoiceInput } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'history'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(data);
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Errore nel caricamento dei dati. Verifica i permessi.");
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError("Accesso fallito.");
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
            <Receipt className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">NON SOLO FUMO</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-[0.3em]">Professional Ledger</p>
          </div>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Gestione avanzata Aggi e Corrispettivi per tabaccherie moderne.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-5 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Inizia ora con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-[#0a0a0a] border-r border-white/5 p-8 sticky top-0 h-screen">
        <div className="mb-12">
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">NSF</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Web Platform</p>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
          />
          <SidebarLink 
            active={activeTab === 'entry'} 
            onClick={() => setActiveTab('entry')}
            icon={<PlusCircle className="w-5 h-5" />}
            label="Nuova Voce"
          />
          <SidebarLink 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<FileText className="w-5 h-5" />}
            label="Archivio"
          />
        </nav>

        <div className="pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6 p-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName || 'Utente'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">NSF</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Mobile View</p>
        </div>
        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 mb-8">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-xs underline">Chiudi</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard transactions={transactions} />}
            {activeTab === 'entry' && <TransactionForm user={user} onComplete={() => setActiveTab('dashboard')} />}
            {activeTab === 'history' && <History transactions={transactions} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/5 p-4 flex justify-around items-center z-50">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="w-6 h-6" />}
          label="Home"
        />
        <NavButton 
          active={activeTab === 'entry'} 
          onClick={() => setActiveTab('entry')}
          icon={<PlusCircle className="w-6 h-6" />}
          label="Nuovo"
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<FileText className="w-6 h-6" />}
          label="Storico"
        />
      </nav>
    </div>
  );
}

function SidebarLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest group",
        active 
          ? "bg-white text-black shadow-lg shadow-white/5" 
          : "text-zinc-500 hover:text-white hover:bg-white/5"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "text-black" : "text-zinc-500 group-hover:text-white")}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-emerald-500 scale-110" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function Dashboard({ transactions }: { transactions: Transaction[] }) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  
  const totalAggi = monthTransactions
    .filter(t => t.type === 'Agio')
    .reduce((acc, t) => acc + (t.netAmount || 0), 0);
    
  const totalCorrispettivi = monthTransactions
    .filter(t => t.type === 'Corrispettivo')
    .reduce((acc, t) => acc + t.grossAmount, 0);

  const categories = [
    { name: 'Mooney', color: 'bg-amber-500' },
    { name: 'Lotto', color: 'bg-blue-500' },
    { name: 'Gratta e Vinci', color: 'bg-emerald-500' },
    { name: 'Sisal', color: 'bg-purple-500' },
    { name: 'Corrispettivi', color: 'bg-rose-500', isTotalCorrispettivi: true },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Dashboard</h2>
          <p className="text-zinc-500 font-medium">Riepilogo attività di {format(new Date(), 'MMMM yyyy', { locale: it })}</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
          <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest">Mensile</div>
          <div className="px-4 py-2 text-zinc-500 text-xs font-bold uppercase tracking-widest cursor-not-allowed">Settimanale</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Totale Aggi (Netto)" 
          value={totalAggi} 
          subtext="Commissioni maturate"
          color="text-emerald-500"
        />
        <StatCard 
          label="Totale Corrispettivi" 
          value={totalCorrispettivi} 
          subtext="Vendite dirette"
          color="text-blue-500"
        />
        <StatCard 
          label="Volume Totale" 
          value={totalAggi + totalCorrispettivi} 
          subtext="Movimentazione complessiva"
          color="text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Performance Categorie</h3>
            <LayoutDashboard className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="space-y-6">
            {categories.map(cat => {
              const amount = cat.isTotalCorrispettivi 
                ? totalCorrispettivi
                : monthTransactions
                  .filter(t => t.category === cat.name)
                  .reduce((acc, t) => acc + (t.type === 'Agio' ? (t.netAmount || 0) : t.grossAmount), 0);
              
              const percentage = (amount / (totalAggi + totalCorrispettivi || 1)) * 100;
              
              return (
                <div key={cat.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{cat.name}</p>
                      <p className="text-xl font-light">€{amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-1 rounded-md">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                      className={cn("h-full rounded-full", cat.color)} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Strumenti</h3>
              <FileText className="w-4 h-4 text-zinc-700" />
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Esporta i dati in formato CSV ottimizzato per i software gestionali dei commercialisti. Include dettagli su aliquote IVA e ventilazione.
            </p>
          </div>
          
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Data,Categoria,Tipo,Lordo,Netto,IVA,Note\n"
                + monthTransactions.map(t => `${t.date},${t.category},${t.type},${t.grossAmount},${t.netAmount || ''},${t.ivaRate || ''},${t.notes || ''}`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `report_${currentMonth}.csv`);
              document.body.appendChild(link);
              link.click();
            }}
            className="w-full mt-8 py-6 bg-white text-black hover:bg-zinc-200 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]"
          >
            <FileText className="w-5 h-5" />
            Scarica Report Commercialista
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, color }: { label: string, value: number, subtext: string, color: string }) {
  return (
    <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl hover:border-white/10 transition-all group">
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{label}</p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={cn("text-4xl font-black tracking-tighter", color)}>
          €{value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{subtext}</p>
    </div>
  );
}

function TransactionForm({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Mooney',
    type: 'Agio',
    grossAmount: 0,
    netAmount: 0,
    ivaRate: 22,
    isVentilato: false,
    isArt74: true,
    notes: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grossAmount || formData.grossAmount <= 0) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        ...formData,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      onComplete();
    } catch (err) {
      console.error(err);
    }
  };

  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Il tuo browser non supporta il riconoscimento vocale.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      const parsed = await parseVoiceInput(transcript);
      if (parsed) {
        setFormData(prev => ({ ...prev, ...parsed }));
      }
      setIsProcessing(false);
    };

    recognition.start();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Nuova Voce</h2>
          <p className="text-zinc-500 font-medium">Inserimento manuale o tramite assistente vocale</p>
        </div>
        
        <button
          type="button"
          onClick={startSpeechRecognition}
          disabled={isProcessing}
          className={cn(
            "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl group relative",
            isRecording ? "bg-red-500 animate-pulse scale-110" : "bg-white hover:bg-zinc-200",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic className={cn("w-8 h-8 transition-transform group-hover:scale-110", isRecording ? "text-white" : "text-black")} />
          )}
          {isRecording && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-500 uppercase tracking-widest whitespace-nowrap">In ascolto...</span>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8 bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Data Operazione</label>
            <input 
              type="date" 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-white transition-colors text-lg font-medium"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Tipologia</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'Agio', category: 'Mooney', isArt74: true })}
                className={cn(
                  "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  formData.type === 'Agio' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
              >
                Agio
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'Corrispettivo', category: '22%', isArt74: false })}
                className={cn(
                  "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  formData.type === 'Corrispettivo' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
              >
                Corrispettivo
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Categoria</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as TransactionCategory })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-white transition-colors font-medium appearance-none"
            >
              {formData.type === 'Agio' ? (
                <>
                  <option value="Mooney">Mooney</option>
                  <option value="Lotto">Lotto</option>
                  <option value="Gratta e Vinci">Gratta e Vinci</option>
                  <option value="Sisal">Sisal</option>
                  <option value="Altro">Altro</option>
                </>
              ) : (
                <>
                  <option value="4%">4%</option>
                  <option value="10%">10%</option>
                  <option value="22%">22%</option>
                  <option value="Altro">Altro</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-8 bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Importo Lordo</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">€</span>
              <input 
                type="number" 
                step="0.01"
                value={formData.grossAmount || ''}
                onChange={e => setFormData({ ...formData, grossAmount: parseFloat(e.target.value) })}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pl-10 focus:outline-none focus:border-white transition-colors font-mono text-2xl"
              />
            </div>
          </div>

          {formData.type === 'Agio' ? (
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Agio Netto (Ricavo)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/50 font-bold">€</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.netAmount || ''}
                  onChange={e => setFormData({ ...formData, netAmount: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 pl-10 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-2xl text-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Aliquota IVA</label>
                <select 
                  value={formData.ivaRate}
                  onChange={e => setFormData({ ...formData, ivaRate: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-white transition-colors font-medium appearance-none"
                >
                  <option value="22">22% Standard</option>
                  <option value="10">10% Ridotta</option>
                  <option value="4">4% Minima</option>
                  <option value="0">0% Esente</option>
                </select>
              </div>
              <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="ventilato"
                  checked={formData.isVentilato}
                  onChange={e => setFormData({ ...formData, isVentilato: e.target.checked })}
                  className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-white focus:ring-white transition-all"
                />
                <label htmlFor="ventilato" className="text-xs text-zinc-400 font-black uppercase tracking-widest cursor-pointer">Ventilazione IVA</label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-3">
        <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Note e Dettagli</label>
        <textarea 
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-white transition-colors h-32 text-sm resize-none"
          placeholder="Inserisci eventuali dettagli per la contabilità..."
        />
      </div>

      <button 
        type="submit"
        className="w-full py-6 bg-white text-black hover:bg-zinc-200 rounded-[2rem] font-black uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-[0.98]"
      >
        Conferma Registrazione
      </button>
    </form>
  );
}

function History({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black tracking-tight">Archivio</h2>
        <p className="text-zinc-500 font-medium">Cronologia completa delle registrazioni</p>
      </header>

      <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Data</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Categoria</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Tipo</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Importo</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-zinc-600 font-medium italic">
                    Nessun dato presente in archivio.
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={t.id} 
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-6">
                      <span className="text-sm font-medium text-zinc-400">
                        {format(parseISO(t.date), 'dd MMM yyyy', { locale: it })}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          t.type === 'Agio' ? "bg-emerald-500" : "bg-blue-500"
                        )} />
                        <span className="text-sm font-bold text-zinc-200">{t.category}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                        t.type === 'Agio' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <span className="font-mono font-bold text-base">
                        €{t.grossAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {t.type === 'Agio' ? (
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                          Netto: €{t.netAmount?.toLocaleString('it-IT')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                          IVA {t.ivaRate}% {t.isVentilato ? '(V)' : ''}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
