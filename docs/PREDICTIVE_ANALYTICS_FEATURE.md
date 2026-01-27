# Team Velocity & Burnout Predictive Analytics

## 🎯 Overview

Advanced forecasting engine that predicts project milestones, tracks team velocity, and identifies developer burnout risk through sentiment analysis and activity patterns.

## ✨ Features

### 1. **Milestone Forecasting** 📅
- **ETA Prediction**: Uses historical velocity data and linear regression to forecast project completion dates
- **Confidence Intervals**: Provides optimistic, expected, and pessimistic estimates
- **Gantt Visualization**: Interactive timeline charts showing projected milestones
- **Scenario Analysis**: Accounts for team size, scope changes, and task complexity

### 2. **Velocity Tracking** 📈
- **Real-time Metrics**: Tracks issues closed per week with 4-week rolling window
- **Trend Analysis**: Identifies improving, declining, or stable velocity patterns
- **Historical Comparison**: Compares current performance against past sprints
- **AI Insights**: Provides actionable recommendations based on velocity data
- **Confidence Scoring**: Reliability metric based on data volume and consistency

### 3. **Burnout Heatmap** 🔥
- **Sentiment Analysis**: Analyzes emotional tone in PR comments and commit messages
- **Activity Patterns**: Detects irregular working hours and sustained high activity
- **Risk Scoring**: Identifies high, medium, and low burnout risk for each developer
- **Early Warning Signals**: Flags drastic sentiment drops and engagement changes
- **Actionable Recommendations**: Suggests interventions based on risk factors

### 4. **What-If Simulator** 🔮
- **Interactive Sliders**: Adjust team size, scope, and complexity in real-time
- **Scenario Comparison**: Compare current state vs. optimistic/pessimistic scenarios
- **Brooks's Law**: Accounts for diminishing returns with team scaling
- **Visual Comparison**: Side-by-side charts showing impact of changes

### 5. **Bottleneck Detection** 🚧
- **Workflow Analysis**: Identifies slow code reviews, contributor concentration, activity gaps
- **Severity Classification**: High, medium, and low severity bottlenecks
- **Metrics Dashboard**: Quantifies impact with specific measurements
- **Trend Monitoring**: Tracks bottleneck resolution over time

### 6. **Sprint Burndown** 📉
- **Daily Tracking**: Monitors story points completed vs. ideal burndown
- **Status Indicators**: On track, ahead, or behind schedule
- **Completion Forecasting**: Predicts sprint finish date based on current velocity
- **Visual Charts**: Line graphs comparing actual vs. ideal progress

## 🏗️ Architecture

### Backend Services

#### **forecasting.service.js**
Core forecasting engine using statistical models:
- `calculateVelocity(owner, repo, timeWindow)` - Computes team velocity with trend analysis
- `forecastMilestone(owner, repo, milestone, remainingIssues)` - Predicts ETA using regression
- `simulateScenarios(owner, repo, scenario)` - What-if analysis with Brooks's Law
- `analyzeBottlenecks(owner, repo, timeWindow)` - Detects workflow impediments
- `calculateBurndown(owner, repo, startDate, endDate)` - Sprint burndown calculations
- `compareHistoricalPerformance(owner, repo, periods)` - Historical analysis

**Technologies**: Linear regression, confidence intervals, trend detection

#### **sentiment-trend.engine.js**
Burnout detection through sentiment analysis:
- `analyzePRComments(pullRequests)` - Sentiment scoring of PR comments
- `analyzeCommits(commits)` - Commit message sentiment analysis
- `detectBurnoutRisk(developer, activities, sentiments)` - Multi-signal risk assessment
- `generateBurnoutHeatmap(developers, activities, sentiments)` - Team-wide analysis
- `calculateSentimentTrend(sentiments)` - Time-series sentiment tracking

**Technologies**: Sentiment.js library, multi-factor risk scoring, working hours analysis

### API Endpoints

