import React, { useState, useMemo, useRef, useEffect } from 'react';
import { READING_PLANS, BOOKS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import { useToast } from './Toast.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

// Map bookNum → book name for display
const BOOK_NAME = Object.fromEntries(BOOKS.map(b => [b.num, b.n]));

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProgressBar({ pct, color = 'var(--gold)' }) {
  return (
    <div className="plan-pbar">
      <div className="plan-pfill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

// ── PLAN DETAIL VIEW ──────────────────────────────────────────
function PlanDetail({ instance, template, onBack, onMarkDay, onDelete, onNavigate }) {
  usePageTitle(instance.title);
  const completedSet = new Set(instance.completedDays);
  const todayIdx = instance.completedDays.length; // next day to complete
  const pct = Math.round((instance.completedDays.length / instance.totalDays) * 100);
  const isComplete = instance.completedAt || instance.completedDays.length >= instance.totalDays;

  const todayReadings = template?.days?.[Math.min(todayIdx, instance.totalDays - 1)] || [];

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to Plans</button>

      {isComplete && (
        <div className="plan-complete-banner">
          <div className="plan-complete-icon">🏆</div>
          <div className="plan-complete-title">Plan Complete!</div>
          <div className="plan-complete-sub">You finished {instance.title} on {formatDate(instance.completedAt)}</div>
        </div>
      )}

      <div className="plan-detail-hdr">
        <div className="plan-detail-icon">{instance.icon}</div>
        <div>
          <div className="plan-detail-title">{instance.title}</div>
          <div className="plan-detail-meta">
            Started {formatDate(instance.startedAt)} · {instance.completedDays.length}/{instance.totalDays} days · {pct}%
          </div>
          <ProgressBar pct={pct} />
        </div>
      </div>

      {/* Today's reading */}
      {!isComplete && todayReadings.length > 0 && (
        <div className="today-card">
          <div className="today-lbl">Day {todayIdx + 1} of {instance.totalDays}</div>
          <div className="today-readings">
            {todayReadings.map((r, i) => (
              <div key={i} className="today-reading-row">
                <span className="today-reading-ref">
                  {BOOK_NAME[r.bookNum] || `Book ${r.bookNum}`} {r.chapter}
                </span>
                <button
                  className="today-reading-btn"
                  onClick={() => onNavigate(r.bookNum, r.chapter)}
                >
                  Read →
                </button>
              </div>
            ))}
          </div>
          <button
            className="today-complete-btn"
            onClick={() => onMarkDay(instance.id, todayIdx)}
          >
            ✓ Mark Day {todayIdx + 1} Complete
          </button>
        </div>
      )}

      {/* Day grid */}
      <div className="lbl" style={{ marginBottom: 10 }}>Progress</div>
      <div className="plan-day-grid">
        {Array.from({ length: instance.totalDays }, (_, i) => {
          const done = completedSet.has(i);
          const isToday = i === todayIdx && !isComplete;
          return (
            <button
              key={i}
              className={`plan-day-cell ${done ? 'done' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => {
                // Allow toggling any past/current day
                if (i <= todayIdx || done) onMarkDay(instance.id, i);
              }}
              title={`Day ${i + 1}${done ? ' (done)' : ''}`}
              aria-label={`Day ${i + 1}${done ? ', completed' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="plan-actions">
        <button className="btn btn-danger" onClick={() => {
          if (window.confirm('Remove this reading plan? Your progress will be lost.')) onDelete(instance.id);
        }}>
          Remove Plan
        </button>
      </div>
    </div>
  );
}

// ── MAIN PLANS COMPONENT ──────────────────────────────────────
export default function Plans({ setTab, setSelectedBook, setCurrentChapter }) {
  usePageTitle('Reading Plans');
  const showToast = useToast();
  const { readingPlans, startPlan, markDayComplete, deletePlan } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewingPlan, setViewingPlan] = useState(null);
  const planTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (planTimerRef.current) clearTimeout(planTimerRef.current);
    };
  }, []);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(READING_PLANS.map(p => p.category))];
    return cats;
  }, []);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'All') return READING_PLANS;
    return READING_PLANS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  // Active (not completed) plan instances
  const activePlans = useMemo(() =>
    readingPlans.filter(p => !p.completedAt),
    [readingPlans]
  );

  // Completed instances
  const completedPlans = useMemo(() =>
    readingPlans.filter(p => p.completedAt),
    [readingPlans]
  );

  function getActiveInstance(planId) {
    return activePlans.find(p => p.planId === planId) || null;
  }

  function handleStartPlan(template) {
    const existing = getActiveInstance(template.id);
    if (existing) {
      setViewingPlan(existing.id);
      return;
    }
    startPlan(template);
    showToast(`Started "${template.title}"!`);
    const timerId = setTimeout(() => {
      setViewingPlan(null);
    }, 50);
    planTimerRef.current = timerId;
  }

  function handleNavigate(bookNum, chapter) {
    const book = BOOKS.find(b => b.num === bookNum);
    if (!book) return;
    setSelectedBook(book);
    setCurrentChapter(chapter);
    setTab('read');
  }

  function handleMarkDay(instanceId, dayIdx) {
    markDayComplete(instanceId, dayIdx);
  }

  function handleDelete(instanceId) {
    deletePlan(instanceId);
    setViewingPlan(null);
  }

  // ── Detail view ─────────────────────────────────────────────
  if (viewingPlan) {
    const instance = readingPlans.find(p => p.id === viewingPlan);
    if (!instance) { setViewingPlan(null); return null; }
    const template = READING_PLANS.find(p => p.id === instance.planId);
    return (
      <PlanDetail
        instance={instance}
        template={template}
        onBack={() => setViewingPlan(null)}
        onMarkDay={handleMarkDay}
        onDelete={handleDelete}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="plans-hdr">
        <div className="plans-title">📅 Reading Plans</div>
        <div className="plans-sub">Structured journeys through Scripture</div>
      </div>

      {/* Active plans */}
      {activePlans.length > 0 && (
        <>
          <div className="lbl">In Progress</div>
          {activePlans.map(instance => {
            const pct = Math.round((instance.completedDays.length / instance.totalDays) * 100);
            return (
              <div
                key={instance.id}
                className="active-plan-card"
                onClick={() => setViewingPlan(instance.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setViewingPlan(instance.id)}
              >
                <div className="apc-row1">
                  <span className="apc-icon">{instance.icon}</span>
                  <span className="apc-badge">
                    Day {instance.completedDays.length + 1} of {instance.totalDays}
                  </span>
                </div>
                <div className="apc-title">{instance.title}</div>
                <div className="apc-day">Started {formatDate(instance.startedAt)}</div>
                <ProgressBar pct={pct} color="rgba(255,255,255,0.65)" />
                <div className="apc-pct">{pct}% complete</div>
              </div>
            );
          })}
        </>
      )}

      {/* Category filter */}
      <div className="plan-category-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`plan-cat-btn ${selectedCategory === cat ? 'on' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plan grid */}
      <div className="plan-grid">
        {filteredTemplates.map(plan => {
          const active = getActiveInstance(plan.id);
          const completed = completedPlans.find(p => p.planId === plan.id);
          return (
            <div
              key={plan.id}
              className={`plan-card ${active ? 'active-plan' : ''}`}
              onClick={() => active ? setViewingPlan(active.id) : handleStartPlan(plan)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (active ? setViewingPlan(active.id) : handleStartPlan(plan))}
            >
              <div className="plan-card-icon">{plan.icon}</div>
              <div className="plan-card-title">{plan.title}</div>
              <div className="plan-card-days">{plan.totalDays} days · {plan.category}</div>
              <div className="plan-card-desc">{plan.description}</div>
              {active && (
                <span className="plan-card-active-badge">
                  {Math.round((active.completedDays.length / active.totalDays) * 100)}% done
                </span>
              )}
              {!active && completed && (
                <span className="plan-card-active-badge" style={{ color: 'var(--gold)', background: 'var(--gold-wash)' }}>
                  ✓ Completed
                </span>
              )}
              {!active && !completed && (
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                  Tap to start →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed plans */}
      {completedPlans.length > 0 && (
        <>
          <div className="lbl" style={{ marginTop: 8 }}>Completed</div>
          {completedPlans.map(instance => (
            <div
              key={instance.id}
              className="plan-card"
              style={{ gridColumn: 'span 2', flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => setViewingPlan(instance.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setViewingPlan(instance.id)}
            >
              <div className="plan-card-icon">{instance.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="plan-card-title">{instance.title}</div>
                <div className="plan-card-days">Completed {formatDate(instance.completedAt)}</div>
              </div>
              <span style={{ fontSize: 20 }}>🏆</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
