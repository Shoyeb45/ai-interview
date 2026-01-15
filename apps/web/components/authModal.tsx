"use client";

import apiClient, { Tokens } from "@/lib/apiClient";
import { AxiosError } from "axios";
import { Brain, X } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAuth = async () => {
    console.log("Auth:", authMode, formData);
    try {
      let res: { tokens: Tokens };

      if (authMode === "register") {
        res = await apiClient.post<{ tokens: Tokens }>(
          "/auth/signup",
          formData
        );
      } else {
        res = await apiClient.post<{ tokens: Tokens }>("/auth/signin", {
          email: formData.email,
          password: formData.password,
        });
      }
      apiClient.setTokens(res.tokens);
      //   setTokens(res.data.accessToken, res.data.refreshToken);
      onClose();
      // router.refresh(); // Refresh server components if needed
      router.push('/dashboard');
    } catch (err) {
      // setError(
      //   err?.response?.data?.message || "Login failed. Please try again."
      // );
      let message = "Login/Signup failed. Please try again.";

      if (err instanceof AxiosError) {
        message = err?.response?.data?.message;
      }
      toast.error(message);
    } finally {
      // setIsLoading(false);
    }
    onClose();
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAI</span>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {authMode === "login" ? "Welcome Back" : "Get Started"}
        </h2>
        <p className="text-gray-600 mb-8">
          {authMode === "login"
            ? "Sign in to continue your interview practice"
            : "Create an account to start practicing"}
        </p>

        <div className="space-y-4">
          {authMode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {authMode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {authMode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
