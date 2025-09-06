#!/usr/bin/env node

/**
 * Test script to understand Vexa transcript flow
 * 1. Fetch transcript via REST API
 * 2. Connect to WebSocket and receive messages
 * 3. Understand data structures for proper state management
 */

const WebSocket = require('ws');

// Configuration - replace with your actual values
const CONFIG = {
  API_BASE_URL: 'https://devapi.dev.vexa.ai',
  WEBSOCKET_URL: 'wss://devapi.dev.vexa.ai/ws',
  API_KEY: 'nZ9f0fte72fVR3okRReyB7RDeEl0kC2i7S9pelFE',
  MEETING_ID: 'google_meet/kzj-grsa-cqf' // Native meeting ID from Google Meet URL
};

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logSegment(segment, index) {
  const timestamp = new Date(segment.timestamp).toLocaleTimeString();
  const speaker = segment.speaker || 'Unknown';
  const text = (segment.text || '').trim();

  console.log(`  ${colors.cyan}${index}.${colors.reset} [${timestamp}] ${colors.yellow}${speaker}${colors.reset}`);
  if (text) {
    console.log(`    ${colors.green}"${text}"${colors.reset}`);
  }
  console.log();
}

// Step 1: Fetch transcript via REST API
async function fetchTranscript() {
  logHeader('📡 FETCHING TRANSCRIPT VIA REST API');

  try {
    const url = `${CONFIG.API_BASE_URL}/transcripts/${CONFIG.MEETING_ID}`;
    log(`GET ${url}`, 'blue');

    const response = await fetch(url, {
      headers: {
        'X-API-Key': CONFIG.API_KEY,
        'Content-Type': 'application/json'
      }
    });

    log(`📊 API Response Status: ${response.status}`, response.ok ? 'green' : 'red');

    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ Error Response: ${errorText}`, 'red');

      // Try to get list of available meetings
      log('\n📋 Trying to get list of available meetings...', 'yellow');
      const meetingsUrl = `${CONFIG.API_BASE_URL}/meetings`;
      const meetingsResponse = await fetch(meetingsUrl, {
        headers: {
          'X-API-Key': CONFIG.API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (meetingsResponse.ok) {
        const meetings = await meetingsResponse.json();
        log(`📋 Available meetings: ${meetings.length}`, 'cyan');
        if (meetings.length > 0) {
          meetings.slice(0, 3).forEach((meeting, i) => {
            log(`  ${i + 1}. ${meeting.platform}/${meeting.nativeMeetingId} (${meeting.status})`, 'white');
          });
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    log(`✅ REST API Response: ${data.segments?.length || 0} segments`, 'green');
    log(`📊 Status: ${data.status}`, 'yellow');
    log(`🕒 Last Updated: ${data.lastUpdated}`, 'yellow');

    if (data.segments && data.segments.length > 0) {
      log('\n📝 REST API Segments:', 'bright');
      data.segments.slice(0, 3).forEach((segment, i) => {
        logSegment(segment, i + 1);
      });

      if (data.segments.length > 3) {
        log(`... and ${data.segments.length - 3} more segments`, 'yellow');
      }
    }

    return data;

  } catch (error) {
    log(`❌ REST API Error: ${error.message}`, 'red');
    return null;
  }
}

// Step 2: Connect to WebSocket and monitor messages
async function monitorWebSocket() {
  logHeader('🔌 CONNECTING TO WEBSOCKET');

  return new Promise((resolve, reject) => {
    try {
      const wsUrl = `${CONFIG.WEBSOCKET_URL}?api_key=${CONFIG.API_KEY}`;
      log(`Connecting to: ${wsUrl}`, 'blue');

      const ws = new WebSocket(wsUrl);

      let messageCount = 0;
      const maxMessages = 10; // Limit messages for testing

      ws.on('open', () => {
        log('✅ WebSocket Connected', 'green');

        // Subscribe to meeting
        const subscribeMsg = {
          action: 'subscribe',
          meetings: [{ id: 'kzj-grsa-cqf' }] // Use native meeting ID directly
        };

        ws.send(JSON.stringify(subscribeMsg));
        log(`📤 Sent subscription: ${JSON.stringify(subscribeMsg)}`, 'blue');
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messageCount++;

          log(`\n📨 Message ${messageCount}:`, 'bright');

          if (message.type === 'transcript.mutable') {
            log('🎯 TRANSCRIPT.MUTABLE', 'cyan');
            const segments = message.payload?.segments || [];
            log(`📊 ${segments.length} mutable segments`, 'yellow');

            if (segments.length > 0) {
              segments.forEach((segment, i) => {
                logSegment(segment, i + 1);
              });
            }

          } else if (message.type === 'transcript.finalized') {
            log('✅ TRANSCRIPT.FINALIZED', 'green');
            const segments = message.payload?.segments || [];
            log(`📊 ${segments.length} finalized segments`, 'yellow');

            if (segments.length > 0) {
              segments.forEach((segment, i) => {
                logSegment(segment, i + 1);
              });
            }

          } else if (message.type === 'subscribed') {
            log('🔗 SUBSCRIBED', 'green');
            log(`Meeting IDs: ${message.meetings?.join(', ')}`, 'yellow');

          } else if (message.type === 'pong') {
            log('🏓 PONG', 'yellow');

          } else {
            log(`📋 ${message.type || 'UNKNOWN'}`, 'magenta');
            log(JSON.stringify(message, null, 2), 'yellow');
          }

          // Auto-close after receiving enough messages for testing
          if (messageCount >= maxMessages) {
            log(`\n🛑 Received ${maxMessages} messages, closing connection...`, 'yellow');
            ws.close();
          }

        } catch (error) {
          log(`❌ Error parsing message: ${error.message}`, 'red');
          log(`Raw data: ${data.toString()}`, 'red');
        }
      });

      ws.on('error', (error) => {
        log(`❌ WebSocket Error: ${error.message}`, 'red');
        reject(error);
      });

      ws.on('close', (code, reason) => {
        log(`🔌 WebSocket Closed (${code}): ${reason.toString()}`, 'yellow');
        resolve();
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        log('\n⏰ Timeout reached, closing connection...', 'yellow');
        ws.close();
      }, 30000);

    } catch (error) {
      log(`❌ WebSocket Setup Error: ${error.message}`, 'red');
      reject(error);
    }
  });
}

// Step 3: Analyze data structures for state management
function analyzeDataStructures(restData, wsMessages) {
  logHeader('🔍 DATA STRUCTURE ANALYSIS');

  if (restData) {
    log('📊 REST API Structure:', 'bright');
    log(`- Segments: ${restData.segments?.length || 0}`, 'cyan');
    log(`- Status: ${restData.status}`, 'cyan');
    log(`- Language: ${restData.language}`, 'cyan');

    if (restData.segments && restData.segments.length > 0) {
      const sampleSegment = restData.segments[0];
      log('\n📋 Sample REST Segment:', 'yellow');
      Object.keys(sampleSegment).forEach(key => {
        log(`  ${key}: ${JSON.stringify(sampleSegment[key])}`, 'cyan');
      });
    }
  }

  log('\n📈 RECOMMENDED STATE MANAGEMENT:', 'bright');
  log('Based on the data flow analysis:', 'yellow');

  log('\n1. 📦 UNIFIED SEGMENTS MAP', 'cyan');
  log('   - Use Map<segmentKey, segment> for deduplication', 'white');
  log('   - Key: id || timestamp|speaker|text_prefix', 'white');

  log('\n2. 🎯 MUTABLE TRACKING', 'cyan');
  log('   - Set<string> for mutable segment IDs', 'white');
  log('   - Clear when finalized', 'white');

  log('\n3. 🔄 UPDATE STRATEGY', 'cyan');
  log('   - REST: Load initial data', 'white');
  log('   - Mutable: Replace/add segments', 'white');
  log('   - Finalized: Update + remove from mutable', 'white');

  log('\n4. 🎨 VISUAL INDICATORS', 'cyan');
  log('   - Blue background: Mutable segments', 'white');
  log('   - Normal background: Finalized segments', 'white');
  log('   - Pulse animation: New mutable segments', 'white');
}

// Main execution
async function main() {
  try {
    logHeader('🚀 VEXA TRANSCRIPT FLOW TEST');

    // Step 1: Fetch via REST API
    const restData = await fetchTranscript();

    // Step 2: Monitor WebSocket
    await monitorWebSocket();

    // Step 3: Analyze data structures
    analyzeDataStructures(restData, []);

    logHeader('✅ TEST COMPLETED');
    log('Use this analysis to design your React state management!', 'green');

  } catch (error) {
    log(`💥 Test failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Vexa Transcript Flow Test

Usage: node test-transcript-flow.js [options]

Options:
  --meeting-id <id>    Meeting ID (default: ${CONFIG.MEETING_ID})
  --api-key <key>      API Key (default: ${CONFIG.API_KEY})
  --api-url <url>      API Base URL (default: ${CONFIG.API_BASE_URL})
  --help, -h           Show this help

Example:
  node test-transcript-flow.js --meeting-id "google_meet/test/123"
    `);
    process.exit(0);
  }

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--meeting-id':
        CONFIG.MEETING_ID = args[++i];
        break;
      case '--api-key':
        CONFIG.API_KEY = args[++i];
        break;
      case '--api-url':
        CONFIG.API_BASE_URL = args[i + 1];
        CONFIG.WEBSOCKET_URL = args[i + 1].replace(/^http/, 'ws') + '/ws';
        i++;
        break;
    }
  }

  main();
}

module.exports = { fetchTranscript, monitorWebSocket, analyzeDataStructures };
