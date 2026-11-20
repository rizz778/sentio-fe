import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, RightOutlined } from '@ant-design/icons';
import './SelfAssessment.css';

const categories = [
  {
    name: 'Mood Disorders',
    description: 'Assess and understand your emotional patterns',
    icon: '🌤️',
    tests: [
      { name: 'Depression Screening', questions: 20, image: 'depression.jpg', route: '/test/depression' },
      { name: 'Bipolar Tendencies Test', questions: 15, image: 'bipolar.jpg', route: '/test/bipolar' },
      { name: 'Mood Tracker Assessment', questions: 10, image: 'mood.jpg', route: '/test/mood' },
    ]
  },
  {
    name: 'Anxiety & Stress',
    description: 'Evaluate your stress levels and anxiety patterns',
    icon: '🌿',
    tests: [
      { name: 'Generalized Anxiety Test', questions: 18, image: 'anxiety.jpg', route: '/test/anxiety' },
      { name: 'Social Anxiety Scale', questions: 12, image: 'social-anxiety.jpg', route: '/test/social-anxiety' },
      { name: 'Stress Level Analyzer', questions: 15, image: 'stress.jpg', route: '/test/stress' },
    ]
  },
  {
    name: 'Personality & Emotional Well-being',
    description: 'Understand your personality traits and emotional health',
    icon: '✨',
    tests: [
      { name: 'Big Five Personality Test', questions: 50, image: 'personality.jpg', route: '/test/personality' },
      { name: 'Emotional Intelligence Test', questions: 25, image: 'emotional-intelligence.jpg', route: '/test/emotional-intelligence' },
      { name: 'Self-Esteem Scale', questions: 10, image: 'self-esteem.jpg', route: '/test/self-esteem' },
    ]
  },
  {
    name: 'Trauma & PTSD',
    description: 'Assess symptoms related to trauma and PTSD',
    icon: '🛡️',
    tests: [
      { name: 'PTSD Checklist for DSM-5', questions: 20, image: 'ptsd.jpg', route: '/test/ptsd' },
      { name: 'Trauma History Questionnaire', questions: 15, image: 'trauma.jpg', route: '/test/trauma' },
      { name: 'CPTSD Inventory', questions: 12, image: 'cptsd.jpg', route: '/test/cptsd' },
    ]
  },
  {
    name: 'Sleep & Fatigue',
    description: 'Evaluate your sleep patterns and fatigue levels',
    icon: '🌙',
    tests: [
      { name: 'Sleep Quality Index', questions: 12, image: 'sleep.jpg', route: '/test/sleep' },
      { name: 'Insomnia Severity Index', questions: 7, image: 'insomnia.jpg', route: '/test/insomnia' },
      { name: 'Fatigue Severity Scale', questions: 9, image: 'fatigue.jpg', route: '/test/fatigue' },
    ]
  },
  {
    name: 'Substance Use & Addictions',
    description: 'Evaluate your risk of substance use and addiction',
    icon: '🕊️',
    tests: [
      { name: 'Alcohol Use Disorders Test (AUDIT)', questions: 10, image: 'alcohol.jpg', route: '/test/alc' },
      { name: 'Drug Abuse Screening Test (DAST)', questions: 20, image: 'drug.jpg', route: '/test/drug' },
      { name: 'Addiction Severity Index', questions: 21, image: 'addiction.jpg', route: '/test/add' },
    ]
  },
  {
    name: 'Self-Harm & Suicide Risk',
    description: 'Identify risk factors related to self-harm and suicide',
    icon: '❤️‍🩹',
    tests: [
      { name: 'Suicide Risk Assessment', questions: 15, image: 'suicide-risk.jpg', route: '/test/scd' },
      { name: 'Self-Harm Behavior Questionnaire', questions: 20, image: 'self-harm.jpg', route: '/test/sha' },
      { name: 'Suicidal Ideation Questionnaire', questions: 10, image: 'suicidal-ideation.jpg', route: '/test/scdi' },
    ]
  }
];

const SelfAssessment = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleStartTest = (route) => {
    navigate(route);
  };

  const filteredCategories = categories
    .filter((cat) => selectedCategory === 'All' || cat.name === selectedCategory)
    .map((cat) => ({
      ...cat,
      tests: cat.tests.filter((test) =>
        test.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.tests.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f8] via-[#fff9fb] to-[#f4faff] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Clinically Informed Assessments</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Mental Health Assessments
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Explore confidential psychological evaluations and self-assessment tools to better understand your emotional well-being.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-md mx-auto relative">
            <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search evaluations (e.g. Anxiety, Depression, Sleep)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-pink-200 rounded-full shadow-sm focus:ring-2 focus:ring-[#f64a8a] focus:outline-none text-sm text-gray-800 transition-all placeholder-gray-400"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === 'All'
                  ? 'bg-[#f64a8a] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-100'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-[#f64a8a] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories & Assessment Cards */}
        {filteredCategories.length > 0 ? (
          <div className="space-y-12">
            {filteredCategories.map((category) => (
              <section key={category.name} className="relative">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-pink-100">
                  <span className="text-2xl p-2 bg-pink-100/60 rounded-xl">{category.icon}</span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{category.name}</h2>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>

                {/* Robust Tailwind Grid (Eliminates vertical character collapse bug) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.tests.map((test) => (
                    <div
                      key={test.name}
                      onClick={() => handleStartTest(test.route)}
                      className="group bg-white rounded-2xl border border-pink-100/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                    >
                      {/* Image Preview Container */}
                      <div className="relative h-44 w-full bg-gradient-to-tr from-pink-100 to-indigo-50 overflow-hidden">
                        <img
                          src={`/images/${test.image}`}
                          alt={test.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-medium text-pink-700 shadow-xs">
                          {test.questions} Questions
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#f64a8a] transition-colors leading-snug">
                            {test.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                            <span>10–15 mins</span>
                            <span>•</span>
                            <span>Free & Confidential</span>
                          </div>
                        </div>

                        {/* CTA button */}
                        <div className="mt-5 pt-3 border-t border-gray-50 flex items-center justify-between text-sm font-semibold text-[#f64a8a] group-hover:text-pink-700">
                          <span>Start Assessment</span>
                          <span className="p-1.5 rounded-full bg-pink-50 group-hover:bg-[#f64a8a] group-hover:text-white transition-colors">
                            <RightOutlined className="text-xs" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-pink-100 p-8 shadow-xs">
            <p className="text-gray-500 text-lg">No assessments found matching "{searchQuery}".</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-4 px-4 py-2 bg-pink-50 text-[#f64a8a] rounded-lg font-medium text-sm hover:bg-pink-100"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfAssessment;
