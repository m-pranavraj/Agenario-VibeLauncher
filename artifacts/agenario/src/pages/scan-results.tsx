import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  ArrowLeft,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Eye,
  Layers,
  Bot,
  Activity,
  Loader2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  CreditCard,
  Upload,
  Lock,
  Search,
  TrendingUp,
  TrendingDown,
  Scale,
  Database,
  Cpu,
  Fingerprint,
  ShieldCheck,
  FileText,
  ArrowRight,
  BarChart3,
  DollarSign,
  Target,
  ChevronRight,
  Play,
  Camera,
  Minus,
  Globe,
  GitBranch,
  Award,
  Dna,
  Users,
  Share2,
  Sparkles,
  ListChecks,
  ExternalLink,
  Wifi,
  Package,
  Cloud,
  RefreshCw,
  Network,
  Brain,
  Terminal,
  GitMerge,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  ShieldAlert,
  Star,
  Flame,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  api,
  type ScanDetail,
  type ScanIssue,
  type ComplianceResult,
  type RiskForecast,
  type RevenueIntelligence,
  type ProofEvidence,
  type RegressionDiff,
  type BenchmarkData,
  type LaunchDNA,
  type ShadowApiFindings,
  type LaunchReplayStep,
  type DigitalTwinResult,
  type PredictiveIntelResult,
  type RootCauseResult,
} from "@/lib/api";
import { motion } from "framer-motion";

// Theme-agnostic severity styles - work on both light and dark backgrounds.
// The app uses JS-conditional `isLight ? "..." : "..."` everywhere, NOT Tailwind
// dark: prefix (incompatible with this Tailwind v4 + next-themes class setup).
const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-500",
    bg: "bg-red-500/[0.08] border-red-400/25",
    badge: "bg-red-500/15 text-red-600",
    dot: "bg-red-500",
  },
  high: {
    color: "text-amber-500",
    bg: "bg-amber-500/[0.07] border-amber-400/22",
    badge: "bg-amber-500/15 text-amber-700",
    dot: "bg-amber-500",
  },
  medium: {
    color: "text-yellow-600",
    bg: "bg-yellow-500/[0.06] border-yellow-400/20",
    badge: "bg-yellow-500/15 text-yellow-700",
    dot: "bg-yellow-500",
  },
  low: {
    color: "text-gray-400",
    bg: "bg-gray-400/[0.05] border-gray-300/25",
    badge: "bg-gray-100 text-gray-500",
    dot: "bg-gray-400",
  },
};

function getConfidenceStyle(c: number): {
  label: string;
  color: string;
  badge: string;
  icon: string;
} {
  if (c >= 99)
    return {
      label: `${c}% - Browser Runtime Proof`,
      color: "text-green-400",
      badge: "bg-green-500/15 text-green-400 border border-green-500/25",
      icon: "🟢",
    };
  if (c >= 90)
    return {
      label: `${c}% - HTTP Runtime Proof`,
      color: "text-green-400",
      badge: "bg-green-500/10 text-green-400 border border-green-500/20",
      icon: "🔵",
    };
  if (c >= 75)
    return {
      label: `${c}% - Static Code Evidence`,
      color: "text-sky-400",
      badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
      icon: "🔵",
    };
  if (c >= 60)
    return {
      label: `${c}% - Pattern Match`,
      color: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      icon: "🟡",
    };
  return {
    label: `${c}% - AI Reasoning`,
    color: "text-white/35",
    badge: "bg-white/[0.05] text-white/35 border border-white/[0.08]",
    icon: "⚪",
  };
}

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "Security & Access Control": Lock,
  "Compliance & Regulatory": Scale,
  "Revenue & Business Logic": CreditCard,
  "Performance & Scalability": Zap,
  "User Experience & Conversion": Eye,
  "Reliability & Error Handling": Activity,
  "Data Integrity & Architecture": Database,
  "Observability & Launch Readiness": Fingerprint,
  "AI Code Quality": Bot,
  "Founder Blind Spots": Cpu,
  "IDOR & Access Control Agent": Lock,
  "Auth & Session Agent": Shield,
  "Payments & Billing Agent": CreditCard,
  "Input & Validation Agent": Search,
  "File & Upload Agent": Upload,
  "UX Flow Agent": Eye,
  "Performance Agent": Zap,
  "Reliability & Observability Agent": Activity,
  "Cleanup & Architecture Agent": Layers,
  "AI Smell Agent": Bot,
  "Mobile & PWA Audit": Smartphone,
  "i18n & Accessibility Deep Scan": Globe,
  "Supply Chain Security": Package,
  "Cloud Cost Efficiency": Cloud,
  "Competitive Gap Analysis": Target,
  "Business Logic Attack Lab": ShieldAlert,
};

const VERDICT_CONFIG = {
  ready: {
    label: "Ready to Launch",
    sublabel: "Strong production readiness across all dimensions",
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "border-green-500/15 bg-green-500/[0.04]",
    scoreColor: "text-green-400",
  },
  caution: {
    label: "Launch with Caution",
    sublabel: "Address critical and high-severity items before going live",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "border-amber-500/15 bg-amber-500/[0.04]",
    scoreColor: "text-amber-400",
  },
  "do-not-launch": {
    label: "Do Not Launch",
    sublabel:
      "Critical issues pose serious security, compliance, or revenue risk",
    icon: XCircle,
    color: "text-red-400",
    bg: "border-red-500/15 bg-red-500/[0.04]",
    scoreColor: "text-red-400",
  },
  needs_work: {
    label: "Needs Work",
    sublabel: "Several issues require attention before production deployment",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "border-amber-500/15 bg-amber-500/[0.04]",
    scoreColor: "text-amber-400",
  },
};

const COMPLIANCE_COLORS: Record<string, string> = {
  GDPR: "text-blue-400",
  "OWASP Top 10": "text-red-400",
  "PCI-DSS": "text-green-400",
  HIPAA: "text-purple-400",
  "SOC 2": "text-amber-400",
  "WCAG 2.1": "text-cyan-400",
  CCPA: "text-orange-400",
  "ISO 27001": "text-violet-400",
};

function ScoreRing({ score }: { score: number }) {
  const isLight = useIsLight();
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#f59e0b" : "#f87171";
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="-rotate-90"
        >
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-['Syne']" style={{ color }}>
            {score}
          </span>
          <span
            className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}
          >
            /100
          </span>
        </div>
      </div>
    </div>
  );
}

