import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { SiWhatsapp } from "react-icons/si";
import {
  ArrowRight,
  Send,
  CalendarRange,
  CheckCircle,
  Shield,
  Wallet,
  Eye,
  PercentCircle,
  Download,
  FileText,
  Activity,
  Layers,
} from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

interface StatsData {
  metrics: Record<string, string>;
  eoyReturns: { year: number; returnPct: number; cumulative: string }[];
  drawdowns: { started: string; recovered: string; drawdown: number; days: number }[];
  dateRange: string;
  equity: { date: string; value: number }[];
  drawdownChart: { date: string; value: number }[];
  monthlyGrid: { ym: string; ret: number }[];
  dailyPnl: { date: string; value: number }[];
}

type StrategyKey = "basket50" | "basket70tf";

interface StrategyConfig {
  key: string;
  apiKey: string;
  label: string;
  pairs: string[];
  approachShort: string;
  approachFull: string;
  desc: string;
  archDesc: string;
  riskDesc: string;
  execDesc: string;
  strategyType: string;
  holdingPeriod: string;
  capacity: string;
}

const STRATEGIES: Record<string, StrategyConfig> = {
  basket50: {
    key: "basket50",
    apiKey: "basket50",
    label: "Basket 50",
    pairs: ["BTC/USDT", "ETH/USDT"],
    approachShort: "Мультисистемный алгоритмический подход",
    approachFull: "комбинация нескольких алгоритмических моделей",
    desc: "Портфель из 15 независимых алгоритмических стратегий на BTC и ETH. Каждая модель использует собственную логику входа и выхода. Комбинация подходов сглаживает кривую доходности.",
    archDesc: "Система объединяет 15 независимых алгоритмов на BTC и ETH. Торговля в лонг и шорт. Диверсификация обеспечивает стабильность в любых рыночных условиях.",
    riskDesc: "Каждая позиция с фиксированным риском. Стоп-лоссы и тейк-профиты рассчитываются по волатильности. В аномальные периоды система снижает экспозицию.",
    execDesc: "Полностью автоматизированное исполнение 24/7. Алгоритм выбирает тип ордера по ликвидности и спреду. Без участия человека.",
    strategyType: "Алгоритмический, системный",
    holdingPeriod: "< 3 дней",
    capacity: "$200M",
  },
  basket70tf: {
    key: "basket70tf",
    apiKey: "basket70tf",
    label: "Basket 70 TF",
    pairs: ["BTC/USDT", "ETH/USDT"],
    approachShort: "Трендследящий подход с моментум-фильтрами",
    approachFull: "трендследящая торговля с использованием эффекта моментума",
    desc: "Портфель из 15 трендовых алгоритмов на BTC и ETH. Стратегии удерживают позиции дольше для захвата крупных импульсов. Фильтры волатильности отсеивают ложные сигналы.",
    archDesc: "15 трендовых моделей на BTC и ETH с увеличенным периодом удержания. Моментум и кластеризация волатильности позволяют захватывать направленные движения.",
    riskDesc: "Фиксированный риск на сделку без усреднения. Закрытие по стоп-лоссу или трейлинг-стопу по волатильности.",
    execDesc: "Входы и выходы через рыночные или лимитные ордера по глубине стакана и спреду.",
    strategyType: "Трендовый, моментумный, системный",
    holdingPeriod: "< 14 дней",
    capacity: "$350M",
  },
};

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function LiveDataBadge({ text, pulse = true }: { text: string; pulse?: boolean }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ) : (
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/80"></span>
      )}
      <span className="text-xs font-medium text-emerald-400">{text}</span>
    </div>
  );
}

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(80, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 12000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
        ctx.fill();
      });

      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

const NAV_ITEMS = [
  { label: "О стратегии", href: "#strategy" },
  { label: "Эквити", href: "#equity" },
  { label: "Показатели", href: "#metrics" },
  { label: "P&L", href: "#daily-pnl" },
  { label: "Рост капитала", href: "#capital-growth" },
  { label: "Условия", href: "#terms" },
];

const STRATEGY_OPTIONS: { key: StrategyKey; label: string }[] = [
  { key: "basket50", label: "Basket 50" },
  { key: "basket70tf", label: "Basket 70 TF" },
];

