import React from 'react';
import { Link } from 'react-router-dom';
import { Play, BookOpen, Video, Mic, Sparkles } from 'lucide-react';
import GuestModeButton from '../components/demo/GuestModeButton';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-indigo-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">BookVid AI</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                Personal Project
              </span>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Books Into
            <span className="text-indigo-600 block">Stunning Videos</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A personal AI-powered video creation platform that automatically generates 
            promotional videos from book content. Built as a portfolio demonstration 
            of modern web development and AI integration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GuestModeButton className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700" />
            <Link
              to="/register"
              className="border border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-50"
            >
              Create Account
            </Link>
            <a
              href="#features"
              className="border border-gray-300 text-gray-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Core Features
            </h2>
            <p className="text-lg text-gray-600">
              Explore the AI-powered capabilities of this personal project
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Script Generation
              </h3>
              <p className="text-gray-600">
                Analyzes book content to create compelling video scripts using OpenAI GPT.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Media Selection
              </h3>
              <p className="text-gray-600">
                Intelligent selection of background images, videos, and music to match your content.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Mic className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Voiceovers
              </h3>
              <p className="text-gray-600">
                Professional-quality voiceovers generated using Resemble AI voice synthesis.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Video Rendering
              </h3>
              <p className="text-gray-600">
                Automated video composition and rendering with customizable templates.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built With Modern Technology
            </h2>
            <p className="text-lg text-gray-600">
              A showcase of full-stack development skills and AI integration
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frontend</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• React 18 with Hooks</li>
                  <li>• Redux Toolkit</li>
                  <li>• TailwindCSS</li>
                  <li>• Vite Build Tool</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Backend</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Node.js & Express</li>
                  <li>• SQLite Database</li>
                  <li>• JWT Authentication</li>
                  <li>• File Upload & Processing</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Services</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• OpenAI GPT Integration</li>
                  <li>• Resemble AI Voice Synthesis</li>
                  <li>• FFmpeg Video Processing</li>
                  <li>• Custom AI Workflows</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Project Notice */}
        <section className="mt-20">
          <div className="bg-indigo-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Personal Portfolio Project
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              This is a personal project created to demonstrate full-stack development skills, 
              AI integration capabilities, and modern web application architecture. 
              It's designed for individual use and portfolio demonstration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GuestModeButton className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700" />
              <Link
                to="/register"
                className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>BookVid AI - Personal Project Demonstration</p>
            <p className="mt-2 text-sm">
              Built with React, Node.js, and AI APIs for portfolio showcase
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;