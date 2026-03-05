"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

interface ScanReportProps {
  result: AnalysisResult;
}

// Get risk color based on score
function getRiskColor(score: number): string {
  if (score <= 20) return "text-green-400 bg-green-400/20 border-green-400/30";
  if (score <= 40) return "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";
  if (score <= 60) return "text-orange-400 bg-orange-400/20 border-orange-400/30";
  if (score <= 80) return "text-red-400 bg-red-400/20 border-red-400/30";
  return "text-red-600 bg-red-600/20 border-red-600/30";
}

// Get risk label
function getRiskLabel(score: number): string {
  if (score <= 20) return "Very Safe";
  if (score <= 40) return "Generally Safe";
  if (score <= 60) return "Moderate Risk";
  if (score <= 80) return "High Risk";
  return "Critical Risk";
}

// Get risk level color for key functions
function getRiskLevelColor(level: string): string {
  switch (level) {
    case "LOW":
      return "text-green-400 bg-green-400/10";
    case "MEDIUM":
      return "text-yellow-400 bg-yellow-400/10";
    case "HIGH":
      return "text-red-400 bg-red-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
}

// Network display names
const networkNames: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
};

export default function ScanReport({ result }: ScanReportProps) {
  const { contract, analysis, cached, timestamp } = result;
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(contract.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <a
          href="/"
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </a>
        <h1 className="text-3xl font-bold mb-2">Contract Analysis Report</h1>
        <div className="flex items-center gap-4 text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {networkNames[contract.network] || contract.network}
          </span>
          {cached && (
            <span className="text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
              Cached Result
            </span>
          )}
        </div>
      </div>

      {/* Contract Info Card */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">{contract.contractName}</h2>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-gray-900 px-3 py-1 rounded font-mono text-gray-300">
                {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
              </code>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Compiler: {contract.compilerVersion}
            </p>
          </div>

          {/* Risk Score */}
          <div className={`px-6 py-4 rounded-xl border text-center ${getRiskColor(analysis.riskScore)}`}>
            <div className="text-3xl font-bold">{analysis.riskScore}</div>
            <div className="text-sm opacity-80">Risk Score</div>
            <div className="text-xs mt-1 opacity-70">{getRiskLabel(analysis.riskScore)}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Summary
        </h3>
        <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Key Functions */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Key Functions
          </h3>
          <div className="space-y-3">
            {analysis.keyFunctions.map((func, idx) => (
              <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-sm font-mono text-blue-400">{func.name}</code>
                  <span className={`text-xs px-2 py-1 rounded ${getRiskLevelColor(func.riskLevel)}`}>
                    {func.riskLevel}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{func.purpose}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Access: {func.accessControl}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Privileges */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Admin Privileges
          </h3>
          {analysis.adminPrivileges.length > 0 ? (
            <div className="space-y-3">
              {analysis.adminPrivileges.map((priv, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-sm text-gray-300 font-medium">{priv.capability}</p>
                  <p className="text-sm text-red-400/80 mt-1">{priv.risk}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No significant admin privileges detected.</p>
          )}
        </div>
      </div>

      {/* Risks */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Identified Risks
        </h3>
        {analysis.risks.length > 0 ? (
          <ul className="space-y-2">
            {analysis.risks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1">•</span>
                {risk}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No specific risks identified.</p>
        )}
      </div>

      {/* Advice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mt-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Recommendations
        </h3>
        <p className="text-gray-300">{analysis.advice}</p>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
        <p>Analysis generated on {new Date(timestamp).toLocaleString()}</p>
        <p className="mt-1">
          This is an automated analysis and should not be considered a substitute for a professional audit.
        </p>
      </div>
    </div>
  );
}
