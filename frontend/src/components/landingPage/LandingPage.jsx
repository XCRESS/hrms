import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import {
  ArrowRight, Play, Check, Menu, X, Mail, MapPin,
  Clock, Users, Calendar, FileText, DollarSign,
  Shield, Bot, Bell, Facebook, Linkedin, Twitter, Instagram, Building, ArrowUpRight
} from 'lucide-react'
import { Button } from '../ui/button'

const LandingPage = () => {
  const navigate = useNavigate()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (token) {
      navigate("/dashboard")
      return
    }
  }, [navigate])

  const scrollToSection = (href) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleLogin = () => {
    navigate('/login')
  }


  // Navigation Component
  const Navigation = ({ onScrollToSection }) => {

    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20)
      }
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navItems = [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Contact', href: '#contact' }
    ]

    const handleNavItemClick = (href) => {
      onScrollToSection(href);
    };

    return (
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-black/15 backdrop-blur-md backdrop-saturate-150 border-b-2 border-gray-200/50 shadow-lg'
          : 'bg-transparent'
          }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center cursor-pointer"
              onClick={() => handleNavItemClick('#hero')}
            >
              <div className="w-8 h-8 mr-3 flex items-center justify-center">
                <img
                  src="/Logos/HRMS.webp"
                  alt="Logo"
                  className="w-full h-full border rounded-md"
                />
              </div>
              <span className="text-xl font-bold text-white hover:text-blue-600">HRMS</span>
            </motion.div>

            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.name}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => handleNavItemClick(item.href)}
                  className={`${isScrolled ? 'text-white hover:text-blue-600' : 'text-white hover:text-blue-600'} font-medium transition-colors duration-300`}

                >
                  {item.name}
                </motion.button>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleLogin}
                className={`${isScrolled ? 'text-white hover:text-blue-600' : 'text-white hover:text-blue-600'} font-medium transition-colors duration-300`}
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
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg"
              >
                Login
              </Button>
            </div>
          </div>
        </div>


      </motion.nav>
    )
  }

  // Hero Section - No scroll triggers, immediate animation
  const Hero = () => {
    return (
      <section id="hero" className="relative min-h-screen bg-black text-white overflow-hidden">
        {/* 🔥 Animated Cyber Grid Background */}
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        {/* Glowing gradient background behind everything */}
        <div className="absolute inset-0 bg-blue-900/20"></div>

        <motion.div
          className="absolute top-1/3 right-1/5 w-40 h-40 bg-gradient-to-br from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.4, 0.6, 0.4],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 12,
            repeaat: Infinity,
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
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <span className="text-sm font-semibold text-green-700">Trusted by 500+ Indian Businesses</span>
                </div>
              </motion.div>

              <motion.h1
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight"
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
                className="text-xl text-white mb-10 leading-relaxed"
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

                <button className="text-white hover:text-gray-900 transition-all duration-300 flex items-center gap-3 group hover:translate-y-[-1px]">
                  <div className="w-12 h-12 rounded-2xl border-2 border-gray-300 flex items-center justify-center group-hover:border-blue-500 group-hover:bg-blue-50 transition-all duration-300">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                  <div className="text-left text-white">
                    <div className="font-semibold">Watch Demo</div>
                    <div className="text-sm text-white">2 minutes</div>
                  </div>
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="flex items-center gap-8 mt-12 text-sm text-white"
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
                        src="/screenshots/HR_Buddy.webp"
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

  // Sliding Companies Section


  const CompaniesSlider = () => {
    const logos = [
      { src: "/Logos/1.png", alt: "CFG" },
      { src: "/Logos/2.png", alt: "InnovateHub" },
      { src: "/Logos/3.png", alt: "Solutionize" },
      { src: "/Logos/4.png", alt: "DataWeave" },
      { src: "/Logos/5.png", alt: "NextGen Corp" },
    ];

    return (
      <section className="relative py-10 bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/20" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

        <div className="relative mx-auto w-full px-6">
          {/* Heading */}
          <div className="text-center max-w-4xl mx-auto">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              The Engine Behind{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                World-Class
              </span>{" "}
              Teams
            </h3>
            <p className="text-gray-400 sm:text-lg mb-12">
              From fast-growing startups to Fortune companies, we are the
              trusted HR platform for businesses that build the future.
            </p>
          </div>

          {/* Slider */}
          <div
            className="relative h-28 w-full overflow-hidden
          [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]"
          >
            <motion.div
              className="absolute left-0 flex w-max items-center"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                ease: "linear",
                duration: 10,
                repeat: Infinity,
              }}
            >
              {/* First set */}
              <div className="flex items-center gap-16 px-8">
                {logos.map((logo, i) => (
                  <img
                    key={`first-${i}`}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-16 sm:h-20 md:h-24 w-auto object-contain opacity-80 hover:opacity-100 transition"
                  />
                ))}
              </div>

              {/* Duplicate set (MANDATORY for loop) */}
              <div className="flex items-center gap-16 px-8">
                {logos.map((logo, i) => (
                  <img
                    key={`second-${i}`}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-16 sm:h-20 md:h-24 w-auto object-contain opacity-80 hover:opacity-100 transition"
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  };




  // Features Section - Redesigned with Alternating Layout
  const Features = () => {
    const featuresData = [
      {
        icon: Clock,
        title: "Smart Attendance Tracking",
        description:
          "GPS location detection, automatic half-day/full-day calculation, live status. Smart exceptions & manual overrides for a seamless workflow.",
        color: "cyan",
        image: "/screenshots/Attendence.png",
      },
      {
        icon: Bot,
        title: "HR Buddy — AI Assistant",
        description:
          "Automate responses, generate reports, draft policies and handle employee queries 24/7 with our context-aware intelligent assistant.",
        color: "violet",
        image: "/screenshots/HrBuddy.png",
      },
      {
        icon: Users,
        title: "Employee Directory & Profiles",
        description:
          "Rich, detailed profiles, a secure document vault, org-chart linking, and quick-action buttons for HR admins to manage teams effectively.",
        color: "green",
        image: "/screenshots/Employee.png",
      },
      {
        icon: DollarSign,
        title: "Advanced Salary Processing",
        description:
          "Support for both old & new tax regimes, automatic TDS, PF/ESI handling, bulk salary processing, and instant payslip generation for your entire team.",
        color: "amber",
        image: "/screenshots/SalaryManagement.png",
      },
      {
        icon: Calendar,
        title: "Holiday & Leave Management",
        description:
          "Comes with pre-configured Indian holidays, custom work patterns, streamlined approval workflows, and predictive leave forecasting.",
        color: "indigo",
        image: "/screenshots/Holiday.png",
      },
      {
        icon: FileText,
        title: "Task Reports & Documentation",
        description:
          "Enable employees to submit daily or weekly task reports, generate audit-ready documents, and securely publish versioned company policies.",
        color: "red",
        image: "/screenshots/EmployeeTaskReport.png",
      },
      {
        icon: Bell,
        title: "Smart Notifications",
        description:
          "Keep everyone in the loop with Email, SMS, and in-app alerts for birthdays, work anniversaries, approval requests, and critical escalations.",
        color: "pink",
        image: "/screenshots/Notification.png",
      },
      {
        icon: Building,
        title: "Department Management",
        description:
          "Organize your company into departments, define department-specific policies, manage role-based access, and view department-level analytics.",
        color: "blue",
        image: "/screenshots/Department.png",
      },
    ];

    const colorMap = {
      cyan: { text: "text-cyan-400" },
      violet: { text: "text-violet-400" },
      green: { text: "text-green-400" },
      amber: { text: "text-amber-400" },
      indigo: { text: "text-indigo-400" },
      red: { text: "text-red-400" },
      pink: { text: "text-pink-400" },
      blue: { text: "text-blue-400" },
    };

    return (
      <section id="features" className="relative py-10 bg-black text-white">
        <div className="absolute inset-0 bg-blue-900/20" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold">
              A Future-Ready HRMS
              <span className="block text-3xl mt-2 text-blue-400">
                Built for Modern Indian Businesses
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto mt-4">
              Enterprise-grade automation, delightful UX, and compliance-first
              engineering.
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            {featuresData.map((feature, i) => {
              const Icon = feature.icon;
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={`content-${i}`}
                  className="mb-20 lg:mb-32 last:mb-0"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <div
                    className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-12 ${!isEven ? "lg:flex-row-reverse" : ""
                      }`}
                  >
                    {/* Text Content */}
                    <div className="lg:w-2/5">
                      <div className="flex items-center mb-4">
                        <div
                          className={`w-10 h-10 rounded-full ${colorMap[feature.color].text
                            } bg-white/10 border border-white/20 flex items-center justify-center mr-3`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Image Content */}
                    <div className="w-full lg:w-3/5">
                      <div className="rounded-2xl overflow-hidden p-2 bg-white/5 border-2 border-white/10 shadow-2xl shadow-black/50">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>
    );
  };

  // Pricing Section - Optimized
  const Pricing = () => {
    const plans = [
      {
        name: "Starter",
        price: "₹599",
        description: "Small teams just beginning their transformation",
        glow: "from-cyan-400/40 to-blue-500/30",
        beam: "bg-cyan-400/40",
        features: [
          "Up to 25 employees",
          "Basic attendance tracking",
          "Leave management ",
          "Salary slip generation",
          "Email support",
          "Mobile app access",
          "Document management"

        ]
      },
      {
        name: "Business",
        price: "₹2500",
        description: "Growing companies scaling with automation",
        glow: "from-violet-500/40 to-purple-600/30",
        beam: "bg-violet-500/50",
        popular: true,
        features: [
          "Up to 100 employees",
          "Advanced attendance with GPS",
          "HR Buddy AI Assistant",
          "Full payroll with tax compliance",
          "Document management",
          "Priority phone support",
          "Custom reports",
          "Department management",
          " Employee document automation"
        ],
        note: "* Extended feature available"
      },
      {
        name: "Enterprise",
        price: "₹4500",
        description: "High-performance organisations with deep complexity",
        glow: "from-amber-400/40 to-orange-500/30",
        beam: "bg-amber-400/40",
        features: [
          "Unlimited employees",
          "All Business features",
          "Multi-location support",
          "Advanced analytics dashboard",
          "Dedicated account manager",
          "On-site training included",
          "Custom integrations",
          "White-label option"
        ]
      },
    ];

    return (
      <section id="pricing" className="relative py-32 bg-black text-white overflow-hidden">

        {/* 🔥 Animated Cyber Grid Background */}
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        {/* Glowing gradient background behind everything */}
        <div className="absolute inset-0 bg-blue-900/20"></div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* ============ Futuristic Title ============ */}
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
              Simple Pricing That
              <span className="block text-blue-600">Scales With You</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fixed monthly pricing. No per-employee charges. 30-day free trial with all features.
            </p>
          </div>

          {/* ============ Pricing “hologram” Panels ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">

            {plans.map((plan, i) => (
              <div
                className={`relative group cursor-pointer ${plan.popular ? 'transform -translate-y-8' : ''} hover:scale-105 transition-all duration-300`}
              >

                {/* 🔥 Holographic Glow Behind Card */}
                {/* <div
                  className={`absolute inset-0 rounded-3xl blur-3xl bg-gradient-to-br ${plan.glow} opacity-60 group-hover:opacity-90 transition-all`}
                ></div> */}

                {/* 🔥 The Floating Glass Panel */}
                <div className="relative p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl 
                              group-hover:shadow-cyan-500/20 transition-all overflow-hidden">

                  {/* Animated neon beam at top */}
                  <div
                    className={`absolute top-0 left-0 w-full h-[3px] ${plan.beam} blur-sm group-hover:h-[5px] transition-all`}
                  ></div>

                  {/* Popular badge */}
                  {plan.popular && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-2 right-4 text-xs bg-purple-600 px-4 py-1 rounded-full shadow-purple-400/50"
                    >
                      Most Selected
                    </motion.div>
                  )}

                  {/* Hologram title */}
                  <h3 className="text-3xl font-bold tracking-wide mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {plan.name}
                  </h3>

                  {/* Futuristic price */}
                  <div className="text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
                    {plan.price}
                  </div>

                  <p className="text-gray-300 mb-10">{plan.description}</p>

                  {/* Button */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-lg flex items-center justify-center gap-2 shadow-xl"
                  >
                    Activate Plan
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>

                  {/* Divider light beam */}
                  <div className="h-[1px] w-full my-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                  {/* Feature list */}
                  <ul className="space-y-4">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-center">
                        <Check className="w-6 h-6 text-cyan-400 mr-3" />
                        <span className="text-gray-200">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.note && (
                    <div className="mt-6 text-sm text-blue-400 italic">
                      {plan.note}
                    </div>
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>
    );
  };



  // CTA Section
  const CTA = () => {
    return (
      <section className="relative py-25 overflow-hidden bg-black text-white">

        {/* 🔥 Animated Cyber Grid Background */}
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        {/* Glowing gradient background behind everything */}
        <div className="absolute inset-0 bg-blue-900/20"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-6">

          {/* Glass CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative rounded-[32px] p-10 md:p-16
            bg-white/5 backdrop-blur-xl
            border border-white/10
            shadow-[0_0_120px_rgba(59,130,246,0.15)]"
          >

            {/* Subtle glow border */}
            <div className="absolute inset-0 rounded-[32px] pointer-events-none
            bg-gradient-to-r from-blue-500/20 via-transparent to-purple-500/20 opacity-40" />

            {/* Content */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto opacity-90">
                {['No Setup Fees', '30-day Free Trial', 'Cancel Anytime', 'Migration Support'].map((benefit, index) => (
                  <div key={index} className="flex items-center justify-center text-sm">
                    <Check className="w-4 h-4 mr-2 text-green-300" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }
  // Footer


  const Footer = () => {
    return (
      <footer id="contact" className="bg-gray-950 text-gray-300 relative overflow-hidden">
        {/* Gradient Top Border */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-700" />

        <div className="max-w-7xl mx-auto px-6 py-20 relative">



          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

            {/* === COMPANY BRANDING === */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-xl text-white font-bold text-2xl">
                  <img
                    src="/Logos/HRMS.webp"
                    alt="Logo"
                    className="w-full h-full border rounded-md"
                  />
                </div>
                <span className="ml-4 text-2xl font-extrabold text-white">HRMS</span>
              </div>

              <p className="text-gray-400 mb-6">
                India’s most powerful HR automation platform built for scaling organizations.
              </p>

              <div className="space-y-3 text-gray-400">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-blue-400" />
                  intakesense@gmail.com
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 text-blue-400" />
                  New Delhi, India
                </div>
              </div>

              {/* SOCIAL ICONS */}
              <div className="flex gap-4 mt-6">
                <Facebook className="w-6 h-6 hover:text-white cursor-pointer" />
                <Linkedin className="w-6 h-6 hover:text-white cursor-pointer" />
                <Twitter className="w-6 h-6 hover:text-white cursor-pointer" />
                <Instagram className="w-6 h-6 hover:text-white cursor-pointer" />
              </div>
            </motion.div>

            {/* === PRODUCT LINKS === */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                <li className="hover:text-white cursor-pointer">Attendance & Leave</li>
                <li className="hover:text-white cursor-pointer">Payroll Automation</li>
                <li className="hover:text-white cursor-pointer">Performance Reviews</li>
                <li className="hover:text-white cursor-pointer">Employee Self-Service</li>
                <li className="hover:text-white cursor-pointer">Hiring & Onboarding</li>
              </ul>
            </motion.div>

            {/* === COMPANY === */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                <li className="hover:text-white cursor-pointer">About Us</li>
                <li className="hover:text-white cursor-pointer">Careers</li>
                <li className="hover:text-white cursor-pointer">Partners</li>
                <li className="hover:text-white cursor-pointer">Case Studies</li>
                <li className="hover:text-white cursor-pointer">Blogs</li>
              </ul>
            </motion.div>

            {/* === LEGAL === */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-3">
                <li className="hover:text-white cursor-pointer">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer">Terms & Conditions</li>
                <li className="hover:text-white cursor-pointer">Security</li>
                <li className="hover:text-white cursor-pointer">GDPR Compliance</li>
                <li className="hover:text-white cursor-pointer">Refund Policy</li>
              </ul>
            </motion.div>

          </div>


          {/* === COPYRIGHT === */}
          <div className="border-t border-gray-800 text-center mt-16 pt-8">
            <p className="text-gray-500">
              © {new Date().getFullYear()} HRMS by Intakesense. All rights reserved.
            </p>
          </div>

        </div>
      </footer>
    )
  }


  return (
    <div className="relative min-h-screen bg-white">

      <Navigation onScrollToSection={scrollToSection} />
      <div className="relative z-0">
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] -z-10"></div>
        <Hero />
        <CompaniesSlider />
        <Features />
        <Pricing />
        <CTA />
      </div>
      <Footer />
    </div>
  )
}

export default LandingPage