function Navbar({ strategy, onStrategyChange }: { strategy: StrategyKey; onStrategyChange: (k: StrategyKey) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = useCallback((href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 shrink-0"
            data-testid="link-logo"
          >
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">Algotrading</span>
          </button>

          <div className="hidden lg:flex items-center gap-0.5 shrink-0">
            <div className="w-px h-4 bg-border/50 mx-2" />
            {STRATEGY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onStrategyChange(opt.key)}
                data-testid={`button-strategy-${opt.key}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  strategy === opt.key
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-4 bg-border/50 mx-2" />
          </div>

          <div className="hidden lg:flex items-center gap-1 ml-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </button>
            ))}
            <Button
              size="sm"
              className="ml-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs"
              onClick={() => window.open("https://t.me/etheremax", "_blank")}
              data-testid="button-nav-contact"
            >
              <Send className="w-3 h-3 mr-1.5" />
              Свяжитесь с нами
            </Button>
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#1fb855] text-white text-xs"
              onClick={() => window.open("https://wa.me/48883750965", "_blank")}
              data-testid="button-nav-whatsapp"
            >
              <SiWhatsapp className="w-3 h-3 mr-1.5" />
              WhatsApp
            </Button>
          </div>

          <button
            className="lg:hidden p-2 text-foreground ml-auto"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            <div className="w-5 flex flex-col gap-1">
              <span className={`h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-3 flex flex-col gap-1">
            <div className="flex gap-1 pb-2 border-b border-border/30 mb-1">
              {STRATEGY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onStrategyChange(opt.key)}
                  data-testid={`button-mobile-strategy-${opt.key}`}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    strategy === opt.key
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left rounded-md"
                data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </button>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm w-full"
                onClick={() => { setMobileOpen(false); window.open("https://t.me/etheremax", "_blank"); }}
                data-testid="button-mobile-contact"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
              <Button
                className="bg-[#25D366] hover:bg-[#1fb855] text-white text-sm w-full"
                onClick={() => { setMobileOpen(false); window.open("https://wa.me/48883750965", "_blank"); }}
                data-testid="button-mobile-whatsapp"
              >
                <SiWhatsapp className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function getMetricValue(metrics: Record<string, string> | undefined, key: string, fallback: string): string {
  if (!metrics) return fallback;
  return metrics[key] || fallback;
}

function HeroEquityChart({ stats }: { stats?: StatsData }) {
  const [points, setPoints] = useState<string>("");
  const [fillPoints, setFillPoints] = useState<string>("");

  useEffect(() => {
    const w = 400, h = 100, pad = 8;
    const equity = stats?.equity;
    if (equity && equity.length > 10) {
      const step = Math.max(1, Math.floor(equity.length / 120));
      const sampled = equity.filter((_: unknown, i: number) => i % step === 0 || i === equity.length - 1);
      const values = sampled.map((p: { value: number }) => p.value);
      const minV = Math.min(...values);
      const maxV = Math.max(...values);
      const range = maxV - minV || 1;
      const pts: string[] = [];
      for (let i = 0; i < sampled.length; i++) {
        const x = (i / (sampled.length - 1)) * w;
        const y = pad + (1 - (values[i] - minV) / range) * (h - 2 * pad);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      setPoints(pts.join(" "));
      setFillPoints(pts.join(" ") + ` ${w},${h} 0,${h}`);
    } else {
      const pts: string[] = [];
      const returns = [0,1,0.5,2,-1,1.5,3,-2,1,4,-1.5,3,2,-3,5,1,2,-1,4,3,-2,6,1,-1,3,5,-2,4,7,-3,5,2,8,-1,6,3,9,1,-2,7,4,10,2,5,12,-3,8,6,14,3,7,16,-2,9,5,18,4,8,20,-4,12,7,22,5,15,25,-5,18,10,28,8,20,32,-6,22,15,35,12,25,40];
      let cumulative = 0;
      const vals: number[] = [];
      for (const r of returns) { cumulative += r; vals.push(cumulative); }
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const range = maxV - minV || 1;
      for (let i = 0; i < vals.length; i++) {
        const x = (i / (vals.length - 1)) * w;
        const y = pad + (1 - (vals[i] - minV) / range) * (h - 2 * pad);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      setPoints(pts.join(" "));
      setFillPoints(pts.join(" ") + ` ${w},${h} 0,${h}`);
    }
  }, [stats?.equity]);

  if (!points) return null;

  return (
    <div className="h-28 sm:h-36 relative overflow-hidden rounded-lg">
      <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(6,182,212)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(6,182,212)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#heroGrad)" />
        <polyline points={points} fill="none" stroke="rgb(6,182,212)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function HeroSection({ stats, sc }: { stats?: StatsData; sc: StrategyConfig }) {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden -mt-16 pt-16" data-testid="section-hero">
      <ParticleCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-80 h-48 sm:h-80 bg-blue-600/8 rounded-full blur-[100px]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="text-left min-w-0">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 mb-6 px-5 py-2 text-sm font-mono tracking-[0.15em] border border-cyan-500/30 text-cyan-400 rounded-full bg-cyan-500/5 uppercase">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                Алгоритмический трейдинг 24/7
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-[1.08] tracking-tight">
                Алгоритм торгует.<br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Вы зарабатываете.</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground/80 mb-8 max-w-lg leading-relaxed">
                Алгоритмические стратегии торгуют криптовалюту 24/7. Полностью автоматизированный трейдинг по API — средства всегда на вашем счёте.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <div className="flex flex-nowrap gap-3 w-full sm:w-auto">
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-600/80 to-blue-700/80 text-white font-bold px-5 py-4 sm:px-8 sm:py-6 text-sm sm:text-base rounded-xl cta-pulse transition-all"
                  onClick={() => window.open("https://t.me/etheremax", "_blank")}
                >
                  Подключиться
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 sm:flex-none border-border/50 text-foreground bg-transparent px-5 py-4 sm:px-8 sm:py-6 text-sm sm:text-base"
                  onClick={() => document.querySelector("#equity")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Результаты <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </AnimatedSection>
          </div>

          <div className="min-w-0">
            <AnimatedSection delay={400}>
              <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="text-sm text-muted-foreground font-medium">{sc.label}</span>
                  <span className="text-sm sm:text-base font-bold text-cyan-400 font-mono text-right">
                    Кривая доходности
                  </span>
                </div>
                <HeroEquityChart stats={stats} />
              </div>
            </AnimatedSection>
            <AnimatedSection delay={500}>
              <div className="grid grid-cols-3 divide-x divide-border/20 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm mt-4">
                {[
                  { label: "Годовой доход", value: getMetricValue(stats?.metrics, "CAGR", "—") },
                  { label: "Коэфф. Шарпа", value: getMetricValue(stats?.metrics, "Sharpe", "—") },
                  { label: "Трек-рекорд", value: stats?.dateRange ? stats.dateRange.replace(/.*?(\d{4}).*?(\d{4}).*/, "$1–$2") : "—" },
                ].map((item) => (
                  <div key={item.label} className="text-center py-4 px-1">
                    <div className="text-sm sm:text-xl font-bold text-foreground font-mono leading-tight">{item.value}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wide uppercase mt-1 leading-tight">{item.label}</div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExchangesBar() {
  const exchanges = [
    { name: "Bybit", logo: "/exchanges/bybit.svg", scale: "scale-[1.8]", filter: "" },
    { name: "Binance", logo: "/exchanges/binance.svg", scale: "scale-[1.9]", filter: "" },
    { name: "Bitget", logo: "/exchanges/bitget.png", scale: "scale-90", filter: "" },
    { name: "OKX", logo: "/exchanges/okx.png", scale: "scale-[1.4]", filter: "brightness-0 invert" },
    { name: "BingX", logo: "/exchanges/bingx.svg", scale: "scale-[1.8]", filter: "" },
  ];
  return (
    <section className="py-12 px-4 sm:px-6 bg-card/40 border-y border-cyan-500/10">
      <div className="max-w-5xl mx-auto text-center">
        <AnimatedSection>
          <p className="text-lg sm:text-xl text-white font-semibold mb-8 tracking-wide">
            Работаем на биржах
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {exchanges.map((ex) => (
              <div
                key={ex.name}
                className="flex items-center justify-center h-16 sm:h-16 w-[calc(33%-8px)] sm:w-[calc(20%-13px)] px-4 rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <img
                  src={ex.logo}
                  alt={ex.name}
                  className={`w-full h-full object-contain opacity-80 p-1.5 ${ex.scale} ${ex.filter}`}
                />
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function SocialProofBar() {
  return (
    <section className="-mt-1 py-10 px-4 sm:px-6 bg-gradient-to-r from-cyan-500/10 via-blue-500/8 to-cyan-500/10 border-y border-cyan-500/15">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 max-w-2xl mx-auto">
          {[
            "Работаем с 2018 года",
            "Прозрачная статистика",
            "Тысячи аккаунтов",
            "Крупнейшие криптобиржи",
            "Без перевода средств",
            "Автоматическая торговля 24/7",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 text-sm sm:text-base text-white font-semibold pl-4 sm:pl-6">
              <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function localizeDate(s: string): string {
  const months: Record<string, string> = {
    January: "Январь", February: "Февраль", March: "Март", April: "Апрель",
    May: "Май", June: "Июнь", July: "Июль", August: "Август",
    September: "Сентябрь", October: "Октябрь", November: "Ноябрь", December: "Декабрь",
  };
  return s.replace(/(\w+)\s+(\d+),\s+(\d+)/g, (_m, mon, day, year) => `${day} ${months[mon] ?? mon} ${year}`);
}

function calcAvgYearly(m: Record<string, string> | undefined, _dateRange: string | undefined): string {
  if (!m) return "---";
  return m["CAGR"] || "---";
}

function MetricsSection({ stats, isLoading, strategyKey }: { stats?: StatsData; isLoading: boolean; strategyKey?: string }) {
  const m = stats?.metrics;
  const metricsCards = [
    {
      label: "Общая доходность",
      value: getMetricValue(m, "Cumulative Return", getMetricValue(m, "Total Return", "---")),
    },
    {
      label: "Годовой доход",
      value: calcAvgYearly(m, stats?.dateRange),
    },
    {
      label: "Коэфф. Шарпа",
      value: getMetricValue(m, "Sharpe", "---"),
    },
    {
      label: "Макс. просадка",
      value: getMetricValue(m, "Max Drawdown", "---"),
    },
  ];

  return (
    <section id="metrics" className="py-12 px-4 sm:px-6 relative bg-card/30 border-y border-border/10" data-testid="section-metrics">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Ключевые показатели
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {stats?.dateRange ? `Период: ${localizeDate(stats.dateRange)}` : "Данные загружаются..."}
            </p>
            <LiveDataBadge text="Реальный торговый счёт" />
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsCards.map((metric, i) => (
            <AnimatedSection key={metric.label} delay={i * 80}>
              <div className="text-center py-6 px-4 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm" data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s/g, "-")}`}>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mx-auto mb-2" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mb-2" data-testid={`text-metric-${metric.label.toLowerCase().replace(/\s/g, "-")}`}>
                    {metric.value}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{metric.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
        {strategyKey && (
          <div className="flex justify-center mt-6">
            <a
              href={`/api/quantstats?strategy=${strategyKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors bg-card/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              QuantStats Report
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function ChartPeriodFilter({
  allData,
  onFilter,
  rebaseOnFilter = false,
  additiveRebase = false,
}: {
  allData: { date: string; value: number }[];
  onFilter: (filtered: { date: string; value: number }[]) => void;
  rebaseOnFilter?: boolean;
  additiveRebase?: boolean;
}) {
  const years = Array.from(new Set(allData.map((d) => d.date.substring(0, 4)))).sort();
  const [active, setActive] = useState<string>("all");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen] = useState(false);

  const rangeLabel = useMemo(() => {
    if (!range?.from) return "";
    const fmt = (d: Date) => d.toLocaleDateString("ru-RU", { month: "short", day: "numeric", year: "numeric" });
    if (range.to) return fmt(range.from) + " — " + fmt(range.to);
    return "From " + fmt(range.from);
  }, [range]);
  const [leftMonth, setLeftMonth] = useState<Date | undefined>(undefined);
  const [rightMonth, setRightMonth] = useState<Date | undefined>(undefined);

  const allowedDates = useMemo(
    () => new Set(allData.map((d) => d.date)),
    [allData]
  );

  function toLocalISO(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const minDate = allData.length ? new Date(allData[0].date + "T00:00:00") : undefined;
  const maxDate = allData.length ? new Date(allData[allData.length - 1].date + "T00:00:00") : undefined;

  function isDisabled(date: Date) {
    if (!minDate || !maxDate) return true;
    return date < minDate || date > maxDate;
  }

  function maybeRebase(slice: { date: string; value: number }[]) {
    if (!rebaseOnFilter || slice.length === 0) return slice;
    if (additiveRebase) {
      const base = slice[0].value;
      return slice.map((d) => ({ ...d, value: Math.min(0, parseFloat((d.value - base).toFixed(4))) }));
    }
    const baseMul = 1 + slice[0].value / 100;
    return slice.map((d) => ({ ...d, value: parseFloat((((1 + d.value / 100) / baseMul - 1) * 100).toFixed(4)) }));
  }

  function applyYearOrAll(period: string) {
    setRange(undefined);
    setActive(period);
    if (period === "all") {
      onFilter(allData);
    } else {
      onFilter(maybeRebase(allData.filter((d) => d.date.startsWith(period))));
    }
  }

  function handleRangeSelect(r: DateRange | undefined) {
    setRange(r);
    if (r?.from) setActive("custom");
    if (!r) { onFilter(allData); return; }
    const from = r.from ? toLocalISO(r.from) : null;
    const to = r.to ? toLocalISO(r.to) : null;
    if (from && to) {
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const filtered = allData.filter((d) => d.date >= lo && d.date <= hi);
      if (filtered.length > 0) {
        onFilter(maybeRebase(filtered));
      } else {
        const nearIdx = allData.findIndex((d) => d.date >= lo);
        if (nearIdx >= 0) {
          onFilter(maybeRebase(allData.slice(nearIdx, nearIdx + 1)));
        }
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="chart-period-filter">
      <button
        onClick={() => applyYearOrAll("all")}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${active === "all" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-background/50 border border-border/50 text-muted-foreground hover:text-foreground"}`}
        data-testid="button-filter-all"
      >
        Всё время
      </button>
      {years.map((y) => (
        <button
          key={y}
          onClick={() => applyYearOrAll(y)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${active === y ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-background/50 border border-border/50 text-muted-foreground hover:text-foreground"}`}
          data-testid={`button-filter-${y}`}
        >
          {y}
        </button>
      ))}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <button
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${range?.from ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-background/50 border border-border/50 text-muted-foreground hover:text-foreground"}`}
            data-testid="button-filter-calendar"
          >
            <CalendarRange className="w-3 h-3" />
            {active === "custom" && range?.from ? rangeLabel : "Период"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border/50" align="start">
          <div className="flex gap-0 p-3 calendar-dark-dropdowns">
            <CalendarPicker
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              disabled={isDisabled}
              numberOfMonths={1}
              captionLayout="dropdown"
              fromYear={minDate?.getFullYear()}
              toYear={maxDate?.getFullYear()}
              month={leftMonth || minDate}
              onMonthChange={setLeftMonth}
            />
            <div className="hidden sm:block">
              <CalendarPicker
                mode="range"
                selected={range}
                onSelect={handleRangeSelect}
                disabled={isDisabled}
                numberOfMonths={1}
                captionLayout="dropdown"
                fromYear={minDate?.getFullYear()}
                toYear={maxDate?.getFullYear()}
                month={rightMonth || maxDate}
                onMonthChange={setRightMonth}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ChartLiveBadge({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <span className="text-[10px] text-emerald-400/80">{text}</span>
    </div>
  );
}


function ZoomableChart({
  data,
  color,
  gradientId,
  valueSuffix,
  valueLabel,
  valueDecimals,
  height,
  rebaseOnZoom = false,
  yearlyTicks = false,
  yMin,
  locale = "ru-RU",
  liveBadgeText,
}: {
  data: { date: string; value: number }[];
  color: string;
  gradientId: string;
  valueSuffix: string;
  valueLabel: string;
  valueDecimals: number;
  height: string;
  rebaseOnZoom?: boolean;
  yearlyTicks?: boolean;
  yMin?: number;
  locale?: string;
  liveBadgeText?: string;
}) {
  const [refLeft, setRefLeft] = useState<string | null>(null);
  const [refRight, setRefRight] = useState<string | null>(null);
  const [zoomedData, setZoomedData] = useState(data);

  useEffect(() => {
    setZoomedData(data);
  }, [data]);

  const isZoomed = zoomedData.length < data.length;

  const handleMouseDown = (e: any) => {
    if (e?.activeLabel) setRefLeft(e.activeLabel);
  };

  const handleMouseMove = (e: any) => {
    if (refLeft && e?.activeLabel) setRefRight(e.activeLabel);
  };

  const handleMouseUp = () => {
    if (refLeft && refRight && refLeft !== refRight) {
      const leftIdx = data.findIndex((d) => d.date === refLeft);
      const rightIdx = data.findIndex((d) => d.date === refRight);
      const [from, to] = leftIdx < rightIdx ? [leftIdx, rightIdx] : [rightIdx, leftIdx];
      if (to - from > 1) {
        const sliced = data.slice(from, to + 1);
        if (rebaseOnZoom && sliced.length > 0) {
          const baseMul = 1 + sliced[0].value / 100;
          setZoomedData(sliced.map((d) => ({ ...d, value: parseFloat((((1 + d.value / 100) / baseMul - 1) * 100).toFixed(4)) })));
        } else {
          setZoomedData(sliced);
        }
      }
    }
    setRefLeft(null);
    setRefRight(null);
  };

  const handleReset = () => setZoomedData(data);

  return (
    <div>
      {isZoomed && (
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" className="text-xs border-border/50" onClick={handleReset}>
            Reset Zoom
          </Button>
        </div>
      )}
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={zoomedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={yearlyTicks} />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              minTickGap={40}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                if (isZoomed) return d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
                return yearlyTicks ? d.getFullYear().toString() : d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
              }}
              ticks={yearlyTicks && !isZoomed ? (() => {
                const seen = new Set<number>();
                return zoomedData.filter((d) => {
                  const y = new Date(d.date).getFullYear();
                  if (seen.has(y)) return false;
                  seen.add(y);
                  return true;
                }).map((d) => d.date);
              })() : undefined}
              interval={yearlyTicks && !isZoomed ? 0 : Math.floor(zoomedData.length / 8)}
            />
            <YAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(0) + valueSuffix}
              width={55}
              domain={yMin !== undefined ? [yMin, "auto"] : ["auto", "auto"]}
              allowDataOverflow={yMin !== undefined}
            />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                const dateStr = new Date(label).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
                const formatted = (val >= 0 ? "+" : "") + val.toFixed(valueDecimals) + valueSuffix;
                const valColor = val >= 0 ? color : "#f87171";
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 sm:px-4 sm:py-3 shadow-xl min-w-[140px] max-w-[calc(100vw-32px)]">
                    <p className="text-sm font-bold text-foreground mb-2">{dateStr}</p>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-xs text-muted-foreground">{valueLabel}</span>
                      <span className="text-sm font-bold font-mono" style={{ color: valColor }}>{formatted}</span>
                    </div>
                  {liveBadgeText && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <span className="text-[10px] text-emerald-400/80">{liveBadgeText}</span>
                    </div>
                  )}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={"url(#" + gradientId + ")"} dot={false} activeDot={{ r: 4, fill: color, stroke: "#0a0e27", strokeWidth: 2 }} />
            {refLeft && refRight && (
              <ReferenceArea x1={refLeft} x2={refRight} strokeOpacity={0.2} stroke="rgba(6,182,212,0.3)" fill="rgba(6,182,212,0.05)" fillOpacity={1} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!isZoomed && (
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">Нажмите и потяните для увеличения</p>
      )}
    </div>
  );
}

// ── Strategy Overview ────────────────────────────────────────────────────────
function StrategyOverviewSection({ sc }: { sc: StrategyConfig }) {
  return (
    <section id="strategy" className="py-12 px-4 sm:px-6 relative" data-testid="section-strategy">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">О стратегии</h2>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
              {sc.label} — систематический портфель на основе {sc.approachFull}.<br />
              Торговля ведётся через API-подключение к субаккаунту биржи клиента, без доступа к его средствам.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <AnimatedSection>
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 h-full">
              <h3 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Параметры стратегии
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Тип стратегии", value: sc.strategyType },
                  { label: "Класс активов", value: "Бессрочные фьючерсы (BTC, ETH)" },
                  { label: "Срок удержания позиций", value: sc.holdingPeriod },
                  { label: "Стиль торговли", value: "Лонг и шорт" },
                  { label: "Портфель", value: "Систематический, диверсифицированный" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3 border-b border-border/30 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </AnimatedSection>

          <AnimatedSection delay={150}>
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Торговая логика
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{sc.archDesc}</p>
              <div className="mt-auto grid grid-cols-2 gap-3">
                {[
                  { val: "12+", desc: "Лет исследований" },
                  { val: sc.key === "basket70tf" ? "3" : "2", desc: "Типа стратегий" },
                  { val: "2", desc: "Торговых пары" },
                  { val: "24/7", desc: "Автоматически" },
                ].map((s) => (
                  <div key={s.desc} className="bg-background/50 rounded-md p-3 text-center">
                    <div className="text-lg font-bold font-mono text-cyan-400">{s.val}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ── Drawdown Chart ────────────────────────────────────────────────────────────
function DrawdownChartSection({ stats, isLoading }: { stats?: StatsData; isLoading: boolean }) {
  const allData = (stats?.drawdownChart || []).map((d) => ({ date: d.date, value: d.value }));
  const [filteredData, setFilteredData] = useState(allData);

  useEffect(() => {
    setFilteredData(allData);
  }, [stats]);

  return (
    <section id="drawdown-chart" className="py-12 px-4 sm:px-6 relative" data-testid="section-drawdown-chart">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Просадка</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Снижение от пика на составной основе эквити
            </p>
            <LiveDataBadge text="История просадок реального счёта" pulse={false} />
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <Card className="overflow-visible bg-card/50 backdrop-blur-sm border-border/50 p-4 sm:p-6">
            {isLoading || allData.length === 0 ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <>
                <ChartPeriodFilter allData={allData} onFilter={setFilteredData} rebaseOnFilter additiveRebase />
                <ZoomableChart
                  data={filteredData}
                  color="#ef4444bb"
                  gradientId="drawdownGrad"
                  valueSuffix="%"
                  valueLabel="Drawdown"
                  valueDecimals={4}
                  height="h-[250px] sm:h-[300px]"
                  yearlyTicks
                  liveBadgeText="Реальные торговые данные · Обновляется ежедневно"
                />
              </>
            )}
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Daily P&L ─────────────────────────────────────────────────────────────────
const MONTH_LABELS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

// ── Monthly Returns ───────────────────────────────────────────────────────────
function MonthlyReturnsSection({ stats, isLoading, strategyKey }: { stats?: StatsData; isLoading: boolean; strategyKey: StrategyKey }) {
  const grid = stats?.monthlyGrid ?? [];

  const tableData = useMemo(() => {
    if (grid.length === 0) return { years: [] as number[], data: {} as Record<number, Record<number, number | null>>, yearTotals: {} as Record<number, number> };
    const data: Record<number, Record<number, number | null>> = {};
    for (const { ym, ret } of grid) {
      const [y, m] = ym.split("-").map(Number);
      if (!data[y]) data[y] = {};
      data[y][m] = ret;
    }
    const years = Object.keys(data).map(Number).sort();
    const yearTotals: Record<number, number> = {};
    for (const y of years) {
      const rets = Object.values(data[y]).filter((v): v is number => v !== null);
      yearTotals[y] = (rets.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100;
    }
    return { years, data, yearTotals };
  }, [grid, strategyKey]);

  function cellColor(v: number | null | undefined) {
    if (v == null) return "";
    if (v > 0) return "text-emerald-400";
    if (v < 0) return "text-red-400";
    return "text-muted-foreground";
  }

  return (
    <section id="monthly-returns" className="py-12 px-4 sm:px-6 relative" data-testid="section-monthly-returns">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Помесячная доходность</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Результаты по месяцам с накопительным итогом по годам
            </p>
            <LiveDataBadge text="Обновляется ежедневно · Binance API" pulse={false} />
          </div>
        </AnimatedSection>
        <AnimatedSection delay={100}>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-4 sm:p-6 overflow-x-auto">
            {isLoading || tableData.years.length === 0 ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <table className="w-full text-xs sm:text-sm font-mono">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="py-2 px-2 text-left text-cyan-400 font-semibold">Год</th>
                    {MONTH_LABELS_RU.map((m) => (
                      <th key={m} className="py-2 px-1.5 text-center text-cyan-400 font-semibold">{m}</th>
                    ))}
                    <th className="py-2 px-2 text-center text-cyan-400 font-semibold border-l border-cyan-500/20 bg-cyan-500/5">Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.years.map((y) => (
                    <tr key={y} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-2 text-cyan-400 font-semibold">{y}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const v = tableData.data[y]?.[m];
                        return (
                          <td key={m} className={`py-2 px-1.5 text-center rounded-sm ${cellColor(v)}`}>
                            {v != null ? (v >= 0 ? "+" : "") + v.toFixed(2) + "%" : ""}
                          </td>
                        );
                      })}
                      <td className={`py-2 px-2 text-center font-bold border-l border-cyan-500/20 bg-cyan-500/5 ${cellColor(tableData.yearTotals[y])}`}>
                        {(tableData.yearTotals[y] >= 0 ? "+" : "") + tableData.yearTotals[y].toFixed(2) + "%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}
function DailyPnlSection({ stats, isLoading, strategyKey }: { stats?: StatsData; isLoading: boolean; strategyKey: StrategyKey }) {
  const dailyData = stats?.dailyPnl ?? [];
  const [filteredData, setFilteredData] = useState(dailyData);
  const [zoomedData, setZoomedData] = useState<typeof dailyData | null>(null);
  const [refLeft, setRefLeft] = useState<string | null>(null);
  const [refRight, setRefRight] = useState<string | null>(null);

  useEffect(() => { setFilteredData(dailyData); }, [stats]);
  useEffect(() => { setZoomedData(null); }, [filteredData]);

  const displayData = zoomedData ?? filteredData;
  const isZoomed = zoomedData !== null;

  const handleMouseDown = (e: any) => { if (e?.activeLabel) setRefLeft(e.activeLabel); };
  const handleMouseMove = (e: any) => { if (refLeft && e?.activeLabel) setRefRight(e.activeLabel); };
  const handleMouseUp = () => {
    if (refLeft && refRight && refLeft !== refRight) {
      const leftIdx = filteredData.findIndex((d) => d.date === refLeft);
      const rightIdx = filteredData.findIndex((d) => d.date === refRight);
      const [from, to] = leftIdx < rightIdx ? [leftIdx, rightIdx] : [rightIdx, leftIdx];
      if (to - from > 1) setZoomedData(filteredData.slice(from, to + 1));
    }
    setRefLeft(null);
    setRefRight(null);
  };

  const chartBarData = useMemo(() => {
    const minBar = displayData.length > 0 ? Math.max(...displayData.map(d => Math.abs(d.value))) * 0.02 : 0.01;
    return displayData.map((d) => ({ ...d, displayValue: Math.abs(d.value) < 0.0001 ? minBar : d.value }));
  }, [displayData]);

  const yExtreme = useMemo(() => {
    if (displayData.length === 0) return 2;
    return Math.ceil(Math.max(...displayData.map((d) => Math.abs(d.value))) * 1.1 * 10) / 10;
  }, [displayData]);

  return (
    <section id="daily-pnl" className="py-12 px-4 sm:px-6 relative" data-testid="section-daily-pnl">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Ежедневный P&amp;L</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">Распределение ежедневной доходности стратегии</p>
            <LiveDataBadge text="Реальные данные с торгового счёта" pulse={false} />
            <div className="flex items-center justify-center gap-3 mt-4">
              <TooltipProvider delayDuration={0}>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <a href={`/api/csv?strategy=${strategyKey}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Download className="w-3.5 h-3.5" />
                      Скачать CSV
                    </a>
                  </TooltipTrigger>
                  <TooltipContent><p>Данные обновляются ежедневно через API Binance</p></TooltipContent>
                </UITooltip>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <a href={`/api/quantstats?strategy=${strategyKey}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <FileText className="w-3.5 h-3.5" />
                      QuantStats Report
                    </a>
                  </TooltipTrigger>
                  <TooltipContent><p>Данные обновляются ежедневно через API Binance</p></TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-4 sm:p-6">
            {isLoading || dailyData.length === 0 ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <>
                <ChartPeriodFilter allData={dailyData} onFilter={setFilteredData} />
                {isZoomed && (
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" size="sm" className="text-xs border-border/50" onClick={() => setZoomedData(null)}>
                      Сбросить
                    </Button>
                  </div>
                )}
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, angle: -35, textAnchor: "end", dy: 4 }}
                        tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }}
                        height={36}
                        tickFormatter={(v: string) => {
                          const d = new Date(v + "T00:00:00");
                          return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
                        }}
                        interval={Math.max(0, Math.floor(displayData.length / 6) - 1)} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                        domain={[-yExtreme, yExtreme]} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value.toFixed(4)}%`, "P&L"]}
                        labelFormatter={(label: string) => new Date(label + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} />
                      {refLeft && refRight && (
                        <ReferenceArea x1={refLeft} x2={refRight} strokeOpacity={0.3} fill="rgba(6,182,212,0.08)" />
                      )}
                      <Bar dataKey="displayValue" radius={[2, 2, 0, 0]}>
                        {chartBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Capital Growth ────────────────────────────────────────────────────────────
function CapitalGrowthSection({ stats, isLoading }: { stats?: StatsData; isLoading: boolean }) {
  const CAPITALS = [
    { label: "$20K", value: 20_000 },
    { label: "$50K", value: 50_000 },
    { label: "$100K", value: 100_000 },
    { label: "$500K", value: 500_000 },
    { label: "$1M", value: 1_000_000 },
  ];

  const [capitalIdx, setCapitalIdx] = useState(0);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const capital = CAPITALS[capitalIdx].value;

  const equityData = stats?.equity ?? [];
  const firstDate = equityData[0]?.date ?? "";
  const lastDate = equityData[equityData.length - 1]?.date ?? "";
  const [startDate, setStartDate] = useState(firstDate);

  useEffect(() => {
    if (firstDate && !startDate) setStartDate(firstDate);
  }, [firstDate]);

  const handleSetStartDate = useCallback((date: string) => {
    setStartDate(date);
    setHasInteracted(true);
  }, []);

  useEffect(() => {
    setSliderIdx(0);
    setHasInteracted(false);
  }, [capitalIdx]);

  const chartData = useMemo(() => {
    const startIdx = Math.max(0, equityData.findIndex((d) => d.date >= startDate));
    const baseEquity = 1 + (equityData[startIdx]?.value ?? 0) / 100;
    return equityData.slice(startIdx).map((d) => ({
      date: d.date,
      value: capital * (1 + d.value / 100) / baseEquity,
    }));
  }, [equityData, capital, startDate]);

  const maxIdx = Math.max(0, chartData.length - 1);

  useEffect(() => {
    if (hasInteracted) setSliderIdx(0);
  }, [startDate]);

  const visibleData = useMemo(() => chartData.slice(0, sliderIdx + 1), [chartData, sliderIdx]);
  const chartDisplayData = useMemo(() => chartData.map((d, i) => ({
    ...d,
    displayValue: i <= sliderIdx ? d.value : null,
  })), [chartData, sliderIdx]);

  const currentValue = visibleData.length > 0 ? visibleData[visibleData.length - 1].value : capital;
  const profit = currentValue - capital;
  const currentDate = visibleData.length > 0 ? visibleData[visibleData.length - 1].date : chartData[0]?.date ?? "";

  const peakValue = useMemo(() => {
    if (visibleData.length === 0) return capital;
    return Math.max(...visibleData.map((d) => d.value));
  }, [visibleData, capital]);
  const currentDDPct = peakValue > 0 ? ((currentValue - peakValue) / peakValue) * 100 : 0;
  const currentDDDollar = currentValue - peakValue;

  const maxDrawdown = useMemo(() => {
    if (visibleData.length < 2) return { pct: 0, dollar: 0 };
    let peak = visibleData[0].value;
    let worstPct = 0;
    let worstDollar = 0;
    for (const d of visibleData) {
      if (d.value > peak) peak = d.value;
      const ddPct = (d.value - peak) / peak * 100;
      if (ddPct < worstPct) { worstPct = ddPct; worstDollar = d.value - peak; }
    }
    return { pct: worstPct, dollar: worstDollar };
  }, [visibleData]);

  const availableYears = useMemo(() => {
    if (equityData.length === 0) return [];
    const seen = new Set<string>();
    return equityData.map((d) => d.date.substring(0, 4))
      .filter((y) => { if (seen.has(y)) return false; seen.add(y); return true; })
      .sort();
  }, [equityData]);

  const yMin = useMemo(() => visibleData.length < 2 ? capital * 0.8 : Math.min(...visibleData.map((d) => d.value)) * 0.97, [visibleData, capital]);
  const yMax = useMemo(() => visibleData.length < 2 ? capital * 1.2 : Math.max(...visibleData.map((d) => d.value)) * 1.03, [visibleData, capital]);

  function fmtDollar(v: number) {
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "+";
    if (abs >= 1_000_000) return sign + "$" + (abs / 1_000_000).toFixed(2) + "M";
    if (abs >= 1_000) return sign + "$" + Math.round(abs / 1_000) + "K";
    return sign + "$" + Math.round(abs);
  }
  function fmtValue(v: number) {
    if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(2) + "M";
    if (v >= 1_000) return "$" + Math.round(v / 1_000) + "K";
    return "$" + Math.round(v);
  }
  function fmtYAxis(v: number) {
    if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M";
    if (v >= 100_000) return "$" + Math.round(v / 1_000) + "K";
    if (v >= 1_000) return "$" + (v / 1_000).toFixed(1) + "K";
    return "$" + Math.round(v);
  }

  const sliderPct = maxIdx > 0 ? (sliderIdx / maxIdx) * 100 : 0;

  return (
    <section id="capital-growth" className="py-20 px-4 sm:px-6 relative" data-testid="section-capital-growth">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Рост капитала</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Перетащите ползунок и посмотрите как рос бы ваш капитал вместе со стратегией
            </p>
            <LiveDataBadge text="На основе реальных торговых данных" pulse={false} />
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <Card className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="mb-8">
              <p className="text-sm text-muted-foreground text-center sm:text-left mb-4">Начальный капитал</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {CAPITALS.map((c, i) => (
                  <button key={c.label} onClick={() => setCapitalIdx(i)}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                      capitalIdx === i
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-background/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/40"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-2">Старт</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-foreground">{fmtValue(capital)}</p>
              </Card>
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-2">Текущая стоимость</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-blue-400">{fmtValue(currentValue)}</p>
              </Card>
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-0.5">Прибыль / Убыток</p>
                <p className={`text-xl sm:text-2xl font-bold font-mono ${profit >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                  {fmtDollar(profit)}
                </p>
                <p className={`text-[10px] font-mono ${profit >= 0 ? "text-cyan-400/70" : "text-red-400/70"}`}>
                  {profit >= 0 ? "+" : ""}{((profit / capital) * 100).toFixed(2)}%
                </p>
              </Card>
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-0.5">Текущая просадка</p>
                <p className={`text-xl sm:text-2xl font-bold font-mono ${currentDDPct < -0.01 ? "text-red-400" : "text-muted-foreground/50"}`}>
                  {currentDDPct < -0.01 ? currentDDPct.toFixed(2) + "%" : "—"}
                </p>
                <p className={`text-[10px] font-mono ${currentDDPct < -0.01 ? "text-red-400/70" : "text-transparent"}`}>
                  {currentDDPct < -0.01 ? fmtDollar(currentDDDollar) : " "}
                </p>
              </Card>
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-0.5">Макс. просадка</p>
                <p className={`text-xl sm:text-2xl font-bold font-mono ${maxDrawdown.pct < -0.01 ? "text-red-400" : "text-muted-foreground/50"}`}>
                  {maxDrawdown.pct < -0.01 ? maxDrawdown.pct.toFixed(2) + "%" : "—"}
                </p>
                <p className="text-[10px] font-mono text-transparent">{" "}</p>
              </Card>
              <Card className="p-4 bg-background/50 border-border/30 text-center h-[88px] flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-2">По состоянию на</p>
                <p className="text-base sm:text-lg font-bold font-mono text-muted-foreground whitespace-nowrap">
                  {currentDate ? new Date(currentDate).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) : "—"}
                </p>
              </Card>
            </div>

            <div className="relative h-64 sm:h-80 mb-2">
              {visibleData.length < 2 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none select-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-lg sm:text-xl font-semibold text-cyan-400/80 animate-pulse tracking-wide">
                      Перетащите ползунок чтобы увидеть рост
                    </span>
                    <div className="flex items-center gap-2 text-cyan-400/60">
                      <span className="text-2xl">←</span>
                      <div className="w-12 h-1 rounded-full bg-gradient-to-r from-cyan-500/60 to-blue-500/60" />
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDisplayData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="growthGradientRU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, dy: 8 }}
                      tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        const spanDays = chartData.length;
                        if (spanDays <= 180) return d.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
                        if (spanDays <= 730) return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
                        return d.getFullYear().toString();
                      }}
                      interval={Math.max(1, Math.floor(chartData.length / 6))}
                    />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false}
                      axisLine={false} tickFormatter={fmtYAxis} width={65}
                      domain={[yMin, yMax]} allowDataOverflow tickCount={6}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0].value;
                        if (val == null) return null;
                        const dateStr = new Date(label).toLocaleDateString("ru-RU", { month: "long", day: "numeric", year: "numeric" });
                        const returnPct = ((val - capital) / capital) * 100;
                        const returnStr = `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`;
                        return (
                          <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-xl min-w-[220px]">
                            <p className="text-sm font-bold text-foreground mb-2">{dateStr}</p>
                            <div className="flex items-center justify-between gap-6 mb-1">
                              <span className="text-xs text-muted-foreground">Портфель</span>
                              <span className="text-sm font-bold font-mono text-foreground">{fmtValue(val)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-xs text-muted-foreground">Доходность</span>
                              <span className={`text-sm font-bold font-mono ${returnPct >= 0 ? "text-cyan-400" : "text-red-400"}`}>{returnStr}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area type="linear" dataKey="displayValue" stroke="#06b6d4" connectNulls={false}
                      strokeWidth={1.5} fill="url(#growthGradientRU)" dot={false}
                      activeDot={{ r: 4, fill: "#06b6d4", stroke: "#0a0e27", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="px-1 mb-2">
              <div className="relative">
                <input type="range" min={0} max={maxIdx} step={1} value={sliderIdx}
                  onChange={(e) => { setSliderIdx(Number(e.target.value)); if (!hasInteracted) setHasInteracted(true); }}
                  className="w-full h-3 appearance-none rounded-full cursor-ew-resize growth-slider"
                  style={{ background: `linear-gradient(to right, #06b6d4 0%, #3b82f6 ${sliderPct}%, hsl(var(--border)) ${sliderPct}%, hsl(var(--border)) 100%)` }}
                />
                {!hasInteracted && (
                  <div className="absolute -top-9 left-0 flex items-center gap-2 pointer-events-none select-none">
                    <span className="text-sm font-semibold text-cyan-400 animate-pulse">← Перетащите ползунок →</span>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between mt-3 gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {availableYears.map((y) => {
                    const yearStart = equityData.find((d) => d.date.startsWith(y))?.date ?? "";
                    const isActive = startDate === yearStart;
                    return (
                      <button key={y} onClick={() => handleSetStartDate(yearStart)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                          isActive
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                            : "bg-background/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/40"
                        }`}>
                        {y}
                      </button>
                    );
                  })}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="bg-background/50 border border-border/50 text-foreground text-xs font-mono rounded-md px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-cyan-500/60 hover:border-cyan-500/40 transition-colors flex items-center gap-1.5">
                      <CalendarRange className="w-3 h-3 text-muted-foreground" />
                      {startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("ru-RU", { month: "short", day: "numeric", year: "numeric" }) : "Выбрать дату"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarPicker mode="single" captionLayout="dropdown"
                      selected={startDate ? new Date(startDate + "T00:00:00") : undefined}
                      onSelect={(d: Date | undefined) => { if (d) handleSetStartDate(d.toISOString().substring(0, 10)); }}
                      fromDate={firstDate ? new Date(firstDate + "T00:00:00") : undefined}
                      toDate={lastDate ? new Date(lastDate + "T00:00:00") : undefined}
                      defaultMonth={startDate ? new Date(startDate + "T00:00:00") : undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-3">
              На основе исторических данных реальной торговли. Прошлые результаты не гарантируют будущей доходности.
            </p>
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}

function EquityChartSection({ stats, isLoading, strategyKey }: { stats?: StatsData; isLoading: boolean; strategyKey: StrategyKey }) {
  const equityRaw = stats?.equity ?? [];
  const [filteredData, setFilteredData] = useState(equityRaw);

  useEffect(() => {
    setFilteredData(equityRaw);
  }, [equityRaw]);

  return (
    <section id="equity" className="py-12 px-4 sm:px-6 relative" data-testid="section-equity">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Результаты стратегии
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Кривая эквити — совокупный рост капитала
            </p>
            <LiveDataBadge text="Обновляется ежедневно · Binance API" />
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-foreground">Кривая доходности</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-border/50 gap-1.5"
                  onClick={() => window.open(`/api/quantstats?strategy=${strategyKey}`, "_blank")}
                >
                  <Download className="w-3 h-3" />
                  QuantStats Report
                </Button>
                {equityRaw.length > 0 && (
                  <ChartPeriodFilter allData={equityRaw} onFilter={setFilteredData} rebaseOnFilter />
                )}
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : filteredData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ZoomableChart
                data={filteredData}
                color="#06b6d4"
                gradientId="equityGrad"
                valueSuffix="%"
                valueLabel="Доходность"
                valueDecimals={2}
                height="h-[300px] sm:h-[400px]"
                rebaseOnZoom
                yearlyTicks
                locale="ru-RU"
                liveBadgeText="Реальный счёт · Обновляется ежедневно · API Binance"
              />
            )}
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}

function ResultsSection({ stats, isLoading }: { stats?: StatsData; isLoading: boolean }) {
  const m = stats?.metrics;
  const eoyReturns = stats?.eoyReturns ?? [];

  const resultStats = [
    { label: "Прибыльные месяцы", value: getMetricValue(m, "Win Month", "—") },
    { label: "Лучший месяц", value: getMetricValue(m, "Best Month", "—") },
    { label: "Худший месяц", value: getMetricValue(m, "Worst Month", "—") },
    { label: "Ср. прибыльный месяц", value: getMetricValue(m, "Avg. Up Month", "—") },
    { label: "Ср. убыточный месяц", value: getMetricValue(m, "Avg. Down Month", "—") },
    { label: "Лучший год", value: getMetricValue(m, "Best Year", "—") },
    { label: "Худший год", value: getMetricValue(m, "Worst Year", "—") },
    { label: "Прибыльные годы", value: getMetricValue(m, "Win Year", "—") },
  ];

  return (
    <section id="results" className="py-12 px-4 sm:px-6 relative bg-card/30 border-y border-border/10" data-testid="section-results">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Результаты
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Годовая доходность и ключевые показатели
            </p>
            <LiveDataBadge text="На основе верифицированных реальных результатов" />
          </div>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <AnimatedSection delay={100}>
            <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
              <div className="p-4 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">Годовая доходность</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Год</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Доходность</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-cyan-400">Накопленная</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eoyReturns.map((row) => (
                      <tr key={row.year} className="border-b border-border/20 last:border-0">
                        <td className="px-4 py-3 font-semibold text-sm text-foreground">{row.year}</td>
                        <td className={`px-4 py-3 text-center font-mono text-sm ${row.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.returnPct >= 0 ? '+' : ''}{row.returnPct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-cyan-400">{row.cumulative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
              <div className="p-4 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">Статистика результатов</h3>
              </div>
              <div className="p-4 space-y-0">
                {resultStats.map((item) => {
                  const isNegative = typeof item.value === 'string' && item.value !== '—' && (item.value.startsWith('-') || (parseFloat(item.value) < 0));
                  return (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-mono font-medium ${isNegative ? 'text-red-400' : 'text-foreground'}`}>{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

const ACCESS_TERMS_BASE = [
  { label: "Мин. сумма", value: "$20,000" },
  { label: "Комиссия за управление", value: "0%" },
  { label: "Комиссия за результат", value: "35%" },
  { label: "High-water mark", value: "Применяется" },
  { label: "Lock-up период", value: "Отсутствует" },
  { label: "Распределение комиссий", value: "Раз в квартал" },
  { label: "Формат подключения", value: "API-ключ через биржу" },
  { label: "Торговые активы", value: "10 торговых пар, 5 подходов" },
  { label: "Обеспечение", value: "USDT" },
  { label: "Биржи", value: "Binance, OKX, Bybit, Bitget, BingX" },
];

function AccessTermsSection({ sc }: { sc: StrategyConfig }) {
  const terms = ACCESS_TERMS_BASE;
  return (
    <section id="terms" className="py-12 px-4 sm:px-6 relative bg-card/30 border-y border-border/10" data-testid="section-terms">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Connection Terms
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Автоматический алготрейдинг — просто и безопасно
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {terms.map((term) => (
              <Card key={term.label} className="p-5 bg-card/50 backdrop-blur-sm border-border/50 h-full" data-testid={`card-term-${term.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="text-xs text-muted-foreground mb-1.5">{term.label}</div>
                <div className="text-sm font-semibold text-foreground">{term.value}</div>
              </Card>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function ExchangeLogos({ strategyKey }: { strategyKey: string }) {
  return null;
}

function buildFaqItems(sc: StrategyConfig) {
  return [
    {
      q: "Как работает сервис?",
      a: `Алгоритмическая стратегия подключается к субаккаунту клиента через API и ведёт торговлю по стратегии ${sc.label}. Портфель на основе ${sc.approachFull} работает полностью автоматически. Капитал всегда на вашем счёте.`,
    },
    {
      q: "Где хранятся мои средства?",
      a: "Капитал остаётся на вашем субаккаунте биржи. Алгоритм получает только торговый API-доступ — без прав на вывод. Полный контроль за вами.",
    },
    {
      q: "Как начать?",
      a: "Свяжитесь через Telegram. Поможем создать API-ключ (только торговля) и подключить аккаунт за 10 минут.",
    },
    {
      q: "Минимальная сумма?",
      a: "Минимум — $20 000. Поддерживаем все основные криптобиржи.",
    },
    {
      q: "Какие комиссии?",
      a: "Управление — 0%, плюс 35% от прибыли с high-water mark. Ежеквартально. Без lock-up.",
    },
    {
      q: "Какие биржи поддерживаются?",
      a: "Binance, OKX, Bybit, Bitget, BingX. Подключение через API-ключ биржи.",
    },
    {
      q: "Какими активами торгуем?",
      a: "Бессрочные фьючерсы на BTC и ETH.",
    },
    {
      q: "Управление рисками?",
      a: `Фиксированный риск на сделку. Стоп-лоссы калибруются по волатильности. В аномальные периоды система снижает активность. Мониторинг 24/7.`,
    },
    {
      q: "Данные — бэктест или реальная торговля?",
      a: "Данные основаны на реальной торговле. Прошлые результаты не гарантируют будущих.",
    },
  ];
}

function FAQSection({ sc }: { sc: StrategyConfig }) {
  const FAQ_ITEMS = buildFaqItems(sc);
  return (
    <section id="faq" className="py-12 px-4 sm:px-6 relative bg-card/30 border-y border-border/10" data-testid="section-faq">
      <div className="max-w-3xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Часто задаваемые вопросы
            </h2>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border/30 rounded-md px-4 bg-card/30 backdrop-blur-sm"
              >
                <AccordionTrigger
                  className="text-sm font-medium text-foreground hover:no-underline py-4 text-left"
                  data-testid={`button-faq-${i}`}
                >
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/30" data-testid="section-footer">
      <div className="px-4 sm:px-6 pb-10">
        <div className="max-w-7xl mx-auto pt-8">
          <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-5xl mx-auto text-center">
            <strong>Дисклеймер:</strong> Алгоритмическая торговля цифровыми активами связана со значительными рисками и предназначена только для квалифицированных клиентов. Цифровые активы обладают высокой волатильностью. Стратегии могут испытывать существенные просадки. Прошлые результаты не гарантируют будущих. Клиенты должны располагать достаточным капиталом для покрытия возможных потерь.
          </p>
          <div className="mt-4 text-xs text-muted-foreground/40 text-center">
            &copy; {new Date().getFullYear()} Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
}

function LegalDisclaimerModal() {
  const [accepted, setAccepted] = useState(false);

  if (accepted) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-card border border-border/50 rounded-md shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-border/30">
          <h2 className="text-lg font-semibold text-foreground">Важная правовая информация</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-muted-foreground leading-relaxed custom-scrollbar">
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Только информационные цели</h3>
            <p>Данный сайт предоставляется в информационных целях. Доступ только для квалифицированных клиентов.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Не является инвестиционным советом</h3>
            <p>Ничто на сайте не является инвестиционным, юридическим или налоговым советом.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Риск потерь</h3>
            <p>Алгоритмическая торговля сопряжена со значительными рисками, включая возможную потерю всего капитала.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Прошлые результаты</h3>
            <p>Прошлые результаты не являются показателем будущих. Данные основаны на реальной торговле.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Отсутствие гарантий</h3>
            <p>Нет гарантии достижения целей. Целевые доходности — ориентиры, не гарантии.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Биржевые и контрагентские риски</h3>
            <p>Средства клиента на его субаккаунте. Алгоритм имеет только торговый API-доступ. Контрагентский риск биржи оценивается клиентом.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Прогнозные заявления</h3>
            <p>Сайт может содержать прогнозные заявления, подверженные рискам и неопределённостям.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Доступ по инициативе клиента</h3>
            <p>Содержимое доступно только лицам, обратившимся по собственной инициативе.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Ограниченные юрисдикции</h3>
            <p>Информация не предназначена для юрисдикций, где это противоречит законодательству.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border/30 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => window.location.href = "https://www.google.com"}
            data-testid="button-leave-site"
          >
            Покинуть сайт
          </Button>
          <Button
            onClick={() => setAccepted(true)}
            data-testid="button-accept-disclaimer"
          >
            Принимаю
          </Button>
        </div>
      </div>
    </div>
  );
}

const STRATEGY_SLUG_MAP: Record<string, StrategyKey> = {
  "basket-50": "basket50",
  "basket-70-tf": "basket70tf",
};

const STRATEGY_URL_MAP: Record<StrategyKey, string> = {
  basket50: "basket-50",
  basket70tf: "basket-70-tf",
};

function getStrategyFromPath(): StrategyKey {
  const path = window.location.pathname.replace(/^\//, "").toLowerCase();
  if (path && !STRATEGY_SLUG_MAP[path]) {
    // Redirect unknown slugs to default
    window.history.replaceState(null, "", "/");
  }
  return STRATEGY_SLUG_MAP[path] || "basket50";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [strategy, setStrategyState] = useState<StrategyKey>(getStrategyFromPath);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setStrategy = useCallback((key: StrategyKey) => {
    setStrategyState(key);
    setLocation(`/${STRATEGY_URL_MAP[key]}`);
  }, [setLocation]);
  const sc = STRATEGIES[strategy];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/stats?strategy=${strategy}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setStats(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [strategy]);

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <LegalDisclaimerModal />
      <Navbar strategy={strategy} onStrategyChange={setStrategy} />
      <HeroSection stats={stats ?? undefined} sc={sc} />

      <ExchangesBar />
      <SocialProofBar />

      <StrategyOverviewSection sc={sc} />
      <EquityChartSection stats={stats ?? undefined} isLoading={isLoading} strategyKey={strategy} />
      <DrawdownChartSection stats={stats ?? undefined} isLoading={isLoading} />
      <MetricsSection stats={stats ?? undefined} isLoading={isLoading} strategyKey={strategy} />
      <MonthlyReturnsSection stats={stats ?? undefined} isLoading={isLoading} strategyKey={strategy} />
      <DailyPnlSection stats={stats ?? undefined} isLoading={isLoading} strategyKey={strategy} />
      <CapitalGrowthSection stats={stats ?? undefined} isLoading={isLoading} />
      <ResultsSection stats={stats ?? undefined} isLoading={isLoading} />

      <section className="py-12 px-4 sm:px-6 relative" data-testid="section-strategy">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Архитектура стратегии</h2>
              <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                15 торговых систем на BTC и ETH. Полностью автоматизированное исполнение со встроенным контролем рисков.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/30">
            {[
              {
                num: "01",
                title: "Диверсификация",
                desc: "15 независимых систем снижают зависимость от одного режима. Торговля BTC и ETH — лонг и шорт.",
                accent: "from-cyan-500/30 to-cyan-600/10",
              },
              {
                num: "02",
                title: "Управление рисками",
                desc: "Каждая позиция ограничена со стоп-лоссом. Общий риск контролируется на уровне корреляции.",
                accent: "from-blue-500/30 to-blue-600/10",
              },
              {
                num: "03",
                title: "Автоматизация",
                desc: "Алгоритм исполняет сделки 24/7 без участия человека. Решения основаны на мат. моделях.",
                accent: "from-violet-500/30 to-violet-600/10",
              },
              {
                num: "04",
                title: "Адаптивность",
                desc: "15 стратегий используют моментум, возврат к среднему и кластеризацию волатильности — подходы для разных фаз рынка.",
                accent: "from-emerald-500/30 to-emerald-600/10",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.num} delay={i * 80}>
                <div className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm h-full relative group hover:bg-card/80 transition-colors flex gap-3 sm:gap-4">
                  <div className={`w-1 shrink-0 rounded-full bg-gradient-to-b ${item.accent}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1 sm:mb-2">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">{item.title}</h3>
                      <span className="text-2xl sm:text-3xl font-black text-border/30 select-none leading-none ml-2">{item.num}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Как это работает</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">Алготрейдинг через API биржи — просто и быстро</p>
            </div>
          </AnimatedSection>
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-6">
            {[
              { step: "01", title: "Откройте счёт на бирже", desc: "Binance, OKX, Bybit, Bitget, BingX. Минимум — $20 000." },
              { step: "02", title: "Свяжитесь с нами", desc: "Telegram / WhatsApp. Подключение через API-ключ за 10 минут." },
              { step: "03", title: "Алгоритм работает за вас", desc: "24/7 торговля. 35% от прибыли. Без lock-up." },
            ].map((item) => (
              <AnimatedSection key={item.step} delay={parseInt(item.step) * 100}>
                <div className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0 p-4 sm:p-6 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm h-full">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 sm:mx-auto sm:mb-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm sm:text-lg">{item.step}</span>
                  </div>
                  <div className="flex-1 sm:flex-none">
                    <h3 className="text-sm sm:text-lg font-semibold text-foreground mb-1 sm:mb-3">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="advantages" className="py-12 px-4 sm:px-6 relative bg-card/30 border-y border-border/10">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Почему алгоритмическая торговля через API</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">Преимущества алгоритмической торговли</p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Shield, title: "Без перевода средств", desc: "Средства всегда на вашем биржевом счёте." },
              { icon: Wallet, title: "Вывод в любой момент", desc: "Без lock-up." },
              { icon: Eye, title: "Полная прозрачность", desc: "Каждая сделка видна в приложении биржи." },
              { icon: PercentCircle, title: "Честная комиссия", desc: "35% только с прибыли." },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 80}>
                <div className="p-4 sm:p-6 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm h-full text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 sm:mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>


      <section className="py-12 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Готовы подключиться?</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
            Свяжитесь с нашей командой. Расскажем о стратегии, подключении и онбординге.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 mb-8 text-sm text-muted-foreground max-w-xs sm:max-w-md mx-auto">
            {[
              "8 лет опыта",
              "Тысячи аккаунтов",
              "Прозрачная статистика",
              "Подключение за 10 минут",
              "Поддержка 24/7",
              "Без перевода средств",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 pl-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-600/80 to-blue-700/80 text-white shadow-lg shadow-cyan-500/10 min-w-[200px] cta-pulse transition-all"
              onClick={() => window.open("https://t.me/etheremax", "_blank")}
            >
              <Send className="w-4 h-4 mr-2" />
              Написать в Telegram
            </Button>
            <Button
              size="lg"
              className="bg-[#25D366] hover:bg-[#1fb855] text-white shadow-lg shadow-green-500/20 min-w-[200px]"
              onClick={() => window.open("https://wa.me/48883750965", "_blank")}
            >
              <SiWhatsapp className="w-4 h-4 mr-2" />
              Написать в WhatsApp
            </Button>
          </div>
        </div>
      </section>

      <FAQSection sc={sc} />

      <Footer />
    </div>
  );
}
