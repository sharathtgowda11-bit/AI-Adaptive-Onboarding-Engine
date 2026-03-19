import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, BarChart3, GitBranch, Brain, Clock,
  CheckCircle, AlertTriangle, Target, Layers, ChevronDown,
  Cpu, HardHat, Rocket, Timer
} from 'lucide-react';
import UploadZone from './components/UploadZone';
import SkillGraph from './components/SkillGraph';
import SkillRadarChart from './components/RadarChart';
import LearningTimeline from './components/LearningTimeline';
import ReasoningTrace from './components/ReasoningTrace';
import { runFullAnalysis } from './lib/gapAnalyzer';
import { AnalysisResult, LearningModule, ResumeSkill, JDSkill, DemoPersona } from './lib/types';
import {
  DEMO_RESUME_TECH, DEMO_JD_TECH,
  DEMO_RESUME_OPS, DEMO_JD_OPS,
  DEMO_RESUME_HEALTHCARE, DEMO_JD_HEALTHCARE,
  DEMO_RESUME_TEXT_TECH, DEMO_JD_TEXT_TECH,
  DEMO_RESUME_TEXT_OPS, DEMO_JD_TEXT_OPS,
  DEMO_RESUME_TEXT_HEALTHCARE, DEMO_JD_TEXT_HEALTHCARE,
  DEMO_PERSONAS, personaToAnalysisResult,
} from './lib/demoData';

type Page = 'landing' | 'processing' | 'dashboard';
type DemoMode = 'tech' | 'ops' | 'healthcare';

