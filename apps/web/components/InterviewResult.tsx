'use client';

import { Award, BookOpen, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { InterviewResultData } from '@/types/interview';
import { getDecisionColor } from '@/lib/getDecisionColor';

interface InterviewResultProps {
  data: InterviewResultData;
  onDownloadClick?: () => void;
}

export default function InterviewResult({
  data,
  onDownloadClick,
}: InterviewResultProps) {
  const router = useRouter();

  const handlePracticeClick = () => {
      router.push('/interview');
  };

  const handleDownloadClick = () => {
    if (onDownloadClick) {
      onDownloadClick();
    } else {
      // Default: trigger browser download or show toast
      alert('Download feature not implemented yet.');
    }
  };

  // Helper to format plan keys like "day1-2" → "Day 1 - 2"
  const formatPlanKey = (key: string): string => {
    if (key === 'day7') return 'Day 7';
    return key.replace('day', 'Day ').replace('-', ' - ');
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Interview Results</h2>
          <div className={`px-4 py-2 rounded-full text-lg font-semibold ${getDecisionColor(data.decision)}`}>
            {data.decision}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{data.overallScore}%</div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{data.technicalScore}%</div>
            <div className="text-sm text-gray-600">Technical</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{data.communicationScore}%</div>
            <div className="text-sm text-gray-600">Communication</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">{data.roleReadinessPercent}%</div>
            <div className="text-sm text-gray-600">Role Readiness</div>
          </div>
        </div>

        {/* Skill Scores */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(data.skillScores).map(([skill, score]) => (
              <div key={skill}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{skill}</span>
                  <span className="text-gray-600">{score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Strengths</h3>
          </div>
          <ul className="space-y-2">
            {data.topStrengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2">
            {data.topWeaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">→</span>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7-Day Improvement Plan */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">7-Day Improvement Plan</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(data.improvementPlan).map(([days, tasks]) => (
            <div key={days} className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-gray-900 mb-2">{formatPlanKey(days)}</div>
              <ul className="space-y-1">
                {(Array.isArray(tasks) ? tasks : []).map((task, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">• {task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          onClick={handlePracticeClick}
        >
          Practice Similar Interview
        </button>
        <button
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={handleDownloadClick}
        >
          Download Report
        </button>
      </div>
    </div>
  );
}