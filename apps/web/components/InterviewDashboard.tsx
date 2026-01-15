"use client";
import { useState } from 'react';
import { Calendar, Clock, Award, BookOpen, Target } from 'lucide-react';


export type HiringMetric = 'STRONG_HIRE' | 'HIRE' | 'BORDERLINE' | 
                            'NO_HIRE' | 'STRONG_NO_HIRE';
      
const experienceLevels = [
    { value: 'INTERN', label: 'Intern' },
    { value: 'ENTRY_LEVEL', label: 'Entry Level / Fresher' },
    { value: 'JUNIOR', label: 'Junior (1-2 years)' },
    { value: 'MID_LEVEL', label: 'Mid Level (3-5 years)' },
    { value: 'SENIOR', label: 'Senior (5+ years)' },
    { value: 'LEAD', label: 'Lead / Principal' }
];

export const getDecisionColor = (decision: HiringMetric) => {
      const colors = {
        'STRONG_HIRE': 'text-green-600 bg-green-50',
        'HIRE': 'text-green-600 bg-green-50',
        'BORDERLINE': 'text-yellow-600 bg-yellow-50',
        'NO_HIRE': 'text-red-600 bg-red-50',
        'STRONG_NO_HIRE': 'text-red-600 bg-red-50'
      };
      return colors[decision] || 'text-gray-600 bg-gray-50';
    };
export type ExperienceLevel = 
    'INTERN' |
    'ENTRY_LEVEL' | 
    'JUNIOR' | 
    'MID_LEVEL'|
    'SENIOR' | 
    'LEAD';


export type InterviewFormData = {
    role: string,
    jobDescription: string,
    experienceLevel: ExperienceLevel,
    totalQuestions: number,
    focusAreas: string[]
}




export default function InterviewDashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState<InterviewFormData>({
    role: '',
    jobDescription: '',
    experienceLevel: 'MID_LEVEL',
    totalQuestions: 6,
    focusAreas: []
  });

  

  const focusAreasOptions = [
    'Algorithms', 'Data Structures', 'System Design', 'Databases',
    'Web Development', 'APIs', 'Security', 'Cloud Computing',
    'Testing', 'DevOps', 'Problem Solving', 'Behavioral'
  ];

  const mockInterviews = [
    {
      id: 1,
      role: 'Backend Developer',
      date: '2025-01-10',
      status: 'COMPLETED',
      score: 78,
      decision: 'HIRE'
    },
    {
      id: 2,
      role: 'Frontend Engineer',
      date: '2025-01-12',
      status: 'COMPLETED',
      score: 65,
      decision: 'BORDERLINE'
    }
  ];

  const mockResult = {
    overallScore: 78,
    technicalScore: 82,
    communicationScore: 75,
    problemSolvingScore: 76,
    topStrengths: [
      'Strong technical knowledge',
      'Clear communication',
      'Good problem-solving approach'
    ],
    
    topWeaknesses: [
      'Needs improvement in system design',
      'Could be more concise',
      'Missed some edge cases'
    ],
    decision: 'HIRE',
    roleReadinessPercent: 75,
    improvementPlan: {
      'day1-2': [
        'Review system design fundamentals',
        'Practice explaining solutions concisely'
      ],
      'day3-4': [
        'Work on edge case identification',
        'Study scalability patterns'
      ],
      'day5-6': [
        'Mock interviews with peers',
        'Deep dive into distributed systems'
      ],
      'day7': [
        'Take another mock interview',
        'Review and consolidate learnings'
      ]
    },
    skillScores: {
      'Algorithms': 85,
      'System Design': 68,
      'Databases': 80,
      'Communication': 75
    }
  };

  const handleInputChange = (e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleFocusArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const handleSubmit = () => {
    console.log('Creating interview:', formData);
    // Call API to create interview
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Interview Practice</h1>
          <p className="text-gray-600 mt-2">Practice technical interviews with AI-powered feedback</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Interview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Interview History
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Latest Results
              </button>
            </div>
          </div>
        </div>

        {/* Create Interview Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Configure Your Interview</h2>
            
            <div className="space-y-6">
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Role *
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer, Data Scientist, DevOps Engineer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level *
                </label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {experienceLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description *
                </label>
                <textarea
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleInputChange}
                  placeholder="Paste the job description or describe the role requirements..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The AI will tailor questions based on this description
                </p>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas (Select 2-4) *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {focusAreasOptions.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocusArea(area)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        formData.focusAreas.includes(area)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  name="totalQuestions"
                  value={formData.totalQuestions}
                  onChange={handleInputChange}
                  min="3"
                  max="10"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Estimated time: {formData.totalQuestions * 5} minutes
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Start Interview
                </button>
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interview History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Interview History</h2>
            
            <div className="space-y-4">
              {mockInterviews.map(interview => (
                <div key={interview.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{interview.role}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {interview.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          30 minutes
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{interview.score}%</div>
                        <div className={`text-sm font-medium px-3 py-1 rounded-full ${getDecisionColor(interview.decision as HiringMetric)}`}>
                          {interview.decision}
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Overall Score Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Interview Results</h2>
                <div className={`px-4 py-2 rounded-full text-lg font-semibold ${getDecisionColor(mockResult.decision as HiringMetric)}`}>
                  {mockResult.decision}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{mockResult.overallScore}%</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">{mockResult.technicalScore}%</div>
                  <div className="text-sm text-gray-600">Technical</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">{mockResult.communicationScore}%</div>
                  <div className="text-sm text-gray-600">Communication</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">{mockResult.roleReadinessPercent}%</div>
                  <div className="text-sm text-gray-600">Role Readiness</div>
                </div>
              </div>

              {/* Skill Scores */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(mockResult.skillScores).map(([skill, score]) => (
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
                  {mockResult.topStrengths.map((strength, idx) => (
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
                  {mockResult.topWeaknesses.map((weakness, idx) => (
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
                {Object.entries(mockResult.improvementPlan).map(([days, tasks]) => (
                  <div key={days} className="border-l-4 border-blue-500 pl-4">
                    <div className="font-semibold text-gray-900 mb-2 capitalize">
                      {days.replace('-', ' - Day ')}
                    </div>
                    <ul className="space-y-1">
                      {tasks.map((task, idx) => (
                        <li key={idx} className="text-gray-700 text-sm">
                          • {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                Practice Similar Interview
              </button>
              <button className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Download Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}