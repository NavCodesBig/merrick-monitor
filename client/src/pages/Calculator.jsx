import { useState } from 'react';
import NavBar from '../components/NavBar';

function Field({ label, hint, value, onChange, placeholder }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-semibold text-blue-100">{label}</label>
        {hint && <span className="text-xs text-blue-200">{hint}</span>}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-blue-300 text-base focus:outline-none focus:bg-white/20"
      />
    </div>
  );
}

export default function Calculator() {
  const [currentBG, setCurrentBG]     = useState('');
  const [targetBG, setTargetBG]       = useState('120');
  const [carbs, setCarbs]             = useState('');
  const [carbRatio, setCarbRatio]     = useState('');
  const [corrFactor, setCorrFactor]   = useState('');

  const bg      = parseFloat(currentBG);
  const target  = parseFloat(targetBG)  || 120;
  const c       = parseFloat(carbs)     || 0;
  const icr     = parseFloat(carbRatio);
  const isf     = parseFloat(corrFactor);

  const hasEnough = !isNaN(bg) && !isNaN(isf);

  const mealDose       = (c > 0 && !isNaN(icr) && icr > 0) ? c / icr : 0;
  const correctionDose = hasEnough ? (bg - target) / isf : null;
  const totalRaw       = correctionDose !== null ? mealDose + correctionDose : null;
  const total          = totalRaw !== null ? Math.max(0, totalRaw) : null;

  const correctionCapped = totalRaw !== null && totalRaw < 0;

  function reset() {
    setCurrentBG('');
    setCarbs('');
    setCarbRatio('');
    setCorrFactor('');
    setTargetBG('120');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-700 to-blue-900 max-w-lg mx-auto">
      <header className="px-5 pt-10 pb-6 text-white">
        <p className="text-blue-200 text-sm font-medium mb-1">Merrick Monitor</p>
        <h1 className="text-2xl font-bold tracking-tight">Insulin Calculator</h1>
        <p className="text-blue-200 text-sm mt-1">Meal dose + correction dose</p>
      </header>

      <main className="flex-1 px-4 pb-28 space-y-4">

        {/* Inputs */}
        <div className="bg-white/10 rounded-3xl p-5 space-y-4">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Blood Glucose</p>
          <Field
            label="Current BG"
            hint="mg/dL"
            value={currentBG}
            onChange={setCurrentBG}
            placeholder="e.g. 220"
          />
          <Field
            label="Target BG"
            hint="mg/dL"
            value={targetBG}
            onChange={setTargetBG}
            placeholder="e.g. 120"
          />
          <Field
            label="Correction Factor (ISF)"
            hint="mg/dL per unit"
            value={corrFactor}
            onChange={setCorrFactor}
            placeholder="e.g. 50"
          />
        </div>

        <div className="bg-white/10 rounded-3xl p-5 space-y-4">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Meal (optional)</p>
          <Field
            label="Carbohydrates"
            hint="grams"
            value={carbs}
            onChange={setCarbs}
            placeholder="e.g. 45"
          />
          <Field
            label="Carb Ratio (ICR)"
            hint="g carbs per unit"
            value={carbRatio}
            onChange={setCarbRatio}
            placeholder="e.g. 15"
          />
        </div>

        {/* Results */}
        {total !== null && (
          <div className="bg-white rounded-3xl p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Result</p>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Meal dose</span>
              <span className="text-sm font-semibold text-gray-900">
                {mealDose.toFixed(2)} <span className="font-normal text-gray-400">units</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Correction dose</span>
              <span className={`text-sm font-semibold ${correctionDose < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {correctionDose.toFixed(2)} <span className="font-normal text-gray-400">units</span>
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-base font-bold text-gray-900">Total dose</span>
              <span className="text-2xl font-bold text-blue-700">
                {total.toFixed(2)} <span className="text-base font-normal text-gray-400">units</span>
              </span>
            </div>

            {correctionCapped && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 font-medium">
                BG is below target — correction reduces dose to 0. Monitor for hypoglycemia.
              </div>
            )}

            {correctionDose !== null && correctionDose < 0 && !correctionCapped && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 font-medium">
                Negative correction applied — total dose reduced.
              </div>
            )}
          </div>
        )}

        {!hasEnough && (
          <p className="text-center text-blue-200 text-sm pt-2">
            Enter Current BG and Correction Factor to calculate.
          </p>
        )}

        <button
          onClick={reset}
          className="w-full py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-sm font-semibold hover:bg-white/20 transition-colors"
        >
          Clear
        </button>
      </main>

      <NavBar />
    </div>
  );
}
