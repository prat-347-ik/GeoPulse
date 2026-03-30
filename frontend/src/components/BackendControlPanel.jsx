import { useState } from 'react';
import { Activity, Brain, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';

export default function BackendControlPanel({
  activeEvent,
  backendHealth,
  llmHealth,
  onValidateActive,
  onAnalyzeHeadline,
  onSimulateScenario,
  busy = false,
}) {
  const [headline, setHeadline] = useState('Fed signals pause in rate hikes amid cooling inflation');
  const [scenario, setScenario] = useState('OPEC cuts output and airlines sell off on fuel-cost shock');
  const [message, setMessage] = useState('');

  const runValidate = async () => {
    if (!activeEvent?.event_id) {
      setMessage('Select an event first to run validation.');
      return;
    }
    const ok = await onValidateActive();
    setMessage(ok ? 'Validation completed and lists refreshed.' : 'Validation request failed.');
  };

  const runAnalyze = async () => {
    if (!headline.trim()) {
      setMessage('Enter a headline before running analyze.');
      return;
    }
    const ok = await onAnalyzeHeadline(headline.trim());
    setMessage(ok ? 'Analyze created a new event.' : 'Analyze request failed.');
  };

  const runSimulate = async () => {
    if (!scenario.trim()) {
      setMessage('Enter a scenario before running simulate.');
      return;
    }
    const ok = await onSimulateScenario(scenario.trim());
    setMessage(ok ? 'Simulate completed successfully.' : 'Simulate request failed.');
  };

  return (
    <div className="bg-bg-card-alt border border-gray-800 rounded-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-white">Backend Integration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-bg-card rounded-lg border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">API Health</p>
          <p className={`text-sm font-semibold ${backendHealth ? 'text-accent-green' : 'text-accent-red'}`}>
            {backendHealth ? 'Reachable' : 'Unavailable'}
          </p>
        </div>
        <div className="p-3 bg-bg-card rounded-lg border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">LLM Runtime</p>
          <p className={`text-sm font-semibold ${llmHealth?.ollama_reachable ? 'text-accent-green' : 'text-accent-red'}`}>
            {llmHealth?.ollama_reachable ? 'Ollama Online' : 'Ollama Offline'}
          </p>
        </div>
        <div className="p-3 bg-bg-card rounded-lg border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">Configured Model</p>
          <p className="text-sm font-semibold text-white truncate">{llmHealth?.model || 'Unknown'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="p-3 bg-bg-card rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <ShieldCheck className="w-4 h-4 text-accent-green" />
            Validate Event
          </div>
          <p className="text-xs text-text-secondary truncate">
            Active: {activeEvent?.event_id || 'none'}
          </p>
          <button
            onClick={runValidate}
            disabled={busy}
            className="w-full px-3 py-2 text-sm rounded-md bg-accent-green/20 text-accent-green hover:bg-accent-green/30 disabled:opacity-60"
          >
            Run /api/validate
          </button>
        </div>

        <div className="p-3 bg-bg-card rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Brain className="w-4 h-4 text-accent-blue" />
            Analyze Headline
          </div>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full px-2 py-1.5 bg-bg-primary border border-gray-700 rounded text-sm text-white"
          />
          <button
            onClick={runAnalyze}
            disabled={busy}
            className="w-full px-3 py-2 text-sm rounded-md bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-60"
          >
            Run /api/analyze
          </button>
        </div>

        <div className="p-3 bg-bg-card rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <FlaskConical className="w-4 h-4 text-accent-amber" />
            Simulate Scenario
          </div>
          <input
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full px-2 py-1.5 bg-bg-primary border border-gray-700 rounded text-sm text-white"
          />
          <button
            onClick={runSimulate}
            disabled={busy}
            className="w-full px-3 py-2 text-sm rounded-md bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30 disabled:opacity-60"
          >
            Run /api/simulate
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-2 rounded bg-bg-card border border-gray-800 text-xs text-text-secondary">
          <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
