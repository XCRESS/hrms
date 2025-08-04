import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import signupImg from '../../assets/signupImg.png';
import { apiCallWithFallback, isDevelopment, getEnvironmentInfo } from '../../config/api';

const ChatBot = () => {
  // Log environment info on component mount
  useEffect(() => {
    if (isDevelopment()) {
      console.log('🤖 [ChatBot] Initialized with environment:', getEnvironmentInfo());
    }
  }, []);

  const welcomeMessages = [
    "Welcome back! Let's get your HR tasks running smoothly — I'm here to support you.",
    "Great to see you! Ready when you are to help with whatever's next on your HR list.",
    "Hey there 👋 I'm here to lighten your load — approvals, queries, data? Just say the word.",
    "Hope your day's going well! Let me know what HR task I can help with right now.",
    "Nice to have you back! Whether it's onboarding, policies, or leave — I've got you covered.",
    "You focus on people, I'll handle the process. What can I assist with today?",
    "Welcome! Let's simplify your workday, one HR task at a time.",
    "Here to help you streamline, support, and succeed — just type what you need.",
    "Jump back in anytime — I'm ready to assist with your HR workflows.",
    "Let's keep things moving! Ask me anything related to your HR tasks.",
    "Your digital HR sidekick reporting for duty. What's on today's agenda?",
    "Let's make HR easier today. I'm here whenever you need a hand."
  ];

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set random welcome message on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    setWelcomeMessage(welcomeMessages[randomIndex]);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    // Mark that chat has started
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    // Enhanced loading states with timing
    const loadingStates = [
      '🤔 Processing your query...',
      '📊 Analyzing request...',
      '💭 Thinking...',
      '🔍 Retrieving data...',
      '⚡ Almost ready...'
    ];

    // Show progressive loading states
    let currentStateIndex = 0;
    setLoadingState(loadingStates[currentStateIndex]);
    
    const loadingInterval = setInterval(() => {
      currentStateIndex = (currentStateIndex + 1) % loadingStates.length;
      setLoadingState(loadingStates[currentStateIndex]);
    }, 1500);

    try {
      // Get the authentication token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: currentInput,
          conversation_id: sessionStorage.getItem('hrms_chat_id') || undefined
        }),
      };

      console.log(`🌐 [ChatBot] Environment: ${isDevelopment() ? 'Development' : 'Production'}`);
      
      const response = await apiCallWithFallback('/chat', requestOptions);
      
      // apiCallWithFallback already handles response.ok checks

      const data = await response.json();
      
      // Store conversation ID for future messages
      if (data.conversation_id) {
        sessionStorage.setItem('hrms_chat_id', data.conversation_id);
      }

      const botResponse = {
        id: messages.length + 2,
        text: data.response || "I'm sorry, I couldn't process your request right now.",
        sender: 'bot',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      };

      setMessages(prev => [...prev, botResponse]);
      clearInterval(loadingInterval);
    } catch (error) {
      console.error('Chat API error:', error);
      clearInterval(loadingInterval);
      
      // Create more informative error message
      let errorMessage = "I'm sorry, I'm having trouble connecting right now.";
      
      if (error.message.includes('Both API endpoints are unavailable')) {
        errorMessage = "Both local and production servers are unavailable. Please check:\n\n" +
                      "• Local server: Make sure it's running on localhost:8000\n" +
                      "• Production server: Check network connectivity\n" +
                      "• Try refreshing the page";
      } else if (error.message.includes('Primary endpoint failed')) {
        errorMessage = "Primary server is unavailable, but fallback succeeded. Your request should work normally.";
      }
      
      const errorResponse = {
        id: messages.length + 2,
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      setLoadingState('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyMessage = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen bg-white dark:bg-[#212121] font-inter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-[#212121] h-[50px]">
        <div className="flex items-center space-x-3">
          <img 
            src={signupImg} 
            alt="HRMS Buddy" 
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              HRMS Buddy
            </h1>
          </div>
        </div>
        
        {/* Environment indicator (only show in development) */}
        {isDevelopment() && (
          <div className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium">
            DEV MODE
          </div>
        )}
      </div>

      {/* Welcome Screen or Messages Container */}
      {!hasStartedChat ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
          {/* Welcome Message */}
          <div className="max-w-2xl text-center mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-6">
              <img 
                src={signupImg} 
                alt="HRMS Buddy" 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover mx-auto mb-3 sm:mb-4"
              />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                HRMS Buddy
              </h2>
            </div>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed px-2">
              {welcomeMessage}
            </p>
          </div>

          {/* Input Area - Centered */}
          <div className="w-full max-w-3xl px-2 sm:px-0">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message HRMS Buddy..."
                className={cn(
                  "w-full resize-none rounded-2xl bg-gray-100 dark:bg-[#40414f]",
                  "px-3 sm:px-4 py-3 pr-12 sm:pr-14 text-[16px] placeholder-gray-500 dark:placeholder-[#8e8ea0]",
                  "text-gray-900 dark:text-[#ececec] font-normal",
                  "focus:outline-none border-0 shadow-sm",
                  "max-h-32 min-h-[48px] sm:min-h-[52px] leading-[1.4]"
                )}
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: window.innerWidth < 640 ? '48px' : '52px',
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-150",
                  !inputText.trim() || isLoading
                    ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                    : "text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-200 dark:hover:bg-[#565869] active:scale-95"
                )}
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 dark:text-[#8e8ea0] text-center mt-3 font-normal">
              HRMS Buddy can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              <div className="px-3 sm:px-6 pt-6 sm:pt-8 pb-4">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    {message.sender === 'user' ? (
                      <div className="flex justify-end mb-4">
                        <div className="max-w-[85%] sm:max-w-[70%]">
                          <div className="bg-gray-100 dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] px-3 sm:px-4 py-2.5 sm:py-3 rounded-3xl">
                            <p className="text-[15px] sm:text-[16px] leading-[1.4] whitespace-pre-wrap font-normal">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start mb-6">
                        <div className="w-full">
                          <div className="px-1 sm:px-2">
                            <p className="text-[15px] sm:text-[16px] leading-[1.6] whitespace-pre-wrap text-gray-900 dark:text-[#ececec] font-normal mb-3">
                              {message.text}
                            </p>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyMessage(message.text, message.id)}
                                className="p-1 sm:p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#444654] transition-colors"
                                title={copiedMessageId === message.id ? "Copied!" : "Copy message"}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-[#8e8ea0]" />
                                )}
                              </button>
                              <span className="text-xs text-gray-400 dark:text-[#8e8ea0] select-none">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Enhanced Loading indicator */}
            {isLoading && (
              <div className="max-w-3xl mx-auto">
                <div className="px-3 sm:px-6 mb-6">
                  <div className="group">
                    <div className="flex justify-start">
                      <div className="w-full">
                        <div className="px-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium animate-pulse">
                              {loadingState}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Bottom when chat started */}
          <div className="bg-white dark:bg-[#212121]">
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Message HRMS Buddy..."
                  className={cn(
                    "w-full resize-none rounded-2xl bg-gray-100 dark:bg-[#40414f]",
                    "px-3 sm:px-4 py-3 pr-12 sm:pr-14 text-[16px] placeholder-gray-500 dark:placeholder-[#8e8ea0]",
                    "text-gray-900 dark:text-[#ececec] font-normal",
                    "focus:outline-none border-0 shadow-sm",
                    "max-h-32 min-h-[48px] sm:min-h-[52px] leading-[1.4]"
                  )}
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: window.innerWidth < 640 ? '48px' : '52px',
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                
                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className={cn(
                    "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-lg transition-all duration-150",
                    !inputText.trim() || isLoading
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                      : "text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-200 dark:hover:bg-[#565869] active:scale-95"
                  )}
                  title="Send message"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Footer Text */}
              <p className="text-xs text-gray-400 dark:text-[#8e8ea0] text-center mt-3 font-normal">
                HRMS Buddy can make mistakes. Please verify important information.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;