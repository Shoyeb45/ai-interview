"use client";
import { useEffect, useState } from "react";
import {
  Target,
  Zap,
  CheckCircle,
  ArrowRight,
  Brain,
  BarChart3,
  Sparkles,
} from "lucide-react";
import AuthModal from "./authModal";
import axios from "axios";
import { envVar } from "@/lib/config";
import apiClient from "@/lib/apiClient";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  useEffect(() => {
    apiClient.get('/health');
  }, []);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">
                InterviewAI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100 text-sm font-medium">
                AI-Powered Interview Practice
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Master Your Next Interview with
              <span className="block mt-2 bg-linear-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Personalized AI Feedback
              </span>
            </h1>

            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Create custom technical interviews tailored to your dream role.
              Get detailed, actionable feedback to improve your skills and land
              your next job.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl flex items-center gap-2"
              >
                Start Free Practice
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-blue-500/20 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold text-lg hover:bg-blue-500/30 transition-all">
                Watch Demo
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 text-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              {/* <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>10,000+ users</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Ace Your Interview
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to simulate real interviews and
              accelerate your learning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Fully Customizable
              </h3>
              <p className="text-gray-600 mb-6">
                Tailor every detail: choose your role, experience level, focus
                areas, and number of questions. Paste job descriptions for
                perfectly matched interviews.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>12+ focus areas to choose from</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>All experience levels supported</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Role-specific question generation</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Detailed Analytics
              </h3>
              <p className="text-gray-600 mb-6">
                Get comprehensive feedback with skill breakdowns, strengths,
                weaknesses, and hiring recommendations based on industry
                standards.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Multi-dimensional scoring</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Visual skill breakdowns</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Industry-standard assessments</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Actionable Improvement
              </h3>
              <p className="text-gray-600 mb-6">
                Receive personalized 7-day improvement plans with specific tasks
                to address your weaknesses and build on your strengths.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Week-by-week study plans</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Targeted skill development</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Progress tracking over time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to interview mastery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Customize Your Interview
              </h3>
              <p className="text-gray-600">
                Select your target role, experience level, focus areas, and
                paste the job description. The AI generates tailored questions
                instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Take the Interview
              </h3>
              <p className="text-gray-600">
                Answer questions at your own pace. Practice your communication,
                problem-solving, and technical skills in a realistic
                environment.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Get Detailed Feedback
              </h3>
              <p className="text-gray-600">
                Receive comprehensive analytics, skill breakdowns, hiring
                decisions, and a personalized improvement plan to level up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {/* <div className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-blue-200">Active Users</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50K+</div>
              <div className="text-blue-200">Interviews Completed</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">85%</div>
              <div className="text-blue-200">Success Rate</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">4.9/5</div>
              <div className="text-blue-200">User Rating</div>
            </div>
          </div>
        </div>
      </div> */}

      {/* CTA Section */}
      <div className="py-20 bg-linear-to-br from-gray-900 via-blue-900 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who have improved their interview
            skills with our AI-powered platform.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-10 py-5 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-2xl inline-flex items-center gap-2"
          >
            Start Practicing Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Brain className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold text-white">InterviewAI</span>
            </div>
            <div className="text-sm">
              © 2025 InterviewAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        onClose={() => {
          setShowAuthModal(false);
        }}
        isOpen={showAuthModal}
      />
    </div>
  );
}
