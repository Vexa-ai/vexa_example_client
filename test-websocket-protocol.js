#!/usr/bin/env node

const API_KEY = 'nZ9f0fte72fVR3okRReyB7RDeEl0kC2i7S9pelFE';
const WS_URL = 'wss://devapi.dev.vexa.ai/ws';

console.log('🔌 Testing Updated WebSocket Protocol');
console.log('=====================================');
console.log('');

// Test WebSocket with correct protocol
async function testWebSocketProtocol() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?api_key=${encodeURIComponent(API_KEY)}`);
    let connected = false;
    let subscribed = false;
    let messageCount = 0;
    let transcriptMessages = 0;
    
    const timeout = setTimeout(() => {
      console.log(`\n📊 Summary:`);
      console.log(`   Total messages: ${messageCount}`);
      console.log(`   Transcript messages: ${transcriptMessages}`);
      console.log(`   Subscription status: ${subscribed ? 'SUCCESS' : 'FAILED'}`);
      ws.close();
      resolve({ subscribed, transcriptMessages });
    }, 20000); // 20 seconds
    
    ws.onopen = () => {
      console.log('   ✅ WebSocket connected');
      connected = true;
      
      // Send ping first
      ws.send(JSON.stringify({ action: 'ping' }));
      console.log('   📤 Sent ping');
      
      // Then subscribe to meeting 251
      setTimeout(() => {
        const subscribeMessage = {
          action: 'subscribe',
          meetings: [{ id: 251 }]
        };
        
        ws.send(JSON.stringify(subscribeMessage));
        console.log('   📤 Sent subscription for meeting 251');
      }, 1000);
    };
    
    ws.onmessage = (event) => {
      messageCount++;
      try {
        const data = JSON.parse(event.data);
        console.log(`   📥 Message ${messageCount}: ${data.type || 'unknown'}`);
        
        if (data.type === 'pong') {
          console.log('   ✅ Received pong');
        } else if (data.type === 'subscribed') {
          subscribed = true;
          console.log(`   ✅ Subscription confirmed for meetings: ${data.meetings}`);
        } else if (data.type === 'transcript_mutable') {
          transcriptMessages++;
          console.log(`   📝 Mutable transcript: "${data.segment.text}" (${data.segment.speaker || 'Unknown'})`);
        } else if (data.type === 'transcript_finalized') {
          transcriptMessages++;
          console.log(`   📄 Finalized transcript: "${data.segment.text}" (${data.segment.speaker || 'Unknown'})`);
        } else if (data.type === 'meeting_status') {
          console.log(`   📊 Meeting ${data.meeting_id} status: ${data.status}`);
        } else if (data.type === 'error') {
          console.log(`   ❌ Error: ${data.error}`);
        } else {
          console.log(`   📋 Other: ${JSON.stringify(data)}`);
        }
      } catch (e) {
        console.log(`   📄 Raw message: ${event.data}`);
      }
    };
    
    ws.onerror = (error) => {
      console.log(`   ❌ WebSocket error: ${error.message || 'Unknown error'}`);
      clearTimeout(timeout);
      resolve({ subscribed: false, transcriptMessages: 0 });
    };
    
    ws.onclose = (event) => {
      console.log(`   🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    };
  });
}

// Run test
testWebSocketProtocol().then(result => {
  console.log('\n🏁 WebSocket Protocol Test Results:');
  console.log(`   Subscription: ${result.subscribed ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Transcript messages: ${result.transcriptMessages}`);
  
  if (result.subscribed && result.transcriptMessages > 0) {
    console.log('   🎉 Real-time WebSocket transcription is working!');
  } else if (result.subscribed) {
    console.log('   ⚠️ WebSocket connected but no transcript messages yet');
  } else {
    console.log('   ❌ WebSocket subscription failed');
  }
}).catch(console.error);
