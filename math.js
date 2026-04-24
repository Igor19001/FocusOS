/* ═══════════════════════════════════════════════════════════════════════════
   FocusOS — math.js
   Pure functional mathematics / statistics engine.
   No side effects. All inputs are plain JS arrays / objects.

   ┌─────────────────────────────────────────────────────────────────────┐
   │  ALGORITHMS OVERVIEW                                                 │
   │                                                                      │
   │  1. Bayesian Mean Estimation                                         │
   │     Normal-Normal conjugate shrinkage. Prevents wild estimates when  │
   │     you only have 1-2 data points for a category.                   │
   │                                                                      │
   │  2. Markov Chain Activity Transitions                                │
   │     First-order transition matrix. Tells you: "After coding, you    │
   │     usually go to break (80% of the time)."                         │
   │                                                                      │
   │  3. EMA – Exponential Moving Average                                 │
   │     Smooths your daily productivity scores. A single terrible day   │
   │     barely moves the needle; a consistent trend shows clearly.      │
   │                                                                      │
   │  4. Fatigue Degradation Curve                                        │
   │     Exponential decay: E(t) = 100·e^(−λt). Research shows ~25%      │
   │     performance drop after 90 min of sustained focus. λ is tuned    │
   │     to this threshold. Tells you exactly when to take a break.      │
   │                                                                      │
   │  5. K-Means Golden Hours                                             │
   │     1-D k-means (k=2) on hourly productivity scores. Clusters your  │
   │     24 hours into "peak performance windows" vs "waste hours."      │
   └─────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */

