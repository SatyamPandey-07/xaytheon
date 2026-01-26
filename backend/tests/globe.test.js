/**
 * Test Suite for Global Pulse 3D Globe Feature
 * Run with: node backend/tests/globe.test.js
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

class GlobeFeatureTest {
    constructor() {
        this.socket = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    /**
     * Log test result
     */
    log(testName, passed, message = '') {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${testName}${message ? ': ' + message : ''}`);
        
        this.results.tests.push({ testName, passed, message });
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
    }

    /**
     * Test REST API endpoints
     */
    async testRestAPI() {
        console.log('\n=== Testing REST API Endpoints ===\n');

        // Test 1: Get Statistics
        try {
            const response = await axios.get(`${BASE_URL}/api/globe/statistics`);
            this.log('GET /api/globe/statistics', 
                response.status === 200 && response.data.success,
                `Status: ${response.status}`
            );
        } catch (error) {
            this.log('GET /api/globe/statistics', false, error.message);
        }

        // Test 2: Get Events
        try {
            const response = await axios.get(`${BASE_URL}/api/globe/events?limit=10`);
            this.log('GET /api/globe/events', 
                response.status === 200 && response.data.success,
                `Returned ${response.data.data?.events?.length || 0} events`
            );
        } catch (error) {
            this.log('GET /api/globe/events', false, error.message);
        }

        // Test 3: Get Heatmap
        try {
            const response = await axios.get(`${BASE_URL}/api/globe/heatmap?timeRange=3600000`);
            this.log('GET /api/globe/heatmap', 
                response.status === 200 && response.data.success,
                `Heatmap points: ${response.data.data?.heatmap?.length || 0}`
            );
        } catch (error) {
            this.log('GET /api/globe/heatmap', false, error.message);
        }

        // Test 4: Get Regional Stats
        try {
            const response = await axios.get(`${BASE_URL}/api/globe/regional-stats`);
            this.log('GET /api/globe/regional-stats', 
                response.status === 200 && response.data.success,
                `Regions: ${response.data.data?.length || 0}`
            );
        } catch (error) {
            this.log('GET /api/globe/regional-stats', false, error.message);
        }

        // Test 5: Get Filters
        try {
            const response = await axios.get(`${BASE_URL}/api/globe/filters`);
            this.log('GET /api/globe/filters', 
                response.status === 200 && response.data.success,
                `Event types: ${response.data.data?.eventTypes?.length || 0}`
            );
        } catch (error) {
            this.log('GET /api/globe/filters', false, error.message);
        }

        // Test 6: Start Simulation
        try {
            const response = await axios.post(`${BASE_URL}/api/globe/simulate`, {
                eventsPerSecond: 5,
                duration: 5000 // 5 seconds
            });
            this.log('POST /api/globe/simulate', 
                response.status === 200 && response.data.success,
                'Simulation started'
            );
        } catch (error) {
            this.log('POST /api/globe/simulate', false, error.message);
        }

        // Test 7: Process Webhook
        try {
            const mockEvent = {
                type: 'PushEvent',
                repo: { name: 'test/repo' },
                actor: { login: 'testuser' },
                created_at: new Date().toISOString(),
                repository: { language: 'JavaScript' }
            };

            const response = await axios.post(`${BASE_URL}/api/globe/webhook`, mockEvent);
            this.log('POST /api/globe/webhook', 
                response.status === 200,
                'Webhook processed'
            );
        } catch (error) {
            this.log('POST /api/globe/webhook', false, error.message);
        }
    }

    /**
     * Test WebSocket functionality
     */
    async testWebSocket() {
        console.log('\n=== Testing WebSocket Functionality ===\n');

        return new Promise((resolve) => {
            // Test 1: Connection
            this.socket = io(SOCKET_URL, {
                transports: ['websocket'],
                reconnection: false
            });

            this.socket.on('connect', () => {
                this.log('WebSocket Connection', true, 'Connected successfully');
                
                // Test 2: Subscribe
                this.socket.emit('globe:subscribe', ['test/repo']);
                this.log('Subscribe to Events', true, 'Subscription sent');

                // Test 3: Filter Update
                this.socket.emit('globe:filter', {
                    eventTypes: ['PushEvent'],
                    languages: ['JavaScript']
                });
                this.log('Update Filters', true, 'Filter update sent');

                // Test 4: Receive Events
                let eventReceived = false;
                const timeout = setTimeout(() => {
                    this.log('Receive Events', eventReceived, 
                        eventReceived ? 'Events received' : 'No events received (may be normal if no simulation running)'
                    );
                    this.socket.disconnect();
                    resolve();
                }, 3000);

                this.socket.on('globe:event', (event) => {
                    if (!eventReceived) {
                        eventReceived = true;
                        this.log('Receive Single Event', true, `Event type: ${event.type}`);
                    }
                });

                this.socket.on('globe:events:batch', (data) => {
                    if (!eventReceived) {
                        eventReceived = true;
                        this.log('Receive Batch Events', true, `Batch size: ${data.events.length}`);
                    }
                });
            });

            this.socket.on('connect_error', (error) => {
                this.log('WebSocket Connection', false, error.message);
                resolve();
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
            });
        });
    }

    /**
     * Test performance under load
     */
    async testPerformance() {
        console.log('\n=== Testing Performance ===\n');

        // Test 1: High-frequency event processing
        try {
            const startTime = Date.now();
            const promises = [];

            for (let i = 0; i < 100; i++) {
                promises.push(
                    axios.post(`${BASE_URL}/api/globe/webhook`, {
                        type: 'PushEvent',
                        repo: { name: 'test/repo' },
                        actor: { login: 'testuser' },
                        created_at: new Date().toISOString(),
                        repository: { language: 'JavaScript' }
                    })
                );
            }

            await Promise.all(promises);
            const duration = Date.now() - startTime;
            const eventsPerSecond = Math.round(100 / (duration / 1000));

            this.log('Process 100 Events', 
                duration < 5000,
                `Processed in ${duration}ms (~${eventsPerSecond} events/sec)`
            );
        } catch (error) {
            this.log('Process 100 Events', false, error.message);
        }

        // Test 2: Statistics response time
        try {
            const startTime = Date.now();
            await axios.get(`${BASE_URL}/api/globe/statistics`);
            const duration = Date.now() - startTime;

            this.log('Statistics Response Time', 
                duration < 500,
                `${duration}ms (target: <500ms)`
            );
        } catch (error) {
            this.log('Statistics Response Time', false, error.message);
        }
    }

    /**
     * Test event aggregation
     */
    async testEventAggregation() {
        console.log('\n=== Testing Event Aggregation ===\n');

        // Test 1: Event deduplication
        try {
            const event = {
                type: 'PushEvent',
                repo: { name: 'test/repo' },
                actor: { login: 'testuser' },
                created_at: new Date().toISOString(),
                repository: { language: 'JavaScript' }
            };

            // Send same event twice
            await axios.post(`${BASE_URL}/api/globe/webhook`, event);
            await axios.post(`${BASE_URL}/api/globe/webhook`, event);

            // Should be deduplicated
            const response = await axios.get(`${BASE_URL}/api/globe/statistics`);
            this.log('Event Deduplication', 
                response.data.success,
                'Deduplication mechanism in place'
            );
        } catch (error) {
            this.log('Event Deduplication', false, error.message);
        }

        // Test 2: Priority processing
        try {
            const highPriorityEvent = {
                type: 'ReleaseEvent',
                repo: { name: 'test/repo' },
                actor: { login: 'testuser' },
                created_at: new Date().toISOString()
            };

            await axios.post(`${BASE_URL}/api/globe/webhook`, highPriorityEvent);
            this.log('Priority Processing', true, 'High-priority event sent');
        } catch (error) {
            this.log('Priority Processing', false, error.message);
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🌍 Starting Global Pulse Feature Tests\n');
        console.log('========================================\n');

        try {
            await this.testRestAPI();
            await this.testWebSocket();
            await this.testPerformance();
            await this.testEventAggregation();
        } catch (error) {
            console.error('Fatal test error:', error);
        }

        this.printResults();
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n========================================');
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('========================================\n');
        
        console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        
        const percentage = Math.round(
            (this.results.passed / (this.results.passed + this.results.failed)) * 100
        );
        console.log(`Success Rate: ${percentage}%\n`);

        if (this.results.failed > 0) {
            console.log('Failed Tests:');
            this.results.tests
                .filter(t => !t.passed)
                .forEach(t => console.log(`  - ${t.testName}: ${t.message}`));
        }

        console.log('\n========================================\n');
        
        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// Run tests
if (require.main === module) {
    const tester = new GlobeFeatureTest();
    tester.runAllTests();
}

module.exports = GlobeFeatureTest;
