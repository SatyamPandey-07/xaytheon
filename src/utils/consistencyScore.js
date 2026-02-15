/**
 * Calculates a consistency score from 0-100 based on contribution patterns.
 * Higher scores come from regular activity with fewer long gaps.
 */
function calculateConsistencyScore(contributions) {
    const dates = Object.keys(contributions).sort();
    if (dates.length < 2) return 0;

    let totalGaps = 0;
    let burstFactor = 0;
    const activityDays = dates.length;

    for (let i = 1; i < dates.length; i++) {
        const diffTime = Math.abs(new Date(dates[i]) - new Date(dates[i-1]));
        const gapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Penalize gaps longer than 7 days
        if (gapDays > 7) totalGaps += gapDays;
        
        // Track burst activity (standard deviation proxy)
        const diffCount = Math.abs(contributions[dates[i]] - contributions[dates[i-1]]);
        burstFactor += diffCount;
    }

    // Baseline: Ratio of active days to total span
    const span = Math.ceil(Math.abs(new Date(dates[dates.length-1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)) || 1;
    const frequencyScore = (activityDays / span) * 50;

    // Penalty: Subtract for long inactivity
    const gapPenalty = Math.min(25, (totalGaps / span) * 50);

    // Burst: High volatility in commit counts reduces consistency
    const stabilityScore = Math.max(0, 25 - (burstFactor / (activityDays * 10)));

    return Math.round(frequencyScore + (25 - gapPenalty) + stabilityScore);
}