**Base URL**: `/api/predictive`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/velocity` | GET | Get team velocity metrics |
| `/forecast/milestone` | POST | Forecast milestone completion |
| `/simulate` | POST | Run what-if scenarios |
| `/bottlenecks` | GET | Analyze workflow bottlenecks |
| `/burndown` | GET | Get sprint burndown data |
| `/burnout` | POST | Detect burnout risk |
| `/sentiment` | POST | Analyze sentiment trends |
| `/health` | GET | Get comprehensive project health |
| `/compare` | POST | Compare historical performance |

### Frontend Components

#### **predictive-dashboard.html**
Main dashboard with:
- Repository selector
- Project health overview (4 key metrics)
- Velocity tracking chart
- Milestone forecasting form
- What-if simulator panel
- Burnout heatmap
- Sprint burndown chart
- Bottleneck analysis grid

#### **SimulationPanel.js**
Interactive what-if simulator:
- Team size slider (1-20 developers)
- Scope multiplier slider (50%-200%)
- Task complexity slider (Low/Medium/High)
- Real-time scenario calculation
- Comparison charts (Current vs. Optimistic vs. Pessimistic)
- Confidence scoring with diminishing returns model

#### **predictive.js**
Core dashboard logic:
- API integration
- Chart.js visualizations
- Real-time data updates
- Error handling
- Loading states

## 📊 Data Models

### Velocity Metrics
```javascript
{
  current: 12.5,              // Issues per week
  trend: "improving",         // "improving" | "declining" | "stable"
  trendSlope: 0.3,           // Linear regression slope
  confidence: 0.85,          // 0-1 score based on data quality
  issuesPerWeek: 12.5,
  pointsPerWeek: 45.2,
  historical: [...]          // Weekly velocity data
}
```

### Milestone Forecast
```javascript
{
  milestone: "v2.0 Release",
  estimatedCompletion: "2024-06-15",
  optimisticDate: "2024-06-01",
  pessimisticDate: "2024-06-30",
  weeksToComplete: 8,
  confidence: 0.78,
  baseVelocity: 12.5,
  remainingWork: {
    issues: 100,
    points: 350
  }
}
```

### Burnout Risk Assessment
```javascript
{
  developer: "john-doe",
  risk: "medium",           // "high" | "medium" | "low"
  riskScore: 45,            // 0-100
  confidence: 0.72,
  signals: [
    {
      type: "high_activity_low_sentiment",
      severity: "high",
      message: "High activity (50) with negative sentiment (-0.4)"
    }
  ],
  metrics: {
    activityCount: 50,
    avgSentiment: -0.35,
    sentimentTrend: "declining",
    activityTrend: "increasing",
    irregularHours: 32
  },
  recommendations: [...]
}
```

### Bottleneck Analysis
```javascript
{
  slowReviews: {
    type: "slow_reviews",
    severity: "high",
    description: "Code reviews taking longer than 3 days",
    metrics: {
      avgReviewTime: "5.2 days",
      pendingPRs: 12
    }
  },
  concentrationRisk: {
    type: "contributor_concentration",
    severity: "medium",
    description: "80% of commits from 2 developers",
    metrics: {
      topContributorPercentage: 65,
      criticalDevelopers: 2
    }
  }
}
```

## 🚀 Installation

### 1. Install Dependencies
```bash
cd backend
npm install sentiment
```

The `sentiment` package is already in `package.json` (v5.0.2).

### 2. Register Routes
Routes are automatically registered in `backend/src/app.js`:
```javascript
const predictiveRoutes = require("./routes/predictive.routes");
app.use("/api/predictive", predictiveRoutes);
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
```

### 4. Access Dashboard
Open `predictive-dashboard.html` in your browser or navigate to:
```
http://localhost:5000/predictive-dashboard.html
```

## 📖 Usage Guide

### Forecasting a Milestone

1. **Enter Repository**:
   - Owner: `facebook`
   - Name: `react`
   - Click "Load Analytics"

2. **Configure Milestone**:
   - Milestone Name: `v19.0 Release`
   - Remaining Issues: `45`
   - Remaining Story Points: `180` (optional)
   - Click "Forecast Completion"

3. **Review Results**:
   - Expected completion date
   - Optimistic/pessimistic range
   - Confidence score
   - Gantt chart visualization

### Running What-If Scenarios

1. **Adjust Variables**:
   - Team Size: Slide to desired number (1-20)
   - Scope: Adjust percentage (50%-200%)
   - Complexity: Select Low/Medium/High

2. **Run Simulation**:
   - Click "🔮 Run Simulation"
   - View 4 scenarios: Current, Your Scenario, Optimistic, Pessimistic

3. **Analyze Impact**:
   - Compare completion times
   - Review velocity changes
   - Evaluate confidence levels

### Detecting Burnout

1. **Load Analytics**: System automatically analyzes activity and sentiment

2. **Review Heatmap**:
   - High Risk (Red): Immediate intervention needed
   - Medium Risk (Yellow): Monitor closely
   - Low Risk (Green): Healthy state

3. **Read Signals**:
   - High activity + low sentiment
   - Sustained negative sentiment
   - Drastic sentiment drops
   - Declining activity
   - Irregular working hours

4. **Follow Recommendations**:
   - Schedule 1-on-1 meetings
   - Redistribute workload
   - Address technical debt
   - Improve team dynamics

## 🎨 UI Components

### Health Metrics Cards
4 key metrics displayed prominently:
- ⚡ Current Velocity
- 🎯 Confidence Score
- 🚧 Active Bottlenecks
- 🔥 Burnout Risk

### Interactive Charts
- **Velocity Chart**: Line chart with trend line (Chart.js)
- **Gantt Chart**: Horizontal bar chart for milestone timeline
- **Burndown Chart**: Line chart comparing actual vs. ideal
- **Simulation Chart**: Bar chart comparing scenarios

### Color Coding
- **Green**: Positive indicators (improving, low risk, on track)
- **Yellow/Orange**: Warning indicators (medium risk, stable, slight delays)
- **Red**: Critical indicators (high risk, declining, behind schedule)

## 🔬 Algorithms

### Velocity Calculation
```javascript
// 4-week rolling window
velocity = totalIssuesClosed / numberOfWeeks

