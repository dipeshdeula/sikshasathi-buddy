import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Bot, BarChart3, Shield, Wifi, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: <BookOpen className="h-6 w-6" />, title: 'CDC-Aligned Lessons', desc: 'Generate lesson plans, scripts, and boardwork aligned to Nepal curriculum.' },
  { icon: <Bot className="h-6 w-6" />, title: 'AI Learning Coach', desc: 'Students get step-by-step hints — never direct answers. Safe & supportive.' },
  { icon: <BarChart3 className="h-6 w-6" />, title: 'Mastery Tracking', desc: 'See which topics need attention. No public leaderboards, just growth.' },
  { icon: <Shield className="h-6 w-6" />, title: 'Safe & Private', desc: 'Strict RBAC. Parents see only approved reports. Student data is protected.' },
  { icon: <Wifi className="h-6 w-6" />, title: 'Offline Tolerant', desc: 'Works on slow internet. Cached content available even without connection.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SikshaSathi</span>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="max-w-6xl mx-auto px-4 py-24 lg:py-32 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span>🇳🇵</span> Built for Nepal Schools
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
              Your AI Classroom <span className="text-gradient">Copilot</span> for Teaching & Learning
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              SikshaSathi helps teachers plan CDC-aligned lessons, track student mastery, and keep parents informed — all while students learn with a safe AI coach.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
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
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
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
            Join teachers across Nepal using SikshaSathi to save time and help every student succeed.
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
          © 2026 SikshaSathi. Built with ❤️ for Nepal schools.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
