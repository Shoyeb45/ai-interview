import { Award, BookOpen, Target } from "lucide-react";
import { getDecisionColor, HiringMetric } from "./InterviewDashboard";
import { useRouter } from "next/navigation";

const mockResult = {
  overallScore: 78,
  technicalScore: 82,
  communicationScore: 75,
  problemSolvingScore: 76,
  topStrengths: [
    "Strong technical knowledge",
    "Clear communication",
    "Good problem-solving approach",
  ],
  topWeaknesses: [
    "Needs improvement in system design",
    "Could be more concise",
    "Missed some edge cases",
  ],
  decision: "HIRE",
  roleReadinessPercent: 75,
  improvementPlan: {
    "day1-2": [
      "Review system design fundamentals",
      "Practice explaining solutions concisely",
    ],
    "day3-4": [
      "Work on edge case identification",
      "Study scalability patterns",
    ],
    "day5-6": [
      "Mock interviews with peers",
      "Deep dive into distributed systems",
    ],
    day7: ["Take another mock interview", "Review and consolidate learnings"],
  },
  skillScores: {
    Algorithms: 85,
    "System Design": 68,
    Databases: 80,
    Communication: 75,
  },
};

export default function LatestResults() {

  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Interview Results
          </h2>
          <div
            className={`px-4 py-2 rounded-full text-lg font-semibold ${getDecisionColor(
              mockResult.decision as HiringMetric
            )}`}
          >
            {mockResult.decision}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {mockResult.overallScore}%
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {mockResult.technicalScore}%
            </div>
            <div className="text-sm text-gray-600">Technical</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {mockResult.communicationScore}%
            </div>
            <div className="text-sm text-gray-600">Communication</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">
              {mockResult.roleReadinessPercent}%
            </div>
            <div className="text-sm text-gray-600">Role Readiness</div>
          </div>
        </div>

        {/* Skill Scores */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Skill Breakdown
          </h3>
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
            <h3 className="text-lg font-semibold text-gray-900">
              Top Strengths
            </h3>
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
            <h3 className="text-lg font-semibold text-gray-900">
              Areas for Improvement
            </h3>
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
          <h3 className="text-lg font-semibold text-gray-900">
            7-Day Improvement Plan
          </h3>
        </div>
        <div className="space-y-4">
          {Object.entries(mockResult.improvementPlan).map(([days, tasks]) => (
            <div key={days} className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-gray-900 mb-2 capitalize">
                {days.replace("-", " - Day ")}
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
        <button className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          onClick={() => {
            router.push('/interview');
          }}
        >
          Practice Similar Interview
        </button>
        <button className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Download Report
        </button>
      </div>
    </div>
  );
}
