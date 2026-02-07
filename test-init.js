import Agent0 from './src/agent.js';

async function testInitialization() {
  console.log('🧪 Testing Agent0 initialization...');
  
  try {
    const agent = new Agent0();
    console.log('✅ Agent0 instance created successfully');
    
    // Check that removed properties don't exist
    if (agent.retryPolicy) {
      console.error('❌ retryPolicy should not exist');
      process.exit(1);
    }
    if (agent.monitor) {
      console.error('❌ monitor should not exist');
      process.exit(1);
    }
    if (agent.sessionManager) {
      console.error('❌ sessionManager should not exist');
      process.exit(1);
    }
    
    // Check that core properties do exist
    if (!agent.telegram) {
      console.error('❌ telegram should exist');
      process.exit(1);
    }
    if (!agent.memory) {
      console.error('❌ memory should exist');
      process.exit(1);
    }
    if (!agent.skills) {
      console.error('❌ skills should exist');
      process.exit(1);
    }
    if (!agent.scheduler) {
      console.error('❌ scheduler should exist');
      process.exit(1);
    }
    if (!agent.github) {
      console.error('❌ github should exist');
      process.exit(1);
    }
    
    console.log('✅ All core properties exist');
    console.log('✅ All removed properties are gone');
    console.log('✅ Agent0 initialization test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testInitialization();
