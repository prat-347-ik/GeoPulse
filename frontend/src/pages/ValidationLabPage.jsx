import ValidationPanel from '../components/ValidationPanel';
import { selectEventsLast24h, selectValidationAccuracy } from '../app/selectors';

export default function ValidationLabPage({ data }) {
  const { validations, events } = data;
  const { resolvedCount, accuracyPct } = selectValidationAccuracy(validations);
  const eventsLast24h = selectEventsLast24h(events);

  return (
    <div className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
          <h1 className="text-xl font-semibold text-white">Validation Lab</h1>
          <p className="text-sm text-text-secondary mt-1">
            Monitor prediction reliability and validation outcomes from live backend events.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-bg-card border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-text-secondary">Events (24h)</p>
              <p className="text-lg font-semibold text-white">{eventsLast24h}</p>
            </div>
            <div className="bg-bg-card border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-text-secondary">Validations</p>
              <p className="text-lg font-semibold text-white">{validations.length}</p>
            </div>
            <div className="bg-bg-card border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-text-secondary">Resolved</p>
              <p className="text-lg font-semibold text-white">{resolvedCount}</p>
            </div>
            <div className="bg-bg-card border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-text-secondary">Accuracy</p>
              <p className="text-lg font-semibold text-accent-green">{accuracyPct}%</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
          <ValidationPanel validations={validations} demoMode={false} />
        </div>
      </div>
    </div>
  );
}