// Linear regression for trend
slope = (n∑xy - ∑x∑y) / (n∑x² - (∑x)²)
trend = slope > 0.05 ? "improving" : slope < -0.05 ? "declining" : "stable"

// Confidence based on data volume and variance
confidence = min(1, dataPoints / 50) * (1 - coefficientOfVariation)
```

### Milestone Forecasting
```javascript
// Basic ETA
weeksToComplete = remainingIssues / velocityPerWeek

// Confidence intervals
optimistic = ETA * (1 - (1 - confidence) / 2)
pessimistic = ETA * (1 + (1 - confidence) / 2)
```

### Burnout Risk Scoring
```javascript
riskScore = 0

// Signal 1: High activity + low sentiment (40 points)
if (activity > 50 && sentiment < -0.3) riskScore += 40

// Signal 2: Sustained negative sentiment (35 points)
if (sentiment < -0.2 for 14+ days) riskScore += 35

// Signal 3: Drastic sentiment drop (25 points)
if (sentimentChange < -0.5 in 7 days) riskScore += 25

// Signal 4: Declining activity (20 points)
if (activityTrend === "declining") riskScore += 20

// Signal 5: Irregular hours (10 points)
if (irregularHours > 30%) riskScore += 10

// Classification
risk = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low"
```

### Brooks's Law (Team Scaling)
```javascript
// Diminishing returns when adding developers
teamEfficiency = teamSize > baseline 
  ? log(1 + teamSizeMultiplier) / log(2)
  : teamSizeMultiplier

adjustedVelocity = baseVelocity * teamEfficiency / (scope * complexity)
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Load analytics for public repository (e.g., facebook/react)
- [ ] Verify velocity chart displays historical data
- [ ] Forecast milestone with various input values
- [ ] Run what-if simulation with different scenarios
- [ ] Check burnout heatmap displays correctly
- [ ] Generate sprint burndown chart
- [ ] Review bottleneck analysis grid
- [ ] Test responsive design on mobile

### API Testing
```bash
# Get velocity
curl http://localhost:5001/api/predictive/velocity?owner=facebook&repo=react

# Forecast milestone
curl -X POST http://localhost:5001/api/predictive/forecast/milestone \
  -H "Content-Type: application/json" \
  -d '{"owner":"facebook","repo":"react","milestone":"v19.0","remainingIssues":45}'

# Get project health
curl http://localhost:5001/api/predictive/health?owner=facebook&repo=react
```

## 🔒 Security Considerations

- Input validation on all API endpoints
- Rate limiting to prevent abuse
- Sanitize user inputs (repo names, milestone names)
- No sensitive data in burnout analysis
- CORS configured for frontend domain

## 📈 Performance

- **Velocity Calculation**: O(n) where n = number of weeks
- **Sentiment Analysis**: O(m) where m = number of comments
- **Burnout Detection**: O(k * (n + m)) where k = number of developers
- **API Response Time**: < 500ms for most endpoints
- **Chart Rendering**: < 100ms with Chart.js

## 🎯 Future Enhancements

1. **Machine Learning Models**:
   - Replace linear regression with polynomial or ARIMA models
   - Neural network for burnout prediction
   - Anomaly detection for unusual patterns

2. **Integration with GitHub API**:
   - Real-time data fetching
   - Webhook support for live updates
   - Issue and PR data synchronization

3. **Advanced Analytics**:
   - Code quality correlation with burnout
   - Team dynamics analysis
   - Skill gap identification

4. **Notifications**:
   - Email alerts for high burnout risk
   - Slack integration for milestone updates
   - Weekly velocity reports

5. **Customization**:
   - Configurable thresholds for risk detection
   - Custom burnout signals
   - Team-specific velocity baselines

## 📞 Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: See `docs/ANALYTICS_FEATURE.md`
- API Docs: See inline JSDoc comments in service files

## 📄 License

MIT License - See LICENSE.md

---

**Built with** ❤️ **by the Xaytheon team**