function ComplianceRing({ score, status }: { score: number; status: string }) {
  const color =
    status === "pass"
      ? "#4ade80"
      : status === "partial"
        ? "#f59e0b"
        : "#f87171";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: 50, height: 50 }}>
      <svg width="50" height="50" viewBox="0 0 50 50" className="-rotate-90">
        <circle
          cx="25"
          cy="25"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <circle
          cx="25"
          cy="25"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold font-['Syne']" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function EvidenceCard({
  issue,
  rank,
  scanId,
  isCreator,
}: {
  issue: ScanIssue;
  rank?: number;
  scanId?: number;
  isCreator?: boolean;
}) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fixCode, setFixCode] = useState("");
  const [generatingFix, setGeneratingFix] = useState(false);
  const [fixCopied, setFixCopied] = useState(false);
  const [fixError, setFixError] = useState("");
  const cfg =
    SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ??
    SEVERITY_CONFIG.low;
  const conf = getConfidenceStyle(issue.confidence ?? 60);

  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFix = async () => {
    const clean = fixCode.replace(/```\w*\n?/g, "").replace(/```/g, "");
    await navigator.clipboard.writeText(clean);
    setFixCopied(true);
    setTimeout(() => setFixCopied(false), 2000);
  };

  const handleGenerateFix = async () => {
    if (!scanId) return;
    setGeneratingFix(true);
    setFixError("");
    try {
      const result = await api.scans.generateFix(scanId, {
        title: issue.title,
        description: issue.description,
        fixPrompt: issue.fixPrompt,
        agentName: issue.agentName,
      });
      setFixCode(result.fix);
    } catch {
      setFixError("Could not generate fix. Please try again.");
    } finally {
      setGeneratingFix(false);
    }
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-4 text-left 
           
         
        
         
        
          
        
         
        
         
        ? (
          <ChevronUp
 
              ) : (
  
           
         
        )
         
        
           
          
            
          
           
           
           
                      
                    
                        
                      
                                     
                    
                       
                       
                         
                         
                             
                    
                       
                       
                      
                    (
                      
                        
                      
                    )
                 
                
                      
                    
                     
                    
                      
                    
                   
                  
                    
                  
                      
                    
                   
                  
                    
                  
           
           
               
                 
                
                  
                    
           
          
               
              
                
               ? (
                    
                    
                  )(
                  
                    
                    
                  
                )
             
            
              
            ( ? (
                        
                        
                      ) : (
                   
                        
                      
                    )
                        
                       
                       
                      (
                          
                            
                            
                          
                        )(
                          
                            
                            
                          
                        )
                        
                        
                        ()
   
   
   
   
       
           
         
        
         
        
          
        
             
            
              
            
           
          
               
              
                
               ? (
                    
                    
                   ) : (
              
                    
                    
                  
                )
             
            
              
            
             
            
              
            
           
          
             
            
              
            
             
             
            >      <button 
                {" "}
                 
           
          
            
          >  <button 
            
 
 
 
 
 ,

 
 
 
 
       
       
      
       
                  
        
     
         
                    
          
        
           
              
               
               
            
          
            
          
           
              
               
               
            
          
            
          
           
                      
            
          {" "}
           
 
 ,

 
 ;

     
            
      
       
                  
        
      
         
            
             
             
          
        
         
            
             
             
          
        
         
         
                    
          
        
          
        
          
        
          
        
         >
        
        
           
          
              
            
               
              
            
         
        
              
            
             
            
              
            (
              
                
                
              
            )(
              
                
                
              
            )
     
     
       
       
         
         
     
  :
       
   : 
               : 
     
    
         
       
         
        
          
        
          
        
           
           
           ,
         
           
           
           ,
         
           
           
           ,
         
           
           
          
               
              
            
               
              
               
              
                
              
         
        
           
          
            
          
           
          
            
          
         
           
            
          
           
          
            
          
         
        
           
          
            
          
               
               
              
                 
                
                  
                
            
          
           
          
            
          
     
    
         
       
         
        
          
        
         
        
          (){" "}
         
        
           
             
             
               
               
           
             
             
               
               
           
             
             
            
                 
                
                      
                    
                     
                    
                      
                    
                   
                  
                    (
                  
                   
                 
                )(
                  
                   
                 
                )
                 
                
                     
                     
                    
                       
                      
                        
                      
 ,

 ;

   
     
     
       
       
     
    
         
       
         
        
          
        
            
          
            
          
            
          
           
          
            
          
             
             
               
               
              
                   
                  
                    
                  
                   
                  
                    
                  
                   
                  
                    
                  >          
                  (
                    
                     
                   
                  )(
                    
                     
                   
                  )
                   
                  
                               
                      
                    
                       
                      
                                       
                          
                        
                         
                        
                          
                        
            
          
               
               
              
   
   
   
   ,
 
   
   
   
   ,
 
   
   
   
   ,
 
   
   
   
   ,
 
   
   
   
   ,
 
   
   
   
   ,
 
     
    
         
       
         
        
          
        
       
      
       
       
           
           
             
             
            
                 
                
                 
                
                  
                
                 
                (
                  
                   
                 
                )(
                  
                   
                 
                )
                 
                
                       
                     
                        
                      
                     
                    
                       
                      
                         
                        
                          
                   
                  
                       
                      
                        
                         
                         
                        
                           
                          
                            
                          
                     
                    
                       
                      
                        
                      
                       
                      
                        
                      
                        
                      
                       
                      
                        
                      
                       
                      
                         
                        
                          
                        
                         
                        
                          
                        
    ,
  
    ,
  
     
    
         
        
          
        
         
        
     
    
         
       
         
        
          
        
             
            
       
      
           
           (
             
            )(
              
            )(
              
            )
            
             
            
              {" "}
             
            
         
        
           
          
            
          
           
          
            
          
         
        
           
          
            
          
           
          
            
          
         
        
           
            
          
           
          
            
          
            
          
             
             
                 
                
                  
                
                 
                
                  
                
            
          
             
             
            
     
    
         
       
         
        
          
        
         
        
          
        
           
               
              
                
              
               
              
                 
                 
               
               
               
              
         
        
          
        
  
                 
""
 
 
 ,

    ,
  
     
    
       
      
             
            
              
            
             
            
           
          >    
            
             
            
              
            
           
          
              
            
           
          
                  
                    
                    
                      
                    
                    
                    
                      ,
                    
                   
                  
                   
                      
                       
                       
                         
                         
                    
                  
             
            
                 
                    
                  
                   
                   
                  
                       
                      
                       
                      
                        
                      
                         
                        
              
                 
                 
             
            
              
            
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
     ,
   
     
    
         
       
         >
        
        
         
        
          
        
           
                  
                
                     
                     
                   
                   
                   
                  
                    
                  
                   
                   
                  
                   
                
              
     
    
         
       
         
        
          
        
       
      
       
           
               
           
                ? ()?(
):(
         
          )
               
               
              
                 
                
                     
                       
                       
                         
                           
                   
                 
               
              
                   
                  
                    
                  
                   
                  
                   
                  
                    
                  
              
            
             
            
              
             
             
     
    
         
       
         
        
          
        
          
        
           
           
          
            
          
     
    
         
       
         
        
          
        
         
        
       
      
        
      
           
          
            
          
             
             
            
               
              
                 
                
                  
                
                 
                
                  
                
         
        
           
          
            
          
              
                
                 
                 
                
                  
                  
         
           
          
            
          
               
               
              
                
              
   
     
     
       
       
     
     
     ,
   
     
     
     ,
   (
          
        )(
          
        )
         
        
               
              
                
              
                   
                
              
   
   
   ,
 
   
   
   ,
 
   
   
   ,
 
 
 ,

 
 ;

    
  
     
     
     
    
       
      
           
            
          
           
          
            
          
           
          
            
          
           
          
            
           
          
                
               
               
               
                 
                 
                
                     
                   
                         
                        
                         
                        
                          
                         (
                         >                  
                          
                        )
                       
                      
                        
                      
                             
                            
                           
                          
                           
                          
                            
                          
                           
                          
                            
                          
                              
                            
                 
                
                  
                 
                
                 
                
   
   
     
     
       
       
   
   
     
     
 
 ,

 
 ;

    |
   
     
     
     
    
       
      
           
            
          
           
          
            
          
             
            
           
          
            
          
           
          
            
           
          
               
               
                 
                 
                   
                   
                  
                                       
                          
                        
                         
                          
                        
                         
                        
                          
                        
                          
                        
                         
                        
                          
                        
                       
                      
                        
                        {" "}
                       
                      
                     
                    (
                      
                       
                     
                    )(
                      
                       
                     
                    )
                         
                         
                        
                             
                            
                             
                            
                              
                            
                           
                          
                            
                          
                           
                          
                            
                          
                               
                              
                                
                              
                               
                              
                                
                              
                               
                              
                                
                              
                                
                              
                               
                              
                                
                              
                                
                              
                           
                          
                            
                          
                             
                            
                              
                            
                             
                            
                              
                             
                            >                <button 
                          
                 
                
                  
                  
                
                 
                
  
 

   
   
   ,
 
   
   
     
     
 ,

 ;

    ,
  
        
         ,
      
     
     
     
    
       
      
               
              
            
             
            
              
            
             
              
            
             
            
              
            
               
                     : 
                          :  
            
              
            
           
          
            
          
             
            
              
            (
              
            )(
              
            )
              
            
           
           
           ,
         
              
            
             
            
              
            
               
               
                 
                
                   
                   
           
          
            
          
             
                  :
                      :
                   
                  
                       
                      
                        
                      (
                        
                          
                        
                      )
                          
                        
                        
                      
                     
                    
                      
                    
                     
                    
           
          
            
          
               
               
              
                 
                
                  
                
                 
                
                  
                
 
 ,

 
 ;

    
  
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
    
       
      
         
        
          
        
            
          
       
      
           
           
           
             
               
               
                 
                 ,
         
           
           
           
             
               
               
                 
                 ,
         
           
           
           ,
         
           
           
          
              
            
             
            
              
            
       
      
            
             
             
             ,
             
             
             
             ,
             
             
             
             ,
             
        
            
                 
               
                     
                    
                      
                    
                     
                    
                      
                    
                     
                    
                      
                    (
                      
                       
                      
                        
                      
                    )
                      
                       
                       
                      
               
             
                   
                  
                    
                  
                   
                  
                   
                  
                    
                  
                       
                  
                
                 
                
                  
                
             
            
               
             
            
              
            
                 
               
                     
                    
                      
                    
                     
                    
                     
                    
                      
                    
                   
                  
                    
                  (
                    
                     
                    
                      
                    
                  )
       
      
          
        
 
 ,

 
 ;

       
       
      
           
           
           
           
           
         
           
           
           
           
           
           
         
            
          
           
          
            
          
     
     
     
    
       
      
         >
        
        
         
        
          
        
       
      
           
          
             
             
            
              
           
           
          
             
            
              
            
             
            
              
            
             
            (
                
              )(
                
              )(
                
              )
             
            
              
            
 
 ,

 
 ;

    
   
   
   
   
   ,
  
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
    
       
      
         >
        
        
         
        
          
        
       
      
          
        
            
               
             
                 
                
                  
                
                 
                  {" "}
                 (){" "}
                 
                
               
              (
                
                 
               
              )(
                
                 
               
              )()
                           
                          
                             
                            
                               
                             
                               
                              
                                
                              
                             
                            
                              
                            
                               
                              
                                
                              >            
                    
                   
                  
                    
                  
                 
                
                   
                  
                     
                    
                      
                    
                       
                      (
                          
                            
                            
                          
                        )(
                          
                            
                            
                          
                        )
                       
                       
                      
                        
                      
                   
                  
 ,

 ;

   
     
     
       
       
   
     
     
       
       
    ,
  
     
     
     
    
       
      
         >
        
        
         
        
       
      
           
           
           ,
         
           
           
           ,
         
           
           
           ,
         
           
           
          
              
            
             
            
              
            
         
        
           
          
            
          
                       
                  
                
                 
                
                 
                
                  
                
       
      
         >
        
        
         
        
           
          
            
          
               
               
              {" "}
               
           
           (
             
            )(
              
            )
 ,

 ;
(
        ,
      )
       
     
          
        
         >
        
          
        (
          
            
          
        )(
          
            
          
        )
     
   
     
   
   
   
   
   ;
 
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
     ,
   
     
     
     
     ,
   
      
     
     ,
    
          ,
        
     
     
     
    
       
      
         
       
         >
        
        
         
          
        
         (
            
              
              
            
          )(
            
              
              
            
          )
       
      
           
          
           
          
            
           (
           
              
            
          )
               
              
                
              
                 
                 
                
                           
                  (
                      
                       
                     
                    )>          <p 
                    
                     
                    
                      
                    
         
           
             
      
         
       
             >
           
          
                   
          
 
 ,

 
 ;

   
   
   ;
 
           
       
           
           
           
           
           
           
         
        
          
        
           
           
          
               
              
                
              
               
              
                
              {" "}
         
 ,

 ;

     
    
         
       
         
        
          
        
          
        
          
        >
        
         
        
          
        
         
           
          
            
          
           
          
            
          
         
           
          
            
          
           
          
            
          
            
          
            
          
            
          (
              
            )(
              
            )
            
                 
                    
                  
                       
                      
                        
                      
                       
                      
                        
                      
                         
                        
                          
                        
                          
                        
                         
                        
                          
                        
                          
                        
                         
                        
                          
                        
                         
                        
                          
                        
 ,

 ;

   
     
     
       
       
   
     
    
         
       
         
        
          
        
                 
        
           
           
           
           
          
             
             
             
             
             
             
           
             
             
             
             
             
             
             
           
              
            
             
            
              
            
           
          
            
          
                 
                 
                
             
               
               
                 
                 
             
               
               
                 
                 
               
               
              
                     
                     
                     
                     
                    
                       
                       
                       
                       
                       
                       
                     
                       
                       
                       
                       
                          
                           
                           
                             
                             
                        
                     
                        
                      
                   
                  
                    
                  
                   
                  
                    
                  (
                    
                     
                   
                  )(
                    
                     
                   
                  )
                   
                  
                       
                       
                      
                         
                        
                          
                        
     
    
         
       
         
        
          
        
         
        
          
        
           
         (
            
          )(
            
          )(
            
              
            
          )
                 >
             
            
              
            
     
    
           
             ,
         
               
               
               ,
             
             
             
             
             
            
               
               
               
               
               
             
               
               
               
               
               
               
                 
                 ,
               
               
              
                
              >  <h2 
            
             
            
                 
                 
                 ,
               
                       
                       
                       
                       
                 
                
                   
                       
                           
                         
                           
                
                   
                   
                   
                  
                     
                     
                     ,
                   
           
          
    
  
     
     
     
     
     
     
     
     
     
     
     
     
     
     

     
   
     
       
          
           
            
             
               
           
            
                
     
       
        
          
            
   ()
       
      
             
            
              
            
             
            
              
             
            (
                
                  
                  
                
              )(
                
              )
               ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
        data-testid={`issue-${issue.id}`}
      >
        {rank && (
          <span className={`w-5 h-5 rounded-full ${isLight ? "bg-gray-100" : "bg-white/[0.06]"} border ${isLight ? "border-gray-200" : "border-white/[0.1]"} flex items-center justify-center text-[10px] font-bold ${isLight ? "text-gray-500" : "text-white/40"} shrink-0`}
          >
            {rank}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
          {issue.severity}
        </span>
        {issue.owaspMapping && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/[0.08] text-red-400/70 border-red-500/15 shrink-0 hidden sm:block">
            {issue.owaspMapping.owaspId}
          </span>
        )}
        <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white/90"} flex-1 text-left`}>{issue.title}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:flex items-center gap-1 ${conf.badge}`}>
          {conf.icon} {issue.confidence ?? 60}%
        </span>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"} shrink-0 hidden lg:block truncate max-w-[120px]`}>
          {issue.agentName.replace(" Agent", "")}
        </span>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />
          : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />}
      </button>

      {expanded && (
        <div className={`px-4 pb-4 space-y-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3`}>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{issue.description}</p>

          {/* ── Evidence Graph Chain ──────────────────────────────── */}
          {(issue.filePath || issue.codeSnippet || issue.impactStatement || issue.evidence) && (
            <div className="space-y-2">
              {/* File + Line badge row */}
              {issue.filePath && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    <FileText className="w-3 h-3 text-amber-400/70 shrink-0" />
                    <code className="text-[11px] font-mono text-amber-300/80">{issue.filePath}</code>
                    {issue.lineNumber && (
                      <span className="ml-1 text-[10px] font-bold text-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 rounded">:{issue.lineNumber}</span>
                    )}
                  </div>
                  {issue.sourceEvidence && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      issue.sourceEvidence === "runtime"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : issue.sourceEvidence === "static"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : `bg-white/[0.05] text-white/35 ${isLight ? "border-gray-200" : "border-white/[0.08]"}`
                    }`}>
                      {issue.sourceEvidence === "runtime" ? "🟢 Runtime" : issue.sourceEvidence === "static" ? "🔵 Static" : "⚪ AI Reasoning"}
                    </span>
                  )}
                  {issue.retestResult && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      issue.retestResult === "fixed"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400/70 border-red-500/20"
                    }`}>
                      {issue.retestResult === "fixed" ? "✓ Fixed" : "⚠ Needs Fix"}
                    </span>
                  )}
                </div>
              )}

              {/* Code Snippet */}
              {issue.codeSnippet && (
                <div className="bg-black/50 border border-amber-500/15 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/[0.06] border-b border-amber-500/10">
                    <Terminal className="w-3 h-3 text-amber-400/50" />
                    <span className="text-[10px] text-amber-400/50 font-medium uppercase tracking-wide">Vulnerable Code</span>
                    {issue.lineNumber && <span className="text-[10px] text-amber-500/40 ml-auto">Line {issue.lineNumber}</span>}
                  </div>
                  <pre className="px-3 py-2.5 text-[11px] font-mono text-red-300/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {issue.codeSnippet}
                  </pre>
                </div>
              )}

              {/* Why It Triggered */}
              {issue.evidence && (
                <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-lg px-3 py-2.5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${conf.color}`}>Why It Triggered</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${conf.badge}`}>{conf.icon} {conf.label}</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} font-mono leading-relaxed`}>{issue.evidence}</p>
                </div>
              )}

              {/* Impact Statement */}
              {issue.impactStatement && (
                <div className="bg-red-500/[0.05] border border-red-500/15 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3 text-red-400/60" />
                    <span className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wide">Business Impact</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{issue.impactStatement}</p>
                </div>
              )}
            </div>
          )}

          {!issue.filePath && !issue.codeSnippet && !issue.impactStatement && !issue.evidence && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.badge}`}>{conf.icon} {conf.label}</span>
            </div>
          )}

          <div className={`bg-black/40 rounded-lg p-3 border ${isLight ? "border-gray-200" : "border-white/[0.07]"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-white/50"}`}>1-Click Fix Prompt</span>
              <button
                onClick={copy}
                data-testid={`button-copy-${issue.id}`}
                className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white transition-colors`}
              >
                {copied
                  ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied!</>
                  : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} font-mono leading-relaxed`}>{issue.fixPrompt}</p>
          </div>

          {/* ── AI Fix Generator ─────────────────── */}
          {scanId && (
            isCreator ? (
              <div className="space-y-2">
                {!fixCode ? (
                  <button
                    onClick={handleGenerateFix}
                    disabled={generatingFix}
                    className={`flex items-center gap-1.5 text-xs bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-50 ${isLight ? "text-violet-600" : "text-violet-300"} font-semibold px-3 py-2 rounded-lg transition-all border border-violet-500/30 w-full justify-center`}
                  >
                    {generatingFix
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating patch…</>
                      : <><Sparkles className="w-3.5 h-3.5" />⚡ Generate Code Fix</>}
                  </button>
                ) : (
                  <div className="bg-black/50 border border-violet-500/25 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/15">
                      <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />AI-Generated Code Fix
                      </span>
                      <button onClick={copyFix} className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white transition-colors`}>
                        {fixCopied ? <><CheckCheck className="w-3 h-3 text-green-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                      </button>
                    </div>
                    <pre className="text-xs text-green-300/90 font-mono p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-64">
                      {fixCode.replace(/```\w*\n?/g, "").replace(/```$/, "").trim()}
                    </pre>
                    <button
                      onClick={() => setFixCode("")}
                      className={`w-full text-center text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} hover:text-gray-500 py-1.5 border-t border-white/[0.05] transition-colors`}
                    >
                      Regenerate
                    </button>
                  </div>
                )}
                {fixError && <p className="text-xs text-red-400">{fixError}</p>}
              </div>
            ) : (
              <button
                onClick={() => window.location.href = "/pricing"}
                className="flex items-center gap-1.5 text-xs text-violet-400/50 border border-violet-500/20 px-3 py-2 rounded-lg w-full justify-center hover:bg-violet-500/5 transition-colors"
              >
                <Lock className="w-3 h-3" />⚡ Generate Code Fix - Creator Plan
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function LockedIssueCard({ issue, rank }: { issue: ScanIssue; rank?: number }) {
  const isLight = useIsLight();
  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
  const fileHint = issue.evidence?.startsWith("Found in:") ? issue.evidence : null;
  const fixPreview = issue.fixPrompt && !issue.fixPrompt.startsWith("🔒")
    ? issue.fixPrompt.slice(0, 60)
    : null;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!issue.promptUnlocked || !issue.fixPrompt) return;
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
      {/* Visible header - severity + title */}
      <div className="flex items-center gap-3 p-4">
        {rank && (
          <span className={`w-5 h-5 rounded-full ${isLight ? "bg-gray-100" : "bg-white/[0.06]"} border ${isLight ? "border-gray-200" : "border-white/[0.1]"} flex items-center justify-center text-[10px] font-bold ${isLight ? "text-gray-500" : "text-white/40"} shrink-0`}
          >
            {rank}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
          {issue.severity}
        </span>
        <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"} flex-1 text-left line-clamp-1`}>{issue.title}</span>
        <Lock className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
      </div>

      {/* File location hint - partial reveal */}
      {fileHint && (
        <div className="px-4 pb-2">
          <span className="text-[10px] font-mono text-amber-400/70 bg-amber-500/[0.06] border border-amber-500/15 px-2 py-0.5 rounded">
            {fileHint}
          </span>
        </div>
      )}

      {/* Partially unlocked (issues 4-5): fix prompt visible, description locked */}
      {issue.promptUnlocked ? (
        <div className="px-4 pb-4 space-y-2">
          {issue.description && (
            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed italic`}>{issue.description}</p>
          )}
          <div className={`bg-black/40 rounded-lg p-3 border ${isLight ? "border-gray-200" : "border-white/[0.07]"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-white/50"}`}>1-Click Fix Prompt</span>
              <button
                onClick={copy}
                className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white transition-colors`}
              >
                {copied
                  ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied!</>
                  : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} font-mono leading-relaxed`}>{issue.fixPrompt}</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>Full evidence + AI patch locked</span>
            <Link href="/pricing">
              <button className="flex items-center gap-1 text-[10px] bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 font-semibold px-2.5 py-1 rounded-lg transition-all border border-violet-500/25">
                Unlock full access <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      ) : fixPreview ? (
        /* Blurred fix prompt preview */
        <div className="px-4 pb-4">
          <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-lg px-3 py-2.5 relative overflow-hidden`}>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mb-1`}>1-Click Fix Prompt</div>
            <p className={`text-xs font-mono ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`} style={{ filter: "blur(3.5px)", userSelect: "none" }}>
              {fixPreview}…
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <Link href="/pricing"
          >
                <button className={`flex items-center gap-1.5 text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30`}>
                  <Lock className="w-3 h-3" /> Unlock Fix Prompt <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 flex items-center justify-between">
          <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>Upgrade to view full details and fix</span>
          <Link href="/pricing"
          >
            <button className={`flex items-center gap-1.5 text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30`}>
              Unlock <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

function CreatorGate({ plan, feature, preview, children, isLight }: {
  plan: string; feature: string; preview?: string; children: React.ReactNode; isLight: boolean;
}) {
  const isUnlocked = plan === "creator" || plan === "enterprise";
  if (isUnlocked) return <>{children}</>;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Content visible at top, gradient covers bottom half */}
      <div className="pointer-events-none select-none" style={{ userSelect: "none" }}>
        {children}
      </div>
      {/* Gradient starts transparent (top visible) and goes opaque */}
      <div className={isLight
        ? "absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white/97 rounded-2xl pointer-events-none"
        : "absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]/97 rounded-2xl pointer-events-none"} />
      {/* Lock UI at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-6 pt-10">
        <div className={isLight
          ? "w-10 h-10 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center"
          : "w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center"}>
          <Lock className="w-5 h-5 text-violet-500" />
        </div>
        <div className="text-center px-6 space-y-1">
          <p className={isLight ? "text-gray-900 font-bold text-sm font-['Syne']" : "text-white font-bold text-sm font-['Syne']"}>{feature}</p>
          <p className={isLight ? "text-gray-500 text-xs max-w-xs" : "text-white/40 text-xs max-w-xs"}>{preview ?? "Detailed analysis available on Creator plan"}</p>
        </div>
        <Link href="/pricing">
          <button className={isLight
            ? "flex items-center gap-2 bg-gray-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg"
            : "flex items-center gap-2 bg-white text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all shadow-lg"}>
            Upgrade to Creator - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

function UpgradeBanner({ count, isLight }: { count: number; isLight: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={isLight
        ? "bg-violet-50 border border-violet-200 rounded-2xl p-5 flex items-center gap-4"
        : "border border-violet-500/25 bg-gradient-to-r from-violet-500/[0.08] to-indigo-500/[0.05] rounded-2xl p-5 flex items-center gap-4"}
    >
      <div className={isLight
        ? "w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"
        : "w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0"}>
        <Lock className="w-5 h-5 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={isLight ? "text-sm font-bold text-gray-900" : "text-sm font-bold text-white"}>
          {count} more finding{count !== 1 ? "s" : ""} locked
        </div>
        <p className={isLight ? "text-xs text-gray-500 mt-0.5" : "text-xs text-white/40 mt-0.5"}>
          Upgrade to Creator to unlock all {count} remaining issues, 1-click fix prompts, and full exploit evidence.
        </p>
      </div>
      <Link href="/pricing" className="shrink-0">
        <button className={isLight
          ? "flex items-center gap-2 bg-gray-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-gray-800 transition-all"
          : "flex items-center gap-2 bg-white text-black font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/90 transition-all"}>
          Upgrade - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  );
}

function ExploitTerminalCard({ issue }: { issue: ScanIssue }) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-red-500/30 bg-[#0d0608] rounded-2xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border-b border-red-500/20">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="w-3 h-3 rounded-full bg-green-500 opacity-30" />
        <span className="text-[10px] text-red-400/70 font-mono ml-2 uppercase tracking-widest">Exploit Terminal · {issue.agentName}</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">
          {issue.severity}
        </span>
      </div>
      {/* Terminal body */}
      <div className="p-4 space-y-3 font-mono">
        <div className="text-green-400/80 text-xs">$ exploit_scanner --target app --mode {issue.severity}</div>
        <div className="text-red-300/90 text-xs font-semibold">[!] {issue.title}</div>
        <div className={`${isLight ? "text-gray-500" : "text-white/40"} text-xs leading-relaxed whitespace-pre-wrap`}
          >{issue.description}</div>
        {issue.evidence && (
          <div className={`bg-black/50 border ${isLight ? "border-gray-200" : "border-white/[0.06]"} rounded-lg p-3`}>
            <div className="text-[10px] text-amber-400/60 uppercase tracking-wide mb-1.5">Evidence</div>
            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"} font-mono leading-relaxed`}
          >{issue.evidence}</p>
          </div>
        )}
        <div className={`border-t ${isLight ? "border-gray-200" : "border-white/[0.06]"} pt-3 flex items-start gap-3`}>
          <div className="flex-1">
            <div className="text-[10px] text-green-400/50 uppercase tracking-wide mb-1.5">1-Click Fix Prompt</div>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} leading-relaxed`}>{issue.fixPrompt}</p>
          </div>
          <button
            onClick={copy}
            className={`shrink-0 flex items-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white px-2 py-1.5 rounded-lg border ${isLight ? "border-gray-200" : "border-white/[0.07]"} hover:border-white/20 transition-all`}
          >
            {copied ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskForecastSection({ forecast }: { forecast: RiskForecast }) {
  const isLight = useIsLight();
  const riskColor = (r: string) =>
    r === "critical" ? "text-red-400" : r === "high" ? "text-amber-400" : r === "medium" ? "text-yellow-400" : "text-green-400";
  const riskBg = (r: string) =>
    r === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" :
    r === "high" ? "bg-amber-500/10 border-amber-500/18 text-amber-400" :
    r === "medium" ? "bg-yellow-500/[0.07] border-yellow-500/15 text-yellow-400" :
    "bg-green-500/[0.07] border-green-500/15 text-green-400";

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Target className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Risk Forecast</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 ml-auto">AI Forecast</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
        {[
          { label: "Churn Risk", value: forecast.churnRisk, type: "badge" },
          { label: "Checkout Risk", value: forecast.checkoutFailureRisk, type: "badge" },
          { label: "Revenue at Risk", value: forecast.revenueAtRisk, type: "text" },
          { label: "Conversion Loss", value: forecast.conversionLoss, type: "text" },
        ].map(({ label, value, type }) => (
          <div key={label} className={`border rounded-xl p-3 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mb-1.5 uppercase tracking-wide`}
          >{label}</div>
            {type === "badge" ? (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${riskBg(value)}`}>
                {value}
              </span>
            ) : (
              <div className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/70"}`}>{value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`border rounded-xl p-4 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-2`}>Auth Breakage</div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{forecast.authBreakageProbability}</div>
        </div>
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-2`}
          >Incident Probability</div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{forecast.incidentProbability}</div>
        </div>
      </div>

      {forecast.topFailureModes && forecast.topFailureModes.length > 0 && (
        <div className={`border rounded-xl p-4 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-3`}>Top Failure Modes</div>
          <div className="space-y-1.5"
          >
            {forecast.topFailureModes.map((mode, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono`}>{i + 1}.</span>
                {mode}
              </div>
            ))}
          </div>
        </div>
      )}

      {forecast.executiveRecommendation && (
        <div className="border border-violet-500/15 bg-violet-500/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-violet-400/70 uppercase tracking-wide mb-2 font-medium">Board Recommendation</div>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{forecast.executiveRecommendation}</p>
        </div>
      )}
    </div>
  );
}

