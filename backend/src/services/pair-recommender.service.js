/**
 * Pair Programming Recommender Service
 * Suggests optimal pairing based on knowledge overlap
 */

class PairRecommenderService {
    constructor() {
        this.MIN_OVERLAP_SCORE = 20; // Minimum overlap for productive pairing
        this.MAX_OVERLAP_SCORE = 80; // Maximum overlap to avoid redundancy
    }

    /**
     * Recommend pair programming partners for PR
     */
    recommendForPR(prAuthor, changedFiles, knowledgeGraph, teamExpertise) {
        try {
            const recommendations = [];

            // Find developers who have worked on changed files
            const relevantDevelopers = this.findRelevantDevelopers(
                prAuthor,
                changedFiles,
                knowledgeGraph
            );

            // Score each potential pair
            relevantDevelopers.forEach(developer => {
                const score = this.calculatePairingScore(
                    prAuthor,
                    developer,
                    changedFiles,
                    knowledgeGraph,
                    teamExpertise
                );

                if (score.totalScore >= 50) {
                    recommendations.push({
                        developer: developer.username,
                        score: score.totalScore,
                        breakdown: score.breakdown,
                        reason: this.generateReason(score),
                        benefits: this.listBenefits(prAuthor, developer, score)
                    });
                }
            });

            // Sort by score
            recommendations.sort((a, b) => b.score - a.score);

            return {
                prAuthor,
                changedFiles: changedFiles.length,
                recommendations: recommendations.slice(0, 5),
                suggestedAt: Date.now()
            };

        } catch (error) {
            console.error('PR recommendation error:', error.message);
            return {
                prAuthor,
                recommendations: [],
                error: error.message
            };
        }
    }

    /**
     * Find developers relevant to changed files
     */
    findRelevantDevelopers(prAuthor, changedFiles, knowledgeGraph) {
        const developerSet = new Set();

        changedFiles.forEach(filePath => {
            const file = knowledgeGraph.files.find(f => f.path === filePath);
            if (file) {
                file.contributors.forEach(contributor => {
                    if (contributor.author !== prAuthor) {
                        developerSet.add(contributor);
                    }
                });
            }
        });

        return Array.from(developerSet).map(c => ({
            username: c.author,
            commits: c.commits,
            ownership: c.ownership
        }));
    }

    /**
     * Calculate pairing score
     */
    calculatePairingScore(author, partner, changedFiles, knowledgeGraph, teamExpertise) {
        const breakdown = {
            fileExpertise: 0,
            knowledgeGap: 0,
            complementarySkills: 0,
            collaborationHistory: 0,
            availability: 0
        };

        // 1. File expertise (40 points)
        let fileExpertiseSum = 0;
        changedFiles.forEach(filePath => {
            const file = knowledgeGraph.files.find(f => f.path === filePath);
            if (file) {
                const partnerContrib = file.contributors.find(c => c.author === partner.username);
                if (partnerContrib) {
                    fileExpertiseSum += parseFloat(partnerContrib.ownership);
                }
            }
        });
        breakdown.fileExpertise = Math.min(40, (fileExpertiseSum / changedFiles.length) * 0.4);

        // 2. Knowledge gap (30 points) - sweet spot between overlap and gap
        const overlap = this.calculateKnowledgeOverlap(author, partner.username, knowledgeGraph);
        const gapScore = this.scoreKnowledgeGap(overlap);
        breakdown.knowledgeGap = gapScore * 0.3;

        // 3. Complementary skills (20 points)
        const skillComplement = this.assessSkillComplementarity(
            author,
            partner.username,
            teamExpertise
        );
        breakdown.complementarySkills = skillComplement * 0.2;

        // 4. Collaboration history (5 points)
        // In real implementation, would check past PR reviews
        breakdown.collaborationHistory = 5;

        // 5. Availability (5 points)
        // Placeholder - would integrate with calendar/workload
        breakdown.availability = 5;

        const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

        return {
            totalScore: Math.round(totalScore),
            breakdown
        };
    }

