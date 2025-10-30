import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Play, Check, Menu, X, Mail, MapPin,
  Clock, Users, Calendar, FileText, DollarSign,
  Shield, Bot, Bell, Building, Star, ArrowUpRight
} from 'lucide-react'
import { Button } from '../ui/button'

const LandingPage = () => {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (token) {
      navigate("/dashboard")
      return
    }
  }, [navigate])

  // Scroll detection for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (href) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
    setIsMenuOpen(false)
  }

  const handleLogin = () => {
    navigate('/login')
  }

  // Animation variants for consistent animations
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Navigation Component
  const Navigation = () => {
    const navItems = [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Contact', href: '#contact' }
    ]

    return (
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/90 backdrop-blur-lg border-b border-gray-200/50 shadow-sm'
          : 'bg-transparent'
          }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center cursor-pointer"
              onClick={() => scrollToSection('#hero')}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900">HRMS</span>
            </motion.div>

            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.name}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => scrollToSection(item.href)}
                  className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-300"
                >
                  {item.name}
                </motion.button>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleLogin}
                className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-300"
              >
                Login
              </button>
              <Button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-300 hover:shadow-lg transform hover:translate-y-[-1px]"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-700"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isMenuOpen ? 'auto' : 0,
            opacity: isMenuOpen ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden overflow-hidden bg-white border-t border-gray-200/50"
        >
          <div className="px-6 py-6 space-y-4">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.href)}
                className="block w-full text-left text-gray-700 font-medium py-2 hover:text-blue-600 transition-colors duration-200"
              >
                {item.name}
              </button>
            ))}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleLogin}
                className="block w-full text-left text-gray-700 font-medium py-2"
              >
                Login
              </button>
              <Button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.nav>
    )
  }

  // Hero Section - No scroll triggers, immediate animation
  const Hero = () => {
    return (
      <section id="hero" className="relative min-h-screen bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30" />

        <motion.div
          className="absolute top-1/3 right-1/5 w-40 h-40 bg-gradient-to-br from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.4, 0.6, 0.4],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20">
          <div className="grid lg:grid-cols-5 gap-16 items-center">
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-full border border-green-100">
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="text-sm font-semibold text-green-700">Trusted by 500+ Indian Businesses</span>
                </div>
              </motion.div>

              <motion.h1
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Transform Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  HR Operations
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-xl text-gray-600 mb-10 leading-relaxed"
              >
                Complete HR automation built for Indian SMEs. GPS attendance tracking,
                automated payroll compliance, AI-powered HR assistant, and seamless employee management.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10"
              >
                {[
                  { icon: Clock, text: "Smart GPS Attendance", desc: "Auto detect location & hours" },
                  { icon: DollarSign, text: "Tax-Compliant Payroll", desc: "Old & new regime support" },
                  { icon: Bot, text: "HR Buddy AI", desc: "24/7 intelligent assistant" },
                  { icon: Shield, text: "100% Compliance", desc: "PF, ESI, TDS automated" }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-white/70 rounded-xl border border-gray-100/50 backdrop-blur-sm hover:bg-white/90 transition-colors duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05, duration: 0.4 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.text}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-6 items-start"
              >
                <Button
                  size="lg"
                  onClick={handleLogin}
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:translate-y-[-2px]"
                >
                  Start 30-Day Free Trial
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <button className="text-gray-700 hover:text-gray-900 transition-all duration-300 flex items-center gap-3 group hover:translate-y-[-1px]">
                  <div className="w-12 h-12 rounded-2xl border-2 border-gray-300 flex items-center justify-center group-hover:border-blue-500 group-hover:bg-blue-50 transition-all duration-300">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Watch Demo</div>
                    <div className="text-sm text-gray-500">2 minutes</div>
                  </div>
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="flex items-center gap-8 mt-12 text-sm text-gray-500"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Free migration</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="lg:col-span-2 relative"
            >
              <div className="relative max-w-sm mx-auto">
                <motion.div
                  className="relative bg-white rounded-3xl shadow-2xl p-3 border border-gray-200/50"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <div className="aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl overflow-hidden">
                    <img
                      src="/screenshots/dashboard.jpg"
                      alt="HRMS Dashboard - Complete HR Management"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Live Dashboard
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="absolute -left-8 top-12 w-32"
                >
                  <div className="bg-white rounded-2xl shadow-xl p-2 border border-gray-100">
                    <div className="aspect-[9/16] bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl overflow-hidden">
                      <img
                        src="/screenshots/hrbuddy.jpg"
                        alt="HR Buddy AI Assistant"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center mt-1 mb-1">
                      <span className="text-xs font-medium text-gray-700">AI Assistant</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="absolute -right-8 bottom-16 w-32"
                >
                  <div className="bg-white rounded-2xl shadow-xl p-2 border border-gray-100">
                    <div className="aspect-[9/16] bg-gradient-to-br from-green-50 to-blue-50 rounded-xl overflow-hidden">
                      <img
                        src="/screenshots/directory.jpg"
                        alt="Employee Directory Management"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center mt-1 mb-1">
                      <span className="text-xs font-medium text-gray-700">Employee Hub</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 px-8 py-4"
                >
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">₹5L+</div>
                      <div className="text-xs text-gray-500">Yearly Savings</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">70%</div>
                      <div className="text-xs text-gray-500">Time Saved</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">99.9%</div>
                      <div className="text-xs text-gray-500">Compliance</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    )
  }

  // Features Section - Using optimized whileInView
  const Features = () => {
    const features = [
      {
        icon: Clock,
        title: 'Smart Attendance Tracking',
        description: 'GPS location detection, automatic half-day/full-day calculation based on working hours. Real-time status updates.',
        color: 'blue',
        image: '/screenshots/dashboard.jpg'
      },
      {
        icon: Bot,
        title: 'HR Buddy - AI Assistant',
        description: 'Your intelligent HR companion. Automate responses, generate reports, and handle employee queries 24/7.',
        color: 'purple',
        image: '/screenshots/hrbuddy.jpg'
      },
      {
        icon: Users,
        title: 'Employee Directory Management',
        description: 'Complete employee profiles, document storage, department management, and seamless user-employee linking.',
        color: 'green',
        image: '/screenshots/directory.jpg'
      },
      {
        icon: DollarSign,
        title: 'Advanced Salary Processing',
        description: 'Support both old & new tax regimes. Automatic TDS calculation, PF/ESI compliance, and instant salary slip generation.',
        color: 'yellow'
      },
      {
        icon: Calendar,
        title: 'Holiday & Leave Management',
        description: 'Pre-configured Indian holidays, custom working days setup, automatic leave integration with attendance.',
        color: 'indigo'
      },
      {
        icon: FileText,
        title: 'Task Reports & Documentation',
        description: 'Employee task submission, report generation, policy publishing, and document management system.',
        color: 'red'
      },
      {
        icon: Bell,
        title: 'Smart Notifications',
        description: 'Email alerts for birthdays, work anniversaries, pending approvals, and milestone achievements.',
        color: 'pink'
      },
      {
        icon: Building,
        title: 'Department Management',
        description: 'Organize teams, set department-wise policies, manage hierarchies, and track department-wise analytics.',
        color: 'cyan'
      }
    ]

    const colorMap = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      yellow: 'from-yellow-500 to-orange-500',
      indigo: 'from-indigo-500 to-indigo-600',
      red: 'from-red-500 to-red-600',
      pink: 'from-pink-500 to-pink-600',
      cyan: 'from-cyan-500 to-cyan-600'
    }

    return (
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything Your Business
              <span className="block text-blue-600">Needs to Succeed</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive HR management designed specifically for Indian businesses.
              Save time, reduce costs, ensure compliance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {features.slice(0, 3).map((feature, index) => (
              <motion.div
                key={index}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {feature.image && (
                  <div className="aspect-[4/3] mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}

                <div className="flex items-center mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${colorMap[feature.color]} mr-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>

                <div className="flex items-center text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Learn more</span>
                  <ArrowUpRight className="ml-1 w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.slice(3).map((feature, index) => (
              <motion.div
                key={index + 3}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${colorMap[feature.color]} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                <ArrowUpRight className="absolute top-6 right-6 w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            {[
              { number: '₹5L+', label: 'Avg. Annual Savings' },
              { number: '70%', label: 'Time Saved on HR' },
              { number: '99.9%', label: 'Compliance Accuracy' },
              { number: '500+', label: 'Happy Businesses' }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    )
  }

  // Pricing Section - Optimized
  const Pricing = () => {
    const plans = [
      {
        name: 'Starter',
        price: '₹599',
        period: 'per month',
        description: 'Perfect for small businesses up to 25 employees',
        features: [
          'Up to 25 employees',
          'Basic attendance tracking',
          'Leave management',
          'Salary slip generation',
          'Email support',
          'Mobile app access',
          'Document management'
        ],
        popular: false,
        savings: 'Save ₹30,000/month'
      },
      {
        name: 'Business',
        price: '₹3,500',
        period: 'per month',
        description: 'Complete solution for growing SMEs up to 100 employees',
        features: [
          'Up to 100 employees',
          'Advanced attendance with GPS',
          'HR Buddy AI Assistant',
          'Full payroll with tax compliance',
          'Document management',
          'Priority phone support',
          'Custom reports',
          'Department management',
          'Employee document automation'
        ],
        popular: true,
        note: '* Extended feature available',
        savings: 'Save ₹75,000/month'
      },
      {
        name: 'Enterprise',
        price: '₹6,500',
        period: 'per month',
        description: 'Full-featured solution for large organizations',
        features: [
          'Unlimited employees',
          'All Business features',
          'Multi-location support',
          'Advanced analytics dashboard',
          'Dedicated account manager',
          'On-site training included',
          'Custom integrations',
          'White-label option'
        ],
        popular: false,
        savings: 'Save ₹1.5L+/month'
      }
    ]

    return (
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Simple Pricing That
              <span className="block text-blue-600">Scales With You</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fixed monthly pricing. No per-employee charges. 30-day free trial with all features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                className={`relative bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-xl ${plan.popular
                  ? 'border-2 border-blue-500 shadow-lg scale-105'
                  : 'border border-gray-200'
                  }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">/{plan.period}</span>
                  </div>
                  <div className="text-sm font-semibold text-green-600 mb-4">{plan.savings}</div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <Button
                  onClick={handleLogin}
                  className={`w-full mb-8 ${plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  size="lg"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>

                    </li>
                  ))}

                  {plan.note && (
                    <p className="pl-7 text-sm text-blue-500">{plan.note}</p>
                  )}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
<<<<<<< HEAD
            <p className="text-gray-600 mb-4">
              All plans include 30-day free trial. No credit card required. Cancel anytime.
=======
            <p className="text-gray-600 mb-2">
              All plans include 30-day free trial. No credit card required. Cancel anytime.
            </p>
            <p className="text-md text-gray-600 mb-2">
              An annual maintenance & recruitment charge of ₹5,000 will be applicable.
>>>>>>> 43c668da6151c3c1fe0a48a645178337191f31b6
            </p>
            <p className="text-sm text-gray-500">
              Need a custom solution? <button className="text-blue-600 hover:underline font-semibold">Contact Us</button>
            </p>
          </motion.div>
        </div>
      </section>
    )
  }

  // CTA Section
  const CTA = () => {
    return (
      <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Ready to Transform
              <span className="block">Your HR Operations?</span>
            </h2>

            <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join 500+ Indian businesses already saving thousands monthly on HR operations.
              Start your free trial today - no credit card needed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                onClick={handleLogin}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-lg"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <button className="text-white/80 hover:text-white transition-colors duration-300 font-medium">
                Schedule a personalized demo →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto opacity-90">
              {['No Setup Fees', '30-day Free Trial', 'Cancel Anytime', 'Migration Support'].map((benefit, index) => (
                <div key={index} className="flex items-center justify-center text-sm">
                  <Check className="w-4 h-4 mr-2 text-green-300" />
                  {benefit}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  // Footer
  const Footer = () => {
    return (
      <footer id="contact" className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
                  <span className="text-white font-bold">H</span>
                </div>
                <span className="text-2xl font-bold">HRMS</span>
              </div>
              <p className="text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto text-lg">
                Modern HR management system designed specifically for Indian businesses.
                Streamline operations, ensure compliance, and focus on growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-12">
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-blue-400" />
                <span className="text-gray-300">intakesense@gmail.com</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-3 text-blue-400" />
                <span className="text-gray-300">New Delhi, India</span>
              </div>
            </div>

            <div className="max-w-3xl mx-auto mb-12 p-6 bg-gray-800 rounded-2xl border border-gray-700">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-lg italic text-gray-300 mb-4">
                "HRMS has completely transformed our HR operations. We've saved over ₹80,000 monthly
                and our team productivity has increased by 40%. The AI assistant is a game-changer!"
              </blockquote>
              <cite className="text-blue-400 font-semibold">— Rajesh Kumar, CEO, TechnoSoft Solutions</cite>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-400">
                © 2024 HRMS by Intakesense. All rights reserved. Made with ❤️ for Indian businesses.
              </p>
            </div>
          </motion.div>
        </div>
      </footer>
    )
  }

  return (
    <div className="relative min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}

export default LandingPage