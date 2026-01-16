
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserPersona, 
  Bucket, 
  Transaction,
  Currency, 
  CURRENCIES, 
  FALLBACK_BUCKETS,
  TRANSLATIONS,
  BudgetPlan,
  UserProfile,
  MaritalStatus,
  FamilyStructure,
  AISuggestion,
  AIPlanResponse
} from './types';
import { getBudgetPlans, getFinancialAdvice, getPostTransactionSuggestions, generateGoalImage } from './services/geminiService';
import { 
  PlusCircle, 
  TrendingUp, 
  ArrowRight, 
  Globe, 
  LayoutDashboard, 
  BrainCircuit, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Pencil,
  Settings2,
  CheckCircle2,
  Sparkles,
  Baby,
  Users,
  User as UserIcon,
  Heart,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  Zap,
  Wallet,
  FolderPlus,
  Info,
  Layers,
  Activity,
  Edit3,
  Filter,
  X,
  Calendar,
  DollarSign,
  RefreshCw,
  Wand2,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Home
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`glass rounded-[2.5rem] p-6 transition-all duration-500 hover:border-emerald-500/30 ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [profile, setProfile] = useState<UserProfile>({
    persona: null,
    status: null,
    childrenCount: 0,
    priorities: '',
    age: 25,
    familyStructure: null
  });
  const [salary, setSalary] = useState<number>(1000000); 
  const [buckets, setBuckets] = useState<Bucket[]>(FALLBACK_BUCKETS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]); 
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); 
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [salaryFeedback, setSalaryFeedback] = useState<string>('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showPlansOverlay, setShowPlansOverlay] = useState(false);
  const [apiErrorType, setApiErrorType] = useState<string | null>(null);
  
  const [advice, setAdvice] = useState<string[]>([]);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isNewBucketModalOpen, setIsNewBucketModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudgetBucket, setEditingBudgetBucket] = useState<Bucket | null>(null);
  const [bucketToDelete, setBucketToDelete] = useState<Bucket | null>(null);
  
  const [postTxSuggestions, setPostTxSuggestions] = useState<AISuggestion[]>([]);
  const [showPostTxModal, setShowPostTxModal] = useState(false);

  // Goal Visualization State
  const [goalPrompt, setGoalPrompt] = useState('');
  const [goalImage, setGoalImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBucketId, setFilterBucketId] = useState('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const bucketsWithSpending = useMemo(() => {
    return buckets.map(b => {
      const spent = transactions
        .filter(tx => tx.bucketId === b.id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { ...b, spent };
    });
  }, [buckets, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBucket = filterBucketId === 'all' || tx.bucketId === filterBucketId;
      const numAmount = tx.amount;
      const matchesMin = minAmount === '' || numAmount >= parseFloat(minAmount);
      const matchesMax = maxAmount === '' || numAmount <= parseFloat(maxAmount);
      return matchesSearch && matchesBucket && matchesMin && matchesMax;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterBucketId, minAmount, maxAmount]);

  const totalSpent = useMemo(() => transactions.reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
  const totalAllocated = useMemo(() => buckets.reduce((sum, b) => sum + b.allocated, 0), [buckets]);
  const netRemaining = salary - totalSpent;
  const isDeficit = totalSpent > salary;

  const chartData = useMemo(() => {
    const data = bucketsWithSpending.map(b => ({
      name: b.name,
      value: b.spent > 0 ? b.spent : (b.allocated > 0 ? 0.001 : 0), 
      color: b.spent > b.allocated ? '#ff3131' : b.color,
    })).filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: 'Empty', value: 1, color: '#111' }];
  }, [bucketsWithSpending]);

  const triggerSmartPlans = async (newSalary: number, isInitial: boolean, oldVal?: number) => {
    setIsLoadingPlans(true);
    setApiErrorType(null);
    setShowPlansOverlay(true);
    const result: AIPlanResponse = await getBudgetPlans(profile, newSalary, currency, lang, isInitial, oldVal);
    
    if (result.feedback === "QUOTA_EXCEEDED" || result.feedback === "API_ERROR") {
      setApiErrorType(result.feedback);
      setBudgetPlans([]);
    } else {
      setBudgetPlans(result.plans);
      setSalaryFeedback(result.feedback);
    }
    setIsLoadingPlans(false);
  };

  const handleOnboardingStart = async () => {
    setOnboardingStep(3); 
    await triggerSmartPlans(salary, true);
  };

  const applyPlan = (plan: BudgetPlan) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#f97316'];
    const newBuckets = plan.buckets.map((b, i) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      recommendedPercent: b.percent,
      allocated: Math.round(salary * (b.percent / 100)),
      spent: 0,
      color: colors[i % colors.length]
    }));
    setBuckets(newBuckets);
    setShowPlansOverlay(false);
    setOnboardingComplete(true);
  };

  const fetchAdvice = useCallback(async () => {
    if (!onboardingComplete) return;
    setIsLoadingAdvice(true);
    const newAdvice = await getFinancialAdvice(profile, salary, bucketsWithSpending, currency, lang);
    setAdvice(newAdvice);
    setIsLoadingAdvice(false);
  }, [onboardingComplete, profile, salary, bucketsWithSpending, currency, lang]);

  useEffect(() => {
    if (onboardingComplete) fetchAdvice();
  }, [onboardingComplete, transactions]);

  const handleGenerateGoal = async () => {
    if (!goalPrompt) return;
    setIsGeneratingImage(true);
    const url = await generateGoalImage(goalPrompt);
    if (url) setGoalImage(url);
    setIsGeneratingImage(false);
  };

  const applyAISuggestion = (suggestion: AISuggestion) => {
    if (!suggestion.action) return;
    const { action } = suggestion;
    setBuckets(prev => prev.map(b => {
      if (action.type === 'REALLOCATE') {
        if (b.id === action.fromId) return { ...b, allocated: Math.max(0, b.allocated - (action.amount || 0)) };
        if (b.id === action.toId) return { ...b, allocated: b.allocated + (action.amount || 0) };
      }
      return b;
    }));
    setShowPostTxModal(false);
    fetchAdvice();
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const handleDeleteBucket = (id: string) => {
    setBuckets(prev => prev.filter(b => b.id !== id));
    setBucketToDelete(null);
  };

  const saveTransaction = async (txData: Omit<Transaction, 'id'>, id?: string) => {
    let finalTx: Transaction;
    if (id) {
      finalTx = { ...txData, id };
      setTransactions(prev => prev.map(t => (t.id === id ? finalTx : t)));
    } else {
      finalTx = { ...txData, id: Math.random().toString(36).substr(2, 9) };
      setTransactions(prev => [finalTx, ...prev]);
    }
    const suggestions = await getPostTransactionSuggestions(finalTx, bucketsWithSpending, salary, profile, currency, lang);
    setPostTxSuggestions(suggestions);
    setShowPostTxModal(true);
  };

  const handleSalarySave = async (newVal: number) => {
    const oldVal = salary;
    setSalary(newVal);
    await triggerSmartPlans(newVal, false, oldVal);
  };

  if (!onboardingComplete) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center p-6 bg-[#050505] font-inter">
        <div className="max-w-6xl w-full">
          {onboardingStep === 0 && (
            <div className="max-w-md mx-auto space-y-12 animate-in fade-in zoom-in duration-700">
               <div className="flex justify-center gap-4">
                  <button onClick={() => setLang('ar')} className={`px-4 py-1 text-xs rounded-full border transition-all ${lang === 'ar' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/10 text-gray-500'}`}>العربية</button>
                  <button onClick={() => setLang('en')} className={`px-4 py-1 text-xs rounded-full border transition-all ${lang === 'en' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/10 text-gray-500'}`}>English</button>
               </div>
               <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto emerald-glow animate-pulse">
                    <BrainCircuit className="w-16 h-16 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t.tutorialTitle}</h2>
                  <p className="text-gray-400 text-lg leading-relaxed h-24 flex items-center justify-center px-4">{t.tutorialSlide1}</p>
               </div>
               <button onClick={() => setOnboardingStep(1)} className="w-full py-5 bg-white text-black font-black rounded-3xl hover:bg-emerald-400 transition-all text-lg shadow-xl uppercase tracking-widest">{t.getStarted}</button>
            </div>
          )}
          {onboardingStep === 1 && (
            <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <div className="text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 emerald-glow mx-auto rotate-3">
                  <TrendingUp className="text-white w-10 h-10 -rotate-3" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-white mb-3">Rafiqe<span className="text-emerald-500">.</span></h1>
                <p className="text-gray-500 font-medium">{t.subtitle}</p>
              </div>
              <GlassCard className="space-y-8 border-white/10 shadow-2xl">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Info className="w-3 h-3 text-emerald-500" /> {t.personaPrompt}</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(['Solo', 'Family Head', 'Living with Family'] as UserPersona[]).map((p) => (
                      <button key={p} onClick={() => setProfile({ ...profile, persona: p })} className={`group w-full p-5 rounded-3xl border text-left transition-all duration-500 ${profile.persona === p ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-white/5 bg-white/[0.02] text-gray-500 hover:border-emerald-500/50 hover:text-white'}`}>
                        <div className="flex items-center justify-between"><span className="font-bold text-lg">{t[p as keyof typeof t] || p}</span>{profile.persona === p && <CheckCircle2 className="w-6 h-6 animate-in zoom-in" />}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">{t.currency}</label>
                    <select value={currency.code} onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-4 text-white text-sm font-bold appearance-none">{CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.code} ({c.symbol})</option>)}</select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">{t.incomePrompt}</label>
                    <input type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">{t.agePrompt}</label>
                    <input type="number" min="15" max="100" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                </div>
                <button onClick={() => setOnboardingStep(2)} disabled={!profile.persona} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 text-lg shadow-xl uppercase tracking-widest">{t.next} <ArrowRight className={isRtl ? 'rotate-180' : ''} /></button>
              </GlassCard>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
               <div className="text-center"><h2 className="text-3xl font-black mb-2">{t.statusPrompt}</h2><p className="text-gray-500">سوف نستخدم هذه البيانات لتوليد أقسام مصروفاتك.</p></div>
               <GlassCard className="space-y-8 border-white/10 shadow-2xl">
                 <div className="grid grid-cols-3 gap-3">
                   {(['Single', 'Married', 'With Family'] as MaritalStatus[]).map((s) => (
                      <button key={s} onClick={() => setProfile({ ...profile, status: s })} className={`flex flex-col items-center gap-2 p-5 rounded-3xl border transition-all ${profile.status === s ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-white/5 bg-white/[0.02] text-gray-500 hover:border-emerald-500/50'}`}>
                        {s === 'Single' ? <UserIcon className="w-6 h-6" /> : s === 'Married' ? <Heart className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t[s as keyof typeof t] || s}</span>
                      </button>
                   ))}
                 </div>
                 
                 <div className="space-y-4">
                    {/* Only ask for children if married */}
                    {profile.status === 'Married' && (
                      <div className="space-y-2 animate-in slide-in-from-top-4">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Baby className="w-3 h-3 text-emerald-500" /> {t.childrenPrompt}
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          value={profile.childrenCount} 
                          onChange={e => setProfile({...profile, childrenCount: Math.max(0, parseInt(e.target.value) || 0)})}
                          className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-4 text-white text-lg font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50" 
                        />
                      </div>
                    )}

                    {/* Only ask for family structure if "Living with Family" */}
                    {profile.persona === 'Living with Family' && (
                      <div className="space-y-2 animate-in slide-in-from-top-4">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Home className="w-3 h-3 text-emerald-500" /> {t.familyStructurePrompt}
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {([
                            {id: 'Mother and Father', label: t.structureBoth},
                            {id: 'Father only', label: t.structureFather},
                            {id: 'Mother only', label: t.structureMother}
                          ] as {id: FamilyStructure, label: string}[]).map((st) => (
                            <button key={st.id} onClick={() => setProfile({...profile, familyStructure: st.id})} className={`p-4 rounded-2xl border text-sm transition-all ${profile.familyStructure === st.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-white/5 bg-white/[0.02] text-gray-500'}`}>
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-emerald-500" /> {t.prioritiesPrompt}
                      </label>
                      <textarea 
                        value={profile.priorities} 
                        onChange={e => setProfile({...profile, priorities: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50" 
                      />
                    </div>
                 </div>

                 <div className="flex gap-4">
                   <button onClick={() => setOnboardingStep(1)} className="flex-1 py-4 text-gray-500 font-bold uppercase tracking-widest text-xs">{t.back}</button>
                   <button onClick={handleOnboardingStart} className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-xs">{t.startBtn}</button>
                 </div>
               </GlassCard>
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="fixed inset-0 z-[2000] bg-black overflow-y-auto px-6 py-12 flex flex-col items-center">
              <div className="max-w-6xl w-full space-y-12 animate-in fade-in zoom-in duration-700">
                 <div className="text-center space-y-6">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.plansTitle}</h2>
                    {salaryFeedback && !apiErrorType && <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 font-bold text-center max-w-2xl mx-auto leading-relaxed"><Sparkles className="inline-block w-5 h-5 mb-1 me-2" /> {salaryFeedback}</div>}
                    {apiErrorType === "QUOTA_EXCEEDED" && (
                      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-red-400 font-bold text-center max-w-2xl mx-auto flex flex-col items-center gap-4">
                         <AlertCircle className="w-10 h-10" />
                         <p className="text-xl">{isRtl ? 'لقد تجاوزت حصة الاستخدام المجانية لـ Gemini.' : 'You exceeded your current Gemini usage quota.'}</p>
                         <p className="text-sm opacity-70">{isRtl ? 'يرجى الانتظار دقيقة والمحاولة مرة أخرى أو استخدام الخيار اليدوي.' : 'Please wait a minute and try again or use the manual configuration.'}</p>
                         <button onClick={() => triggerSmartPlans(salary, true)} className="mt-4 px-8 py-3 bg-red-500 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-red-400 transition-all">
                            <RefreshCw className="w-4 h-4" /> {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                         </button>
                      </div>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {isLoadingPlans ? [1,2,3].map(i => <div key={i} className="h-[35rem] bg-white/5 rounded-[3.5rem] animate-pulse" />) : budgetPlans.map(plan => (
                      <div key={plan.id} className="group glass p-10 rounded-[3.5rem] border border-white/10 hover:border-emerald-500/50 transition-all flex flex-col h-[40rem] shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                            <Zap className="w-10 h-10 text-emerald-500" />
                         </div>
                         <h3 className="text-2xl font-black mb-3 text-white group-hover:text-emerald-400 transition-colors">{plan.title}</h3>
                         <p className="text-sm text-gray-400 mb-8 leading-relaxed line-clamp-2 h-10">{plan.description}</p>
                         
                         <div className="flex-1 space-y-4 mb-8 overflow-y-auto custom-scrollbar pe-4 -me-4">
                            {plan.buckets.map((b) => (
                               <div key={b.id} className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                     <span className="flex items-center gap-2">{b.icon} {b.name}</span>
                                     <span>{b.percent}%</span>
                                  </div>
                                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${b.percent}%` }} />
                                  </div>
                               </div>
                            ))}
                         </div>
                         
                         <button 
                           onClick={() => applyPlan(plan)} 
                           className="w-full py-5 bg-white text-black font-black rounded-[2rem] hover:bg-emerald-400 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs shadow-xl active:scale-95"
                         >
                            {t.apply}
                         </button>
                      </div>
                   ))}
                 </div>
                 
                 <div className="flex flex-col items-center gap-8 py-8">
                    {!isLoadingPlans && !apiErrorType && (
                      <button 
                        onClick={() => triggerSmartPlans(salary, true)} 
                        className="text-emerald-500 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-emerald-400 transition-colors bg-white/5 px-8 py-3 rounded-full border border-white/10"
                      >
                        <RefreshCw className="w-4 h-4" /> {t.regenerate}
                      </button>
                    )}
                    <button 
                      onClick={() => { setBuckets(FALLBACK_BUCKETS); setOnboardingComplete(true); }} 
                      className="text-gray-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors underline decoration-dotted underline-offset-8"
                    >
                      {t.manualPlan}
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#020202] text-gray-100 flex flex-col lg:flex-row overflow-hidden font-inter">
      {isDeficit && <div className="fixed top-0 left-0 right-0 z-[1000] bg-red-600 text-white py-3 px-6 flex items-center justify-center gap-4 animate-bounce"><ShieldAlert className="w-6 h-6" /><span className="font-black text-sm uppercase tracking-widest">{t.spendingExceeded}</span></div>}

      {showPlansOverlay && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
          <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-6">
               <h2 className="text-3xl font-black">{t.plansTitle}</h2>
               {salaryFeedback && !apiErrorType && <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-emerald-400 font-bold text-center"><Sparkles className="inline-block w-5 h-5 mb-1 me-2" /> {salaryFeedback}</div>}
               {apiErrorType === "QUOTA_EXCEEDED" && (
                 <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-red-400 font-bold text-center flex flex-col items-center gap-4">
                    <AlertCircle className="w-10 h-10" />
                    <p className="text-xl">{isRtl ? 'لقد تجاوزت حصة الاستخدام المجانية لـ Gemini.' : 'You exceeded your current Gemini usage quota.'}</p>
                    <button onClick={() => triggerSmartPlans(salary, false)} className="mt-4 px-8 py-3 bg-red-500 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-red-400 transition-all">
                       <RefreshCw className="w-4 h-4" /> {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                 </div>
               )}
            </div>
            {isLoadingPlans ? (
               <div className="h-[35rem] bg-white/5 rounded-[3rem] animate-pulse flex items-center justify-center"><BrainCircuit className="w-16 h-16 text-emerald-500 animate-pulse" /></div>
            ) : budgetPlans.length > 0 && (
              <div className="glass p-10 rounded-[3rem] border border-white/10 flex flex-col h-[38rem] shadow-2xl mx-auto max-w-lg">
                 <h3 className="text-2xl font-black mb-4 text-emerald-400">{budgetPlans[0].title}</h3>
                 <p className="text-sm text-gray-400 mb-8 leading-relaxed h-12 overflow-hidden">{budgetPlans[0].description}</p>
                 <div className="flex-1 space-y-5 mb-8 overflow-y-auto custom-scrollbar pe-3">
                    {budgetPlans[0].buckets.map((b) => (
                       <div key={b.id} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500"><span>{b.icon} {b.name}</span><span>{b.percent}%</span></div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${b.percent}%` }} /></div>
                       </div>
                    ))}
                 </div>
                 <button onClick={() => applyPlan(budgetPlans[0])} className="w-full py-6 bg-white text-black font-black rounded-3xl hover:bg-emerald-400 transition-all uppercase tracking-widest text-sm">{t.apply}</button>
              </div>
            )}
            <div className="flex justify-center gap-6">
              {!isLoadingPlans && !apiErrorType && (
                <button onClick={() => triggerSmartPlans(salary, false)} className="text-emerald-500 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-emerald-400"><RefreshCw className="w-4 h-4" /> {t.regenerate}</button>
              )}
              <button onClick={() => { setShowPlansOverlay(false); setApiErrorType(null); }} className="text-gray-500 font-black uppercase tracking-widest text-xs hover:text-white transition-all">{t.dismiss}</button>
            </div>
          </div>
        </div>
      )}

      {showPostTxModal && (
        <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
           <div className="glass w-full max-w-md rounded-[3rem] p-10 border-emerald-500/30 animate-in slide-in-from-bottom-20 duration-500 shadow-2xl">
              <div className="flex items-center gap-5 mb-8"><div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center"><Sparkles className="text-black w-7 h-7" /></div><div><h3 className="text-2xl font-black tracking-tight">{t.postTxTitle}</h3><p className="text-xs text-gray-500 font-black uppercase tracking-widest">AI ANALYSIS</p></div></div>
              <div className="space-y-4 mb-10 overflow-y-auto max-h-[400px] pe-2 custom-scrollbar">
                 {postTxSuggestions.map((s, i) => (
                    <button key={i} onClick={() => applyAISuggestion(s)} className="w-full p-6 rounded-3xl bg-white/[0.04] border border-white/10 text-left hover:bg-emerald-500/20 hover:border-emerald-500 transition-all flex items-center justify-between group">
                       <div className={isRtl ? 'text-right flex-1' : 'flex-1'}><p className="text-gray-100 font-medium">{s.text}</p></div>
                       <ChevronRight className={`w-5 h-5 text-gray-600 group-hover:text-emerald-500 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                 ))}
              </div>
              <button onClick={() => setShowPostTxModal(false)} className="w-full py-5 bg-white/5 text-gray-400 font-black rounded-3xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs">{t.dismiss}</button>
           </div>
        </div>
      )}

      <aside className="w-full lg:w-28 bg-black/40 border-r border-white/5 flex lg:flex-col items-center py-6 lg:py-12 space-x-6 lg:space-x-0 lg:space-y-12 z-50">
        <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl emerald-glow cursor-pointer" onClick={() => setOnboardingComplete(false)}><TrendingUp className="text-white w-7 h-7" /></div>
        <nav className="flex-1 flex lg:flex-col items-center gap-8">
          <button className="p-4 text-emerald-400 bg-emerald-500/10 rounded-3xl border border-emerald-500/20"><LayoutDashboard className="w-7 h-7" /></button>
          <button onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} className="p-4 text-gray-600 hover:text-white hover:bg-white/5 rounded-3xl transition-all"><PlusCircle className="w-7 h-7" /></button>
          <button onClick={() => setIsNewBucketModalOpen(true)} className="p-4 text-gray-600 hover:text-white hover:bg-white/5 rounded-3xl transition-all"><FolderPlus className="w-7 h-7" /></button>
          <button onClick={() => triggerSmartPlans(salary, false)} className="p-4 text-gray-600 hover:text-emerald-500 hover:bg-white/5 rounded-3xl transition-all" title={t.regenerate}><Wand2 className="w-7 h-7" /></button>
        </nav>
        <button onClick={() => setOnboardingComplete(false)} className="p-4 text-gray-600 hover:text-red-500 transition-colors"><LogOut className="w-7 h-7" /></button>
      </aside>

      <main className={`flex-1 h-screen overflow-y-auto relative p-6 lg:p-12 custom-scrollbar transition-all duration-500 ${isDeficit ? 'pt-24' : ''}`}>
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-16">
          <div><h2 className="text-5xl font-black tracking-tighter mb-2">Rafiqe<span className="text-emerald-500">.</span></h2><div className="flex items-center gap-4"><span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">{t[profile.persona as keyof typeof t] || profile.persona}</span><span className="text-gray-600 text-sm font-bold opacity-80 uppercase tracking-widest">AI ACTIVE</span></div></div>
          <div className="flex flex-wrap items-center gap-4">
             <select value={currency.code} onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])} className="bg-white/5 border border-white/10 text-white text-xs font-black rounded-2xl p-4 appearance-none uppercase hover:bg-white/10 transition-all">{CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.code} ({c.symbol})</option>)}</select>
             <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} className="p-4 bg-white/5 rounded-2xl border border-white/10 text-gray-500 hover:text-white transition-all"><Globe className="w-6 h-6" /></button>
             <button onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} className="px-8 py-4 bg-white text-black font-black text-sm rounded-3xl hover:bg-emerald-400 transition-all flex items-center gap-3 shadow-2xl uppercase tracking-widest"><PlusCircle className="w-6 h-6" /> {t.newEntry}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-16">
           <GlassCard className={`xl:col-span-3 flex flex-col md:flex-row items-center gap-12 border-emerald-500/5 ${isDeficit ? 'border-red-500/50 bg-red-500/[0.04]' : ''}`}>
              <div className="w-72 h-72 shrink-0 relative flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={85} outerRadius={110} paddingAngle={5} dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}</Pie><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '20px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }} /></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">{t.spent}</p><p className={`text-3xl font-black ${isDeficit ? 'text-red-500' : 'text-white'}`}>{currency.symbol}{totalSpent.toLocaleString()}</p></div></div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-10 w-full py-4">
                 <div className="space-y-2 relative"><p className="text-xs font-black text-gray-600 uppercase tracking-widest">{t.income}</p><div className="flex items-center gap-3"><p className="text-4xl font-black text-white">{currency.symbol}{salary.toLocaleString()}</p><button onClick={() => setIsSalaryModalOpen(true)} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all group"><Edit3 className="w-4 h-4 text-emerald-400" /></button></div></div>
                 <div className="space-y-2"><p className="text-xs font-black text-gray-600 uppercase tracking-widest">{t.remaining}</p><p className={`text-4xl font-black ${netRemaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{currency.symbol}{Math.abs(netRemaining).toLocaleString()}</p></div>
                 <div className="sm:col-span-2 mt-4"><div className="flex justify-between items-center mb-3"><span className="text-[11px] text-gray-600 font-black uppercase tracking-widest">{isRtl ? 'نبض الدخل' : 'INCOME PULSE'}</span><span className={`text-[11px] font-black ${isDeficit ? 'text-red-500' : 'text-emerald-400'}`}>{((totalSpent/salary)*100).toFixed(1)}%</span></div><div className="w-full bg-white/5 h-3 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${isDeficit ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (totalSpent/salary)*100)}%` }}></div></div></div>
              </div>
           </GlassCard>
           <GlassCard className="flex flex-col border-emerald-500/10">
              <div className="flex items-center gap-3 mb-8"><Sparkles className="w-6 h-6 text-emerald-400" /><h3 className="text-xs font-black text-white uppercase tracking-widest">{t.aiAdvisor}</h3></div>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-3">
                 {isLoadingAdvice ? <div className="flex items-center justify-center h-full"><BrainCircuit className="w-8 h-8 text-emerald-500 animate-pulse" /></div> : advice.map((a, i) => (
                    <div key={i} className="p-5 rounded-[1.5rem] bg-white/[0.04] border border-white/5 text-[11px] leading-relaxed text-gray-300 hover:bg-emerald-500/10 transition-all cursor-default">{a}</div>
                 ))}
              </div>
           </GlassCard>
        </div>

        {/* Goal Visualizer Section */}
        <div className="mb-16">
          <GlassCard className="border-emerald-500/5 overflow-hidden flex flex-col md:flex-row gap-8 items-stretch min-h-[400px]">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl"><ImageIcon className="w-6 h-6 text-emerald-400" /></div>
                <div>
                  <h3 className="text-2xl font-black">{isRtl ? 'تصور أحلامك' : 'Visualize Your Dreams'}</h3>
                  <p className="text-xs text-gray-500 font-black uppercase tracking-widest">{isRtl ? 'أدخل هدفك المالي وسيقوم الذكاء الاصطناعي برسمه لك' : 'Describe a financial goal and AI will render it'}</p>
                </div>
              </div>
              
              <div className="relative group">
                <input 
                  type="text" 
                  value={goalPrompt} 
                  onChange={e => setGoalPrompt(e.target.value)}
                  placeholder={isRtl ? 'مثلاً: منزلي المستقبلي المطل على البحر...' : 'e.g. My future beach house...'}
                  className="w-full bg-black/40 border border-white/10 rounded-3xl py-6 px-8 text-lg focus:ring-1 focus:ring-emerald-500 outline-none transition-all pr-32"
                />
                <button 
                  onClick={handleGenerateGoal}
                  disabled={!goalPrompt || isGeneratingImage}
                  className="absolute right-3 top-3 bottom-3 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 text-black font-black rounded-2xl transition-all flex items-center gap-2 group active:scale-95"
                >
                  {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  {isRtl ? 'رسم' : 'Render'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{isRtl ? 'لماذا نتصور أهدافنا؟' : 'Why visualize?'}</p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {isRtl ? 'رؤية هدفك بوضوح تزيد من التزامك المالي وتجعل الادخار تجربة ممتعة.' : 'Seeing your goal clearly increases financial discipline and turns saving into a rewarding experience.'}
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-emerald-500/[0.03] border border-emerald-500/10 space-y-2">
                  <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">{isRtl ? 'نصيحة ذكية' : 'Smart Tip'}</p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {isRtl ? 'استخدم كلمات مثل "عصري"، "بسيط"، "فاخر" للحصول على نتائج أفضل.' : 'Use descriptors like "modern", "minimalist", or "luxury" for better renders.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 relative rounded-[2.5rem] bg-black/50 border border-white/5 overflow-hidden group min-h-[300px]">
              {goalImage ? (
                <>
                  <img src={goalImage} alt="Financial Goal" className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <p className="text-white font-black uppercase tracking-widest text-sm">{goalPrompt}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-600">
                  <ImageIcon className={`w-16 h-16 opacity-10 ${isGeneratingImage ? 'animate-pulse text-emerald-500' : ''}`} />
                  <p className="text-xs font-black uppercase tracking-widest opacity-30">
                    {isGeneratingImage ? (isRtl ? 'يتم التوليد...' : 'Generating dream...') : (isRtl ? 'لا توجد صورة بعد' : 'Waiting for a dream...')}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
           <div className="xl:col-span-2 space-y-8">
              <h3 className="text-2xl font-black tracking-tight">{t.buckets}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {bucketsWithSpending.map(bucket => {
                    const isOver = bucket.spent > bucket.allocated;
                    return (
                       <div key={bucket.id} className={`group relative p-8 rounded-[2.5rem] border transition-all duration-500 ${isOver ? 'bg-red-500/[0.12] border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'bg-white/[0.03] border-white/10 hover:border-emerald-500/40'}`}>
                          <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-5">
                              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-4xl">{bucket.icon}</div>
                              <div>
                                <h4 className="font-black text-xl mb-0.5">{bucket.name}</h4>
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t.editAllocation}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setEditingBudgetBucket(bucket)} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all"><Settings2 className="w-5 h-5" /></button>
                              <button onClick={() => setBucketToDelete(bucket)} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 mb-5"><div><p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">{t.spent}</p><p className={`text-xl font-black ${isOver ? 'text-red-500' : 'text-white'}`}>{currency.symbol}{bucket.spent.toLocaleString()}</p></div><div className="text-right"><p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">المخصص</p><p className="text-xl font-black text-gray-500">{currency.symbol}{bucket.allocated.toLocaleString()}</p></div></div>
                          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} style={{ width: `${Math.min(100, (bucket.spent/bucket.allocated)*100 || 0)}%` }} /></div>
                       </div>
                    )
                 })}
              </div>
           </div>
           <div className="space-y-8">
              <div className="flex items-center justify-between"><h3 className="text-2xl font-black tracking-tight">{t.ledger}</h3><button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${showFilters ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}><Filter className="w-4 h-4" /></button></div>
              <GlassCard className="!p-0 min-h-[600px] border-white/5 flex flex-col overflow-hidden shadow-2xl">
                 <div className={`p-6 border-b border-white/5 bg-white/[0.01]`}>
                    <div className="space-y-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" /><input type="text" placeholder={isRtl ? 'ابحث...' : 'Search...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all" /></div></div>
                 </div>
                 <div className="divide-y divide-white/5 overflow-y-auto max-h-[700px] flex-1 custom-scrollbar">
                    {filteredTransactions.map(tx => {
                       const b = buckets.find(b => b.id === tx.bucketId);
                       return (
                          <div key={tx.id} className="group p-6 flex items-center justify-between hover:bg-white/[0.04] transition-colors"><div className="flex items-center gap-5"><div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl">{b?.icon || '💰'}</div><div><p className="font-bold text-[15px] mb-0.5">{tx.description}</p><p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{b?.name}</p></div></div><div className="flex items-center gap-4"><p className="font-black text-lg">{currency.symbol}{tx.amount.toLocaleString()}</p><button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl text-gray-600 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button></div></div>
                       )
                    })}
                 </div>
              </GlassCard>
           </div>
        </div>

        {isTransactionModalOpen && <TransactionModal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} buckets={bucketsWithSpending} currency={currency} onSave={saveTransaction} editingTransaction={editingTransaction} />}
        {editingBudgetBucket && <EditBudgetModal isOpen={!!editingBudgetBucket} onClose={() => setEditingBudgetBucket(null)} bucket={editingBudgetBucket} currency={currency} totalAllocated={totalAllocated} salary={salary} onUpdate={(id, val) => setBuckets(prev => prev.map(b => b.id === id ? { ...b, allocated: val } : b))} />}
        {bucketToDelete && <DeleteBucketModal isOpen={!!bucketToDelete} onClose={() => setBucketToDelete(null)} bucket={bucketToDelete} onConfirm={handleDeleteBucket} t={t} isRtl={isRtl} />}
        {isSalaryModalOpen && <SalaryModal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} salary={salary} currency={currency} onSave={handleSalarySave} t={t} />}
        {isNewBucketModalOpen && <NewBucketModal isOpen={isNewBucketModalOpen} onClose={() => setIsNewBucketModalOpen(false)} onAdd={(n, i) => setBuckets([...buckets, { id: Math.random().toString(36).substr(2, 9), name: n, icon: i, allocated: 0, spent: 0, recommendedPercent: 0, color: '#333' }])} t={t} />}
      </main>
    </div>
  );
};

const DeleteBucketModal: React.FC<{ isOpen: boolean; onClose: () => void; bucket: Bucket; onConfirm: (id: string) => void; t: any; isRtl: boolean }> = ({ onClose, bucket, onConfirm, t, isRtl }) => {
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
       <div className="glass w-full max-w-sm rounded-[3rem] p-10 border-red-500/20 shadow-2xl animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-black mb-4 text-center">{isRtl ? 'حذف الخزنة؟' : 'Delete Bucket?'}</h3>
          <p className="text-gray-400 text-sm text-center mb-10 leading-relaxed">
            {isRtl ? `هل أنت متأكد من حذف "${bucket.name}"؟ سيتم فقدان المخصصات المالية المرتبطة بها.` : `Are you sure you want to delete "${bucket.name}"? You will lose the associated financial allocation.`}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => onConfirm(bucket.id)} className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-[2rem] transition-all shadow-xl uppercase tracking-widest text-xs">{isRtl ? 'نعم، احذف' : 'Yes, Delete'}</button>
            <button onClick={onClose} className="w-full py-5 bg-white/5 text-gray-500 hover:text-white font-black rounded-[2rem] transition-all uppercase tracking-widest text-xs">{t.back}</button>
          </div>
       </div>
    </div>
  );
};

const SalaryModal: React.FC<{ isOpen: boolean; onClose: () => void; salary: number; currency: Currency; onSave: (val: number) => void; t: any }> = ({ isOpen, onClose, salary, currency, onSave, t }) => {
  const [val, setVal] = useState(salary.toString());
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
       <div className="glass w-full max-w-sm rounded-[3rem] p-10 border-emerald-500/20 shadow-2xl animate-in zoom-in duration-300">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Wallet className="w-7 h-7 text-emerald-500" /> {t.editSalary}</h3>
          <div className="space-y-2 mb-8"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t.incomePrompt} ({currency.symbol})</label><input type="number" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl py-5 px-6 text-2xl font-black text-emerald-400 focus:outline-none" /></div>
          <button onClick={() => { onSave(parseFloat(val) || 0); onClose(); }} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2rem] transition-all shadow-xl uppercase tracking-widest text-xs">{t.saveChanges}</button>
          <button onClick={onClose} className="w-full py-2 text-gray-500 mt-4 hover:text-white transition-colors uppercase tracking-widest text-[10px]">{t.back}</button>
       </div>
    </div>
  )
}

const NewBucketModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (name: string, icon: string) => void; t: any }> = ({ isOpen, onClose, onAdd, t }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
       <div className="glass w-full max-w-sm rounded-[3rem] p-10 border-emerald-500/20 shadow-2xl">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><FolderPlus className="w-7 h-7 text-emerald-500" /> {t.addNewBucket}</h3>
          <div className="space-y-4">
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t.bucketName}</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none" placeholder="..." /></div>
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t.bucketIcon}</label><input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none" /></div>
             <button onClick={() => { if (name) onAdd(name, icon); onClose(); }} className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] transition-all shadow-xl uppercase tracking-widest text-xs">{t.apply}</button>
             <button onClick={onClose} className="w-full py-2 text-gray-500 mt-4 hover:text-white transition-colors uppercase tracking-widest text-[10px]">{t.back}</button>
          </div>
       </div>
    </div>
  )
}

const TransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; buckets: Bucket[]; currency: Currency; onSave: (transaction: Omit<Transaction, 'id'>, id?: string) => void; editingTransaction?: Transaction | null; }> = ({ isOpen, onClose, buckets, currency, onSave, editingTransaction }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [bucketId, setBucketId] = useState(buckets[0]?.id || '');
  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
       <div className="glass w-full max-w-md rounded-[3rem] p-10 border-emerald-500/20 shadow-2xl">
          <h3 className="text-3xl font-black mb-8">معاملة جديدة</h3>
          <div className="space-y-6">
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">المبلغ ({currency.symbol})</label><input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl py-5 px-6 text-3xl font-black text-emerald-400 outline-none" placeholder="0.00" /></div>
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">التصنيف</label><div className="relative"><select value={bucketId} onChange={e => setBucketId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-sm appearance-none font-bold cursor-pointer">{buckets.map(b => <option key={b.id} value={b.id} className="bg-neutral-900">{b.icon} {b.name}</option>)}</select></div></div>
             <div className="space-y-2"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">الوصف</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none" placeholder="..." /></div>
             <button onClick={() => { if (!amount) return; onSave({ amount: parseFloat(amount), description, bucketId, date: new Date().toISOString() }); onClose(); }} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2rem] transition-all shadow-2xl uppercase tracking-widest text-xs">تأكيد العملية</button>
             <button onClick={onClose} className="w-full py-2 text-gray-500 hover:text-white transition-colors uppercase tracking-widest text-[10px]">إلغاء</button>
          </div>
       </div>
    </div>
  )
}

const EditBudgetModal: React.FC<{ isOpen: boolean; onClose: () => void; bucket: Bucket | null; currency: Currency; totalAllocated: number; salary: number; onUpdate: (id: string, newAllocated: number) => void; }> = ({ isOpen, onClose, bucket, currency, totalAllocated, salary, onUpdate }) => {
  const [val, setVal] = useState(bucket?.allocated.toString() || '0');
  const numericVal = parseFloat(val) || 0;
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
       <div className="glass w-full max-w-sm rounded-[3rem] p-10 border-blue-500/20 shadow-2xl animate-in zoom-in duration-300">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Settings2 className="w-7 h-7 text-blue-500" /> تعديل الميزانية</h3>
          <div className="space-y-2 mb-8">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">المبلغ المخصص ({currency.symbol})</label>
            <input type="number" value={val} onChange={e => setVal(e.target.value)} className={`w-full bg-black/40 border border-white/10 rounded-3xl py-5 px-6 text-2xl font-black text-blue-400 focus:outline-none`} />
          </div>
          <button onClick={() => { onUpdate(bucket!.id, numericVal); onClose(); }} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] transition-all shadow-xl uppercase tracking-widest text-xs">حفظ التغييرات</button>
          <button onClick={onClose} className="w-full py-2 text-gray-500 mt-4 hover:text-white transition-colors uppercase tracking-widest text-[10px]">إلغاء</button>
       </div>
    </div>
  )
}

export default App;
