/**
 * OnboardingTour.jsx — Guided walkthrough for first-time users
 *
 * 5-step overlay explaining A.P.E.X capabilities.
 * Shows only on first visit (persisted in localStorage).
 */
import React, { useState, useEffect, useCallback } from 'react';
import './OnboardingTour.css';

const STORAGE_KEY = 'apex_onboarding_complete';

const STEPS = [
  {
    icon: '⚡',
    title: 'Welcome to A.P.E.X',
    desc: 'An <span class="onboarding-card__highlight">Autonomous Self-Healing Supply Chain</span> for India\'s highway freight network. Powered by Gemini 2.5 Flash, XGBoost ML, and real-time FASTag data.',
  },
  {
    icon: '🗺️',
    title: 'Your Highway Network',
    desc: 'The map shows <span class="onboarding-card__highlight">15 live nodes</span> — toll plazas, warehouses, and ICDs across NH-48 and NH-44 corridors. Click any node to inspect its health metrics.',
  },
  {
    icon: '💥',
    title: 'Inject a Disruption',
    desc: 'Use the <span class="onboarding-card__highlight">Inject tab</span> in the sidebar to simulate monsoons, accidents, or ICEGATE failures. Watch A.P.E.X autonomously detect and respond.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Response',
    desc: 'XGBoost classifies the disruption in <span class="onboarding-card__highlight">&lt;15ms</span>. A* finds optimal reroutes. Gemini 2.5 Flash generates strategic analysis. All <span class="onboarding-card__highlight">zero human intervention</span>.',
  },
  {
    icon: '🌍',
    title: 'FASTag-as-IoT Innovation',
    desc: 'A.P.E.X transforms India\'s <span class="onboarding-card__highlight">5.9 crore active FASTags</span> and 10.5 million daily transactions into a predictive intelligence network — zero new hardware needed.',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Delay slightly so the map loads behind the overlay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
    }
  }, [step]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-overlay" onClick={handleSkip}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-card__step">
          <span className="onboarding-card__step-badge">
            STEP {step + 1} of {STEPS.length}
          </span>
          <div className="onboarding-card__step-dots">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`onboarding-card__dot ${
                  i === step ? 'onboarding-card__dot--active' :
                  i < step ? 'onboarding-card__dot--done' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <span className="onboarding-card__icon">{current.icon}</span>
        <h2 className="onboarding-card__title">{current.title}</h2>
        <p
          className="onboarding-card__desc"
          dangerouslySetInnerHTML={{ __html: current.desc }}
        />

        <div className="onboarding-card__actions">
          <button className="onboarding-card__skip" onClick={handleSkip}>
            Skip tour
          </button>
          <button className="onboarding-card__next" onClick={handleNext}>
            {isLast ? 'Start Exploring →' : 'Next →'}
          </button>
        </div>

        {step === 4 && (
          <div className="onboarding-card__sdg">
            <span className="onboarding-card__sdg-badge">UN SDG 9</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Industry, Innovation & Infrastructure
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