function ComplianceSection({ results }: { results: ComplianceResult[] }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Scale className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>8-Framework Compliance Audit</h2>
        <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} ml-auto`}>{results.filter(r => r.status === "pass").length}/{results.length} passed</span>
      </div>

      <div className="grid gap-2.5">
        {results.map((result) => {
          const isExpanded = expanded === result.framework;
          const statusColor = result.status === "pass" ? "text-green-400" : result.status === "partial" ? "text-amber-400" : "text-red-400";
          const statusBg = result.status === "pass" ? "bg-green-500/[0.07] border-green-500/15" : result.status === "partial" ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-red-500/[0.06] border-red-500/15";
          const fwColor = COMPLIANCE_COLORS[result.framework] ?? "text-white/50";

          return (
            <div key={result.framework} className={`border rounded-xl overflow-hidden ${statusBg}`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : result.framework)}
                className={`w-full flex items-center gap-3 px-4 py-3 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <ComplianceRing score={result.score} status={result.status} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${fwColor}`}>{result.framework}</span>
                    <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{result.status}</span>
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>
                    {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
                    {result.riskLevel && ` · ${result.riskLevel} risk`}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} />}
              </button>
              {isExpanded && result.findings.length > 0 && (
                <div className={`px-4 pb-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3 space-y-1.5`}>
                  {result.findings.map((finding: any, i: any) => (
                    <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>
                      <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono mt-0.5 shrink-0`}>{i + 1}.</span>
                      {finding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueIntelligenceSection({ revenue }: { revenue: RevenueIntelligence }) {
  const isLight = useIsLight();
  const riskColor = revenue.overallRevenueRisk === "critical" ? "text-red-400" : revenue.overallRevenueRisk === "high" ? "text-amber-400" : "text-yellow-400";
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <DollarSign className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Revenue Intelligence</h2>
        <div className="ml-auto flex items-center gap-2"
          >
          <span className={`text-xs font-bold capitalize ${riskColor}`}>{revenue.overallRevenueRisk} Risk</span>
        </div>
      </div>

      {revenue.estimatedMonthlyImpact && (
        <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-xl px-4 py-3 space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide">Proportional Revenue Exposure</div>
          <div className="text-sm font-bold text-amber-400">{revenue.estimatedMonthlyImpact}</div>
          <div className="text-[10px] text-amber-400/50 leading-relaxed">
            This is a proportional estimate — actual exposure scales with your revenue. A ₹1Cr/mo business would see roughly this exposure; a ₹10Cr/mo business, ~10×.
          </div>
        </div>
      )}

      {revenue.leaks && revenue.leaks.length > 0 && (
        <div className="space-y-2">
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium mb-3`}>Revenue Leaks</div>
          {revenue.leaks.map((leak: any, i: any) => {
            const isExp = expanded === i;
            const sev = SEVERITY_CONFIG[leak.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
                <button
                  onClick={() => setExpanded(isExp ? null : i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${sev.badge}`}>{leak.severity}</span>
                  <span className={`text-xs font-medium ${isLight ? "text-gray-800" : "text-white/80"} flex-1`}>{leak.description}</span>
                  <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} shrink-0 hidden sm:block`}>{leak.category}</span>
                  <span className="text-[10px] text-amber-400/70 shrink-0 hidden md:block"
          >{leak.impact}</span>
                  {isExp ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} />}
                </button>
                {isExp && (
                  <div className={`px-4 pb-3 pt-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} space-y-2`}>
                    <div className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}
          >{leak.description}</div>
                    {leak.fix && (
                      <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-lg p-3`}>
                        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mb-1 font-medium`}
          >Fix Prompt</div>
                        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} font-mono leading-relaxed`}>{leak.fix}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {revenue.quickWins && revenue.quickWins.length > 0 && (
        <div className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-4">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide mb-3 font-medium">Quick Wins ({"<"}1 day)</div>
          <div className="space-y-1.5">
            {revenue.quickWins.map((win: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0 mt-0.5" />
                {win}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// New Feature Panels
// ─────────────────────────────────────────────────────────────

const PROOF_TYPE_CONFIG = {
  idor: { label: "IDOR Probe", icon: Lock, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  chaos: { label: "Chaos Test", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
  pii: { label: "PII Scanner", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/[0.07] border-violet-500/20" },
  "stripe-bypass": { label: "Payment Bypass", icon: CreditCard, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  "shadow-api": { label: "Shadow API", icon: Globe, color: "text-sky-400", bg: "bg-sky-500/[0.07] border-sky-500/20" },
  regression: { label: "Regression", icon: GitBranch, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
};

function ProofEvidencePanel({ evidence }: { evidence: ProofEvidence[] }) {
  const isLight = useIsLight();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const copySteps = async (idx: number, steps: string[]) => {
    await navigator.clipboard.writeText(steps.join("\n"));
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Camera className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Visual Evidence Gallery</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium"
          >
          {evidence.length} Runtime Proof{evidence.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed`}>
        These findings were actively probed at runtime - not AI guesses. Each has been verified with real HTTP requests and step-by-step reproduction instructions.
      </p>

      <div className="space-y-3">
        {evidence.map((e, i) => {
          const pcfg = PROOF_TYPE_CONFIG[e.type] ?? PROOF_TYPE_CONFIG.chaos;
          const Icon = pcfg.icon;
          const sev = SEVERITY_CONFIG[e.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
          const isOpen = openIdx === i;

          return (
            <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className={`w-full flex items-center gap-3 p-4 text-left ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${pcfg.bg} ${pcfg.color}`}>
                  {pcfg.label}
                </span>
                <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white/90"} flex-1`}>{e.title}</span>
                <span className={`text-xs shrink-0 font-bold ${e.confidence >= 95 ? "text-green-400" : e.confidence >= 85 ? "text-sky-400" : "text-amber-400"}`}>
                  {e.confidence}%
                </span>
                {isOpen ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} />}
              </button>

              {isOpen && (
                <div className={`px-4 pb-4 space-y-4 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3`}>
                  {e.url && (
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className={`w-3 h-3 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />
                      <code className="text-violet-400 font-mono break-all">{e.url}</code>
                    </div>
                  )}

                  {e.screenshot && (
                    <div className={`border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl overflow-hidden`}>
                      <div className={`flex items-center gap-1.5 text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} px-3 py-2 bg-black/20 border-b border-white/[0.05] uppercase tracking-wide font-medium`}>
                        <Camera className="w-3 h-3" />
                        Runtime Screenshot
                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${getConfidenceStyle(e.confidence).badge}`}>
                          {getConfidenceStyle(e.confidence).icon} {e.confidence}%
                        </span>
                      </div>
                      <img
                        src={e.screenshot}
                        alt="Runtime proof screenshot"
                        className="w-full object-contain bg-[#08080f]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? "text-gray-500" : "text-white/50"}`}>
                        <Play className="w-3 h-3" />Reproduction Steps
                      </div>
                      <button
                        onClick={() => copySteps(i, e.steps)}
                        className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}
                      >
                        {copied === i ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <ol className="space-y-2">
                      {e.steps.map((step: any, si: any) => (
                        <li key={si} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                          <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono shrink-0 mt-0.5`}>{si + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className={`bg-black/20 border ${isLight ? "border-gray-200" : "border-white/[0.06]"} rounded-xl p-3`}>
                      <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-1.5`}>What Was Observed</div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed whitespace-pre-line`}>{e.observed}</p>
                    </div>
                    <div className="bg-red-500/[0.05] border border-red-500/15 rounded-xl p-3">
                      <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1.5">Business Impact</div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{e.impact}</p>
                    </div>
                    {e.codeRef && (
                      <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}>
                        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-1.5`}>How to Fix</div>
                        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} font-mono leading-relaxed`}>{e.codeRef}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadges({ evidence }: { evidence: ProofEvidence[] }) {
  const isLight = useIsLight();
  const browserCount = evidence.filter((e) => e.confidence >= 99).length;
  const httpCount = evidence.filter((e) => e.confidence >= 90 && e.confidence < 99).length;
  const staticCount = evidence.filter((e) => e.confidence >= 75 && e.confidence < 90).length;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-xl px-5 py-3 aurora-card`}>
      <div className="flex flex-wrap gap-4 items-center text-xs">
        <span className={`${isLight ? "text-gray-400" : "text-white/20"} uppercase tracking-widest font-medium text-[10px]`}>Confidence Scale</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[10px] font-semibold">
          🟢 99% Browser Runtime{browserCount > 0 ? ` (${browserCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold">
          🔵 90% HTTP Runtime{httpCount > 0 ? ` (${httpCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold">
          🔵 75% Static Code{staticCount > 0 ? ` (${staticCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
          🟡 60% Pattern Match
        </span>
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-white/35 text-[10px] font-semibold ${isLight ? "bg-gray-100 border-gray-200" : "bg-white/[0.05] border-white/[0.08]"}`}>
          ⚪ &lt;60% AI Reasoning
        </span>
      </div>
    </div>
  );
}

function RegressionPanel({ diff }: { diff: RegressionDiff }) {
  const isLight = useIsLight();
  const hasRegressions = diff.newRegressions.length > 0;
  const hasFixed = diff.fixedIssues.length > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-4 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <GitBranch className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Regression Memory</h2>
        {diff.previousScanId && (
          <Link href={`/scans/${diff.previousScanId}`}>
            <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/50 transition-colors cursor-pointer`}>
              vs Scan #{diff.previousScanId} →
            </span>
          </Link>
        )}
      </div>

      <p className={`text-sm leading-relaxed ${hasRegressions ? "text-red-400" : hasFixed ? "text-green-400" : "text-white/45"}`}>
        {diff.summary}
      </p>

      {diff.scoreDelta != null && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-sm font-bold ${diff.scoreDelta > 0 ? "text-green-400" : diff.scoreDelta < 0 ? "text-red-400" : isLight ? "text-gray-400" : "text-white/30"}`}>
            {diff.scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : diff.scoreDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {diff.scoreDelta > 0 ? "+" : ""}{diff.scoreDelta} points
          </div>
          {diff.previousScore != null && (
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>from {diff.previousScore} → {(diff.previousScore ?? 0) + (diff.scoreDelta ?? 0)}</span>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className={`rounded-xl p-3 border text-center ${hasRegressions ? "bg-red-500/[0.07] border-red-500/20" : isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasRegressions ? "text-red-400" : isLight ? "text-gray-400" : "text-white/30"}`}>{diff.newRegressions.length}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>New Regressions</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${hasFixed ? "bg-green-500/[0.07] border-green-500/20" : isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasFixed ? "text-green-400" : isLight ? "text-gray-400" : "text-white/30"}`}>{diff.fixedIssues.length}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>Issues Fixed</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-400" : "text-white/30"}`}
          >{diff.unchanged}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>Unchanged</div>
        </div>
      </div>

      {hasRegressions && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide font-medium">New Regressions Since Last Scan</div>
          {diff.newRegressions.slice(0, 5).map((r: any, i: any) => {
            const sev = SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
            return (
              <div key={i} className="flex items-center gap-2 text-xs"
          >
                <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${sev.badge}`}>{r.severity}</span>
                <span className={`${isLight ? "text-gray-500" : "text-white/55"}`}>{r.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {hasFixed && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide font-medium">Fixed Since Last Scan</div>
          {diff.fixedIssues.slice(0, 4).map((r: any, i: any) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
              <CheckCircle2 className="w-3 h-3 text-green-400/60 shrink-0" />
              {r.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BenchmarkPanel({ data }: { data: BenchmarkData }) {
  const isLight = useIsLight();
  const dims = [
    { label: "Overall", value: data.overall },
    { label: "Security", value: data.security },
    { label: "Performance", value: data.performance },
    { label: "UX", value: data.ux },
    { label: "Reliability", value: data.reliability },
  ];

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Award className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Benchmark Percentile</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>vs {data.totalScansCompared} apps</span>
      </div>

      {data.vibeToolRank && (
        <div className="bg-violet-500/[0.06] border border-violet-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-violet-400">{data.vibeToolRank}</span>
        </div>
      )}
      {data.industryRank && (
        <div className="bg-sky-500/[0.06] border border-sky-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-sky-400">{data.industryRank}</span>
        </div>
      )}

      <div className="space-y-3">
        {dims.map(({ label, value }) => {
          const color = value >= 70 ? "#4ade80" : value >= 40 ? "#f59e0b" : "#f87171";
          return (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} w-20 shrink-0`}>{label}</span>
              <div className={`flex-1 h-1.5 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} rounded-full overflow-hidden`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs font-bold w-12 text-right shrink-0" style={{ color }}>
                {value}th %ile
              </span>
            </div>
          );
        })}
      </div>

      {data.totalScansCompared === 0 && (
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"} text-center`}>Benchmarks will populate as more apps are scanned.</p>
      )}
    </div>
  );
}

// ── VibeCode Intelligence Network ────────────────────────────────────────────

const VIBE_TOOL_PATTERNS: Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  patterns: string[];
  riskPhrase: string;
}> = {
  "replit": {
    label: "Replit AI",
    emoji: "🟠",
    color: "text-orange-400",
    bg: "bg-orange-500/[0.06]",
    border: "border-orange-500/20",
    riskPhrase: "Common Replit pattern",
    patterns: [
      "Monolithic App.tsx / index.ts (900+ lines) - should be split across modules",
      "PORT hardcoded in source instead of environment variable",
      "Express server missing helmet + rate-limiting middleware",
      "Secrets referenced directly from process.env without validation",
      "CORS origins whitelist missing or set to wildcard *",
    ],
  },
  "cursor": {
    label: "Cursor AI",
    emoji: "🔵",
    color: "text-sky-400",
    bg: "bg-sky-500/[0.06]",
    border: "border-sky-500/20",
    riskPhrase: "Common Cursor pattern",
    patterns: [
      "Multiple conflicting implementations of the same function from different AI sessions",
      '"TODO: implement this" placeholders left in production code paths',
      "Inconsistent TypeScript strictness - some files strict, others permissive",
      "Over-use of 'as' type casts to silence TS errors instead of fixing types",
      "Dead branches from earlier AI sessions never cleaned up",
    ],
  },
  "lovable": {
    label: "Lovable",
    emoji: "🩷",
    color: "text-pink-400",
    bg: "bg-pink-500/[0.06]",
    border: "border-pink-500/20",
    riskPhrase: "Common Lovable pattern",
    patterns: [
      "Supabase / Firebase RLS not enabled - all rows publicly readable",
      "API keys or service credentials exposed in client-side code",
      "Auth checked only on frontend - no server-side guard on protected endpoints",
      "Single-file components exceeding 2,000 lines",
      "No environment separation - same keys used in dev and prod",
    ],
  },
  "bolt": {
    label: "Bolt",
    emoji: "⚡",
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.06]",
    border: "border-yellow-500/20",
    riskPhrase: "Common Bolt pattern",
    patterns: [
      "Supabase / Firebase RLS not enabled - all rows publicly readable",
      "API keys or service credentials exposed in client-side code",
      "Auth checked only on frontend - no server-side guard on protected endpoints",
      "Single-file components exceeding 2,000 lines",
      "No environment separation - same keys used in dev and prod",
    ],
  },
  "windsurf": {
    label: "Windsurf / Codeium",
    emoji: "🌊",
    color: "text-cyan-400",
    bg: "bg-cyan-500/[0.06]",
    border: "border-cyan-500/20",
    riskPhrase: "Common Windsurf pattern",
    patterns: [
      "Duplicate utility functions with slight variations across files",
      "useEffect hooks missing cleanup functions - causes memory leaks",
      "Async functions without try-catch in 60%+ of cases",
      "State mutations inside render - causes unexpected re-renders",
      "Missing dependency arrays or stale closures in hooks",
    ],
  },
  "copilot": {
    label: "GitHub Copilot",
    emoji: "🤖",
    color: "text-violet-400",
    bg: "bg-violet-500/[0.06]",
    border: "border-violet-500/20",
    riskPhrase: "Common Copilot pattern",
    patterns: [
      'Auth check commented out: // TODO: validate user - left in production',
      "SQL queries with string interpolation - SQL injection risk",
      "Error swallowing: catch(e) {} with no logging or retry",
      "Debug console.log() statements left in production paths",
      "Boilerplate security stubs never implemented",
    ],
  },
};

function VibeCodeIntelPanel({ vibeTool, issues, vibeToolRank }: {
  vibeTool: string;
  issues: ScanIssue[];
  vibeToolRank?: string | null;
}) {
  const isLight = useIsLight();
  const normalised = vibeTool.toLowerCase().replace(/[^a-z]/g, "");
  const cfg = VIBE_TOOL_PATTERNS[normalised] ?? VIBE_TOOL_PATTERNS["copilot"];
  const aiIssues = issues.filter((i) => i.agentName === "AI Code Quality");
  const criticalOrHigh = aiIssues.filter((i) => i.severity === "critical" || i.severity === "high");

  const [expanded, setExpanded] = useState(false);
  const displayIssues = expanded ? aiIssues : aiIssues.slice(0, 3);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden border ${cfg.border}`}>
      {/* Header */}
      <div className={`${cfg.bg} px-6 py-4 flex items-center gap-3 border-b border-white/[0.05]`}>
        <span className="text-xl">{cfg.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>VibeCode Intelligence</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>
            Pattern-matched against known {cfg.label} failure signatures
          </p>
        </div>
        {criticalOrHigh.length > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold font-['Syne'] text-red-400"
          >{criticalOrHigh.length}</div>
            <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>High-risk patterns</div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* vibeToolRank badge */}
        {vibeToolRank && (
          <div className={`${cfg.bg} border ${cfg.border} rounded-xl px-4 py-2.5`}>
            <span className={`text-xs font-semibold ${cfg.color}`}>{vibeToolRank}</span>
          </div>
        )}

        {/* Known failure patterns for this tool */}
        <div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium mb-2.5`}>
            Known {cfg.label} failure patterns - checked in your code
          </div>
          <div className="space-y-1.5">
            {cfg.patterns.map((p, i) => {
              const matched = aiIssues.some((issue) =>
                issue.title?.toLowerCase().split(" ").some((w: any) => p.toLowerCase().includes(w)) ||
                issue.description?.toLowerCase().split(" ").some((w: any) => w.length > 5 && p.toLowerCase().includes(w)),
              );
              return (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <span className={`mt-0.5 shrink-0 text-sm ${matched ? "text-red-400" : "text-white/15"}`}>
                    {matched ? "⚠" : "✓"}
                  </span>
                  <span className={matched ? "text-white/60" : isLight ? "text-gray-400" : "text-white/20"}>
                    {p}
                  </span>
                  {matched && (
                    <span className="ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                      {cfg.riskPhrase}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Code Quality issues from agent */}
        {aiIssues.length > 0 && (
          <div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium mb-2.5`}>
              AI Code Quality findings ({aiIssues.length} total)
            </div>
            <div className="space-y-2">
              {displayIssues.map((issue) => {
                const sev = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
                return (
                  <div key={issue.id} className={`rounded-xl border px-3 py-2.5 ${sev.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sev.badge} shrink-0`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className={`text-xs ${isLight ? "text-gray-800" : "text-white/80"} font-medium`}>{issue.title}</span>
                      {issue.filePath && (
                        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} font-mono shrink-0 truncate max-w-[120px]`}>
                          {issue.filePath.split("/").pop()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {aiIssues.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`mt-2 text-[11px] ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/50 transition-colors w-full text-center`}>
                {expanded ? "Show less" : `Show ${aiIssues.length - 3} more findings`}
              </button>
            )}
          </div>
        )}

        {aiIssues.length === 0 && (
          <div className="text-center py-4">
            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>No AI code quality issues detected for {cfg.label} patterns.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchDNAPanel({ dna }: { dna: LaunchDNA }) {
  const isLight = useIsLight();
  const profiles = [
    { key: "risk", data: dna.riskProfile, accent: "text-red-400", bg: "bg-red-500/[0.05] border-red-500/15" },
    { key: "growth", data: dna.growthProfile, accent: "text-green-400", bg: "bg-green-500/[0.05] border-green-500/15" },
    { key: "tech", data: dna.techHealthProfile, accent: "text-sky-400", bg: "bg-sky-500/[0.05] border-sky-500/15" },
  ];

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Dna className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Launch DNA</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} font-mono`}>{dna.overallDNA}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4"
          >
        {profiles.map(({ key, data, accent, bg }) => {
          const pct = data.score;
          const color = pct >= 70 ? "#4ade80" : pct >= 45 ? "#f59e0b" : "#f87171";
          return (
            <div key={key} className={`rounded-2xl border p-4 space-y-3 ${bg}`}>
              <div>
                <div className={`text-xs font-bold ${accent} mb-0.5`}>{data.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color }}>{pct}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tag: any) => (
                  <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.06] border-white/[0.08] text-white/40"}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}
          >{data.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchReplaySection({ steps }: { steps: LaunchReplayStep[] }) {
  const isLight = useIsLight();
  const failCount = steps.filter((s) => s.status === "fail").length;
  const warnCount = steps.filter((s) => s.status === "warning").length;
  const hasCritical = failCount > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Play className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Replay</h2>
        <div className="ml-auto flex items-center gap-2">
          {failCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {failCount} failure{failCount !== 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25"
          >
              {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed`}>
        Visual replay of a typical user's first session - showing exactly where real users hit walls, get confused, or lose trust.
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isOk = step.status === "ok";
          const isWarn = step.status === "warning";
          const isFail = step.status === "fail";

          const dotColor = isOk ? "bg-green-500 border-green-500/50"
            : isWarn ? "bg-amber-500 border-amber-500/50"
            : "bg-red-500 border-red-500/50";

          const cardBg = isOk ? "border-green-500/15 bg-green-500/[0.03]"
            : isWarn ? "border-amber-500/20 bg-amber-500/[0.05]"
            : "border-red-500/20 bg-red-500/[0.05]";

          const statusLabel = isOk ? "ok" : isWarn ? "warning" : "fail";
          const statusBadge = isOk
            ? "bg-green-500/15 text-green-400 border-green-500/25"
            : isWarn
              ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
              : "bg-red-500/15 text-red-400 border-red-500/25";

          const stepIcon = isOk
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            : isWarn
              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />;

          return (
            <div key={i} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-3 shrink-0 z-10 bg-[#09090f] ${dotColor}`}>
                  {stepIcon}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 mt-1 mb-0 ${
                    isFail ? "bg-red-500/30" : isWarn ? "bg-amber-500/30" : "bg-white/10"
                  }`} style={{ minHeight: 20 }} />
                )}
              </div>

              {/* Step card */}
              <div className={`flex-1 border rounded-xl px-4 py-3 mb-3 ${cardBg}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/85"} flex-1 leading-snug`}>{step.step}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>
                {step.detail && (
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} mt-1.5 leading-relaxed`}>{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasCritical && (
        <div className="border border-red-500/25 bg-red-500/[0.05] rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-400 mb-0.5">🔴 DO NOT LAUNCH</div>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} leading-relaxed`}>
              {failCount} critical user journey failure{failCount !== 1 ? "s" : ""} detected. Real users will experience these in their first session.
              Fix these before going live - first impressions are permanent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CofounderNarrativePanel({ narrative }: { narrative: string }) {
  const isLight = useIsLight();
  const paragraphs = narrative.split("\n").filter((p) => p.trim().length > 0);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Users className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Technical Co-Founder Mode</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">AI CTO</span>
      </div>
      <div className="border border-violet-500/10 bg-violet-500/[0.03] rounded-2xl p-5 space-y-4"
          >
        {paragraphs.map((p, i) => (
          <p key={i} className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function ShadowApiPanel({ findings }: { findings: ShadowApiFindings }) {
  const isLight = useIsLight();
  const hasOrphaned = findings.orphanedRoutes.length > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Globe className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Shadow API Radar</h2>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${hasOrphaned ? "bg-amber-500/15 text-amber-400" : "bg-green-500/15 text-green-400"}`}>
          {hasOrphaned ? `${findings.orphanedRoutes.length} orphaned` : "Clean"}
        </span>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}>{findings.summary}</p>

      {hasOrphaned && (
        <div className="space-y-2"
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium`}>Orphaned Routes (live but unused)</div>
          {findings.orphanedRoutes.map((route: any, i: any) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${route.risk.startsWith("HIGH") ? "bg-red-500/[0.06] border-red-500/15" : "bg-amber-500/[0.05] border-amber-500/12"}`}>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${route.risk.startsWith("HIGH") ? "bg-red-500/20 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                {route.method}
              </span>
              <div>
                <code className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} font-mono`}>{route.route}</code>
                <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>{route.risk}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs"
          >
        <div className={`border rounded-xl p-3 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-2`}>Backend Routes Registered</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.backendRegisteredRoutes.slice(0, 8).map((r: any, i: any) => (
              <code key={i} className={`block ${isLight ? "text-gray-400" : "text-white/35"} font-mono text-[10px]`}>{r}</code>
            ))}
          </div>
        </div>
        <div className={`border rounded-xl p-3 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-2`}>Frontend Fetch Calls</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.frontendFetchRoutes.slice(0, 8).map((r: any, i: any) => (
              <code key={i} className={`block ${isLight ? "text-gray-400" : "text-white/35"} font-mono text-[10px]`}>{r}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareBadgeButton({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const score = scan.score ?? 0;
  const color = score >= 80 ? "brightgreen" : score >= 55 ? "yellow" : "red";
  const label = scan.launchVerdict === "ready" ? "launch-ready" : scan.launchVerdict === "do-not-launch" ? "do-not-launch" : "launch-with-caution";

  const badgeUrl = `https://img.shields.io/badge/Agenario-${score}%2F100_${encodeURIComponent(label)}-${color}?style=flat-square`;
  const markdownBadge = `[![Agenario Score](${badgeUrl})](https://agenario.app)`;
  const htmlBadge = `<a href="https://agenario.app"><img src="${badgeUrl}" alt="Agenario Score ${score}/100" /></a>`;

  const options = [
    { label: "Markdown badge", value: markdownBadge, hint: "For GitHub README" },
    { label: "HTML badge", value: htmlBadge, hint: "For websites" },
    { label: "Score only", value: `Agenario score: ${score}/100 (${label}) - ${scan.sourceInput}`, hint: "Plain text" },
  ];

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className={`flex items-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border ${isLight ? "border-gray-200" : "border-white/[0.07]"} hover:border-white/15`}
      >
        {copied ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
        {copied ? "Copied!" : "Share"}
      </button>
      {showMenu && (
        <div className={`absolute right-0 top-9 z-50 bg-[#111] border ${isLight ? "border-gray-200" : "border-white/[0.1]"} rounded-xl shadow-2xl py-1 min-w-[180px]`}>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleCopy(opt.value)}
              className={`w-full text-left px-4 py-2.5 ${isLight ? "hover:bg-gray-100" : "hover:bg-white/[0.05]"} transition-colors`}
            >
              <div className={`text-xs font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{opt.label}</div>
              <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}
          >{opt.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Secret & API Key Leakage Panel ───────────────────────────────────────────
const RISK_CONFIG = {
  critical: { bg: "bg-red-500/[0.08] border-red-500/20", badge: "bg-red-500/15 text-red-400 border-red-500/25", dot: "bg-red-500" },
  high: { bg: "bg-amber-500/[0.06] border-amber-500/18", badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", dot: "bg-amber-500" },
  medium: { bg: "bg-yellow-500/[0.05] border-yellow-500/15", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-500" },
};

const CATEGORY_LABEL: Record<string, string> = {
  payment: "💳 Payment",
  "cloud-credentials": "☁️ Cloud",
  database: "🗄️ Database",
  cryptographic: "🔑 Cryptographic",
  auth: "🔐 Auth",
  "ai-api": "🤖 AI API",
  email: "📧 Email",
  communication: "💬 Comms",
  vcs: "📦 VCS",
  credentials: "🔓 Credentials",
  generic: "⚠️ Generic",
};

function SecretScanPanel({ data, isCreator }: { data: NonNullable<ScanDetail["secretScanResults"]>; isCreator: boolean }) {
  const isLight = useIsLight();
  const lockedCount = (data as Record<string, unknown>)["_lockedFindingCount"] as number | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm">🔍</span>
        </div>
        <div className="flex-1">
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Secret & API Key Scanner</h2>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>Deterministic regex scan - 60+ credential patterns</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.criticalCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {data.criticalCount} CRITICAL
            </span>
          )}
          {data.highCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {data.highCount} HIGH
            </span>
          )}
          {data.totalFound === 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              ✓ No secrets found
            </span>
          )}
        </div>
      </div>

      {data.totalFound === 0 ? (
        <div className="px-6 py-8 text-center"
          >
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-600" : "text-white/60"} font-medium text-sm`}>Clean - no hardcoded secrets detected</p>
          <p className={`${isLight ? "text-gray-400" : "text-white/25"} text-xs mt-1`}>Scanned {(data.scannedChars / 1000).toFixed(0)}KB of source code across 60+ credential patterns</p>
        </div>
      ) : (
        <>
          {data.hasCritical && (
            <div className="px-6 py-3 bg-red-500/[0.06] border-b border-red-500/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-semibold">
                {data.criticalCount} critical secret{data.criticalCount !== 1 ? "s" : ""} found - rotate these credentials immediately before deployment
              </p>
            </div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.findings.map((finding: any) => {
              const rc = RISK_CONFIG[finding.risk as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.medium;
              return (
                <div key={finding.id} className={`px-6 py-4 ${rc.bg} border-l-0`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full ${rc.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${rc.badge}`}>
                          {finding.risk}
                        </span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>{CATEGORY_LABEL[finding.category] ?? finding.category}</span>
                        {finding.lineHint && <span className="text-[10px] font-mono text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded border border-amber-400/10"
          >{finding.lineHint}</span>}
                      </div>
                      <p className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-white/85"} mb-1`}>{finding.name}</p>
                      {isCreator ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <code className={`text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-amber-300/80 border ${isLight ? "border-gray-200" : "border-white/[0.07]"}`}>
                              {finding.maskedValue}
                            </code>
                          </div>
                          <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} font-mono bg-black/20 rounded px-2 py-1.5 leading-relaxed border border-white/[0.04] truncate`}>
                            {finding.context}
                          </p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} mt-2 leading-relaxed`}>{finding.recommendation}</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5"
          >
                          <Lock className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"}`}>{finding.context}</span>
                          <Link href="/pricing">
                            <span className="text-xs text-violet-400 hover:text-violet-300 font-semibold ml-auto cursor-pointer">Unlock →</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {lockedCount && lockedCount > 0 && !isCreator && (
            <div className="px-6 py-3 bg-violet-500/[0.05] border-t border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{lockedCount} more secret{lockedCount !== 1 ? "s" : ""} found - upgrade to see all</span>
              </div>
              <Link href="/pricing">
                <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30 flex items-center gap-1`}>
                  Unlock All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ── Package CVE Vulnerability Panel ─────────────────────────────────────────
const CVSS_COLOR = (score: number) =>
  score >= 9 ? "text-red-400" : score >= 7 ? "text-amber-400" : score >= 4 ? "text-yellow-400" : "text-white/40";

const CVSS_BG = (score: number) =>
  score >= 9 ? "bg-red-500/15 border-red-500/25" : score >= 7 ? "bg-amber-500/15 border-amber-500/25" : "bg-yellow-500/10 border-yellow-500/20";

function PackageVulnsPanel({ data, isCreator }: { data: NonNullable<ScanDetail["packageVulns"]>; isCreator: boolean }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);
  const lockedCount = (data as Record<string, unknown>)["_lockedCount"] as number | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm">📦</span>
        </div>
        <div className="flex-1">
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Dependency CVE Tracker</h2>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>{data.totalPackages} packages scanned · NVD + GitHub Advisory DB</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.hasCritical && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {data.criticalCount} CRITICAL
            </span>
          )}
          {data.highCount > 0 && !data.hasCritical && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {data.highCount} HIGH
            </span>
          )}
          {data.vulnerableCount === 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              ✓ No known CVEs
            </span>
          )}
          {data.topCvssScore && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CVSS_BG(data.topCvssScore)}`}>
              Top CVSS {data.topCvssScore.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {data.vulnerableCount === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-600" : "text-white/60"} font-medium text-sm`}>No known CVEs in your dependency tree</p>
          <p className={`${isLight ? "text-gray-400" : "text-white/25"} text-xs mt-1`}>Checked {data.totalPackages} packages against NVD and GitHub Advisory Database</p>
        </div>
      ) : (
        <>
          {data.topCveId && (
            <div className="px-6 py-3 bg-amber-500/[0.05] border-b border-amber-500/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-400 text-xs font-semibold">
                Highest: {data.topCveId} (CVSS {data.topCvssScore?.toFixed(1)}) - update affected packages before launch
              </p>
            </div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.findings.map((pkg: any) => {
              const isExpanded = expanded === pkg.name;
              const sev = pkg.highestSeverity;
              const sevCfg = sev === "critical" ? RISK_CONFIG.critical : sev === "high" ? RISK_CONFIG.high : RISK_CONFIG.medium;
              return (
                <div key={pkg.name}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : pkg.name)}
                    className={`w-full px-6 py-4 flex items-center gap-4 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors text-left`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"} font-mono`}
          >{pkg.name}</span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
                        v{pkg.installedVersion}</span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>→</span>
                        <span className="text-xs text-green-400/70 font-mono">v{pkg.fixVersion}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${sevCfg.badge}`}>{sev}</span>
                      </div>
                      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>{pkg.vulns.length} CVE{pkg.vulns.length !== 1 ? "s" : ""} · CVSS {pkg.highestCvss.toFixed(1)}</p>
                    </div>
                    <div className={`text-xl font-bold font-['Syne'] shrink-0 ${CVSS_COLOR(pkg.highestCvss)}`}>
                      {pkg.highestCvss.toFixed(1)}
                    </div>
                    {isExpanded ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />}
                  </button>
                  {isExpanded && isCreator && (
                    <div className="px-6 pb-4 space-y-3">
                      {pkg.vulns.map((vuln: any) => (
                        <div key={vuln.cveId} className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}>
                          <div className="flex items-start gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${CVSS_BG(vuln.cvssScore)}`}>
                              {vuln.cveId}
                            </span>
                            <span className={`text-sm font-bold ${CVSS_COLOR(vuln.cvssScore)}`}>CVSS {vuln.cvssScore.toFixed(1)}</span>
                            {vuln.exploitAvailable && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                                ⚡ EXPLOIT PUBLIC
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-semibold ${isLight ? "text-gray-800" : "text-white/80"} mb-1`}>{vuln.title}</p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} leading-relaxed mb-3`}>{vuln.description}</p>
                          <div className="bg-black/20 rounded-lg p-2.5 text-xs space-y-1">
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Attack</span>
                              <span className={`${isLight ? "text-gray-500" : "text-white/55"}`}>{vuln.attackVector}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Affected</span>
                              <span className="text-amber-400/70 font-mono">{vuln.affectedRange}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Fixed in</span>
                              <span className="text-green-400/70 font-mono">{vuln.fixedIn}</span>
                            </div>
                          </div>
                          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} mt-2 font-mono`}>{vuln.cvssVector}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && !isCreator && (
                    <div className="px-6 pb-4">
                      <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-violet-400" />
                          <div>
                            <p className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/60"}`}>Full CVE details locked</p>
                            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>Upgrade to see CVE IDs, CVSS vectors, exploit status, and exact fix versions</p>
                          </div>
                        </div>
                        <Link href="/pricing"
          >
                          <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-2 rounded-lg transition-all border border-violet-400/30 shrink-0 flex items-center gap-1`}>
                            Unlock <ArrowRight className="w-3 h-3" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {lockedCount && lockedCount > 0 && !isCreator && (
            <div className="px-6 py-3 bg-violet-500/[0.05] border-t border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2"
          >
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{lockedCount} more vulnerable package{lockedCount !== 1 ? "s" : ""} - upgrade to see all</span>
              </div>
              <Link href="/pricing">
                <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30 flex items-center gap-1`}>
                  Unlock All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ── Cleanup Agent Panel ──────────────────────────────────────────────────────
const CLEANUP_CAT_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  "debug-noise":    { label: "Debug Noise",    icon: "🔊", color: "text-amber-400" },
  "tech-debt":      { label: "Tech Debt",      icon: "⏰", color: "text-orange-400" },
  "dead-code":      { label: "Dead Code",      icon: "💀", color: "text-red-400" },
  "type-safety":    { label: "Type Safety",    icon: "🔷", color: "text-blue-400" },
  "env-hygiene":    { label: "Env Hygiene",    icon: "🌿", color: "text-green-400" },
  "doc-clutter":    { label: "Doc Clutter",    icon: "📄", color: "text-white/40" },
  "security-smell": { label: "Security Smell", icon: "🔥", color: "text-red-500" },
  "file-hygiene":   { label: "File Hygiene",   icon: "🗑️", color: "text-white/35" },
};

const DEBT_COLOR = (score: number) =>
  score >= 85 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
const DEBT_LABEL = (score: number) =>
  score >= 85 ? "Clean" : score >= 60 ? "Moderate Debt" : "High Debt";

function CleanupAgentPanel({ data }: { data: NonNullable<ScanDetail["cleanupReport"]> }) {
  const isLight = useIsLight();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const categoryCounts = data.categories as Record<string, number>;
  const categoryKeys = Object.keys(categoryCounts).filter((k) => categoryCounts[k] > 0);

  const visibleFindings = activeCategory
    ? data.findings.filter((f: any) => f.category === activeCategory)
    : data.findings;

  const copyAsTodo = () => {
    const lines = [
      `# Code Cleanup Report - Tech Debt Score: ${data.debtScore}/100`,
      `# ${data.summary}`,
      `# Estimated cleanup: ~${data.estimatedCleanupMinutes} minutes`,
      "",
      ...data.findings.map((f: any) => `- [ ] [${f.severity.toUpperCase()}] ${f.title}${f.file ? ` (${f.file})` : ""}${f.lineHint ? ` - ${f.lineHint}` : ""}\n  Fix: ${f.fixSuggestion}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-start gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm">🧹</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Cleanup Agent</h2>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>·</span>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
            Tech Debt Score</span>
            <span className={`text-sm font-bold font-['Syne'] ${DEBT_COLOR(data.debtScore)}`}>{data.debtScore}/100</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              data.debtScore >= 85 ? "bg-green-500/10 text-green-400 border-green-500/20" :
              data.debtScore >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>{DEBT_LABEL(data.debtScore)}</span>
          </div>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>{data.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0"
          >
          {data.estimatedCleanupMinutes > 0 && (
            <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} hidden sm:block`}>~{data.estimatedCleanupMinutes} min to fix</span>
          )}
          <button
            onClick={copyAsTodo}
            className={`flex items-center gap-1.5 text-xs ${isLight ? "text-gray-500" : "text-white/40"} hover:text-white/70 bg-white/[0.05] border ${isLight ? "border-gray-200" : "border-white/[0.08]"} rounded-lg px-2.5 py-1.5 transition-colors`}
          >
            {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Export TODO"}</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-white/[0.04] border-b border-white/[0.04]">
        {[
          { label: "Errors", value: data.errorCount, color: "text-red-400" },
          { label: "Warnings", value: data.warnCount, color: "text-amber-400" },
          { label: "Info", value: data.infoCount, color: "text-white/40" },
          { label: "Auto-fixable", value: data.autoFixableCount, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3 text-center">
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category filters */}
      {categoryKeys.length > 1 && (
        <div className="px-6 py-3 border-b border-white/[0.04] flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${
              activeCategory === null ? "bg-white/10 border-white/20 text-white" : `${isLight ? "bg-white border-gray-200" : "bg-white/[0.03] border-white/[0.08]"} text-white/35 hover:text-white/60`
            }`}
          >
            All ({data.totalFindings})
          </button>
          {categoryKeys.map((cat) => {
            const meta = CLEANUP_CAT_LABEL[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${
                  activeCategory === cat ? "bg-white/10 border-white/20 text-white" : `bg-white/[0.03] ${isLight ? "border-gray-200" : "border-white/[0.08]"} text-white/35 hover:text-white/60`
                }`}
              >
                {meta?.icon ?? "•"} {meta?.label ?? cat} ({categoryCounts[cat]})
              </button>
            );
          })}
        </div>
      )}

      {/* Findings list */}
      {visibleFindings.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-500" : "text-white/55"} font-medium text-sm`}>No findings in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
          {visibleFindings.map((finding: any) => {
            const meta = CLEANUP_CAT_LABEL[finding.category];
            const sevColor = finding.severity === "error" ? "text-red-400 border-red-500/20 bg-red-500/[0.06]" :
              finding.severity === "warn" ? "text-amber-400 border-amber-500/20 bg-amber-500/[0.06]" :
              `text-white/35 ${isLight ? "border-gray-200 bg-gray-50" : "border-white/[0.08] bg-white/[0.03]"}`;
            return (
              <div key={finding.id} className="px-6 py-3.5">
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase mt-0.5 shrink-0 ${sevColor}`}>
                    {finding.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-white/80"}`}>{finding.title}</p>
                      {meta && <span className={`text-[10px] ${meta.color}`}>{meta.icon} {meta.label}</span>}
                      {finding.autoFixable && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15">⚡ auto-fixable</span>
                      )}
                    </div>
                    {finding.lineHint && (
                      <p className="text-[10px] font-mono text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded border border-amber-400/10 mb-1 inline-block">{finding.lineHint}</p>
                    )}
                    <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed mb-1.5`}>{finding.detail}</p>
                    <div className={`bg-black/30 border rounded-lg px-3 py-2 text-[10px] font-mono leading-relaxed ${isLight ? "border-gray-200 text-gray-400" : "border-white/[0.06] text-white/30"}`}>
                      💡 {finding.fixSuggestion}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top offending files */}
      {data.topFiles.length > 0 && (
        <div className="px-6 py-4 border-t border-white/[0.04]"
          >
          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wider font-bold mb-2`}>Most issues</p>
          <div className="flex flex-wrap gap-2">
            {data.topFiles.map((f: any) => (
              <div key={f.path} className={`flex items-center gap-1.5 text-[10px] border rounded-lg px-2 py-1 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
                <span className={`${isLight ? "text-gray-400" : "text-white/25"} font-mono truncate max-w-[180px]`}>{f.path.split("/").slice(-2).join("/")}</span>
                <span className={`${isLight ? "text-gray-500" : "text-white/40"} font-bold`}>{f.issueCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Digital Twin Panel ───────────────────────────────────────────────────────
function DigitalTwinPanel({ data, isCreator }: { data: DigitalTwinResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const [openSection, setOpenSection] = useState<"journeys" | "chaos" | "attacks">("journeys");

  const statusConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    pass:     { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",  dot: "bg-green-400",  label: "Pass"     },
    degraded: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",  dot: "bg-amber-400",  label: "Degraded" },
    fail:     { color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20",      dot: "bg-red-400",    label: "Fail"     },
  };
  const getStatusConfig = (s: string) =>
    statusConfig[s] ?? { color: isLight ? "text-gray-400" : "text-white/30", bg: isLight ? "bg-gray-100 border-gray-200" : "bg-white/[0.04] border-white/[0.08]", dot: isLight ? "bg-gray-300" : "bg-white/20", label: s ?? "Unknown" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Network className="w-4 h-4 text-violet-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}>Digital Twin Simulation</h2>
        <div className="flex items-center gap-3 text-xs"
          >
          <span className={`${isLight ? "text-gray-400" : "text-white/25"}`}>{data.simulatedUserCount?.toLocaleString() ?? "1,000"} virtual users</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold">
            {data.twinConfidenceScore}/100 confidence
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {[
          { label: "Journey Pass Rate", value: `${data.journeyPassRate}%`, color: data.journeyPassRate >= 70 ? "text-green-400" : data.journeyPassRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Attack Block Rate", value: `${data.attackBlockRate}%`, color: data.attackBlockRate >= 70 ? "text-green-400" : data.attackBlockRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Chaos Scenarios", value: `${data.chaosResults.length}`, color: "text-white/60" },
        ].map((s) => (
          <div key={s.label} className={`px-6 py-3 text-center border-r ${isLight ? "border-gray-200" : "border-white/[0.05]"} last:border-0`}>
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className={`flex border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {([
          { key: "journeys", label: `Journeys (${data.journeys.length})`, icon: Play },
          { key: "chaos", label: `Chaos (${data.chaosResults.length})`, icon: RefreshCw },
          { key: "attacks", label: `Attacks (${isCreator ? data.attackSimulations.length : (data._lockedAttackCount ?? data.attackSimulations.length)})`, icon: ShieldAlert },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setOpenSection(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              openSection === key
                ? `border-violet-500 ${isLight ? "text-gray-900" : "text-white"}`
                : `border-transparent ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60`
            }`}
          >
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Journeys */}
      {openSection === "journeys" && (
        <div className="divide-y divide-white/[0.04]">
          {data.journeys.map((j: any, i: any) => {
            const sc = getStatusConfig(j.status);
            return (
              <div key={i} className="px-6 py-3 flex items-start gap-4">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${sc.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{j.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono text-[10px] ml-auto`}>{j.route}</span>
                    {j.latencyMs && <span className={`${isLight ? "text-gray-400" : "text-white/20"} text-[10px]`}>{j.latencyMs}ms</span>}
                  </div>
                  {j.finding && (
                    <p className="text-xs text-amber-400/80 mt-0.5 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{j.finding}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {j.steps.slice(0, 4).map((s: any, si: any) => (
                      <span key={si} className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} ${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border border-white/[0.06] px-1.5 py-0.5 rounded`}>
                        {si + 1}. {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chaos */}
      {openSection === "chaos" && (
        <div className="divide-y divide-white/[0.04]">
          {data.chaosResults.map((c: any, i: any) => (
            <div key={i} className="px-6 py-3 flex items-start gap-4"
          >
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${c.graceful ? "bg-green-400" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{c.service}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${c.graceful ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {c.graceful ? "Graceful" : "Crashes"}
                  </span>
                  <span className={`text-[10px] ml-auto ${SEVERITY_CONFIG[c.severity as keyof typeof SEVERITY_CONFIG]?.color ?? (isLight ? "text-gray-500" : "text-white/40")}`}>{c.severity}</span>
                </div>
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}
          >{c.scenario}</p>
                <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} mt-0.5`}>{c.impact}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attacks */}
      {openSection === "attacks" && (
        <div>
          {!isCreator && (data._lockedAttackCount ?? 0) > 0 && (
            <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} bg-amber-500/[0.03]`}>
              <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                {data._lockedAttackCount} attack vectors hidden - upgrade to Creator to see full exploit map
              </p>
            </div>
          )}
          {isCreator && data.attackSimulations.length === 0 && (
            <div className={`px-6 py-6 text-center ${isLight ? "text-gray-400" : "text-white/25"} text-sm`}>No attack simulations available</div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.attackSimulations.map((a: any, i: any) => (
              <div key={i} className="px-6 py-3 flex items-start gap-4">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${a.blocked ? "bg-green-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-bold ${isLight ? "text-gray-700" : "text-white/70"} ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} px-1.5 py-0.5 rounded`}>{a.type}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${a.blocked ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      {a.blocked ? "Blocked" : "Unblocked"}
                    </span>
                    <span className={`text-[10px] ml-auto ${SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG]?.color ?? (isLight ? "text-gray-500" : "text-white/40")}`}>{a.severity}</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{a.detail}</p>
                  {a.vector && <p className={`text-[10px] font-mono ${isLight ? "text-gray-400" : "text-white/25"} mt-1 truncate`}>{a.vector}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`px-6 py-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.summary}</p>
      </div>
    </motion.div>
  );
}

// ── Predictive Intelligence Panel ────────────────────────────────────────────
function PredictiveIntelPanel({ data, isCreator }: { data: PredictiveIntelResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const colorMap: Record<string, string> = {
    red: "text-red-400",
    amber: "text-amber-400",
    green: "text-green-400",
    blue: "text-sky-400",
  };
  const bgMap: Record<string, string> = {
    red: "bg-red-500/[0.06] border-red-500/15",
    amber: "bg-amber-500/[0.06] border-amber-500/15",
    green: "bg-green-500/[0.06] border-green-500/15",
    blue: "bg-sky-500/[0.06] border-sky-500/15",
  };

  const ReleaseGauge = ({ score }: { score: number }) => {
    const color = score >= 70 ? "#4ade80" : score >= 45 ? "#f59e0b" : "#f87171";
    const r = 36;
    const circ = Math.PI * r;
    const dash = (score / 100) * circ;
    return (
      <div className="relative flex flex-col items-center justify-center" style={{ width: 100, height: 60 }}>
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d={`M 14 50 A ${r} ${r} 0 0 1 86 50`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
          <path d={`M 14 50 A ${r} ${r} 0 0 1 86 50`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: "stroke-dasharray 1.2s ease" }} />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold font-['Syne']" style={{ color }}>{score}</span>
          <span className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>Release Confidence</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Brain className="w-4 h-4 text-sky-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Predictive Intelligence</h2>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.confidenceLabel}</span>
      </div>

      <div className={`px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <div className="flex flex-col items-center justify-center gap-2">
          <ReleaseGauge score={data.releaseConfidenceScore} />
        </div>
        <div className="sm:col-span-2">
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>
            {isCreator ? data.narrative : data.narrative}
          </p>
          {!isCreator && data.narrative.startsWith("🔒") && (
            <Link href="/pricing" className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:underline">
              <Zap className="w-3 h-3" />Upgrade to unlock full narrative
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
        {(data.forecasts ?? []).map((f: any, i: any) => (
          <div key={i} className={`rounded-xl border p-3 ${bgMap[f.color] ?? bgMap.amber}`}>
            <div className={`text-lg font-bold font-['Syne'] ${colorMap[f.color] ?? "text-white/60"}`}>{f.value}</div>
            <div className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/50"} font-medium mt-0.5`}>{f.metric}</div>
            <div className={`flex items-center gap-0.5 mt-1 text-[10px] ${colorMap[f.color] ?? (isLight ? "text-gray-500" : "text-white/40")}`}>
              {f.trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : f.trend === "down" ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
              {f.trendLabel}
            </div>
            <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mt-1 leading-relaxed`}>{f.detail}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Root Cause Panel ──────────────────────────────────────────────────────────
function RootCausePanel({ data, isCreator }: { data: RootCauseResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const [expandedChain, setExpandedChain] = useState<number | null>(0);
  const [copiedPR, setCopiedPR] = useState<number | null>(null);

  const LAYERS = ["Source Code", "API Layer", "DB Layer", "Infrastructure", "Network", "Third Party"];
  const hopConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    clean:      { color: "text-green-400",                            bg: "bg-green-500/10 border-green-500/25",                                                dot: "bg-green-400",                        label: "Clean"      },
    implicated: { color: "text-red-400",                              bg: "bg-red-500/10 border-red-500/25",                                                    dot: "bg-red-400",                          label: "Implicated" },
    unknown:    { color: isLight ? "text-gray-400" : "text-white/30", bg: isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.08]",      dot: isLight ? "bg-gray-300" : "bg-white/20", label: "Unknown"  },
  };
  const getHopConfig = (s: string) => hopConfig[s] ?? hopConfig.unknown;

  const copyPR = async (pr: string, i: number) => {
    await navigator.clipboard.writeText(pr);
    setCopiedPR(i);
    setTimeout(() => setCopiedPR(null), 2000);
  };

  if (data.chains.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <GitMerge className="w-4 h-4 text-red-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Root Cause Engine</h2>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.chains.length} issue{data.chains.length !== 1 ? "s" : ""} traced</span>
      </div>

      <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{data.summary}</p>
      </div>

      <div className="divide-y divide-white/[0.04]"
          >
        {data.chains.map((chain: any, ci: any) => (
          <div key={ci}>
            <button
              onClick={() => setExpandedChain(expandedChain === ci ? null : ci)}
              className={`w-full px-6 py-4 flex items-center gap-3 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors text-left`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chain.issueSeverity === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"} truncate block`}>{chain.issueTitle}</span>
                <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>
                Origin: {chain.originLayer} · {chain.hops.filter(h => h.status === "implicated").length} layers implicated</span>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${chain.issueSeverity === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                {chain.issueSeverity}
              </span>
              {expandedChain === ci ? <ChevronUp className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"} shrink-0`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"} shrink-0`} />}
            </button>

            {expandedChain === ci && (
              <div className="px-6 pb-5 space-y-4">
                {/* Hop chain */}
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-0 min-w-max">
                    {LAYERS.map((layer, li) => {
                      const hop = chain.hops.find(h => h.layer === layer);
                      const status = hop?.status ?? "unknown";
                      const hc = getHopConfig(status);
                      return (
                        <div key={layer} className="flex items-center">
                          <div className={`rounded-xl border px-3 py-2 text-center w-28 ${hc.bg}`}>
                            <div className={`flex items-center justify-center gap-1 mb-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${hc.dot}`} />
                              <span className={`text-[9px] font-bold ${hc.color}`}>{hc.label}</span>
                            </div>
                            <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/50"} font-medium leading-tight`}>{layer}</div>
                            {hop?.evidence && (
                              <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/30"} mt-1 leading-tight line-clamp-2`}>{hop.evidence}</div>
                            )}
                          </div>
                          {li < LAYERS.length - 1 && (
                            <div className="w-4 h-px bg-white/10 mx-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blast radius */}
                <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs font-bold text-red-400"
          >Blast Radius</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} leading-relaxed`}>{chain.blastRadius}</p>
                </div>

                {/* Fix PR */}
                <div className={`border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl overflow-hidden`}>
                  <div className={`flex items-center gap-2 px-4 py-2 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} ${isLight ? "bg-gray-50/50" : "bg-white/[0.02]"}`}>
                    <Terminal className="w-3 h-3 text-green-400" />
                    <span className={`text-[11px] font-bold ${isLight ? "text-gray-500" : "text-white/50"} flex-1`}>Auto-Generated Fix PR</span>
                    {!chain.fixPR.startsWith("🔒") ? (
                      <button onClick={() => copyPR(chain.fixPR, ci)}
                        className={`flex items-center gap-1 text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}>
                        {copiedPR === ci ? <><CheckCheck className="w-2.5 h-2.5 text-green-400" />Copied!</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
                      </button>
                    ) : (
                      <Link href="/pricing" className="text-[10px] text-violet-400 hover:underline">Upgrade</Link>
                    )}
                  </div>
                  <pre className={`px-4 py-3 text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto`}>
                    {chain.fixPR}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Cleanup Radar Panel ───────────────────────────────────────────────────────
function CleanupRadarPanel({ data }: { data: NonNullable<ScanDetail["cleanupReport"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  const debtColor = data.debtScore >= 70 ? "text-red-400" : data.debtScore >= 40 ? "text-amber-400" : "text-green-400";
  const debtBg = data.debtScore >= 70 ? "bg-red-500/10 border-red-500/20" : data.debtScore >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20";

  const categoryColors: Record<string, string> = {
    security: "bg-red-500",
    performance: "bg-orange-500",
    typescript: "bg-blue-500",
    react: "bg-cyan-500",
    "dead-code": "bg-white/30",
    architecture: "bg-violet-500",
    "error-handling": "bg-amber-500",
    logging: "bg-yellow-500",
    testing: "bg-green-500",
    accessibility: "bg-emerald-500",
  };

  const cats = Object.entries(data.categories ?? {}).sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Layers className="w-4 h-4 text-amber-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Cleanup Radar</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${debtBg} ${debtColor}`}>
          Tech Debt {data.debtScore}/100
        </span>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {[
          { label: "Total Findings", value: data.totalFindings, color: "text-white/70" },
          { label: "Errors", value: data.errorCount, color: "text-red-400" },
          { label: "Auto-Fixable", value: data.autoFixableCount, color: "text-green-400" },
          { label: "Est. Fix Time", value: `${data.estimatedCleanupMinutes}m`, color: "text-sky-400" },
        ].map((s) => (
          <div key={s.label} className={`px-5 py-3 text-center border-r ${isLight ? "border-gray-200" : "border-white/[0.05]"} last:border-0`}>
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category bar chart */}
      {cats.length > 0 && (
        <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest mb-3`}>Debt by Category</div>
          <div className="space-y-2">
            {cats.slice(0, 6).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/40"} w-28 capitalize shrink-0`}
          >{cat}</span>
                <div className={`flex-1 h-1.5 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${categoryColors[cat] ?? "bg-white/30"}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} w-6 text-right`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}
          >{data.summary}</p>
      </div>

      {/* Top files */}
      {data.topFiles && data.topFiles.length > 0 && (
        <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest mb-2`}>Hotspot Files</div>
          <div className="flex flex-wrap gap-1.5">
            {data.topFiles.slice(0, 6).map((f: any) => (
              <span key={f.path} className={`text-[10px] font-mono border px-2 py-0.5 rounded ${isLight ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}>
                {f.path.split("/").pop()} <span className="text-red-400"
          >{f.issueCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Findings toggle */}
      {data.findings && data.findings.length > 0 && (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            className={`w-full px-6 py-3 flex items-center gap-2 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Show"} {data.findings.length} findings
          </button>
          {expanded && (
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {data.findings.slice(0, 20).map((f: any) => (
                <CleanupFindingRow key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CleanupFindingRow({ finding: f }: { finding: NonNullable<ScanDetail["cleanupReport"]>["findings"][0] }) {
  const isLight = useIsLight();
  const [rmCopied, setRmCopied] = useState(false);

  // Extract a git rm / npm uninstall command from fixSuggestion if auto-fixable
  const rmCmd = f.autoFixable
    ? f.fixSuggestion.match(/(?:git rm|npm uninstall|rm -rf?|npx rimraf)\s+\S+/)?.[0] ?? null
    : null;

  function copyRm() {
    if (!rmCmd) return;
    navigator.clipboard.writeText(rmCmd).catch(() => {});
    setRmCopied(true);
    setTimeout(() => setRmCopied(false), 2000);
  }

  return (
    <div className="px-6 py-2.5 flex items-start gap-3">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${f.severity === "error" ? "bg-red-400" : f.severity === "warn" ? "bg-amber-400" : "bg-white/20"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${isLight ? "text-gray-700" : "text-white/70"}`}>{f.title}</p>
        <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}
          >{f.file}{f.lineHint ? `:${f.lineHint}` : ""}</p>
        {f.fixSuggestion && <p className="text-[10px] text-green-400/60 mt-0.5 truncate">{f.fixSuggestion}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {rmCmd && (
          <button
            onClick={copyRm}
            title={`Copy: ${rmCmd}`}
            className="text-[9px] font-mono text-amber-400/70 border border-amber-500/20 px-1.5 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
          >
            {rmCopied ? "✓ Copied" : "Copy rm"}
          </button>
        )}
        {f.autoFixable && <span className="text-[9px] text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Auto</span>}
      </div>
    </div>
  );
}

// ── Pre-Launch Checklist ─────────────────────────────────────────────────────
function PreLaunchChecklist({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const storageKey = `checklist-${scan.id}`;
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
  });
  const [copied, setCopied] = useState(false);

  const unlockedIssues = scan.issues.filter((i: any) => !i.locked);
  if (unlockedIssues.length === 0) return null;

  const groups: Array<{ label: string; color: string; dot: string; items: typeof unlockedIssues }> = [
    { label: "Critical - Fix before launch", color: "text-red-400", dot: "bg-red-500", items: unlockedIssues.filter((i) => i.severity === "critical") },
    { label: "High - Fix this week", color: "text-amber-400", dot: "bg-amber-500", items: unlockedIssues.filter((i) => i.severity === "high") },
    { label: "Medium - Fix this month", color: "text-yellow-400", dot: "bg-yellow-500", items: unlockedIssues.filter((i) => i.severity === "medium") },
    { label: "Low - When time allows", color: "text-white/35", dot: "bg-white/20", items: unlockedIssues.filter((i) => i.severity === "low") },
  ].filter((g) => g.items.length > 0);

  const total = unlockedIssues.length;
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = (id: number) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const copyMarkdown = async () => {
    const lines = [`# Pre-Launch Checklist - ${scan.sourceInput}`, `Score: ${scan.score ?? "??"}/100`, ""];
    for (const g of groups) {
      lines.push(`## ${g.label}`);
      for (const item of g.items) {
        lines.push(`- [${checked[item.id] ? "x" : " "}] **${item.title}** - ${item.description.slice(0, 120)}…`);
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <ListChecks className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Pre-Launch Checklist</h2>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
        {done}/{total} resolved</span>
        <button onClick={copyMarkdown}
          className={`flex items-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/60 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} hover:border-white/15 px-3 py-1.5 rounded-lg transition-all`}
          >
          {copied ? <><CheckCheck className="w-3 h-3 text-green-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy MD</>}
        </button>
      </div>

      {/* Progress bar */}
      <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <div className="flex items-center gap-3">
          <div className={`flex-1 h-1.5 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} rounded-full overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${pct === 100 ? "text-green-400" : isLight ? "text-gray-500" : "text-white/40"}`}>{pct}%</span>
          {pct === 100 && <span className="text-xs text-green-400 font-semibold">Launch ready! 🚀</span>}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {groups.map((g) => (
          <div key={g.label} className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wide ${g.color}`}>{g.label}</span>
            </div>
            <div className="space-y-2">
              {g.items.map((item: any) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 mt-0.5 rounded shrink-0 border flex items-center justify-center transition-all ${
                    checked[item.id]
                      ? "bg-green-500 border-green-500"
                      : "bg-white/[0.04] border-white/[0.12] group-hover:border-white/25"
                  }`}
                    onClick={() => toggle(item.id)}>
                    {checked[item.id] && <CheckCheck className={`w-2.5 h-2.5 ${isLight ? "text-gray-900" : "text-white"}`} />}
                  </div>
                  <div className="flex-1 min-w-0"
          >
                    <p className={`text-sm font-medium transition-colors ${checked[item.id] ? (isLight ? "text-gray-400 line-through" : "text-white/25 line-through") : (isLight ? "text-gray-700" : "text-white/75")}`}>
                      {item.title}
                    </p>
                    <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5 leading-relaxed line-clamp-2`}>{item.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StickyLaunchAlertBanner({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const [dismissed, setDismissed] = useState(false);
  const critCount = scan.issueCounts?.critical ?? 0;
  const hasRevenueLeak =
    scan.revenueIntelligence &&
    scan.revenueIntelligence.overallRevenueRisk !== "low";

  if (dismissed || (critCount === 0 && !hasRevenueLeak)) return null;
  const isRevAlert = critCount === 0 && hasRevenueLeak;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.4 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
      <div className={`rounded-2xl px-5 py-3.5 backdrop-blur-xl flex items-center gap-4 shadow-2xl border ${
        isRevAlert ? "bg-amber-950/90 border-amber-500/30" : "bg-red-950/90 border-red-500/30"
      }`}>
        <AlertTriangle className={`w-5 h-5 shrink-0 ${isRevAlert ? "text-amber-400" : "text-red-400"}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
        
            {isRevAlert ? "⚠️ Revenue Alert" : "⚠️ Launch Security Alert"}
          </p>
          <p className={`text-xs mt-0.5 truncate ${isRevAlert ? "text-amber-300/70" : "text-red-300/70"}`}>
            {isRevAlert
              ? `${scan.revenueIntelligence?.estimatedMonthlyImpact ?? "Potential revenue loss"} at risk`
              : `${critCount} critical blocker${critCount !== 1 ? "s" : ""} - fix before going live`}
          </p>
        </div>
        <Link href="/pricing" className="shrink-0">
          <button className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${
            isRevAlert
              ? `bg-amber-500/80 hover:bg-amber-500 ${isLight ? "text-gray-900" : "text-white"} border border-amber-400/30`
              : `bg-red-500/80 hover:bg-red-500 ${isLight ? "text-gray-900" : "text-white"} border border-red-400/30`
          }`}>
            Fix Before Launch
          </button>
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 w-7 h-7 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/[0.07]"} hover:bg-white/[0.12] flex items-center justify-center transition-colors ${isLight ? "text-gray-500" : "text-white/40"} hover:text-white`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function LockedInsightsPanel({ scan, plan }: { scan: ScanDetail; plan: string }) {
  const isLight = useIsLight();
  const isCreator = plan === "creator" || plan === "enterprise";
  if (isCreator) return null;

  const items: Array<{ label: string; detail: string; IconCmp: typeof Target }> = [];
  if (scan.riskForecast) items.push({
    label: "Launch Risk Forecast",
    detail: `Churn risk: ${scan.riskForecast.churnRisk}`,
    IconCmp: Target,
  });
  if (scan.revenueIntelligence) items.push({
    label: `Revenue Leakage: ${scan.revenueIntelligence.leaks.length} findings`,
    detail: scan.revenueIntelligence.estimatedMonthlyImpact ?? "Revenue at risk",
    IconCmp: DollarSign,
  });
  if (scan.digitalTwin) items.push({
    label: "Digital Twin Simulation",
    detail: `${scan.digitalTwin.simulatedUserCount ?? "?"} user journeys simulated`,
    IconCmp: Globe,
  });
  if (scan.predictiveIntel) items.push({
    label: "Predictive Intelligence",
    detail: `Release confidence: ${scan.predictiveIntel.releaseConfidenceScore}%`,
    IconCmp: Brain,
  });
  if (scan.rootCause && scan.rootCause.chains.length > 0) items.push({
    label: "Root Cause Engine",
    detail: `${scan.rootCause.chains.length} issue chain${scan.rootCause.chains.length !== 1 ? "s" : ""} traced`,
    IconCmp: Target,
  });
  if (scan.launchImpact) items.push({
    label: "Launch Impact Calculator",
    detail: scan.launchImpact.totalRevenueAtRisk,
    IconCmp: DollarSign,
  });
  if (scan.productHuntScore) items.push({
    label: "Product Hunt Readiness",
    detail: `Score: ${scan.productHuntScore.score}/100`,
    IconCmp: Award,
  });

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-indigo-500/[0.03] rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-violet-400" />
        <h3 className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"} font-['Syne']`}>Locked Premium Insights</h3>
        <span className="ml-auto text-[11px] text-violet-400/70 border border-violet-500/20 px-2 py-0.5 rounded-full">
          {items.length} report{items.length !== 1 ? "s" : ""} detected
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
        {items.map((item, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-3 ${isLight ? "bg-gray-50/50" : "bg-white/[0.02]"} border ${isLight ? "border-gray-200" : "border-white/[0.06]"} rounded-xl`}>
            <item.IconCmp className="w-3.5 h-3.5 text-violet-400/50 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/60"} leading-tight`}>🔒 {item.label}</p>
              <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5 truncate`}>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/pricing">
        <button className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-xs py-3 rounded-xl hover:bg-white/90 transition-all">
          Unlock All Reports - Creator Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  );
}

function LaunchImpactPanel({ data }: { data: NonNullable<ScanDetail["launchImpact"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <DollarSign className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Impact Calculator</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Real Cost</span>
      </div>
      <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-3.5">
        <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1 font-medium">Total Revenue at Risk</div>
        <div className="text-lg font-bold text-red-400"
          >{data.totalRevenueAtRisk}</div>
        <div className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} mt-0.5`}>{data.supportCostPerMonth}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-1.5`}>Trust Impact</div>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>{data.trustImpact}</p>
        </div>
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-1.5`}>User Impact</div>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>{data.userImpact}</p>
        </div>
      </div>
      {data.topRisk && (
        <div className="border border-amber-500/15 bg-amber-500/[0.04] rounded-xl px-4 py-3">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide mb-1">Top Risk</div>
          <p className="text-xs text-amber-300/80">{data.topRisk}</p>
        </div>
      )}
      {data.founderWarning && (
        <div className="border border-red-500/20 bg-red-500/[0.05] rounded-xl p-4">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1.5 font-medium">⚠️ Founder Warning</div>
          <p className="text-sm text-red-300/80 leading-relaxed">{data.founderWarning}</p>
        </div>
      )}
      {data.breakdown && data.breakdown.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Show"} per-issue breakdown ({data.breakdown.length} issues)
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {data.breakdown.map((item: any, i: any) => {
                const sev = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
                return (
                  <div key={i} className={`border rounded-xl p-3 ${sev.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sev.badge}`}>{item.severity}</span>
                      <span className={`text-xs font-medium ${isLight ? "text-gray-700" : "text-white/70"} flex-1 line-clamp-1`}>{item.issueTitle}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Revenue</div>
                        <div className="text-[10px] text-red-400/80">{item.revenueImpact}</div>
                      </div>
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Trust</div>
                        <div className="text-[10px] text-amber-400/80 line-clamp-1">{item.trustImpact}</div>
                      </div>
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Support</div>
                        <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} line-clamp-1`}>{item.supportHours}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductHuntPanel({ data }: { data: NonNullable<ScanDetail["productHuntScore"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);
  const scoreColor = data.score >= 70 ? "text-green-400" : data.score >= 50 ? "text-amber-400" : "text-red-400";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (data.score / 100) * circ;
  const ringColor = data.score >= 70 ? "#4ade80" : data.score >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Award className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Product Hunt Readiness</h2>
        <span className={`ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          data.readyToHunt
            ? "bg-green-500/15 text-green-400 border-green-500/25"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          {data.readyToHunt ? "🚀 Ready to Hunt" : "⚠️ Not Yet Ready"}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={ringColor} strokeWidth="6"
              strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-['Syne'] ${scoreColor}`}>{data.score}</span>
            <span className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>/100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{data.verdict}</p>
          {data.topBlockers && data.topBlockers.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {data.topBlockers.slice(0, 2).map((b: any, i: any) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400/80">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {data.categories && data.categories.length > 0 && (
        <div className="space-y-2"
          >
          {data.categories.map((cat: any) => {
            const isExp = expanded === cat.name;
            const statusColor = cat.status === "pass" ? "text-green-400" : cat.status === "warning" ? "text-amber-400" : "text-red-400";
            const statusBg = cat.status === "pass" ? "bg-green-500/[0.07] border-green-500/15" : cat.status === "warning" ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-red-500/[0.06] border-red-500/15";
            const catR = 10;
            const catCirc = 2 * Math.PI * catR;
            const catDash = (cat.score / 100) * catCirc;
            return (
              <div key={cat.name} className={`border rounded-xl overflow-hidden ${statusBg}`}>
                <button
                  onClick={() => setExpanded(isExp ? null : cat.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
                >
                  <div className="w-8 h-8 shrink-0 relative">
                    <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
                      <circle cx="16" cy="16" r={catR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="16" cy="16" r={catR} fill="none"
                        stroke={cat.status === "pass" ? "#4ade80" : cat.status === "warning" ? "#f59e0b" : "#f87171"}
                        strokeWidth="3"
                        strokeDasharray={`${catDash} ${catCirc - catDash}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[8px] font-bold ${statusColor}`}>{cat.score}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/70"} flex-1 text-left`}>{cat.name}</span>
                  <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{cat.status}</span>
                  {isExp ? <ChevronUp className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/20"}`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/20"}`} />}
                </button>
                {isExp && cat.findings.length > 0 && (
                  <div className={`px-4 pb-3 pt-2 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} space-y-1`}>
                    {cat.findings.map((f: any, i: any) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/45"}`}>
                        <span className={`${isLight ? "text-gray-400" : "text-white/20"} mt-0.5 shrink-0`}>·</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CofounderQAPanel({ scanId }: { scanId: number }) {
  const isLight = useIsLight();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [askedQ, setAskedQ] = useState("");

  const PRESET_QUESTIONS = [
    "Should I launch?",
    "What scares you most?",
    "What should I fix first?",
    "What can wait?",
  ];

  const ask = async (q: string) => {
    setLoading(true);
    setAskedQ(q);
    setAnswer("");
    setQuestion("");
    try {
      const data = await api.scans.ask(scanId, q);
      setAnswer(data.answer ?? "Unable to generate answer.");
    } catch {
      setAnswer("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5`}>
      <div className="flex items-center gap-2">
        <Brain className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Ask Your Technical Co-Founder</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>Powered by your scan data</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-full border ${isLight ? "border-gray-200" : "border-white/[0.1]"} ${isLight ? "bg-gray-50" : "bg-white/[0.04]"} text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-40`}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && question.trim()) ask(question.trim()); }}
          placeholder="Ask anything about your scan…"
          className={`flex-1 ${isLight ? "bg-gray-50" : "bg-white/[0.04]"} border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm ${isLight ? "text-gray-900" : "text-white"} placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-all`}
        />
        <button
          onClick={() => question.trim() && ask(question.trim())}
          disabled={loading || !question.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-400 disabled:opacity-40 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {(loading || answer) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-violet-500/[0.05] border border-violet-500/15 rounded-xl p-4 space-y-2"
        >
          {askedQ && <p className="text-[10px] text-violet-400/60 font-medium">Q: {askedQ}</p>}
          {loading ? (
            <div className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>
        
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </div>
          ) : (
            <p className={`text-sm ${isLight ? "text-gray-700" : "text-white/70"} leading-relaxed`}>{answer}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ── Premium Animated Scan Loading Screen ─────────────────────────────── */
const ANALYSIS_STEPS = [
  { label: "Security & Authentication", icon: "🔐", color: "#f87171" },
  { label: "Compliance & Regulatory",   icon: "📋", color: "#60a5fa" },
  { label: "Revenue Intelligence",      icon: "💰", color: "#34d399" },
  { label: "Performance Analysis",      icon: "⚡", color: "#fbbf24" },
  { label: "UX & Conversion",           icon: "👁️", color: "#a78bfa" },
  { label: "Reliability & Errors",      icon: "🛡️", color: "#fb923c" },
  { label: "Data & Architecture",       icon: "🗄️", color: "#22d3ee" },
  { label: "Synthesizing Report",       icon: "✨", color: "#f472b6" },
];

function ScanRunningScreen({
  t,
  sourceInput,
}: {
  t: Record<string, string>;
  sourceInput?: string | null;
}) {
  const isLight = useIsLight();
  const [elapsed, setElapsed] = useState(0);
  const [visibleStep, setVisibleStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (visibleStep >= ANALYSIS_STEPS.length - 1) return;
    const avgPerStep = 8;
    const expected = Math.floor(elapsed / avgPerStep);
    setVisibleStep((s) => Math.min(expected, ANALYSIS_STEPS.length - 2));
  }, [elapsed]);

  const progress = Math.min((elapsed / 70) * 100, 93);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (progress / 100) * circ;

  const glowColor = "#8b5cf6";

  return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center px-6`}>
      {/* ── Ambient glow ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-sm w-full space-y-8 z-10">
        {/* ── Progress ring ─── */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            {/* Outer glow ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[-8px] rounded-full"
              style={{ boxShadow: `0 0 32px 8px ${glowColor}25` }}
            />
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              <circle cx="65" cy="65" r={r} fill="none" strokeWidth="5"
                stroke="rgba(255,255,255,0.06)" />
              {/* Animated progress arc */}
              <motion.circle cx="65" cy="65" r={r} fill="none" strokeWidth="5"
                stroke={glowColor} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                animate={{ strokeDasharray: [`${dash} ${circ - dash}`] }}
                style={{ filter: `drop-shadow(0 0 6px ${glowColor}80)`, transition: "stroke-dasharray 1.2s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.15, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-3xl font-extrabold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}
              >
                {Math.round(progress)}
              </motion.span>
              <span className={`text-[10px] font-medium ${isLight ? "text-gray-400" : "text-white/30"}`}>%</span>
            </div>
          </div>

          <div className="text-center space-y-1.5"
          >
            <h2 className={`text-lg font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white/90"}`}>
              Reviewing your app
            </h2>
            <p className={`text-sm ${isLight ? "text-gray-400" : "text-white/35"}`}>
              {elapsed}s elapsed · auto-refreshing every 3s
            </p>
          </div>
        </div>

        {/* ── Analysis step list ─── */}
        <div className="space-y-2">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < visibleStep;
            const active = i === visibleStep;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                  done
                    ? "bg-green-500/[0.06] border-green-500/20"
                    : active
                      ? (isLight ? "bg-violet-50 border-violet-200 shadow-sm" : "bg-violet-500/[0.10] border-violet-500/30 shadow-[0_0_16px_rgba(139,92,246,0.15)]")
                      : (isLight ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/[0.05]")
                }`}
              >
                <span className={`text-base transition-all duration-300 ${(!done && !active) ? "grayscale opacity-30" : ""}`}>
                  {step.icon}
                </span>
                <span className={`text-sm flex-1 font-medium transition-all duration-300 ${
                  done ? "text-green-400"
                    : active ? "text-violet-300"
                    : (isLight ? "text-gray-400" : "text-white/20")
                }`}>
                  {step.label}
                </span>
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  </motion.div>
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-4 h-4 shrink-0 text-violet-400" />
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* ── Source chip ─── */}
        {sourceInput && (
          <div className={`flex items-center justify-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>
            <Search className="w-3 h-3" />
            <span className="truncate max-w-[240px]">{sourceInput}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanResultsPage() {
  const { user, loading } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/scans/:id");
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "runtime" | "static" | "ai_reasoning">("all");
  const [rescanning, setRescanning] = useState(false);
  const t = {
    page: isLight ? "bg-[#fdf4f8] text-gray-900 overflow-x-hidden" : "bg-[#050505] text-white overflow-x-hidden",
    nav: isLight ? "bg-white/90 border-pink-100/80 backdrop-blur-2xl" : "bg-[#050505]/80 border-white/[0.07] backdrop-blur-2xl",
    navText: isLight ? "text-gray-500 hover:text-gray-900 transition-colors" : "text-white/30 hover:text-white transition-colors",
    navBrand: isLight ? "text-gray-900 font-bold font-['Syne'] text-sm" : "text-white font-bold font-['Syne'] text-sm",
    navMeta: isLight ? "text-gray-400 text-xs ml-2 truncate hidden sm:block max-w-xs" : "text-white/20 text-xs ml-2 truncate hidden sm:block max-w-xs",
    tabBar: isLight ? "bg-white/95 backdrop-blur-2xl border-b border-pink-100/70" : "bg-[#050505]/95 backdrop-blur-2xl border-b border-white/[0.06]",
    tabActive: isLight ? "bg-gray-900 text-white shadow-sm" : "bg-white/[0.1] border border-white/20 text-white",
    tabInactive: isLight ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100" : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
    tabCountActive:   "bg-white/15 text-white/80",
    tabCountInactive: isLight ? "bg-pink-100/40 text-gray-500" : "bg-white/[0.07] text-white/30",
    navBtn:           isLight ? "flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg border border-pink-100/80 hover:border-pink-300" : "flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/15",
    ambient:          isLight ? "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.75)_0%,_transparent_55%)] pointer-events-none" : "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)] pointer-events-none",
  };

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user || !params?.id) return;
    const id = Number(params.id);
    let active = true;

    const load = async () => {
      const result = await api.scans.get(id).catch(() => null);
      if (!active) return;
      if (result) {
        if (result.status === "failed") {
          // Auto-retry silently — show running state while we restart
          try {
            await api.scans.rescan(id);
          } catch {
            // If rescan fails (e.g. already retried), just show the scan as-is
            setScan(result);
            setScanLoading(false);
            return;
          }
          if (!active) return;
          setScan({ ...result, status: "running" });
          setScanLoading(false);
          setTimeout(load, 3000);
        } else {
          setScan(result);
          setScanLoading(false);
          if (result.status === "running") {
            setTimeout(load, 3000);
          }
        }
      } else {
        setScanLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [user, params?.id]);

  if (loading || !user) return null;

  if (scanLoading) return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
      <div className="text-center space-y-4">
        <div className={`w-12 h-12 rounded-2xl ${isLight ? "bg-white border border-gray-200" : "glass"} flex items-center justify-center mx-auto`}>
          <Loader2 className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-white/60"} animate-spin`} />
        </div>
        <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-sm`}
          >Loading report…</p>
      </div>
    </div>
  );

  if (!scan) return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
      <p className={`${isLight ? "text-gray-400" : "text-white/25"}`}>Report not found</p>
    </div>
  );

  if (scan.status === "running") return (
    <ScanRunningScreen t={t} sourceInput={scan.sourceInput} />
  );

  if (scan.status === "failed") {
    const handleRescan = async () => {
      if (!params?.id) return;
      setRescanning(true);
      try {
        await api.scans.rescan(Number(params.id));
        setScan((prev: any) => prev ? { ...prev, status: "running" } : prev);
        setRescanning(false);
      } catch {
        setRescanning(false);
      }
    };
    return (
      <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
        <div className="text-center space-y-5 max-w-sm px-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${isLight ? "bg-white border border-gray-200" : "glass"}`}>
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
          </div>
          <div className="space-y-2">
            <h2 className={`${isLight ? "text-gray-800" : "text-white/80"} text-base font-semibold`}>Sorry for the trouble!</h2>
            <p className={`${isLight ? "text-gray-500" : "text-white/40"} text-sm leading-relaxed`}>We ran into an issue during your review. Don't worry — this doesn't count against your quota. Hit the button below and we'll get your scan right back.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleRescan}
              disabled={rescanning}
              className={`flex items-center justify-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 ${isLight ? "bg-gray-900 hover:bg-gray-800 text-white" : "bg-white hover:bg-white/90 text-black"}`}
            >
              {rescanning ? <><Loader2 className="w-4 h-4 animate-spin" />Getting your scan back…</> : <>Try Again — Get My Scan Back</>}
            </button>
            <Link href="/scans/new">
              <button className={`text-sm ${isLight ? "text-gray-400 hover:text-gray-600" : "text-white/35 hover:text-white/55"} transition-colors`}>
                Start a new scan instead
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rawVerdict =
    scan.launchVerdict ??
    (scan.score != null
      ? scan.score >= 80
        ? "ready"
        : scan.score >= 55
          ? "caution"
          : "do-not-launch"
      : null);
  const verdictKey = rawVerdict as keyof typeof VERDICT_CONFIG | null;
  const verdict = verdictKey ? VERDICT_CONFIG[verdictKey] : null;

  const agents = Array.from(new Set(scan.issues.map((i: any) => i.agentName)));
  const agentFiltered = activeAgent
    ? scan.issues.filter((i: any) => i.agentName === activeAgent)
    : scan.issues;
  const filteredIssues =
    evidenceFilter === "all"
      ? agentFiltered
      : agentFiltered.filter(
          (i: any) => (i.sourceEvidence ?? "ai_reasoning") === evidenceFilter,
        );
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...filteredIssues].sort(
    (a, b) =>
      (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
      (severityOrder[b.severity as keyof typeof severityOrder] ?? 4),
  );

  const topThree = sortedIssues.slice(0, 3);
  const remaining = sortedIssues.slice(3);

  const runtimeCount = agentFiltered.filter(
    (i: any) => i.sourceEvidence === "runtime",
  ).length;
  const staticCount = agentFiltered.filter(
    (i: any) => i.sourceEvidence === "static",
  ).length;
  const aiCount = agentFiltered.filter(
    (i: any) => !i.sourceEvidence || i.sourceEvidence === "ai_reasoning",
  ).length;

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className={t.ambient} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />
      {isLight && <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
        </svg>
        <svg className="w-full opacity-[0.07] -mt-24" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V180 H0 Z" />
        </svg>
      </div>}

      <nav className={`border-b sticky top-0 z-10 ${t.nav}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={t.navText}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Agenario"
              className="w-7 h-7 rounded-xl object-cover"
            />
            <span className={t.navBrand}>Launch Report</span>
          </div>
          <span className={t.navMeta}>{scan.sourceInput}</span>
          <div className="ml-auto flex items-center gap-2">
            {scan.score != null && <ShareBadgeButton scan={scan} />}
            <Link href="/portfolio">
              <button className={t.navBtn}>
                <BarChart3 className="w-3 h-3" />
                Portfolio
              </button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {/* ── Sticky Launch Alert Banner ───────────────────── */}
        <StickyLaunchAlertBanner scan={scan} />

        {/* ── Verdict banner ───────────────────────────────── */}
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-2xl px-6 py-5 flex items-center gap-5 ${verdict.bg}`}
          >
            <verdict.icon className={`w-7 h-7 ${verdict.color} shrink-0`} />
            <div className="flex-1">
              <div
                className={`text-lg font-bold font-['Syne'] ${verdict.color}`}
              >
                {verdict.label}
              </div>
              <p
                className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"} mt-0.5`}
              >
                {verdict.sublabel}
              </p>
            </div>
            {scan.score != null && (
              <div className="shrink-0 flex flex-col items-end gap-2">
                <div className="text-right">
                  <div
                    className={`text-3xl font-bold font-['Syne'] ${verdict.scoreColor}`}
                  >
                    {scan.score}
                  </div>
                  <div
                    className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}
                  >
                    Launch Score
                  </div>
                </div>
                <button
                  onClick={() => {
                    const text = `My app scored ${scan.score}/100 on Agenario 🔐 - ${verdict?.label}. Free AI security & launch audit:`;
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://agenario.tech")}`,
                      "_blank",
                    );
                  }}
                  className={`flex items-center gap-1 text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 border ${isLight ? "border-gray-200" : "border-white/[0.08]"} hover:border-white/20 px-2.5 py-1 rounded-lg transition-all`}
                >
                  𝕏 Share
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Locked Premium Insights (free users) ─────────── */}
        <LockedInsightsPanel scan={scan} plan={user.plan} />

        {/* ── Section Tab Navigation ───────────────────────── */}
        <div
          className={`sticky top-[57px] z-[9] -mx-6 px-6 py-2.5 ${t.tabBar}`}
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-4xl">
            {[
              { id: "overview", label: "Overview" },
              {
                id: "issues",
                label: "Issues",
                count: scan.issues.filter((i) => !i.locked).length || undefined,
              },
              { id: "intelligence", label: "Intelligence" },
              { id: "compliance", label: "Compliance" },
              {
                id: "advanced",
                label: "Advanced",
                badge:
                  user.plan === "creator" || user.plan === "enterprise"
                    ? undefined
                    : "🔒",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-lg transition-all font-medium shrink-0 ${
                  activeTab === tab.id ? t.tabActive : t.tabInactive
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? t.tabCountActive : t.tabCountInactive}`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="text-[10px] opacity-50">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Overview Tab ─────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* ── Executive summary row ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div
                className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-5 flex flex-col items-center justify-center gap-4`}
              >
                {scan.score != null ? (
                  <ScoreRing score={scan.score} />
                ) : (
                  <Loader2
                    className={`w-8 h-8 ${isLight ? "text-gray-400" : "text-white/30"} animate-spin`}
                  />
                )}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {scan.framework && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.framework}
                    </span>
                  )}
                  {scan.vibeTool && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.vibeTool.replace("-", " ")}
                    </span>
                  )}
                  {scan.businessType && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.businessType.replace("-", " ")}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`lg:col-span-2 ${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText
                    className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`}
                  />
                  <h2
                    className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
                  >
                    Executive Summary
                  </h2>
                </div>
                <p
                  className={`${isLight ? "text-gray-500" : "text-white/55"} text-sm leading-relaxed`}
                >
                  {scan.summary ?? "Analysis in progress…"}
                </p>

                {scan.issueCounts && (
                  <div className="grid grid-cols-4 gap-2 mt-5">
                    {[
                      {
                        label: "Critical",
                        count: scan.issueCounts.critical,
                        color: "text-red-400",
                      },
                      {
                        label: "High",
                        count: scan.issueCounts.high,
                        color: "text-amber-400",
                      },
                      {
                        label: "Medium",
                        count: scan.issueCounts.medium,
                        color: "text-yellow-400",
                      },
                      {
                        label: "Low",
                        count: scan.issueCounts.low,
                        color: "text-gray-400",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"} border rounded-xl p-3 text-center`}
                      >
                        <div
                          className={`text-xl font-bold font-['Syne'] ${s.color}`}
                        >
                          {s.count}
                        </div>
                        <div
                          className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── VibeCode Intelligence Network ─────────────────── */}
            {scan.vibeTool && scan.vibeTool !== "unknown" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <VibeCodeIntelPanel
                  vibeTool={scan.vibeTool}
                  issues={scan.issues}
                  vibeToolRank={scan.benchmarkPercentile?.vibeToolRank}
                />
              </motion.div>
            )}
          </>
        )}

        {/* ── Intelligence Tab ─────────────────────────────── */}
        {activeTab === "intelligence" && (
          <>
            {/* ── Launch Impact Calculator - Creator only ──────── */}
            {scan.launchImpact && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Launch Impact Calculator"
                  preview="Per-issue revenue risk in Rs., trust impact, support burden, and a direct founder warning"
                >
                  <LaunchImpactPanel data={scan.launchImpact} />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Visual Evidence Gallery (Runtime Proofs) ─────── */}
            {scan.proofEvidence && scan.proofEvidence.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <ProofEvidencePanel evidence={scan.proofEvidence} />
                </motion.div>
                <ConfidenceBadges evidence={scan.proofEvidence} />
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 aurora-card`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Camera className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
                  <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Live Sandbox Proofs</h2>
                </div>
                <div className={`rounded-xl border border-dashed p-6 text-center ${isLight ? "border-gray-200 bg-gray-50/50" : "border-white/[0.07] bg-white/[0.02]"}`}>
                  <div className={`text-sm font-medium mb-1.5 ${isLight ? "text-gray-500" : "text-white/50"}`}>
                    {scan.sourceType === "description"
                      ? "This analysis used a text description — live sandbox proofs require actual code or a live URL."
                      : "This code isn't eligible for live proofs — our sandbox couldn't execute it in a controlled environment."}
                  </div>
                  <div className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
                    Submit a GitHub repo or ZIP for screenshot-backed runtime evidence.
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Launch DNA ────────────────────────────────────── */}
            {scan.launchDNA && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <LaunchDNAPanel dna={scan.launchDNA} />
              </motion.div>
            )}

            {/* ── Product Hunt Readiness - Creator only ─────────── */}
            {scan.productHuntScore && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.085 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Product Hunt Readiness"
                  preview="6-category Product Hunt score covering mobile UX, onboarding, analytics, social features, error resilience, and traffic readiness"
                >
                  <ProductHuntPanel data={scan.productHuntScore} />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Technical Co-Founder Narrative ───────────────── */}
            {scan.cofounderNarrative && scan.cofounderNarrative.length > 20 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
              >
                <CofounderNarrativePanel narrative={scan.cofounderNarrative} />
              </motion.div>
            )}

            {/* ── Launch Replay ─────────────────────────────────── */}
            {scan.launchReplaySteps && scan.launchReplaySteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
              >
                <LaunchReplaySection steps={scan.launchReplaySteps} />
              </motion.div>
            )}

            {/* ── Regression Memory ────────────────────────────── */}
            {scan.regressionDiff && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
              >
                <RegressionPanel diff={scan.regressionDiff} />
              </motion.div>
            )}

            {/* ── Benchmark Percentile ─────────────────────────── */}
            {scan.benchmarkPercentile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BenchmarkPanel data={scan.benchmarkPercentile} />
              </motion.div>
            )}

            {/* ── Launch Risk Forecast - Creator only ──────────── */}
            {scan.riskForecast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Launch Risk Forecast"
                  preview="AI-powered churn risk, checkout failure probability, and revenue-at-risk estimates"
                >
                  <RiskForecastSection forecast={scan.riskForecast} />
                </CreatorGate>
              </motion.div>
            )}
          </>
        )}

        {/* ── Compliance Tab ───────────────────────────────── */}
        {activeTab === "compliance" && (
          <>
            {/* ── Compliance Audit - Creator only ──────────────── */}
            {scan.complianceResults && scan.complianceResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="8-Framework Compliance Audit"
                  preview="Full scoring across GDPR, OWASP, PCI-DSS, HIPAA, SOC2, ISO 27001, CCPA & WCAG 2.1"
                >
                  <ComplianceSection results={scan.complianceResults} />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Revenue Intelligence - Creator only ──────────── */}
            {scan.revenueIntelligence && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Revenue Intelligence"
                  preview="Payment flow leaks, billing edge cases, churn risk factors, and monthly revenue impact estimates"
                >
                  <RevenueIntelligenceSection
                    revenue={scan.revenueIntelligence}
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Shadow API Radar - Creator only ──────────────── */}
            {scan.shadowApiFindings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Shadow API Radar"
                  preview="Orphaned endpoints, undocumented routes, and API surface attack vector analysis"
                >
                  <ShadowApiPanel findings={scan.shadowApiFindings} />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Secret & API Key Scanner ──────────────────────── */}
            {scan.secretScanResults && (
              <SecretScanPanel
                data={scan.secretScanResults}
                isCreator={
                  user.plan === "creator" || user.plan === "enterprise"
                }
              />
            )}

            {/* ── Dependency CVE Tracker ───────────────────────── */}
            {scan.packageVulns && (
              <PackageVulnsPanel
                data={scan.packageVulns}
                isCreator={
                  user.plan === "creator" || user.plan === "enterprise"
                }
              />
            )}
          </>
        )}

        {/* ── Advanced Tab ─────────────────────────────────── */}
        {activeTab === "advanced" && (
          <>
            {/* ── Digital Twin Simulation - Creator only ────────── */}
            {scan.digitalTwin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.23 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Digital Twin Simulation"
                  preview="Virtual user journeys, chaos engineering probes, and attack vector simulations across your app"
                >
                  <DigitalTwinPanel
                    data={scan.digitalTwin}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Predictive Intelligence - Creator only ────────── */}
            {scan.predictiveIntel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Predictive Intelligence"
                  preview="Release confidence score, outage probability, churn risk, and revenue-at-risk forecasts"
                >
                  <PredictiveIntelPanel
                    data={scan.predictiveIntel}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Root Cause Engine - Creator only ──────────────── */}
            {scan.rootCause && scan.rootCause.chains.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.27 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Root Cause Engine"
                  preview="6-layer architectural blast radius tracing with auto-generated fix PR descriptions"
                >
                  <RootCausePanel
                    data={scan.rootCause}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* ── Cleanup Radar - Creator only ──────────────────── */}
            {scan.cleanupReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Cleanup Radar"
                  preview="Tech debt score, category breakdown, hotspot files, and auto-fixable findings list"
                >
                  <CleanupRadarPanel data={scan.cleanupReport} />
                </CreatorGate>
              </motion.div>
            )}
          </>
        )}

        {/* ── Issues Tab ───────────────────────────────────── */}
        {activeTab === "issues" && (
          <>
            {/* ── Top 3 Action Plan ────────────────────────────── */}
            {topThree.length > 0 && (
              <div
                className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6`}
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp
                    className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`}
                  />
                  <h2
                    className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
                  >
                    Top 3 Priority Actions
                  </h2>
                  <span
                    className={`ml-auto text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}
                  >
                    Address these first
                  </span>
                </div>
                <div className="space-y-3">
                  {topThree.map((issue, i) => (
                    <EvidenceCard
                      key={issue.id}
                      issue={issue}
                      rank={i + 1}
                      scanId={scan.id}
                      isCreator={user.plan === "creator"}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Pre-Launch Checklist ─────────────────────────── */}
            {!activeAgent && scan.issues.length > 0 && (
              <PreLaunchChecklist scan={scan} />
            )}

            {/* ── Confidence legend ────────────────────────────── */}
            <div
              className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-xl px-5 py-3`}
            >
              <div className="flex flex-wrap gap-2 items-center">
                <span
                  className={`${isLight ? "text-gray-400" : "text-white/20"} uppercase tracking-widest font-medium text-[10px] mr-1`}
                >
                  Confidence
                </span>
                {[
                  {
                    badge: "bg-green-500/15 text-green-400 border-green-500/25",
                    label: "🟢 99% Browser Runtime Proof",
                  },
                  {
                    badge: "bg-green-500/10 text-green-400 border-green-500/20",
                    label: "🔵 90% HTTP Runtime Proof",
                  },
                  {
                    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
                    label: "🔵 75% Static Code Evidence",
                  },
                  {
                    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    label: "🟡 60% Pattern Match",
                  },
                  {
                    badge: `bg-white/[0.05] text-white/35 ${isLight ? "border-gray-200" : "border-white/[0.08]"}`,
                    label: "⚪ <60% AI Reasoning",
                  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badge}`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Agent filter ─────────────────────────────────── */}
            {agents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveAgent(null)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    !activeAgent
                      ? isLight
                        ? "bg-gray-100 border-gray-300 text-gray-900"
                        : "bg-white/[0.1] border-white/20 text-white"
                      : isLight
                        ? "bg-white border-gray-200 text-gray-400 hover:text-gray-700"
                        : "glass text-white/35 hover:text-white/60"
                  }`}
                >
                  All Dimensions
                </button>
                {agents.map((agent) => {
                  const Icon = AGENT_ICONS[agent] ?? Bot;
                  const count = scan.issues.filter(
                    (i: any) => i.agentName === agent,
                  ).length;
                  return (
                    <button
                      key={agent}
                      onClick={() =>
                        setActiveAgent(agent === activeAgent ? null : agent)
                      }
                      data-testid={`filter-${agent}`}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        activeAgent === agent
                          ? isLight
                            ? "bg-gray-100 border-gray-300 text-gray-900"
                            : "bg-white/[0.1] border-white/20 text-white"
                          : isLight
                            ? "bg-white border-gray-200 text-gray-400 hover:text-gray-700"
                            : "glass text-white/35 hover:text-white/60"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {agent.replace(" Agent", "")}
                      <span className="opacity-50">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Runtime Evidence Gallery ─────────────────────── */}
            {!activeAgent &&
              (runtimeCount > 0 || staticCount > 0 || aiCount > 0) && (
                <div
                  className={`${isLight ? "bg-white border border-gray-200" : "glass border border-white/[0.07]"} rounded-xl p-4`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck
                      className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"}`}
                    />
                    <span
                      className={`text-xs font-semibold uppercase tracking-widest ${isLight ? "text-gray-500" : "text-white/40"}`}
                    >
                      Evidence Classification
                    </span>
                    {evidenceFilter !== "all" && (
                      <button
                        onClick={() => setEvidenceFilter("all")}
                        className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/50 transition-colors flex items-center gap-1`}
                      >
                        <X className="w-3 h-3" />
                        Clear filter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        setEvidenceFilter(
                          evidenceFilter === "runtime" ? "all" : "runtime",
                        )
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all ${
                        evidenceFilter === "runtime"
                          ? "bg-green-500/15 border-green-500/30"
                          : "bg-green-500/[0.04] border-green-500/10 hover:bg-green-500/[0.08]"
                      }`}
                    >
                      <span className="text-lg font-bold font-['Syne'] text-green-400">
                        {runtimeCount}
                      </span>
                      <span className="text-[10px] font-semibold text-green-400/70">
                        🟢 Runtime Verified
                      </span>
                      <span
                        className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} text-center leading-tight`}
                      >
                        HTTP/browser proof
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setEvidenceFilter(
                          evidenceFilter === "static" ? "all" : "static",
                        )
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all ${
                        evidenceFilter === "static"
                          ? "bg-sky-500/15 border-sky-500/30"
                          : "bg-sky-500/[0.04] border-sky-500/10 hover:bg-sky-500/[0.08]"
                      }`}
                    >
                      <span className="text-lg font-bold font-['Syne'] text-sky-400">
                        {staticCount}
                      </span>
                      <span className="text-[10px] font-semibold text-sky-400/70">
                        🔵 Static Code
                      </span>
                      <span
                        className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} text-center leading-tight`}
                      >
                        Direct code evidence
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setEvidenceFilter(
                          evidenceFilter === "ai_reasoning"
                            ? "all"
                            : "ai_reasoning",
                        )
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all ${
                        evidenceFilter === "ai_reasoning"
                          ? "bg-white/[0.08] border-white/15"
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`text-lg font-bold font-['Syne'] ${isLight ? "text-gray-500" : "text-white/40"}`}
                      >
                        {aiCount}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}
                      >
                        ⚪ AI Observation
                      </span>
                      <span
                        className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} text-center leading-tight`}
                      >
                        Pattern inference
                      </span>
                    </button>
                  </div>
                  {evidenceFilter !== "all" && (
                    <p
                      className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} mt-2 text-center`}
                    >
                      Showing {filteredIssues.length}{" "}
                      {evidenceFilter === "runtime"
                        ? "🟢 runtime verified"
                        : evidenceFilter === "static"
                          ? "🔵 static code"
                          : "⚪ AI observation"}{" "}
                      findings
                    </p>
                  )}
                </div>
              )}

            {/* ── All remaining findings ───────────────────────── */}
            {remaining.length > 0 && (
              <div className="space-y-2.5">
                <p
                  className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"} uppercase tracking-widest font-medium`}
                >
                  {activeAgent
                    ? "All findings"
                    : `All findings (${sortedIssues.length} total)`}
                </p>
                {(activeAgent ? sortedIssues : remaining).map((issue) =>
                  issue.locked ? (
                    <LockedIssueCard
                      key={issue.id ?? issue.title}
                      issue={issue}
                    />
                  ) : (
                    <EvidenceCard
                      key={issue.id}
                      issue={issue}
                      scanId={scan.id}
                      isCreator={user.plan === "creator"}
                    />
                  ),
                )}
              </div>
            )}

            {/* ── Upgrade banner for locked issues ─────────────── */}
            {!activeAgent && (scan as any)._lockedIssueCount > 0 && (
              <UpgradeBanner
                count={(scan as any)._lockedIssueCount as number}
                isLight={isLight}
              />
            )}

            {/* ── Exploit Terminal for critical IDOR/auth issues ─ */}
            {!activeAgent &&
              sortedIssues.some(
                (i) =>
                  !i.locked &&
                  i.severity === "critical" &&
                  (i.agentName.includes("Security") ||
                    i.agentName.includes("IDOR") ||
                    i.agentName.includes("Access")),
              ) && (
                <div className="space-y-3">
                  <p
                    className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"} uppercase tracking-widest font-medium flex items-center gap-2`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Exploit Terminal - Critical Vectors
                  </p>
                  {sortedIssues
                    .filter(
                      (i) =>
                        !i.locked &&
                        i.severity === "critical" &&
                        (i.agentName.includes("Security") ||
                          i.agentName.includes("IDOR") ||
                          i.agentName.includes("Access")),
                    )
                    .slice(0, 2)
                    .map((issue) => (
                      <ExploitTerminalCard key={issue.id} issue={issue} />
                    ))}
                </div>
              )}

            {!activeAgent &&
              topThree.length === 0 &&
              sortedIssues.length === 0 && (
                <div
                  className={`text-center py-16 ${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl`}
                >
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p
                    className={`font-bold font-['Syne'] mb-1 ${isLight ? "text-gray-900" : "text-white"}`}
                  >
                    No issues found
                  </p>
                  <p
                    className={`text-sm ${isLight ? "text-gray-400" : "text-white/30"}`}
                  >
                    Your app passed all checks in this dimension.
                  </p>
                </div>
              )}

            {activeAgent && filteredIssues.length === 0 && (
              <div
                className={`text-center py-12 ${isLight ? "text-gray-400" : "text-white/25"} text-sm`}
              >
                No issues in this dimension.
              </div>
            )}

            {/* ── Technical Co-Founder Q&A ─────────────────────── */}
            {!activeAgent && scan.status === "completed" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CofounderQAPanel scanId={scan.id} />
              </motion.div>
            )}
          </>
        )}

        {/* ── Privacy footer ───────────────────────────────── */}
        <div className="flex items-center gap-2 justify-center py-4">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
          <p
            className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}
          >
            Your code was not stored. Analyzed in-session only.
          </p>
        </div>
      </main>
    </div>
  );
}
