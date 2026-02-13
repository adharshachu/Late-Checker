
import React, { useState } from 'react';
import { Upload, FileUp, Users, Clock, AlertCircle, Download, CheckCircle, Percent } from 'lucide-react';
import { parseExcel } from './utils/excelParser';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const result = await parseExcel(file);
      setData(result);
    } catch (err) {
      setError("Failed to parse the Excel file. Please ensure it follows the correct format.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Mock event structure for handleFileUpload
      handleFileUpload({ target: { files: [file] } });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-purple-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              LateEntry AI
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Upload Section */}
        {!data && (
          <div
            className="border-2 border-dashed border-gray-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-purple-500 hover:bg-gray-900/50 transition-all cursor-pointer group"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
              id="fileInput"
            />
            <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-200">Upload Attendance File</h3>
              <p className="text-gray-500 mt-2">Drag & drop or click to browse</p>
              <p className="text-xs text-gray-600 mt-4">Supports .xlsx and .xls</p>
            </label>
            {loading && <p className="text-purple-400 animate-pulse">Analyzing Employee Records...</p>}
            {error && <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg"><AlertCircle className="w-4 h-4" /><span>{error}</span></div>}
          </div>
        )}

        {/* Dashboard */}
        {data && (
          <div className="space-y-8 animate-fade-in-up">

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-400">File</span>
                <span className="font-medium">{fileName}</span>
              </div>
              <button
                onClick={() => setData(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Upload New File
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Total Employees"
                value={data.summary.total}
                icon={Users}
                color="text-blue-400"
                bg="bg-blue-500/10"
                borderColor="border-blue-500/20"
              />
              <StatCard
                title="On Time"
                value={data.summary.onTime}
                icon={CheckCircle}
                color="text-green-400"
                bg="bg-green-500/10"
                borderColor="border-green-500/20"
              />
              <StatCard
                title="Late Arrivals"
                value={data.summary.late}
                icon={AlertCircle}
                color="text-red-400"
                bg="bg-red-500/10"
                borderColor="border-red-500/20"
              />
              <StatCard
                title="Late Percentage"
                value={`${data.summary.latePercentage}%`}
                icon={Percent}
                color="text-orange-400"
                bg="bg-orange-500/10"
                borderColor="border-orange-500/20"
              />
            </div>

            {/* Late List */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <span className="w-2 h-8 bg-red-500 rounded-full mr-2"></span>
                  Late Entries
                  <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    &gt; 9:31 AM
                  </span>
                </h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors text-gray-300">
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {data.details.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                    <p className="text-lg">Everyone was on time!</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-800/50 text-gray-400 text-sm uppercase tracking-wider">
                        <th className="p-4 font-medium">Employee Name</th>
                        <th className="p-4 font-medium">Entry Time</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium text-right">Penalty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.details.map((employee, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/30 transition-colors group">
                          <td className="p-4 font-medium text-gray-200 group-hover:text-white transition-colors">
                            {employee.name}
                          </td>
                          <td className="p-4 font-mono text-purple-300">
                            {employee.time}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/20">
                              Late
                            </span>
                          </td>
                          <td className="p-4 text-right text-gray-500 text-sm">
                            {/* Placeholder for penalty logic if needed later */}
                            -
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 bg-gray-900 border-t border-gray-800 text-center text-sm text-gray-500">
                Showing {data.details.length} late entries
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, color, bg, borderColor }) => (
  <div className={`p-6 rounded-2xl border ${borderColor} ${bg} backdrop-blur-md relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10">
      <div className={`flex items-center space-x-2 mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium tracking-wide uppercase opacity-80">{title}</span>
      </div>
      <div className="text-4xl font-bold text-white tracking-tight">{value}</div>
    </div>
  </div>
);

export default App;
