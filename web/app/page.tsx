export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ContractScan
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
          AI-powered smart contract analysis
        </p>
        <p className="text-gray-400 mb-12 max-w-xl mx-auto">
          Instantly analyze any verified smart contract on Ethereum, Base, or Arbitrum. 
          Get security insights, risk scores, and plain English explanations.
        </p>
        
        {/* Search Box */}
        <div className="max-w-2xl mx-auto">
          <form action="/scan" method="GET" className="relative">
            <input
              type="text"
              name="address"
              placeholder="Enter contract address (0x...)"
              className="w-full px-6 py-4 pr-36 text-lg bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-500"
              pattern="0x[a-fA-F0-9]{40}"
              required
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              Analyze
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-3">
            Supports Ethereum, Base, and Arbitrum contracts
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Security Analysis</h3>
            <p className="text-gray-400">
              AI-powered risk assessment identifying vulnerabilities, admin privileges, and potential red flags.
            </p>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Plain English</h3>
            <p className="text-gray-400">
              Complex contract logic explained in simple terms. Understand what a contract does without reading Solidity.
            </p>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Shareable Reports</h3>
            <p className="text-gray-400">
              Generate shareable links to contract analysis reports. Perfect for due diligence and community discussions.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h4 className="font-semibold text-lg">Enter Contract Address</h4>
              <p className="text-gray-400">Paste any verified contract address from Ethereum, Base, or Arbitrum.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h4 className="font-semibold text-lg">AI Analysis</h4>
              <p className="text-gray-400">Our AI analyzes the source code, identifies key functions, and assesses risks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h4 className="font-semibold text-lg">Get Your Report</h4>
              <p className="text-gray-400">Receive a detailed security report with risk score, key functions, and recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500 border-t border-gray-800">
        <p>ContractScan — AI-powered smart contract security analysis</p>
        <p className="text-sm mt-2">
          Free tier: 10 scans/hour, 30/day • Results cached for 24 hours
        </p>
      </footer>
    </main>
  );
}
