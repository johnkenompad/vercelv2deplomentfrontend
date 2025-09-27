import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import '../../i18n';

const Landing = () => {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    i18n.changeLanguage(selectedLang);
    localStorage.setItem('i18nextLng', selectedLang);
  };

  const faqItems = [
    { question: t('faq1q'), answer: t('faq1a') },
    { question: t('faq2q'), answer: t('faq2a') },
    { question: t('faq3q'), answer: t('faq3a') },
    { question: t('faq4q'), answer: t('faq4a') },
    { question: t('faq5q'), answer: t('faq5a') },
  ];

  return (
    <div className="bg-[#F6EFFC] dark:bg-gray-900 text-[#5C517B] dark:text-gray-100 min-h-screen transition-all duration-300">
      {/* Navbar */}
      <header className="w-full flex justify-between items-center px-8 py-4 bg-white dark:bg-gray-800 shadow fixed top-0 z-50 border-b border-[#EBD3FA] dark:border-none">
        <div className="text-2xl font-bold text-[#B76EF1] dark:text-indigo-300">QuizRush</div>
        <div className="flex items-center gap-3">
          <select
            className="bg-[#F6EFFC] dark:bg-gray-700 text-[#5C517B] dark:text-white px-3 py-1.5 rounded-md text-sm border border-[#EBD3FA] dark:border-gray-600 shadow-sm focus:outline-none"
            onChange={handleLanguageChange}
            value={i18n.language}
          >
            <option value="en">English</option>
            <option value="tl">Tagalog</option>
          </select>

          <Link
            to="/login"
            className="bg-[#B76EF1] hover:bg-[#974EC3] text-white px-4 py-2 rounded-md text-sm font-semibold shadow transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-[#974EC3] hover:bg-[#B76EF1] text-white px-4 py-2 rounded-md text-sm font-semibold shadow transition-all"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center bg-[#F6EFFC] dark:bg-gray-800 rounded-b-3xl shadow-inner">
        <motion.img
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          src="/Learning-amico.png"
          alt="Learning"
          className="mx-auto max-w-sm md:max-w-md lg:max-w-lg"
        />
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-4xl md:text-5xl font-extrabold mt-6 text-[#B76EF1] dark:text-indigo-300"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg mt-4 max-w-2xl mx-auto text-[#5C517B] dark:text-gray-300"
        >
          {t('heroDesc')}
        </motion.p>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white dark:bg-gray-900 text-center">
        <h2 className="text-3xl font-bold mb-10 text-[#974EC3] dark:text-indigo-300">{t('whyTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#F6EFFC] dark:bg-gray-800 p-6 rounded-xl shadow border border-[#EBD3FA] dark:border-none hover:shadow-md transition-all"
            >
              <h3 className="text-xl font-semibold text-[#B76EF1] dark:text-indigo-300 mb-2">
                {t(`feature${i}Title`)}
              </h3>
              <p className="text-sm text-[#5C517B] dark:text-gray-300">{t(`feature${i}Desc`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-6 bg-[#F0E9FC] dark:bg-gray-800">
        <h2 className="text-3xl font-semibold text-center mb-8 text-[#974EC3] dark:text-indigo-300">
          {t('faqTitle')}
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, idx) => (
            <motion.details
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-[#EBD3FA] dark:border-none shadow-sm cursor-pointer transition-all"
            >
              <summary className="text-lg font-medium text-[#5C517B] dark:text-white">
                {item.question}
              </summary>
              <p className="mt-2 text-[#5C517B] dark:text-gray-300">{item.answer}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F6EFFC] dark:bg-gray-900 border-t border-[#EBD3FA] dark:border-gray-700 text-[#5C517B] dark:text-gray-400 py-6 text-sm text-center">
        <p>© {new Date().getFullYear()} QuizRush. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <a href="#" className="hover:underline">Terms</a>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Help</a>
        </div>
      </footer>

      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="fixed bottom-6 right-6 z-50 bg-[#B76EF1] dark:bg-emerald-500 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl hover:scale-105 transition-transform duration-300"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
    </div>
  );
};

export default Landing;
