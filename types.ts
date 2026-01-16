
export type UserPersona = 'Solo' | 'Family Head' | 'Living with Family';
export type MaritalStatus = 'Single' | 'Married' | 'With Family';
export type FamilyStructure = 'Mother and Father' | 'Father only' | 'Mother only' | null;

export interface UserProfile {
  persona: UserPersona | null;
  status: MaritalStatus | null;
  childrenCount: number;
  priorities: string;
  age: number;
  familyStructure: FamilyStructure;
}

export interface Bucket {
  id: string;
  name: string;
  allocated: number; 
  spent: number; 
  recommendedPercent: number;
  icon: string;
  color: string;
}

export interface DynamicBucketConfig {
  id: string;
  name: string;
  icon: string;
  percent: number;
}

export interface BudgetPlan {
  id: string;
  title: string;
  description: string;
  buckets: DynamicBucketConfig[];
}

export interface AIPlanResponse {
  plans: BudgetPlan[];
  feedback: string;
}

export interface Transaction {
  id: string;
  bucketId: string;
  amount: number;
  date: string;
  description: string;
}

export interface AISuggestionAction {
  type: 'REALLOCATE' | 'ADJUST_TARGET';
  fromId?: string;
  toId?: string;
  amount?: number;
  newTarget?: number;
  targetBucketId?: string;
}

export interface AISuggestion {
  text: string;
  action?: AISuggestionAction;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'SYP', symbol: 'ل.س', name: 'Syrian Pound' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CNY', symbol: '元', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export const FALLBACK_BUCKETS: Bucket[] = [
  { id: 'health', name: 'الصحة', allocated: 0, spent: 0, recommendedPercent: 15, icon: '🏥', color: '#10b981' },
  { id: 'household', name: 'المنزل', allocated: 0, spent: 0, recommendedPercent: 25, icon: '🏠', color: '#ec4899' },
  { id: 'groceries', name: 'البقالة', allocated: 0, spent: 0, recommendedPercent: 20, icon: '🛒', color: '#f59e0b' },
  { id: 'savings', name: 'الادخار', allocated: 0, spent: 0, recommendedPercent: 20, icon: '💰', color: '#8b5cf6' },
  { id: 'investment', name: 'الاستثمار', allocated: 0, spent: 0, recommendedPercent: 10, icon: '📈', color: '#3b82f6' },
  { id: 'entertainment', name: 'الترفيه', allocated: 0, spent: 0, recommendedPercent: 10, icon: '🎭', color: '#ef4444' },
];

