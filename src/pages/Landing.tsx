import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Bot, BarChart3, Shield, Wifi, ArrowRight, CheckCircle2, FlaskConical, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: <BookOpen className="h-6 w-6" />, title: 'CDC-Aligned Lessons', desc: 'Generate lesson plans, scripts, and boardwork aligned to Nepal curriculum.' },
  { icon: <Bot className="h-6 w-6" />, title: 'AI Learning Coach', desc: 'Students get step-by-step hints — never direct answers. Safe & supportive.' },
  { icon: <BarChart3 className="h-6 w-6" />, title: 'Mastery Tracking', desc: 'See which topics need attention. No public leaderboards, just growth.' },
  { icon: <Shield className="h-6 w-6" />, title: 'Safe & Private', desc: 'Strict RBAC. Parents see only approved reports. Student data is protected.' },
  { icon: <Wifi className="h-6 w-6" />, title: 'Offline Tolerant', desc: 'Works on slow internet. Cached content available even without connection.' },
];

const bullets = [
  'CDC lesson plans + exit quizzes, fast and helpful',
  'Identify weak topics + wellbeing patterns early',
  'Weekly parent snapshot with simple interventions',
];

/* Subject icons that orbit the robot */
const subjectIcons = [
  { label: 'Math', content: 'π', angle: 0 },
  { label: 'Science', content: '⚗', angle: 90 },
  { label: 'Nepali', content: 'अ', angle: 180 },
  { label: 'English', content: 'A', angle: 270 },
];

const Landing = () => {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">NOVA A.I.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center" role="banner">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
          role="img"
          aria-label="Classroom illustration background"
        />
        {/* Dark overlay — adapts to theme */}
        <div className="absolute inset-0 bg-background/75 dark:bg-background/85" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 lg:py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* LEFT — Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <span>🇳🇵</span> Built for Nepal Schools • Offline-First
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                NOVA A.I —{' '}
                <span className="text-gradient">Learning + Emotional Support</span>{' '}
                for Every Classroom
              </h1>

              <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Teacher-first copilot that creates CDC-aligned lessons, tracks learning gaps + wellbeing, and sends weekly parent insights.
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground max-w-md mx-auto lg:mx-0">
                {bullets.map((b) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="flex items-start gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              >
                <Link to="/register">
                  <Button size="lg" className="gap-2">
                    Start Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Demo Login
                  </Button>
                </Link>
              </motion.div>

              <button
                onClick={scrollToFeatures}
                className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer mx-auto lg:mx-0 block"
              >
                See how it works ↓
              </button>
            </motion.div>

            {/* RIGHT — Robot + Orbiting Icons */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center"
            >
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
                {/* Orbiting icons */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                >
                  {subjectIcons.map((icon, i) => {
                    const rad = (icon.angle * Math.PI) / 180;
                    const radius = 46; // percent from center
                    const x = 50 + radius * Math.cos(rad);
                    const y = 50 + radius * Math.sin(rad);
                    return (
                      <motion.div
                        key={icon.label}
                        className="absolute flex items-center justify-center"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                      >
                        <div
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-card text-primary font-bold text-base sm:text-lg"
                          title={icon.label}
                        >
                          {icon.label === 'Science' ? (
                            <FlaskConical className="h-5 w-5" />
                          ) : icon.label === 'Math' ? (
                            <Calculator className="h-5 w-5" />
                          ) : (
                            icon.content
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Robot illustration */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                >
                  <div
                    className="w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-3xl gradient-hero flex items-center justify-center shadow-elevated"
                    role="img"
                    aria-label="Friendly AI robot illustration"
                  >
                    <Bot className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 text-primary-foreground" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl lg:text-3xl font-bold text-center text-foreground mb-12">
          Everything your classroom needs
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border hover:shadow-elevated transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-4">
            Ready to transform your classroom?
          </h2>
          <p className="text-primary-foreground/70 mb-8">
            Join teachers across Nepal using NOVA A.I. to save time and help every student succeed.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Get Started Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 NOVA A.I. Built with ❤️ for Nepal schools.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
