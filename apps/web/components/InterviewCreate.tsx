"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type HiringMetric =
  | "STRONG_HIRE"
  | "HIRE"
  | "BORDERLINE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";

const experienceLevels = [
  { value: "INTERN", label: "Intern" },
  { value: "ENTRY_LEVEL", label: "Entry Level / Fresher" },
  { value: "JUNIOR", label: "Junior (1-2 years)" },
  { value: "MID_LEVEL", label: "Mid Level (3-5 years)" },
  { value: "SENIOR", label: "Senior (5+ years)" },
  { value: "LEAD", label: "Lead / Principal" },
];

export const getDecisionColor = (decision: HiringMetric) => {
  const colors = {
    STRONG_HIRE: "text-green-600 bg-green-50",
    HIRE: "text-green-600 bg-green-50",
    BORDERLINE: "text-yellow-600 bg-yellow-50",
    NO_HIRE: "text-red-600 bg-red-50",
    STRONG_NO_HIRE: "text-red-600 bg-red-50",
  };
  return colors[decision] || "text-gray-600 bg-gray-50";
};
export type ExperienceLevel =
  | "INTERN"
  | "ENTRY_LEVEL"
  | "JUNIOR"
  | "MID_LEVEL"
  | "SENIOR"
  | "LEAD";

export type InterviewFormData = {
  role: string;
  jobDescription: string;
  experienceLevel: ExperienceLevel;
  totalQuestions: number;
  focusAreas: string[];
};

export default function InterviewCreate() {
    const router = useRouter();
  const [formData, setFormData] = useState<InterviewFormData>({
    role: "",
    jobDescription: "",
    experienceLevel: "MID_LEVEL",
    totalQuestions: 6,
    focusAreas: [],
  });

  const focusAreasOptions = [
    "Algorithms",
    "Data Structures",
    "System Design",
    "Databases",
    "Web Development",
    "APIs",
    "Security",
    "Cloud Computing",
    "Testing",
    "DevOps",
    "Problem Solving",
    "Behavioral",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFocusArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((a) => a !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const handleSubmit = () => {
    console.log("Creating interview:", formData);

    // Call API to create interview
    router.push('/interview/sample_inter/live');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Interview Practice
          </h1>
          <p className="text-gray-600 mt-2">
            Practice technical interviews with AI-powered feedback
          </p>
        </div>

        {/* Create Interview Tab */}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Configure Your Interview
          </h2>

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
                {experienceLevels.map((level) => (
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
                {focusAreasOptions.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.focusAreas.includes(area)
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
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
      </div>
    </div>
  );
}