    /**
     * Calculate knowledge overlap between two developers
     */
    calculateKnowledgeOverlap(dev1, dev2, knowledgeGraph) {
        const dev1Files = new Set(
            knowledgeGraph.files
                .filter(f => f.contributors.some(c => c.author === dev1))
                .map(f => f.path)
        );

        const dev2Files = new Set(
            knowledgeGraph.files
                .filter(f => f.contributors.some(c => c.author === dev2))
                .map(f => f.path)
        );

        const intersection = new Set([...dev1Files].filter(f => dev2Files.has(f)));
        const union = new Set([...dev1Files, ...dev2Files]);

        return {
            shared: intersection.size,
            unique1: dev1Files.size - intersection.size,
            unique2: dev2Files.size - intersection.size,
            overlapPercentage: union.size > 0 ? (intersection.size / union.size * 100).toFixed(2) : 0
        };
    }

    /**
     * Score knowledge gap (sweet spot between 30-70% overlap)
     */
    scoreKnowledgeGap(overlap) {
        const percent = parseFloat(overlap.overlapPercentage);

        // Ideal range: 30-70% overlap
        if (percent >= 30 && percent <= 70) {
            // Perfect range
            return 100;
        } else if (percent < 30) {
            // Too little overlap - might be unproductive
            return percent * 2; // Scale: 0-60 points
        } else {
            // Too much overlap - redundant
            return Math.max(0, 100 - (percent - 70) * 2); // Decrease after 70%
        }
    }

    /**
     * Assess skill complementarity
     */
    assessSkillComplementarity(dev1, dev2, teamExpertise) {
        if (!teamExpertise || !teamExpertise.contributors) return 50;

        const dev1Skills = teamExpertise.contributors.find(c => c.username === dev1);
        const dev2Skills = teamExpertise.contributors.find(c => c.username === dev2);

        if (!dev1Skills || !dev2Skills) return 50;

        let complementScore = 0;
        const allTechs = new Set([
            ...Object.keys(dev1Skills.expertise || {}),
            ...Object.keys(dev2Skills.expertise || {})
        ]);

        // Check for complementary strengths
        allTechs.forEach(tech => {
            const score1 = dev1Skills.expertise[tech]?.score || 0;
            const score2 = dev2Skills.expertise[tech]?.score || 0;

            // Ideal: one is strong, other is learning
            if ((score1 > 70 && score2 < 50) || (score2 > 70 && score1 < 50)) {
                complementScore += 10;
            }
            // Both strong: some redundancy but good for complex tasks
            else if (score1 > 70 && score2 > 70) {
                complementScore += 5;
            }
        });

        return Math.min(100, complementScore);
    }

    /**
     * Generate reason for recommendation
     */
    generateReason(score) {
        const reasons = [];

        if (score.breakdown.fileExpertise > 25) {
            reasons.push('Has significant experience with these files');
        }

        if (score.breakdown.knowledgeGap > 20) {
            reasons.push('Good knowledge overlap for productive collaboration');
        }

        if (score.breakdown.complementarySkills > 15) {
            reasons.push('Brings complementary technical skills');
        }

        return reasons.join('. ') + '.';
    }

    /**
     * List benefits of pairing
     */
    listBenefits(author, partner, score) {
        const benefits = [];

        if (score.breakdown.fileExpertise > 25) {
            benefits.push('Knowledge transfer from experienced contributor');
        }

        if (score.breakdown.knowledgeGap > 20) {
            benefits.push('Balanced expertise distribution');
        }

        if (score.breakdown.complementarySkills > 15) {
            benefits.push('Skill development opportunity');
        }

        benefits.push('Reduces knowledge silos');
        benefits.push('Improves code quality through diverse perspectives');

        return benefits;
    }

