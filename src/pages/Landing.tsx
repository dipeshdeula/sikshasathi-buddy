import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Bot, BarChart3, Shield, Wifi, ArrowRight, CheckCircle2, FlaskConical, Calculator, Clock, Users, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useState, useEffect } from 'react';

/* Typewriter Hook */
const useTypewriter = (text: string, speed = 80) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return { displayed, done };
};

/* Subject icons that orbit the robot */
const subjectIcons = [
  { label: 'Math', content: 'π', angle: 0 },
  { label: 'Science', content: '⚗', angle: 90 },
  { label: 'Nepali', content: 'अ', angle: 180 },
  { label: 'English', content: 'A', angle: 270 },
];

const Landing = () => {
  const { t, i18n } = useTranslation();
  const { displayed: typedBrand, done: brandDone } = useTypewriter(t('hero.headline'), 100);

  const features = [
    { icon: <BookOpen className="h-6 w-6" />, title: t('features.cdcTitle'), desc: t('features.cdcDesc') },
    { icon: <Bot className="h-6 w-6" />, title: t('features.aiTitle'), desc: t('features.aiDesc') },
    { icon: <BarChart3 className="h-6 w-6" />, title: t('features.masteryTitle'), desc: t('features.masteryDesc') },
    { icon: <Shield className="h-6 w-6" />, title: t('features.safeTitle'), desc: t('features.safeDesc') },
    { icon: <Wifi className="h-6 w-6" />, title: t('features.offlineTitle'), desc: t('features.offlineDesc') },
  ];

  const bullets = [t('hero.bullet1'), t('hero.bullet2'), t('hero.bullet3')];

  const stats = [
    { icon: <Clock className="h-6 w-6" />, value: t('stats.stat1Value'), label: t('stats.stat1Label'), desc: t('stats.stat1Desc') },
    { icon: <Users className="h-6 w-6" />, value: t('stats.stat2Value'), label: t('stats.stat2Label'), desc: t('stats.stat2Desc') },
    { icon: <Heart className="h-6 w-6" />, value: t('stats.stat3Value'), label: t('stats.stat3Label'), desc: t('stats.stat3Desc') },
    { icon: <Eye className="h-6 w-6" />, value: t('stats.stat4Value'), label: t('stats.stat4Label'), desc: t('stats.stat4Desc') },
  ];

  const teamMembers = [
    { name: 'Dipesh Deula', role: t('team.role1'), photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' },
    { name: 'Aayush Sharma', role: t('team.role2'), photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face' },
    { name: 'Srijana Basnet', role: t('team.role3'), photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face' },
    { name: 'Rohan Thapa', role: t('team.role4'), photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face' },
    { name: 'Priya Adhikari', role: t('team.role5'), photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face' },
  ];

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
            <span className="text-xl font-bold text-foreground">NAVO.AI</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login">
              <Button variant="ghost" size="sm">{t('nav.login')}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t('nav.getStarted')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center" role="banner">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

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
                {t('hero.chip')}
              </div>

              {/* Typewriter brand name */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                <span className="text-gradient">{typedBrand}</span>
                <span className={`inline-block w-[3px] h-[0.8em] bg-primary ml-1 align-middle ${brandDone ? 'animate-pulse' : ''}`} />
              </h1>

              {/* Slogan */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: brandDone ? 1 : 0 }}
                transition={{ duration: 0.6 }}
                className="mt-3 text-lg sm:text-xl lg:text-2xl font-semibold text-primary"
              >
                {t('hero.slogan')}
              </motion.p>

              {/* Nepali tagline — only in English mode */}
              {i18n.language !== 'ne' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: brandDone ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-1 text-base sm:text-lg text-muted-foreground italic"
                >
                  {t('taglineNepali')}
                </motion.p>
              )}

              <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                {t('hero.subtext')}
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground max-w-md mx-auto lg:mx-0">
                {bullets.map((b, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
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
                    {t('hero.ctaPrimary')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    {t('hero.ctaSecondary')}
                  </Button>
                </Link>
              </motion.div>

              <button
                onClick={scrollToFeatures}
                className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer mx-auto lg:mx-0 block"
              >
                {t('hero.ctaScroll')}
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
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                >
                  {subjectIcons.map((icon) => {
                    const rad = (icon.angle * Math.PI) / 180;
                    const radius = 46;
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

      {/* Stats — Reshaping Education */}
      <section className="bg-card border-y border-border py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t('stats.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('stats.subtitle')}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl border border-border bg-background"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                  {s.icon}
                </div>
                <div className="text-3xl font-bold text-gradient mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-foreground mb-1">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl lg:text-3xl font-bold text-center text-foreground mb-12">
          {t('features.title')}
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
            {t('cta.title')}
          </h2>
          <p className="text-primary-foreground/70 mb-8">
            {t('cta.subtitle')}
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              {t('cta.button')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* About Us — Team */}
      <section className="bg-background py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t('team.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('team.subtitle')}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <div className="h-28 w-28 rounded-full p-[3px] bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="h-full w-full rounded-full object-cover border-2 border-background"
                      loading="lazy"
                    />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">NAVO.AI</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('footer.tagline')}</p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={scrollToFeatures} className="hover:text-primary transition-colors">{t('footer.features')}</button></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">{t('nav.login')}</Link></li>
                <li><Link to="/register" className="hover:text-primary transition-colors">{t('nav.getStarted')}</Link></li>
              </ul>
            </div>

            {/* For Schools */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t('footer.forSchools')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('footer.cdcAligned')}</li>
                <li>{t('footer.offlineReady')}</li>
                <li>{t('footer.parentReports')}</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t('footer.contact')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>📧 hello@navo.ai</li>
                <li>📍 {t('footer.location')}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t('footer.copy')}</p>
            <p className="text-xs text-muted-foreground">{t('footer.madeWith')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
