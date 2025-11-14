// src/pages/Landing.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Landing = () => {
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState('en');

  // ────────────────────────────────────────
  // 🔤 Mock translation helper
  // ────────────────────────────────────────
  const t = (key) => {
    const translations = {
      en: {
        heroTitle: 'Master Knowledge Through Interactive Quizzes',
        heroDesc: 'An engaging platform for educators and students to create, share, and excel in interactive assessments.',
        whyTitle: 'Why Choose QuizRush?',
        feature1Title: 'Secure Authentication',
        feature1Desc: 'Enterprise-grade security ensures your data and assessments remain protected at all times.',
        feature2Title: 'Live Leaderboards',
        feature2Desc: 'Real-time rankings motivate students and create healthy competition in the classroom.',
        feature3Title: 'Instant Results',
        feature3Desc: 'Get immediate feedback on performance with detailed analytics and insights.',
        feature4Title: 'Achievement System',
        feature4Desc: 'Gamified rewards and badges keep students engaged and motivated to learn.',
        faqTitle: 'Frequently Asked Questions',
        faq1q: 'How do I get started with QuizRush?',
        faq1a: 'Simply create an account, choose your role (teacher or student), and start creating or joining quizzes right away.',
        faq2q: 'Is QuizRush free to use?',
        faq2a: 'Yes! We offer a free tier with essential features. Premium plans are available for advanced functionality.',
        faq3q: 'Can I use QuizRush for remote learning?',
        faq3a: 'Absolutely! QuizRush is designed for both in-class and remote learning environments.',
        faq4q: 'How secure is student data?',
        faq4a: 'We use industry-standard encryption and comply with educational data privacy regulations.',
        faq5q: 'What types of questions can I create?',
        faq5a: 'Multiple choice, true/false, short answer, and various other question formats are supported.'
      },
      tl: {
        heroTitle: 'Matutunan ang Kaalaman sa Pamamagitan ng Interactive na Quiz',
        heroDesc: 'Isang nakaka-engage na platform para sa mga guro at mag-aaral na lumikha, magbahagi, at manalo sa interactive na pagsusulit.',
        whyTitle: 'Bakit Piliin ang QuizRush?',
        feature1Title: 'Secure na Authentication',
        feature1Desc: 'Enterprise-grade na seguridad na nagsisiguro na protektado ang iyong data at assessments.',
        feature2Title: 'Live na Leaderboards',
        feature2Desc: 'Real-time na ranking na nag-motivate sa mga estudyante at lumilikha ng healthy competition.',
        feature3Title: 'Instant na Resulta',
        feature3Desc: 'Makakuha ng agarang feedback sa performance na may detalyadong analytics at insights.',
        feature4Title: 'Achievement System',
        feature4Desc: 'Gamified na rewards at badges na nakakatulong sa engagement ng mga estudyante.',
        faqTitle: 'Mga Madalas Itanong',
        faq1q: 'Paano ako magsisimula sa QuizRush?',
        faq1a: 'Simpleng lumikha ng account, piliin ang iyong role (guro o estudyante), at magsimula ng paggawa o pagsali sa mga quiz.',
        faq2q: 'Libre ba ang QuizRush?',
        faq2a: 'Oo! Nag-aalok kami ng free tier na may essential features. May premium plans para sa advanced functionality.',
        faq3q: 'Pwede ko bang gamitin ang QuizRush para sa remote learning?',
        faq3a: 'Syempre! Ang QuizRush ay dinisenyo para sa in-class at remote learning environments.',
        faq4q: 'Gaano ka-secure ang student data?',
        faq4a: 'Gumagamit kami ng industry-standard encryption at sumusunod sa educational data privacy regulations.',
        faq5q: 'Anong uri ng tanong ang pwede kong gawin?',
        faq5a: 'Multiple choice, true/false, short answer, at iba pang question formats ay suportado.'
      }
    };
    return translations[language]?.[key] || key;
  };

  // ────────────────────────────────────────
  // 🌗 Theme handler
  // ────────────────────────────────────────
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  // ────────────────────────────────────────
  // 📜 Scroll handler
  // ────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ────────────────────────────────────────
  // ❓ FAQ items
  // ────────────────────────────────────────
  const faqItems = [
    { question: t('faq1q'), answer: t('faq1a') },
    { question: t('faq2q'), answer: t('faq2a') },
    { question: t('faq3q'), answer: t('faq3a') },
    { question: t('faq4q'), answer: t('faq4a') },
    { question: t('faq5q'), answer: t('faq5a') }
  ];

  // ────────────────────────────────────────
  // 🌟 Feature icon wrapper
  // ────────────────────────────────────────
  const FeatureIcon = ({ children }) => (
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3399FF] to-[#2A7DFF] flex items-center justify-center text-white text-2xl mb-4 shadow-lg">
      {children}
    </div>
  );

  // ────────────────────────────────────────
  // 📈 Stats
  // ────────────────────────────────────────
  const stats = [
    { label: 'Active Users', value: '10,000+' },
    { label: 'Quizzes Created', value: '50,000+' },
    { label: 'Institutions', value: '200+' },
    { label: 'Success Rate', value: '95%' }
  ];

  // ────────────────────────────────────────
  // 🖼️ Render
  // ────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
      {/* ────────── NAVBAR ────────── */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg'
            : 'bg-white dark:bg-gray-900'
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* 🔵 Brand */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3399FF] to-[#2A7DFF]">
                <span className="text-xl font-bold text-white">Q</span>
              </div>
              <span className="bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] bg-clip-text text-2xl font-bold text-transparent">
                QuizRush
              </span>
            </motion.div>

            {/* 🌐 Navigation */}
            <div className="flex items-center gap-4">
              <select
                className="hidden rounded-lg border border-[#DDDDDD] bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3399FF] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                onChange={(e) => setLanguage(e.target.value)}
                value={language}
              >
                <option value="en">English</option>
                <option value="tl">Tagalog</option>
              </select>

              <a
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#555555] transition-colors hover:text-[#3399FF] dark:text-gray-300 dark:hover:text-[#3399FF]"
              >
                Sign&nbsp;In
              </a>
              <a
                href="/register"
                className="rounded-lg bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Get&nbsp;Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ────────── HERO ────────── */}
      <section className="relative overflow-hidden px-6 pt-32 pb-20">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#E0F2FF] to-[#D9F0FF] dark:from-gray-900 dark:to-gray-950"></div>

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-0 left-0 h-full w-full opacity-30 dark:opacity-20">
          <div className="absolute top-20 right-10 h-72 w-72 animate-blob rounded-full bg-[#3399FF] mix-blend-multiply filter blur-3xl"></div>
          <div className="animation-delay-2000 absolute top-40 left-10 h-72 w-72 animate-blob rounded-full bg-purple-400 mix-blend-multiply filter blur-3xl"></div>
          <div className="animation-delay-4000 absolute bottom-20 left-1/2 h-72 w-72 animate-blob rounded-full bg-pink-400 mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <div className="mb-6 inline-block rounded-full bg-[#E8F6FF] px-4 py-2 text-sm font-semibold text-[#3399FF] dark:bg-[#3399FF]/30 dark:text-[#E0F2FF]">
                🎓 Trusted by 200+ Educational Institutions
              </div>

              <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-r from-[#3399FF] via-[#3191F5] to-[#2A7DFF] bg-clip-text text-transparent">
                  {t('heroTitle')}
                </span>
              </h1>

              <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-[#555555] dark:text-gray-400 md:text-xl lg:mx-0">
                {t('heroDesc')}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <a
                  href="/register"
                  className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] px-8 py-4 text-base font-semibold text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
                >
                  Start Free Trial
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
                <a
                  href="/login"
                  className="rounded-xl border-2 border-[#E0E0E0] bg-white px-8 py-4 text-base font-semibold text-[#2A2A2A] transition-all hover:border-[#3399FF] hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  Sign&nbsp;In
                </a>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-2 gap-6 border-t border-[#E0E0E0] pt-12 sm:grid-cols-4 dark:border-gray-800">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="text-center lg:text-left"
                  >
                    <div className="text-2xl font-bold text-[#3399FF] md:text-3xl">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-sm text-[#555555] dark:text-gray-400">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <img
                src="/images/Teaching-amico.png" 
                alt="Learning Illustration"
                className="mx-auto w-full max-w-lg drop-shadow-2xl"
              />
              <div className="absolute top-1/4 -right-8 h-24 w-24 animate-float rounded-2xl bg-[#3399FF] opacity-20"></div>
              <div className="animation-delay-2000 absolute bottom-1/4 -left-8 h-32 w-32 animate-float rounded-full bg-purple-500 opacity-20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ────────── FEATURES ────────── */}
      <section className="bg-[#FAFAFA] py-24 px-6 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] bg-clip-text text-transparent">
                {t('whyTitle')}
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#555555] dark:text-gray-400">
              Built for educators and students with powerful features that enhance learning
            </p>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🔒', num: 1 },
              { icon: '🏆', num: 2 },
              { icon: '⚡', num: 3 },
              { icon: '📊', num: 4 }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-2xl border border-[#E0E0E0] bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-[#3399FF] hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800"
              >
                <FeatureIcon>{item.icon}</FeatureIcon>
                <h3 className="mb-3 text-xl font-bold text-[#2A2A2A] transition-colors group-hover:text-[#3399FF] dark:text-white">
                  {t(`feature${item.num}Title`)}
                </h3>
                <p className="leading-relaxed text-[#555555] dark:text-gray-400">
                  {t(`feature${item.num}Desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── HOW IT WORKS ────────── */}
      <section className="bg-white py-24 px-6 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] bg-clip-text text-transparent">
                How QuizRush Works
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#555555] dark:text-gray-400">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a teacher or student in seconds' },
              { step: '02', title: 'Join or Create Quiz', desc: 'Teachers create quizzes, students join with room codes' },
              { step: '03', title: 'Track Progress', desc: 'Monitor results, achievements, and leaderboards in real-time' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative text-center"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3399FF] to-[#2A7DFF] text-2xl font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#2A2A2A] dark:text-white">
                  {item.title}
                </h3>
                <p className="text-[#555555] dark:text-gray-400">{item.desc}</p>
                {idx < 2 && (
                  <div className="absolute top-10 -right-4 hidden text-4xl text-[#E0F2FF] dark:text-[#3399FF]/40 md:block">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── FAQ ────────── */}
      <section className="bg-[#FAFAFA] py-24 px-6 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-[#3399FF] to-[#2A7DFF] bg-clip-text text-transparent">
                {t('faqTitle')}
              </span>
            </h2>
            <p className="text-lg text-[#555555] dark:text-gray-400">
              Find answers to common questions
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <motion.details
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group cursor-pointer rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <summary className="flex items-center justify-between text-lg font-semibold text-[#2A2A2A] dark:text-white">
                  {item.question}
                  <span className="transition-transform text-[#3399FF] group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-4 leading-relaxed text-[#555555] dark:text-gray-400">
                  {item.answer}
                </p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── CTA ────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3399FF] to-[#2A7DFF] py-24 px-6 dark:from-[#3399FF] dark:to-[#1F5FCF]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            Ready to Transform Your Classroom?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-[#E0F2FF]">
            Join thousands of educators and students using QuizRush to make learning engaging and effective
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/register"
              className="group flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#3399FF] shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              Get&nbsp;Started&nbsp;Free
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="/login"
              className="rounded-xl border-2 border-white px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white hover:text-[#3399FF]"
            >
              Sign&nbsp;In
            </a>
          </div>
        </motion.div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className="bg-gray-900 py-12 text-[#555555] dark:bg-black">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3399FF] to-[#2A7DFF]">
                  <span className="text-xl font-bold text-white">Q</span>
                </div>
                <span className="text-2xl font-bold text-white">QuizRush</span>
              </div>
              <p className="mb-4 max-w-md text-[#666666]">
                Empowering educators and students with interactive, engaging quiz experiences. Built for the modern classroom.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">Features</a></li>
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">Pricing</a></li>
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-white">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">Help Center</a></li>
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">Terms</a></li>
                <li><a href="#" className="transition-colors hover:text-[#3399FF]">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            © {new Date().getFullYear()} QuizRush. All&nbsp;rights&nbsp;reserved.
          </div>
        </div>
      </footer>

      {/* ────────── THEME TOGGLE ────────── */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setIsDark(!isDark)}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#3399FF] to-[#2A7DFF] text-2xl text-white shadow-2xl transition-all hover:scale-110 dark:border-gray-900 dark:from-gray-700 dark:to-gray-800"
      >
        {isDark ? '☀️' : '🌙'}
      </motion.button>

      {/* ────────── Custom animations ────────── */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default Landing;