const MATH = (() => {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. BAYESIAN MEAN ESTIMATION
  //
  //    Model: Normal likelihood, Normal prior (conjugate pair).
  //    posterior_mean = (n·x̄ + k·μ₀) / (n + k)
  //
  //    where:
  //      n  = number of observations
  //      x̄  = sample mean
  //      k  = prior strength (pseudo-observation count) – default 3
  //      μ₀ = prior mean (our belief before any data) – default 600 s (10 min)
  //
  //    Effect: with n=1 we barely move from μ₀.
  //            with n=20 the data dominates entirely.
  // ─────────────────────────────────────────────────────────────────────────

  function bayesianMean(values, priorMean = 600, priorStrength = 3) {
    const n = values.length;
    if (n === 0) return priorMean;
    const xBar = values.reduce((s, v) => s + v, 0) / n;
    return (n * xBar + priorStrength * priorMean) / (n + priorStrength);
  }

  function bayesianStd(values, priorMean = 600, priorStrength = 3) {
    const n = values.length;
    if (n < 2) return 0;
    const postMean = bayesianMean(values, priorMean, priorStrength);
    const variance = values.reduce((s, v) => s + (v - postMean) ** 2, 0) / Math.max(n - 1, 1);
    return Math.sqrt(variance);
  }

  // Per-category Bayesian stats from a task array
  function bayesianCategoryStats(tasks) {
    const buckets = {};
    for (const t of tasks) {
      if (!t.duration || t.duration <= 0) continue;
      if (!buckets[t.category]) buckets[t.category] = [];
      buckets[t.category].push(t.duration);
    }
    const result = {};
    for (const [cat, vals] of Object.entries(buckets)) {
      result[cat] = {
        bayesMean:   Math.round(bayesianMean(vals)),
        bayesStd:    Math.round(bayesianStd(vals)),
        sampleMean:  Math.round(vals.reduce((s,v) => s+v, 0) / vals.length),
        sampleCount: vals.length,
        totalSeconds: vals.reduce((s,v) => s+v, 0),
      };
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. MARKOV CHAIN – Activity Transition Matrix
  //
  //    Builds P(Cₙ₊₁ | Cₙ): the probability of transitioning from one
  //    activity category to another, based on historical sequence.
  //
  //    Implementation: count(i→j) / count(i→*) per state i.
  // ─────────────────────────────────────────────────────────────────────────

  function buildMarkovChain(tasks) {
    const sortedTasks = [...tasks].sort((a, b) =>
      new Date(a.start_time) - new Date(b.start_time)
    );
    const counts = {};
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      const from = sortedTasks[i].category;
      const to   = sortedTasks[i + 1].category;
      if (!counts[from]) counts[from] = {};
      counts[from][to] = (counts[from][to] || 0) + 1;
    }
    // Normalize to probabilities
    const matrix = {};
    for (const [from, tos] of Object.entries(counts)) {
      const total = Object.values(tos).reduce((s, v) => s + v, 0);
      matrix[from] = {};
      for (const [to, cnt] of Object.entries(tos)) {
        matrix[from][to] = Math.round((cnt / total) * 1000) / 1000;
      }
    }
    return matrix;
  }

  function mostLikelyNext(matrix, currentCategory) {
    const row = matrix[currentCategory];
    if (!row) return null;
    return Object.entries(row).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Top-N transitions for display
  function topTransitions(matrix, n = 5) {
    const all = [];
    for (const [from, tos] of Object.entries(matrix)) {
      for (const [to, prob] of Object.entries(tos)) {
        all.push({ from, to, prob });
      }
    }
    return all.sort((a, b) => b.prob - a.prob).slice(0, n);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. EMA – Exponential Moving Average
  //
  //    EMAₜ = α·xₜ + (1−α)·EMAₜ₋₁
  //
  //    α = 0.3 (default):
  //      • roughly 50% weight on last 2–3 data points
  //      • smooths single bad days without hiding real trends
  //
  //    Use on daily productivity scores (0–100) over the last N days.
  //    The last EMA value is the "current trend score."
  // ─────────────────────────────────────────────────────────────────────────

  function ema(values, alpha = 0.3) {
    if (!values.length) return [];
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result.map(v => Math.round(v * 10) / 10);
  }

  // Build daily productivity scores from tasks, then compute EMA
  function emaProductivityTrend(tasks, days = 14, alpha = 0.3) {
    const scores = {};
    for (const t of tasks) {
      if (!t.duration || t.duration <= 0) continue;
      const d = t.start_time.slice(0, 10);
      if (!scores[d]) scores[d] = { productive: 0, total: 0 };
      scores[d].total += t.duration;
      if (DB.PRODUCTIVE.has(t.category)) scores[d].productive += t.duration;
    }

    // Build sorted array of last N days
    const today = new Date();
    const dayLabels = [];
    const rawScores = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = DB.toDateStr(d);
      dayLabels.push(key.slice(5)); // 'MM-DD'
      const s = scores[key];
      rawScores.push(s && s.total > 0 ? Math.round(s.productive / s.total * 100) : 0);
    }

    const smoothed = ema(rawScores, alpha);
    const lastEMA  = smoothed[smoothed.length - 1] || 0;
    const prevEMA  = smoothed[smoothed.length - 4] || 0;
    const trend = lastEMA > prevEMA + 5 ? 'improving'
                : lastEMA < prevEMA - 5 ? 'declining'
                : 'stable';
    return { dayLabels, rawScores, smoothed, trend, currentScore: lastEMA };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. FATIGUE DEGRADATION CURVE
  //
  //    Model: E(t) = 100 · e^(−λt)
  //
  //    λ is calibrated so that at t = 90 min, E = 75%
  //    (i.e., 25% performance drop — consistent with Ericsson deliberate-
  //    practice research and cognitive load literature).
  //
  //    λ = −ln(0.75) / 90 ≈ 0.003205
  //
  //    Output:
  //      currentEfficiency  — % of peak performance right now
  //      optimalBreakAt     — minutes until you should take a break (75% threshold)
  //      shouldBreak        — boolean: break NOW
  //      recoveryMinutes    — suggested break length (logarithmic recovery model)
  // ─────────────────────────────────────────────────────────────────────────

  const FATIGUE_LAMBDA  = -Math.log(0.75) / 90;   // ≈ 0.003205
  const BREAK_THRESHOLD = 75;                       // % efficiency

  function fatigueCurve(sessionMinutes) {
    const efficiency = 100 * Math.exp(-FATIGUE_LAMBDA * sessionMinutes);
    const optimalBreakAt = Math.ceil(-Math.log(BREAK_THRESHOLD / 100) / FATIGUE_LAMBDA); // 90 min
    const shouldBreak = efficiency < BREAK_THRESHOLD;
    // Recovery model: R(t_break) = 100·(1 − e^(−0.07·t))
    // To reach 90% recovery: t = −ln(0.1)/0.07 ≈ 33 min
    const recoveryMinutes = Math.ceil(-Math.log(0.1) / 0.07); // ~33 min

    return {
      currentEfficiency: Math.max(0, Math.round(efficiency * 10) / 10),
      optimalBreakAt,
      shouldBreak,
      dropPercent: Math.round((100 - Math.max(0, efficiency)) * 10) / 10,
      recoveryMinutes,
    };
  }

  // Compute curve data points for chart (0 to maxMin)
  function fatigueChartData(maxMin = 180, step = 10) {
    const points = [];
    for (let t = 0; t <= maxMin; t += step) {
      points.push({
        t,
        efficiency: Math.max(0, Math.round(100 * Math.exp(-FATIGUE_LAMBDA * t) * 10) / 10),
      });
    }
    return points;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. K-MEANS GOLDEN HOURS (k = 2, 1-D)
  //
  //    Groups the 24 hours of the day into two clusters:
  //      Cluster A: "Golden Hours"  — high productivity score
  //      Cluster B: "Shadow Hours"  — low productivity / waste
  //
  //    Algorithm (1-D k-means, simplified):
  //      1. Build hourlyScore[0..23] = productive_seconds / total_seconds
  //      2. Initialize centroids: max·0.8 and min+ε
  //      3. Iterate 30×:
  //         a. Assign each hour to nearest centroid (L1 distance)
  //         b. Recompute centroids as cluster mean
  //      4. Label cluster with higher centroid = "Golden"
  //
  //    Returns: { goldenHours, shadowHours, hourlyScores, centroids }
  // ─────────────────────────────────────────────────────────────────────────

  function kMeansGoldenHours(tasks, k = 2) {
    // Build hourly productivity scores
    const hourBuckets = Array.from({ length: 24 }, () => ({ prod: 0, total: 0 }));
    for (const t of tasks) {
      if (!t.duration || t.duration <= 0) continue;
      const h = new Date(t.start_time).getHours();
      hourBuckets[h].total += t.duration;
      if (DB.PRODUCTIVE.has(t.category)) hourBuckets[h].prod += t.duration;
    }
    const hourlyScores = hourBuckets.map(b =>
      b.total > 0 ? Math.round(b.prod / b.total * 100) / 100 : 0
    );

    const nonZeroScores = hourlyScores.filter(s => s > 0);
    if (nonZeroScores.length < k) {
      return { goldenHours: [], shadowHours: [], hourlyScores, centroids: [0, 0] };
    }

    // Init centroids: pick 80th-percentile and 20th-percentile values
    const sorted = [...nonZeroScores].sort((a, b) => a - b);
    let centroids = [
      sorted[Math.floor(sorted.length * 0.8)],
      sorted[Math.floor(sorted.length * 0.2)],
    ];

    // Iterate
    for (let iter = 0; iter < 30; iter++) {
      const clusters = Array.from({ length: k }, () => []);
      hourlyScores.forEach((score, hour) => {
        if (hourBuckets[hour].total === 0) return; // skip empty hours
        const dists = centroids.map(c => Math.abs(score - c));
        const nearest = dists.indexOf(Math.min(...dists));
        clusters[nearest].push(score);
      });
      const newCentroids = clusters.map(cl =>
        cl.length > 0 ? cl.reduce((s, v) => s + v, 0) / cl.length : 0
      );
      if (newCentroids.every((c, i) => Math.abs(c - centroids[i]) < 0.0001)) break;
      centroids = newCentroids;
    }

    // Label clusters: higher centroid = "Golden"
    const goldenClusterIdx = centroids[0] >= centroids[1] ? 0 : 1;
    const assignments = hourlyScores.map((score, h) => {
      if (hourBuckets[h].total === 0) return -1; // no data
      const dists = centroids.map(c => Math.abs(score - c));
      return dists.indexOf(Math.min(...dists));
    });

    const goldenHours = assignments.map((c, h) => c === goldenClusterIdx ? h : -1).filter(h => h >= 0);
    const shadowHours = assignments.map((c, h) => c !== goldenClusterIdx && c !== -1 ? h : -1).filter(h => h >= 0);

    return { goldenHours, shadowHours, hourlyScores, centroids, assignments };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOSITE ANALYSIS — master function called by app.js
  // ─────────────────────────────────────────────────────────────────────────

  function analyzeAll(tasks, healthLogs = []) {
    const completed = tasks.filter(t => t.duration > 0 && !t.is_active);

    // ── Efficiency ─────────────────────────────────────────────────────────
    let prodSec = 0, unprodSec = 0, neutralSec = 0, totalSec = 0;
    for (const t of completed) {
      const d = t.duration;
      totalSec += d;
      if (DB.PRODUCTIVE.has(t.category))   prodSec   += d;
      else if (DB.UNPRODUCTIVE.has(t.category)) unprodSec += d;
      else neutralSec += d;
    }
    const efficiency = {
      productive_pct:   totalSec > 0 ? Math.round(prodSec / totalSec * 100) : 0,
      unproductive_pct: totalSec > 0 ? Math.round(unprodSec / totalSec * 100) : 0,
      neutral_pct:      totalSec > 0 ? Math.round(neutralSec / totalSec * 100) : 0,
      productive_sec:   prodSec,
      unproductive_sec: unprodSec,
      total_sec:        totalSec,
    };

    // ── Time per category ──────────────────────────────────────────────────
    const timeByCat = {};
    for (const t of completed) {
      timeByCat[t.category] = (timeByCat[t.category] || 0) + t.duration;
    }

    // ── Time per day ───────────────────────────────────────────────────────
    const timeByDay = {};
    for (const t of completed) {
      const d = t.start_time.slice(0, 10);
      timeByDay[d] = (timeByDay[d] || 0) + t.duration;
    }

    // ── Top activities ─────────────────────────────────────────────────────
    const nameMap = {};
    for (const t of completed) {
      if (!nameMap[t.name]) nameMap[t.name] = { total: 0, count: 0, category: t.category };
      nameMap[t.name].total += t.duration;
      nameMap[t.name].count++;
    }
    const topActivities = Object.entries(nameMap)
      .map(([name, v]) => ({ name, total: v.total, count: v.count, avg: Math.round(v.total / v.count), category: v.category }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    // ── Peak hours ─────────────────────────────────────────────────────────
    const hourBuckets = Array.from({ length: 24 }, () => ({ prod: 0, total: 0 }));
    for (const t of completed) {
      const h = new Date(t.start_time).getHours();
      hourBuckets[h].total += t.duration;
      if (DB.PRODUCTIVE.has(t.category)) hourBuckets[h].prod += t.duration;
    }
    const hourlyData = hourBuckets.map((b, h) => ({
      hour: h,
      total: b.total,
      productive: b.prod,
      pct: b.total > 0 ? Math.round(b.prod / b.total * 100) : 0,
    }));
    const bestHour = hourlyData.reduce((best, cur) =>
      (cur.productive > best.productive ? cur : best), { productive: 0, hour: -1 }
    );

    // ── Algorithms ─────────────────────────────────────────────────────────
    const bayesian = bayesianCategoryStats(completed);
    const markov   = buildMarkovChain(completed);
    const kmeans   = kMeansGoldenHours(completed);
    const emaData  = emaProductivityTrend(tasks);

    // ── Time waste ─────────────────────────────────────────────────────────
    const wasteBycat = Object.entries(timeByCat)
      .filter(([cat]) => DB.UNPRODUCTIVE.has(cat))
      .map(([cat, secs]) => ({ category: cat, seconds: secs }))
      .sort((a, b) => b.seconds - a.seconds);

    // ── Insights generator ─────────────────────────────────────────────────
    const insights = generateInsights({
      efficiency, bestHour, wasteBycat, bayesian, markov, kmeans, emaData,
    });

    return {
      efficiency, timeByCat, timeByDay, topActivities,
      hourlyData, bestHour, bayesian, markov, kmeans, emaData,
      wasteBycat, insights, totalTasks: completed.length,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INSIGHTS GENERATOR — human-readable text from algorithm outputs
  // ─────────────────────────────────────────────────────────────────────────

  function generateInsights({ efficiency, bestHour, wasteBycat, bayesian, markov, kmeans, emaData }) {
    const insights = [];

    // EMA trend
    if (emaData.trend === 'improving')
      insights.push({ icon: '📈', text: `Trend tygodniowy (EMA): wzrostowy — Twoja produktywność realnie rośnie (${emaData.currentScore}%).` });
    else if (emaData.trend === 'declining')
      insights.push({ icon: '📉', text: `Trend EMA jest spadkowy (${emaData.currentScore}%). Sprawdź czy nie kumulujesz zmęczenia.` });
    else if (emaData.currentScore > 0)
      insights.push({ icon: '➡️', text: `Trend EMA stabilny na poziomie ${emaData.currentScore}% — bez wielkich wahań w ostatnim tygodniu.` });

    // Peak hour
    if (bestHour.hour >= 0)
      insights.push({ icon: '🕐', text: `Twoja najbardziej produktywna godzina to ${bestHour.hour}:00. Zaplanuj tu najważniejsze zadania.` });

    // Golden hours (k-means)
    if (kmeans.goldenHours.length) {
      const ghStr = kmeans.goldenHours.map(h => `${h}:00`).slice(0, 5).join(', ');
      insights.push({ icon: '✨', text: `K-Means identyfikuje Twoje "Złote Godziny": ${ghStr}.` });
    }

    // Efficiency
    const p = efficiency.productive_pct;
    if (p >= 70)      insights.push({ icon: '⭐', text: `Efektywność: ${p}% — znakomity wynik! Jesteś w strefie wysokiej produktywności.` });
    else if (p >= 45) insights.push({ icon: '💪', text: `Efektywność: ${p}% — dobra robota. Zmniejszenie "Rozproszenia" o 30 min dziennie da ~5pp wzrostu.` });
    else if (p > 0)   insights.push({ icon: '⚠️', text: `Efektywność: ${p}% — poniżej celu. Zidentyfikuj godzinę, w której najczęściej tracisz skupienie.` });

    // Top waste
    if (wasteBycat.length) {
      const w = wasteBycat[0];
      const min = Math.round(w.seconds / 60);
      insights.push({ icon: '⏳', text: `Największy pochłaniacz czasu: "${DB.CAT_LABELS[w.category] || w.category}" — ${min} minut łącznie.` });
    }

    // Bayesian uncertainty
    const uncertain = Object.entries(bayesian)
      .map(([cat, s]) => ({ cat, ...s }))
      .filter(s => s.sampleCount > 2 && s.bayesStd > 300)
      .sort((a, b) => b.bayesStd - a.bayesStd)[0];
    if (uncertain) {
      const avg = Math.round(uncertain.bayesMean / 60);
      insights.push({ icon: '🔮', text: `Bayesian: zadania "${DB.CAT_LABELS[uncertain.cat] || uncertain.cat}" mają dużą zmienność (śr. ${avg} min ±${Math.round(uncertain.bayesStd/60)} min). Podziel je na mniejsze.` });
    }

    // Markov recommendation
    const top = topTransitions(markov, 1)[0];
    if (top && DB.PRODUCTIVE.has(top.from)) {
      insights.push({ icon: '🔗', text: `Markov: po "${DB.CAT_LABELS[top.from] || top.from}" przechodzisz do "${DB.CAT_LABELS[top.to] || top.to}" (${Math.round(top.prob * 100)}%). Zaplanuj to świadomie.` });
    }

    if (insights.length === 0)
      insights.push({ icon: '📊', text: 'Zaloguj więcej aktywności — system potrzebuje danych do generowania wniosków.' });

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DAILY ANALYSIS — subset of analyzeAll for a single day's tasks
  // ─────────────────────────────────────────────────────────────────────────

  function analyzeDay(tasks) {
    const completed = tasks.filter(t => t.duration > 0);
    let prodSec = 0, totalSec = 0;
    for (const t of completed) {
      totalSec += t.duration;
      if (DB.PRODUCTIVE.has(t.category)) prodSec += t.duration;
    }

    const timeByCat = {};
    const hourBuckets = Array.from({ length: 24 }, () => ({ prod: 0, total: 0 }));
    for (const t of completed) {
      timeByCat[t.category] = (timeByCat[t.category] || 0) + t.duration;
      const h = new Date(t.start_time).getHours();
      hourBuckets[h].total += t.duration;
      if (DB.PRODUCTIVE.has(t.category)) hourBuckets[h].prod += t.duration;
    }

    return {
      totalSec,
      prodSec,
      efficiencyPct: totalSec > 0 ? Math.round(prodSec / totalSec * 100) : 0,
      taskCount:     completed.length,
      timeByCat,
      hourlyData:    hourBuckets.map((b, h) => ({ hour: h, total: b.total, productive: b.prod })),
      bayesian:      bayesianCategoryStats(completed),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Core algorithms
    bayesianMean, bayesianStd, bayesianCategoryStats,
    buildMarkovChain, mostLikelyNext, topTransitions,
    ema, emaProductivityTrend,
    fatigueCurve, fatigueChartData, FATIGUE_LAMBDA, BREAK_THRESHOLD,
    kMeansGoldenHours,
    // Composite
    analyzeAll, analyzeDay, generateInsights,
  };

})();

// Ensure both uppercase/lowercase global aliases are available for legacy callers.
if (typeof globalThis !== 'undefined') {
  globalThis.MATH = MATH;
  globalThis.math = MATH;
}
