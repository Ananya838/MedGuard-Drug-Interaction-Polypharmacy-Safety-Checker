import React, { useState, useEffect } from 'react';
import { getDailySchedule, markDoseTaken } from '../api/schedule.js';
import { useI18n } from '../context/I18nContext.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';

export default function SchedulePage() {
  const { t } = useI18n();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await getDailySchedule();
        setSchedule(data);
      } catch (err) {
        console.error("Failed to load schedule", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  const handleToggleDose = async (slotId, medId) => {
    try {
      await markDoseTaken(slotId, medId);
      const updated = await getDailySchedule();
      setSchedule(updated);
    } catch (err) {
      console.error("Failed to mark dose", err);
    }
  };

  // Calculate adherence stats
  let totalDoses = 0;
  let takenDoses = 0;
  schedule.forEach((slot) => {
    slot.medicines.forEach((m) => {
      totalDoses++;
      if (m.status === 'taken') takenDoses++;
    });
  });
  const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {t('scheduleScreen.title', 'Daily Medication Schedule')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('scheduleScreen.subtitle', 'Track daily doses across morning, afternoon, evening, and bedtime.')}
          </p>
        </div>

        {/* Adherence Summary Pill */}
        <div className="flex items-center gap-space-md bg-surface-container-lowest border border-border-subtle p-space-sm rounded-xl shadow-sm">
          <div className="flex flex-col text-right">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">
              Today's Adherence
            </span>
            <span className="font-headline-sm font-bold text-primary">
              {adherencePercent}% ({takenDoses}/{totalDoses} Doses)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">done_all</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-label-lg text-on-surface-variant">
          {t('common.loading', 'Loading daily schedule...')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg">
          {schedule.map((slot) => (
            <div key={slot.id} className="flex flex-col gap-space-sm">
              {/* Time slot header */}
              <div className="bg-surface-container-high/80 rounded-xl p-space-md flex flex-col border border-border-subtle">
                <span className="font-headline-sm text-[18px] font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {slot.timeSlot === 'Morning' ? 'wb_sunny' : slot.timeSlot === 'Afternoon' ? 'light_mode' : slot.timeSlot === 'Evening' ? 'wb_twilight' : 'bedtime'}
                  </span>
                  {slot.timeSlot}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  {slot.timeWindow}
                </span>
              </div>

              {/* Medicines in this slot */}
              <div className="flex flex-col gap-space-sm">
                {slot.medicines.map((med) => {
                  const isTaken = med.status === 'taken';
                  return (
                    <Card
                      key={med.id}
                      className={`flex flex-col gap-2 transition-all border-2 ${
                        isTaken
                          ? 'bg-secondary-container/20 border-secondary-container/60 opacity-90'
                          : 'bg-surface-container-lowest border-border-subtle hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {med.name}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                            {med.generic}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-[12px] font-semibold shrink-0">
                          {med.patientName.split(' ')[0]}
                        </span>
                      </div>

                      <div className="text-[14px] text-on-surface-variant bg-surface-container-low/70 p-2 rounded-lg">
                        <p className="font-medium text-on-surface">{med.dose}</p>
                        <p className="text-[13px]">{med.instruction}</p>
                      </div>

                      {/* Action: Mark Taken */}
                      <button
                        type="button"
                        onClick={() => handleToggleDose(slot.id, med.id)}
                        className={`h-11 rounded-xl font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isTaken
                            ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
                            : 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isTaken ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>
                          {isTaken ? `Taken (${med.takenAt})` : t('scheduleScreen.markTaken', 'Mark Taken')}
                        </span>
                      </button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

