import React from 'react';

export default function DoseLimitBar({ item }) {
  const { ingredient, currentDailyMg, maxDailyMg, unit = 'mg', note } = item;

  const percentage = Math.min(Math.round((currentDailyMg / maxDailyMg) * 100), 100);
  const isOver = currentDailyMg > maxDailyMg;
  const isNearLimit = currentDailyMg >= maxDailyMg * 0.75;

  let barColor = 'bg-primary';
  if (isOver) {
    barColor = 'bg-error';
  } else if (isNearLimit) {
    barColor = 'bg-warning';
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-label-lg text-label-lg font-bold text-on-surface">
          {ingredient}
        </span>
        <div className="font-label-md text-label-md">
          <span className={`font-bold ${isOver ? 'text-error' : 'text-on-surface'}`}>
            {currentDailyMg} {unit}
          </span>
          <span className="text-on-surface-variant font-normal"> / {maxDailyMg} {unit} max</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
        <span>{note || 'Daily ceiling for age and profile'}</span>
        <span className="font-semibold">{percentage}% of ceiling</span>
      </div>
    </div>
  );
}