// Simple text-based skill extraction (simulates what the LLM would do)
function extractSkillsFromText(text: string, allSkills: string[]): ResumeSkill[] {
  const lower = text.toLowerCase();
  const found: ResumeSkill[] = [];
  for (const skill of allSkills) {
    if (lower.includes(skill.toLowerCase())) {
      // Estimate proficiency based on keyword frequency and context
      const count = (lower.match(new RegExp(skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const hasYears = lower.includes(`${skill.toLowerCase()}`) && /\d+\+?\s*(years?|yrs?)/.test(lower);
      const hasCert = lower.includes('certif') && lower.includes(skill.toLowerCase());
      let proficiency = Math.min(0.3 + count * 0.15 + (hasYears ? 0.25 : 0) + (hasCert ? 0.2 : 0), 0.95);
      proficiency = Math.round(proficiency * 100) / 100;

      found.push({
        skill,
        proficiency,
        evidence: `Found ${count} mention(s) in resume${hasYears ? ' with years of experience noted' : ''}${hasCert ? ' with relevant certification' : ''}`
      });
    }
  }
  return found;
}

function extractJDSkillsFromText(text: string, allSkills: string[]): JDSkill[] {
  const lower = text.toLowerCase();
  const found: JDSkill[] = [];
  const totalSkillsInDoc = allSkills.filter(s => lower.includes(s.toLowerCase())).length;

  for (const skill of allSkills) {
    if (lower.includes(skill.toLowerCase())) {
      const isRequired = lower.includes('required') || lower.includes('must have') || lower.includes('essential');
      const isExpert = lower.includes('expert') || lower.includes('strong') || lower.includes('advanced');
      const isNice = lower.includes('nice to have') || lower.includes('preferred');

      let requiredLevel = 0.6 + Math.random() * 0.3;
      let importance = 0.5 + (1 - found.length / Math.max(totalSkillsInDoc, 1)) * 0.5;

      if (isExpert) requiredLevel = Math.min(requiredLevel + 0.15, 0.95);
      if (isRequired) importance = Math.min(importance + 0.1, 1.0);
      if (isNice) { importance *= 0.7; requiredLevel *= 0.85; }

      found.push({
        skill,
        required_level: Math.round(requiredLevel * 100) / 100,
        importance: Math.round(importance * 100) / 100,
      });
    }
  }
  return found.sort((a, b) => b.importance - a.importance);
}

const ALL_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++',
  'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js',
  'GraphQL', 'REST APIs', 'FastAPI', 'Django', 'Pydantic',
  'Docker', 'Kubernetes', 'Linux', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform', 'Git',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps',
  'TensorFlow', 'PyTorch', 'Data Science', 'Data Analysis',
  'SQL', 'Databases', 'MongoDB', 'Redis', 'PostgreSQL',
  'Data Structures', 'System Design', 'Algorithms',
  'Linear Algebra', 'Statistics', 'Networking Basics',
  'Spark', 'Kafka', 'Airflow',
  'Communication', 'Leadership', 'Project Management', 'Agile', 'Problem Solving', 'Team Management',
  'Safety Compliance', 'OSHA Standards', 'Forklift Operation', 'Inventory Management',
  'Quality Control', 'Supply Chain Basics', 'Warehouse Management', 'Logistics',
  'Lean Manufacturing', 'Equipment Maintenance', 'Process Optimization',
  'ERP Systems', 'Hazardous Materials Handling', 'First Aid',
  'Excel', 'Power BI', 'Tableau', 'Cybersecurity',
];

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// Circular progress ring
function ProgressRing({ percentage, size = 160, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const animatedPct = useAnimatedCounter(percentage);

  const color = percentage >= 70 ? '#10B981' : percentage >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="transparent" stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="transparent" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-[Syne]" style={{ color }}>{animatedPct}%</span>
        <span className="text-xs text-text-muted">Match Score</span>
      </div>
    </div>
  );
}

// Stats card
function StatCard({ icon: Icon, label, value, color, subtitle }: { icon: any; label: string; value: number | string; color: string; subtitle?: string }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const animated = useAnimatedCounter(isNaN(numericValue) ? 0 : Math.round(numericValue));

  // Check if we need decimal display (for weeks)
  const isDecimal = typeof value === 'string' && value.includes('.');
  const displayValue = isDecimal ? value : (typeof value === 'string' && value.includes('h') ? `${animated}h` : animated);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl p-4 flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold font-[Syne]" style={{ color }}>
          {displayValue}
        </p>
        <p className="text-xs text-text-muted">{label}</p>
        {subtitle && <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// Processing step animation
function ProcessingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Extracting Skills from Resume', icon: Sparkles },
    { label: 'Analyzing Job Requirements', icon: Target },
    { label: 'Building Prerequisite Graph', icon: GitBranch },
    { label: 'Computing Skill Gaps', icon: BarChart3 },
    { label: 'Generating Learning Pathway', icon: Rocket },
  ];

  useEffect(() => {
    const timers = steps.map((_, idx) =>
      setTimeout(() => setStep(idx + 1), (idx + 1) * 600)
    );
    const final = setTimeout(onComplete, steps.length * 600 + 500);
    return () => { timers.forEach(clearTimeout); clearTimeout(final); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-deep-space flex items-center justify-center z-50">
      <div className="particles-bg" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-strong rounded-3xl p-10 max-w-md w-full mx-4"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-electric-cyan-dim flex items-center justify-center"
          >
            <Cpu className="w-8 h-8 text-electric-cyan" />
          </motion.div>
          <h2 className="text-xl font-bold font-[Syne] gradient-text">Analyzing Your Profile</h2>
          <p className="text-sm text-text-muted mt-1">Running adaptive pathing algorithm...</p>
        </div>

        <div className="space-y-3">
          {steps.map((s, idx) => {
            const StepIcon = s.icon;
            const isComplete = step > idx;
            const isActive = step === idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'glass shimmer' : isComplete ? 'bg-emerald-dim/30' : 'opacity-40'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-emerald/20' : isActive ? 'bg-electric-cyan-dim' : 'bg-glass-bg'
                  }`}>
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-emerald" />
                  ) : (
                    <StepIcon className={`w-4 h-4 ${isActive ? 'text-electric-cyan' : 'text-text-muted'}`} />
                  )}
                </div>
                <span className={`text-sm ${isComplete ? 'text-emerald' : isActive ? 'text-electric-cyan' : 'text-text-muted'}`}>
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// Persona demo card component
function PersonaCard({ persona, onClick }: { persona: DemoPersona; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative glass-strong rounded-2xl p-5 text-left transition-all hover:shadow-lg group flex-1 min-w-[200px]"
      style={{ borderColor: `${persona.accentColor}30`, boxShadow: `0 0 20px ${persona.accentColor}10` }}
    >
      {persona.badge && (
        <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald/20 text-emerald border border-emerald/30">
          {persona.badge}
        </span>
      )}
      <div className="text-3xl mb-2">{persona.icon}</div>
      <h3 className="text-sm font-bold font-[Syne] text-text-primary">{persona.name}</h3>
      <p className="text-[11px] font-semibold mt-0.5" style={{ color: persona.accentColor }}>{persona.label}</p>
      <p className="text-[10px] text-text-muted mt-1.5">{persona.tag}</p>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted group-hover:text-text-secondary transition-colors">
        <ArrowRight className="w-3 h-3" style={{ color: persona.accentColor }} />
        <span>Click to load demo</span>
      </div>
    </motion.button>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [demoMode, setDemoMode] = useState<DemoMode>('tech');
  const [showReasoning, setShowReasoning] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'graph' | 'reasoning'>('graph');
  const [activePersona, setActivePersona] = useState<DemoPersona | null>(null);

  const handleAnalyze = useCallback((resumeSkills?: ResumeSkill[], jdSkills?: JDSkill[]) => {
    const rs = resumeSkills || extractSkillsFromText(resumeText, ALL_SKILLS);
    const jd = jdSkills || extractJDSkillsFromText(jdText, ALL_SKILLS);

    if (rs.length === 0 || jd.length === 0) return;

    setPage('processing');
    setActivePersona(null);

    setTimeout(() => {
      const analysisResult = runFullAnalysis(rs, jd);
      setResult(analysisResult);
    }, 200);
  }, [resumeText, jdText]);

  const handleProcessingComplete = useCallback(() => {
    setPage('dashboard');
  }, []);

  const loadDemo = useCallback((mode: DemoMode) => {
    setDemoMode(mode);
    setActivePersona(null);
    if (mode === 'tech') {
      setResumeText(DEMO_RESUME_TEXT_TECH);
      setJdText(DEMO_JD_TEXT_TECH);
      handleAnalyze(DEMO_RESUME_TECH, DEMO_JD_TECH);
    } else if (mode === 'ops') {
      setResumeText(DEMO_RESUME_TEXT_OPS);
      setJdText(DEMO_JD_TEXT_OPS);
      handleAnalyze(DEMO_RESUME_OPS, DEMO_JD_OPS);
    } else if (mode === 'healthcare') {
      setResumeText(DEMO_RESUME_TEXT_HEALTHCARE);
      setJdText(DEMO_JD_TEXT_HEALTHCARE);
      handleAnalyze(DEMO_RESUME_HEALTHCARE, DEMO_JD_HEALTHCARE);
    }
  }, [handleAnalyze]);

  // Load pre-computed persona instantly — zero API calls
  const loadPersona = useCallback((persona: DemoPersona) => {
    setActivePersona(persona);
    const analysisResult = personaToAnalysisResult(persona);
    setResult(analysisResult);
    setSelectedModule(null);
    setPage('dashboard');
  }, []);

  const switchDomain = useCallback((mode: DemoMode) => {
    setDemoMode(mode);
    setSelectedModule(null);
    setActivePersona(null);
    if (mode === 'tech') {
      setResult(runFullAnalysis(DEMO_RESUME_TECH, DEMO_JD_TECH));
    } else if (mode === 'ops') {
      setResult(runFullAnalysis(DEMO_RESUME_OPS, DEMO_JD_OPS));
    } else {
      setResult(runFullAnalysis(DEMO_RESUME_HEALTHCARE, DEMO_JD_HEALTHCARE));
    }
  }, []);

  const canAnalyze = resumeText.length > 30 && jdText.length > 30;

  return (
    <div className="min-h-screen bg-deep-space">
      <AnimatePresence mode="wait">
        {/* ===== LANDING PAGE ===== */}
        {page === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen relative"
          >
            <div className="particles-bg" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-glass-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-electric-cyan-dim flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-electric-cyan" />
                </div>
                <div>
                  <h1 className="text-sm font-bold font-[Syne] text-electric-cyan">SkillBridge</h1>
                  <p className="text-[10px] text-text-muted tracking-wider uppercase">AI Adaptive Onboarding</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadDemo('tech')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass hover:bg-glass-hover text-text-secondary transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-electric-cyan" />
                  Tech Demo
                </button>
                <button
                  onClick={() => loadDemo('ops')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass hover:bg-glass-hover text-text-secondary transition-colors"
                >
                  <HardHat className="w-3.5 h-3.5 text-amber" />
                  Ops Demo
                </button>
                <button
                  onClick={() => loadDemo('healthcare')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass hover:bg-glass-hover text-text-secondary transition-colors"
                >
                  <span className="text-emerald">🏥</span>
                  Healthcare Demo
                </button>
              </div>
            </header>

            {/* Hero */}
            <div className="relative z-10 flex flex-col items-center pt-16 pb-8 px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center max-w-3xl"
              >
                <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-electric-cyan" />
                  <span className="text-xs text-text-secondary">Powered by Graph-Based Adaptive Pathing</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold font-[Syne] leading-tight mb-2">
                  <span className="gradient-text">SkillBridge</span>
                </h1>
                <p className="text-lg md:text-xl text-text-secondary font-[Syne] font-medium mb-6">
                  Resume in. Role-ready out. Zero guesswork.
                </p>

                <p className="text-base text-text-secondary max-w-xl mx-auto mb-10">
                  Upload your resume and a job description. Our adaptive algorithm identifies skill gaps,
                  maps prerequisites, and generates a prioritized learning roadmap — with full reasoning transparency.
                </p>
              </motion.div>

              {/* ===== IBM Proof-Point Banner (UPGRADE 5) ===== */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="w-full max-w-4xl mb-6"
              >
                <div className="glass rounded-xl p-4 flex items-start gap-3 text-left" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20 whitespace-nowrap font-semibold">📊 IBM Case Study</span>
                  <p className="text-xs text-text-muted leading-relaxed">
                    IBM reduced employee ramp-up time by <span className="text-text-secondary font-semibold">50%</span> using AI-personalized onboarding. SkillBridge makes this open-source and available to everyone.
                  </p>
                </div>
              </motion.div>

              {/* Upload zones */}
              <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4 mb-8">
                <UploadZone
                  label="Your Resume"
                  description="Paste text or drag & drop a file"
                  icon="resume"
                  accentColor="cyan"
                  onTextChange={setResumeText}
                />
                <UploadZone
                  label="Job Description"
                  description="Paste text or drag & drop a file"
                  icon="job"
                  accentColor="purple"
                  onTextChange={setJdText}
                />
              </div>

              {/* Analyze button */}
              <motion.button
                onClick={() => handleAnalyze()}
                disabled={!canAnalyze}
                whileHover={canAnalyze ? { scale: 1.03 } : {}}
                whileTap={canAnalyze ? { scale: 0.98 } : {}}
                className={`group flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold font-[Syne] text-sm transition-all ${canAnalyze
                  ? 'bg-gradient-to-r from-electric-cyan to-purple-accent text-white shadow-lg shadow-electric-cyan/20 hover:shadow-electric-cyan/30'
                  : 'bg-deep-space-lighter text-text-muted cursor-not-allowed border border-glass-border'
                  }`}
              >
                {canAnalyze ? (
                  <>
                    Analyze & Generate Pathway
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    Paste Resume & JD to Begin
                    <Layers className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {/* ===== THREE-WAY PERSONA SWITCHER (UPGRADE 2) ===== */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="w-full max-w-4xl mt-12"
              >
                <div className="text-center mb-5">
                  <h2 className="text-lg font-bold font-[Syne] text-text-primary">Try a Demo</h2>
                  <p className="text-xs text-text-muted mt-1">Click any persona to see SkillBridge in action — instant results, zero API calls</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {DEMO_PERSONAS.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      onClick={() => loadPersona(persona)}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3 justify-center mt-10">
                {[
                  { icon: GitBranch, text: 'Prerequisite Graph', color: '#7C3AED' },
                  { icon: Brain, text: 'Reasoning Trace', color: '#00D4FF' },
                  { icon: Target, text: 'Zero Hallucination', color: '#10B981' },
                  { icon: BarChart3, text: 'Gap Scoring', color: '#F59E0B' },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs text-text-muted"
                  >
                    <f.icon className="w-3 h-3" style={{ color: f.color }} />
                    {f.text}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== PROCESSING SCREEN ===== */}
        {page === 'processing' && (
          <ProcessingScreen key="processing" onComplete={handleProcessingComplete} />
        )}

        {/* ===== DASHBOARD ===== */}
        {page === 'dashboard' && result && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            {/* Dashboard Header */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-glass-border bg-deep-space/80 backdrop-blur-xl sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setPage('landing'); setResult(null); setSelectedModule(null); setActivePersona(null); }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-electric-cyan-dim flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-electric-cyan" />
                  </div>
                  <span className="text-sm font-bold font-[Syne] text-electric-cyan hidden sm:inline">SkillBridge</span>
                </button>
                <span className="text-text-muted text-xs">|</span>
                <span className="text-xs text-text-secondary">Your SkillBridge Roadmap</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Demo Mode badge */}
                {activePersona && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                    style={{
                      backgroundColor: `${activePersona.accentColor}15`,
                      borderColor: `${activePersona.accentColor}40`,
                      color: activePersona.accentColor,
                    }}
                  >
                    <span>{activePersona.icon}</span>
                    Demo Mode — {activePersona.name}
                  </motion.div>
                )}

                {/* Domain toggle (only show if not in persona mode) */}
                {!activePersona && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted hidden sm:inline">Cross-Domain:</span>
                    <div className="flex glass rounded-lg overflow-hidden">
                      <button
                        onClick={() => switchDomain('tech')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${demoMode === 'tech' ? 'bg-electric-cyan/15 text-electric-cyan' : 'text-text-muted hover:text-text-secondary'
                          }`}
                      >
                        <Cpu className="w-3 h-3" /> Tech Role
                      </button>
                      <button
                        onClick={() => switchDomain('ops')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${demoMode === 'ops' ? 'bg-amber/15 text-amber' : 'text-text-muted hover:text-text-secondary'
                          }`}
                      >
                        <HardHat className="w-3 h-3" /> Ops Role
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <div className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto space-y-6">
              {/* ===== SECTION A: Skill Match Overview ===== */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Left: Match ring + Stats */}
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-bold font-[Syne] text-text-primary mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-electric-cyan" />
                    Skill Match Overview
                  </h2>
                  <div className="flex items-center gap-8">
                    <ProgressRing percentage={result.match_percentage} />
                    <div className="flex-1 grid grid-cols-1 gap-3">
                      <StatCard icon={CheckCircle} label="Skills Matched" value={result.skills_matched} color="#10B981" />
                      <StatCard icon={AlertTriangle} label="Gaps Found" value={result.gaps_found} color="#EF4444" />
                      <StatCard icon={Clock} label="Learning Time" value={`${result.total_learning_hours}h`} color="#00D4FF" />
                      {/* ===== TIME SAVED STAT CARD (UPGRADE 3) ===== */}
                      <StatCard
                        icon={Timer}
                        label="Est. Time Saved"
                        value={`${result.time_saved_weeks ?? 0} weeks`}
                        color="#10B981"
                        subtitle="vs standard onboarding"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Radar Chart */}
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-bold font-[Syne] text-text-primary mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-accent" />
                    Skills Radar
                  </h2>
                  <div className="h-72">
                    <SkillRadarChart result={result} />
                  </div>
                </div>
              </motion.div>

              {/* ===== SECTION B & C: Graph + Timeline ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Tab switcher for mobile */}
                <div className="lg:hidden col-span-1 flex glass rounded-xl overflow-hidden">
                  <button
                    onClick={() => setDashboardTab('graph')}
                    className={`flex-1 py-2 text-xs text-center ${dashboardTab === 'graph' ? 'bg-electric-cyan/15 text-electric-cyan' : 'text-text-muted'}`}
                  >
                    Skill Graph
                  </button>
                  <button
                    onClick={() => setDashboardTab('reasoning')}
                    className={`flex-1 py-2 text-xs text-center ${dashboardTab === 'reasoning' ? 'bg-purple-accent/15 text-purple-accent' : 'text-text-muted'}`}
                  >
                    Reasoning
                  </button>
                </div>

                {/* Skill Graph (60%) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`lg:col-span-3 glass rounded-2xl p-4 ${dashboardTab !== 'graph' ? 'hidden lg:block' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold font-[Syne] text-text-primary flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-electric-cyan" />
                      Skill Dependency Graph
                    </h2>
                    {selectedModule && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-lg px-3 py-1.5 text-xs"
                      >
                        <span className="text-text-muted">Selected: </span>
                        <span className="text-electric-cyan font-semibold">{selectedModule.skill}</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="h-[500px] rounded-xl overflow-hidden">
                    <SkillGraph
                      result={result}
                      onNodeClick={setSelectedModule}
                    />
                  </div>
                </motion.div>

                {/* Learning Timeline (40%) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-2 glass rounded-2xl p-4"
                >
                  <h2 className="text-lg font-bold font-[Syne] text-text-primary mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-accent" />
                    Learning Pathway
                    <span className="ml-auto text-xs text-text-muted font-normal">
                      {result.learning_path.length} modules
                    </span>
                  </h2>
                  <LearningTimeline
                    modules={result.learning_path}
                    onModuleClick={setSelectedModule}
                    selectedSkill={selectedModule?.skill || null}
                  />
                </motion.div>
              </div>

              {/* ===== SECTION D: Reasoning Trace ===== */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`glass rounded-2xl overflow-hidden ${dashboardTab !== 'reasoning' && dashboardTab !== 'graph' ? '' : ''}`}
              >
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full flex items-center justify-between p-5 hover:bg-glass-hover transition-colors"
                >
                  <h2 className="text-lg font-bold font-[Syne] text-text-primary flex items-center gap-2">
                    <Brain className="w-5 h-5 text-electric-cyan" />
                    Full Reasoning Trace
                    <span className="text-xs font-normal text-text-muted ml-2">
                      — Why each skill was recommended
                    </span>
                  </h2>
                  <motion.div animate={{ rotate: showReasoning ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5 text-text-muted" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showReasoning && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-2">
                        <ReasoningTrace modules={result.learning_path} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Selected module detail panel */}
              <AnimatePresence>
                {selectedModule && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="glass-strong rounded-2xl p-6 glow-cyan"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold font-[Syne] text-text-primary flex items-center gap-2">
                          {selectedModule.skill}
                          {selectedModule.is_prerequisite && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              PREREQUISITE
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">{selectedModule.course.title}</p>
                      </div>
                      <button
                        onClick={() => setSelectedModule(null)}
                        className="text-text-muted hover:text-text-primary text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass rounded-xl p-4">
                        <p className="text-[11px] text-red-accent font-semibold uppercase mb-1">Gap Analysis</p>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-text-muted mb-1">
                              <span>Current: {Math.round(selectedModule.gap_data.current_level * 100)}%</span>
                              <span>Required: {Math.round(selectedModule.gap_data.required_level * 100)}%</span>
                            </div>
                            <div className="h-2 bg-deep-space rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-electric-cyan rounded-full"
                                style={{ width: `${selectedModule.gap_data.current_level * 100}%` }}
                              />
                              <div
                                className="h-full bg-red-accent/50 rounded-r-full"
                                style={{ width: `${selectedModule.gap_data.gap * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="glass rounded-xl p-4">
                        <p className="text-[11px] text-amber font-semibold uppercase mb-1">Priority</p>
                        <p className="text-lg font-bold text-text-primary font-[Syne]">
                          #{selectedModule.gap_data.rank || selectedModule.order}
                        </p>
                        <p className="text-xs text-text-muted">
                          Score: {selectedModule.gap_data.priority_score.toFixed(2)}
                        </p>
                      </div>

                      <div className="glass rounded-xl p-4">
                        <p className="text-[11px] text-electric-cyan font-semibold uppercase mb-1">Duration</p>
                        <p className="text-lg font-bold text-text-primary font-[Syne]">
                          {selectedModule.course.duration_hours}h
                        </p>
                        <p className="text-xs text-text-muted">{selectedModule.course.platform}</p>
                      </div>

                      <div className="glass rounded-xl p-4">
                        <p className="text-[11px] text-emerald font-semibold uppercase mb-1">Unlocks</p>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {selectedModule.reasoning.unlock_note}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <a
                        href={selectedModule.course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-electric-cyan to-purple-accent text-white text-sm font-semibold hover:shadow-lg hover:shadow-electric-cyan/20 transition-shadow"
                      >
                        Start Learning <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="text-center py-6 border-t border-glass-border">
                <p className="text-xs text-text-muted">
                  SkillBridge — ARTPARK CodeForge Hackathon •
                  Graph-based Adaptive Pathing • Zero Hallucination Course Grounding •
                  Full Reasoning Transparency
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
