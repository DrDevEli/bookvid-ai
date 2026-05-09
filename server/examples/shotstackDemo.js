/**
 * Shotstack Service Demo
 * Example usage of the Shotstack wrapper service
 * 
 * To run this demo:
 * 1. Set SHOTSTACK_API_KEY in your .env file
 * 2. Run: node server/examples/shotstackDemo.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const shotstackService = require('../services/shotstackService');

async function runDemo() {
  console.log('🎬 Shotstack Service Demo\n');
  console.log('='.repeat(50));

  // Check service status
  console.log('\n📊 Step 1: Check Service Status');
  console.log('-'.repeat(50));
  const status = shotstackService.getStatus();
  console.log(JSON.stringify(status, null, 2));

  if (!status.available) {
    console.error('\n❌ Shotstack service is not available.');
    console.error('   Please set SHOTSTACK_API_KEY in your .env file.');
    console.error('   Get your free API key at: https://shotstack.io/');
    process.exit(1);
  }

  // Create a simple video edit
  console.log('\n🎨 Step 2: Create Simple Video Edit');
  console.log('-'.repeat(50));
  
  const edit = shotstackService.createSimpleEdit({
    audioPath: 'https://shotstack-assets.s3.amazonaws.com/music/unminus/palmtrees.mp3',
    images: [
      {
        src: 'https://shotstack-assets.s3.amazonaws.com/footage/car-nature.jpg',
        start: 0,
        length: 3,
        transition: { in: 'fade', out: 'fade' }
      },
      {
        src: 'https://shotstack-assets.s3.amazonaws.com/footage/beach.jpg',
        start: 3,
        length: 3,
        transition: { in: 'fade', out: 'fade' }
      }
    ],
    text: [
      {
        content: 'Welcome to Shotstack!',
        start: 0.5,
        length: 2.5,
        css: 'p { color: white; font-size: 48px; font-weight: bold; text-align: center; font-family: Arial; }'
      }
    ],
    duration: 6,
    resolution: '720',
    fps: 25,
    format: 'mp4'
  });

  console.log('✅ Edit configuration created');
  console.log('   Duration: 6 seconds');
  console.log('   Resolution: 720p');
  console.log('   Images: 2');
  console.log('   Text overlays: 1');

  // Render the video
  console.log('\n🚀 Step 3: Submit Render Job');
  console.log('-'.repeat(50));
  
  try {
    const renderResponse = await shotstackService.renderVideo(edit);
    console.log('✅ Render job submitted successfully!');
    console.log(`   Render ID: ${renderResponse.renderId}`);
    console.log(`   Status URL: ${renderResponse.statusUrl}`);

    // Poll for completion (optional - can be done in background)
    console.log('\n⏳ Step 4: Wait for Render Completion');
    console.log('-'.repeat(50));
    console.log('   This may take 30-60 seconds...');
    
    const result = await shotstackService.waitForRender(
      renderResponse.renderId,
      {
        maxWaitTime: 120000, // 2 minutes
        pollInterval: 5000    // Check every 5 seconds
      }
    );

    console.log('\n🎉 SUCCESS!');
    console.log('='.repeat(50));
    console.log(`✅ Video rendered successfully!`);
    console.log(`🎥 Video URL: ${result.url}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`⏱️  Duration: ${result.data?.duration} seconds`);
    console.log(`📏 Size: ${(result.data?.size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\nYou can download the video from the URL above.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('\n💡 Hint: Your API key may be invalid.');
      console.error('   Please check SHOTSTACK_API_KEY in your .env file.');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Hint: The render is taking longer than expected.');
      console.error('   You can check the status manually using the render ID.');
    }
  }
}

// Run the demo
if (require.main === module) {
  runDemo()
    .then(() => {
      console.log('\n✅ Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runDemo };