export const TRANSLATIONS = {
  ar: {
    appTitle: "رفيقي",
    subtitle: "إدارة ثرواتك بدقة الذكاء الاصطناعي",
    tutorialTitle: "مرحباً بك في عالم المال الذكي",
    tutorialSlide1: "مدرب مالي ذكي يعمل بـ Gemini يحلل كل قراراتك.",
    tutorialSlide2: "ميزانية مبنية على 'هويتك' (Persona) - مخصصة لحالتك الاجتماعية وأهدافك.",
    tutorialSlide3: "نظام نبض حي يحذرك فوراً من أي عجز مالي محتمل.",
    getStarted: "ابدأ الرحلة",
    skip: "تخطي",
    personaPrompt: "من أنت؟",
    statusPrompt: "الحالة الاجتماعية",
    childrenPrompt: "كم عدد أطفالك؟",
    prioritiesPrompt: "ما هي أولوياتك المالية؟ (مثال: شراء سيارة، السفر، مدرسة الأطفال، سداد ديون)",
    incomePrompt: "الدخل الشهري الصافي",
    agePrompt: "كم عمرك؟",
    familyStructurePrompt: "مع من تعيش من والديك؟",
    structureBoth: "الأب والأم معاً",
    structureFather: "الأب فقط",
    structureMother: "الأم فقط",
    startBtn: "حلل وضعي المالي",
    income: "الدخل",
    spent: "المصروف",
    remaining: "المتبقي",
    buckets: "خزائن الأموال",
    ledger: "سجل العمليات",
    aiAdvisor: "المستشار الذكي",
    newEntry: "عملية جديدة",
    editAllocation: "تعديل التخصيص",
    plansTitle: "خطط الميزانية المقترحة لك",
    plansSubtitle: "قام الذكاء الاصطناعي بتصميم هذه الخزائن خصيصاً لتناسب نمط حياتك وأولوياتك:",
    manualPlan: "تخصيص يدوي",
    postTxTitle: "خطوات ذكية مقترحة",
    apply: "تطبيق",
    dismiss: "تجاهل",
    safe: "آمن",
    danger: "خطر",
    Solo: "فردي",
    "Family Head": "رب أسرة",
    "Living with Family": "أعيش مع العائلة",
    Single: "أعزب",
    Married: "متزوج",
    "With Family": "مع العائلة",
    next: "التالي",
    back: "رجوع",
    currency: "العملة",
    editSalary: "تعديل الراتب",
    overBudgetWarning: "تحذير: المخصصات تتجاوز الراتب!",
    spendingExceeded: "تنبيه: لقد تجاوزت الراتب الإجمالي!",
    bucketExceeded: "تجاوزت الحد لهذه الخزنة!",
    saveChanges: "حفظ التغييرات",
    addNewBucket: "إضافة خزنة جديدة",
    bucketName: "اسم الخزنة",
    bucketIcon: "أيقونة الخزنة",
    regenerate: "تحديث الخطط ذكياً",
    feedbackTitle: "تحليل الذكاء الاصطناعي لراتبك"
  },
  en: {
    appTitle: "Rafiqe",
    subtitle: "Elevate your wealth management with precision AI.",
    tutorialTitle: "Welcome to Smart Finance",
    tutorialSlide1: "AI Financial Coach powered by Gemini that analyzes every decision.",
    tutorialSlide2: "Persona-based budgeting tailored to your social status and goals.",
    tutorialSlide3: "Live Pulse Guardrails that warn you instantly of potential deficits.",
    getStarted: "Get Started",
    skip: "Skip",
    personaPrompt: "Select Your Profile",
    statusPrompt: "Marital Status",
    childrenPrompt: "How many children do you have?",
    prioritiesPrompt: "Financial Priorities (e.g., Buy a car, Travel, Schooling, Debt)",
    incomePrompt: "Monthly Net Earnings",
    agePrompt: "What is your age?",
    familyStructurePrompt: "Who do you live with?",
    structureBoth: "Mother and Father",
    structureFather: "Father only",
    structureMother: "Mother only",
    startBtn: "Analyze My Finances",
    income: "Income",
    spent: "Spent",
    remaining: "Remaining",
    buckets: "Financial Buckets",
    ledger: "Ledger",
    aiAdvisor: "AI Strategist",
    newEntry: "New Entry",
    editAllocation: "Adjust Allocation",
    plansTitle: "Tailored Budget Plans",
    plansSubtitle: "AI has designed these specific buckets to match your persona and priorities:",
    manualPlan: "Manual Configuration",
    postTxTitle: "Smart Next-Step Suggestions",
    apply: "Apply",
    dismiss: "Dismiss",
    safe: "Safe",
    danger: "Danger",
    Solo: "Solo",
    "Family Head": "Family Head",
    "Living with Family": "Living with Family",
    Single: "Single",
    Married: "Married",
    "With Family": "With Family",
    next: "Next",
    back: "Back",
    currency: "Currency",
    editSalary: "Edit Salary",
    overBudgetWarning: "Warning: Allocations exceed salary!",
    spendingExceeded: "Alert: Spending has exceeded your total income!",
    bucketExceeded: "Category limit exceeded!",
    saveChanges: "Save Changes",
    addNewBucket: "Add New Bucket",
    bucketName: "Bucket Name",
    bucketIcon: "Bucket Icon",
    regenerate: "Regenerate Plans",
    feedbackTitle: "AI Salary Analysis"
  }
};