    /**
     * Recommend general pairing for knowledge distribution
     */
    recommendGeneralPairing(knowledgeGraph, silos, teamExpertise) {
        const pairings = [];

        // Focus on high-risk silos
        const criticalSilos = silos.silos
            .filter(s => s.risk === 'critical' || s.risk === 'high')
            .slice(0, 10);

        criticalSilos.forEach(silo => {
            // Find the primary owner
            const primaryOwner = silo.primaryOwner;

            // Find best candidates to learn from primary owner
            const allAuthors = knowledgeGraph.authors.filter(a => 
                a.username !== primaryOwner
            );

            const candidates = allAuthors.map(author => {
                // Score based on current knowledge gap
                const hasWorkedOnFile = knowledgeGraph.files
                    .find(f => f.path === silo.path)
                    ?.contributors.some(c => c.author === author.username);

                const overlapScore = this.calculateKnowledgeOverlap(
                    primaryOwner,
                    author.username,
                    knowledgeGraph
                );

                return {
                    learner: author.username,
                    expert: primaryOwner,
                    file: silo.name,
                    hasExperience: hasWorkedOnFile,
                    overlapScore: parseFloat(overlapScore.overlapPercentage),
                    priority: silo.risk === 'critical' ? 'high' : 'medium'
                };
            });

            // Sort by overlap (prefer moderate overlap)
            candidates.sort((a, b) => {
                const idealGap = 50;
                return Math.abs(a.overlapScore - idealGap) - Math.abs(b.overlapScore - idealGap);
            });

            if (candidates.length > 0) {
                pairings.push({
                    expert: primaryOwner,
                    learner: candidates[0].learner,
                    targetFile: silo.name,
                    targetPath: silo.path,
                    reason: `Reduce ${silo.risk} risk silo`,
                    priority: candidates[0].priority,
                    suggestedActivities: [
                        'Code walkthrough session',
                        'Pair programming on next feature',
                        'Joint code review',
                        'Documentation collaboration'
                    ]
                });
            }
        });

        return {
            pairings: pairings.slice(0, 10),
            totalRecommendations: pairings.length,
            generatedAt: Date.now()
        };
    }

    /**
     * Generate pairing schedule
     */
    generatePairingSchedule(pairings, duration = 4) {
        // duration in weeks
        const schedule = [];
        const weeksPerPairing = 2; // 2 weeks per pairing session

        pairings.forEach((pairing, index) => {
            const weekStart = (index * weeksPerPairing) % duration + 1;
            
            schedule.push({
                week: weekStart,
                expert: pairing.expert,
                learner: pairing.learner,
                focus: pairing.targetFile,
                goals: [
                    `Understand architecture of ${pairing.targetFile}`,
                    'Complete at least one paired commit',
                    'Document key insights'
                ],
                successMetrics: [
                    'Learner can explain code to others',
                    'Learner can make independent changes',
                    'Documentation updated'
                ]
            });
        });

        return {
            schedule,
            durationWeeks: duration,
            totalPairings: schedule.length,
            estimatedImpact: 'Reduce bus factor by 20-30%'
        };
    }

    /**
     * Track pairing effectiveness
     */
    trackPairingEffectiveness(beforeSilos, afterSilos, pairings) {
        const effectiveness = {
            silosReduced: beforeSilos.totalSilos - afterSilos.totalSilos,
            ownershipImprovement: {},
            successfulPairings: 0,
            insights: []
        };

        // Check each pairing target
        pairings.forEach(pairing => {
            const fileBefore = beforeSilos.silos.find(s => s.path === pairing.targetPath);
            const fileAfter = afterSilos.silos.find(s => s.path === pairing.targetPath);

            if (fileBefore && !fileAfter) {
                // Silo eliminated!
                effectiveness.successfulPairings++;
                effectiveness.insights.push(
                    `✅ Successfully eliminated silo in ${pairing.targetFile}`
                );
            } else if (fileBefore && fileAfter && 
                       fileAfter.ownership < fileBefore.ownership) {
                // Ownership reduced
                const improvement = fileBefore.ownership - fileAfter.ownership;
                effectiveness.ownershipImprovement[pairing.targetFile] = improvement;
                effectiveness.successfulPairings++;
                effectiveness.insights.push(
                    `📉 Reduced ownership concentration in ${pairing.targetFile} by ${improvement.toFixed(2)}%`
                );
            }
        });

        effectiveness.successRate = (effectiveness.successfulPairings / pairings.length * 100).toFixed(2);

        return effectiveness;
    }
}

module.exports = new PairRecommenderService();
