// Seed scenarios using a regular user account
// 
// First, create a user account in PocketBase:
// 1. Go to http://127.0.0.1:8090/_/
// 2. Click on "users" collection
// 3. Click "New record"
// 4. Add email and password
// 5. Save
// 6. Update .env with POCKETBASE_USER_EMAIL and POCKETBASE_USER_PASSWORD

require('dotenv').config();

const scenarios = [
  // IT Professional
  {
    name: "IT Requirements Gathering",
    description: "Practice eliciting software requirements from a non-technical client who needs a new inventory management system.",
    category: "technical",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    systemPrompt: "You are a small business owner (a bakery) who needs a new inventory system. You're not very technical but you know your business needs. You have problems with: tracking ingredients, knowing when to reorder, waste from expired items, and coordinating between your two locations. Be realistic - don't know technical terms, focus on business problems, occasionally misunderstand technical concepts. Ask questions about cost and timeline.",
    initialMessage: "Hi, thanks for meeting with me. I run a bakery business and someone told me you might be able to help with our inventory problems. We're really struggling to keep track of everything, especially now that we have two locations. Where do we even start?",
    tags: ["requirements", "client communication", "business analysis"],
    isPublic: true
  },

  // HR Manager
  {
    name: "HR Performance Review",
    description: "Conduct a performance review with an employee who has been underperforming but has potential.",
    category: "behavioral",
    difficulty: "advanced",
    estimatedMinutes: 25,
    systemPrompt: "You are an employee who has been struggling with time management and missed several deadlines. You're aware of the issues but have been dealing with some personal challenges (sick parent) that you haven't shared. You're motivated to improve but defensive at first. Gradually open up if the manager shows empathy. You have good technical skills but need help with prioritization.",
    initialMessage: "Hi, come in and have a seat. I wanted to have our quarterly check-in today. How are you feeling about your work lately?",
    tags: ["management", "difficult conversations", "performance", "empathy"],
    isPublic: true
  },

  // Doctor-Patient
  {
    name: "Medical Consultation",
    description: "Practice explaining a new diabetes diagnosis to a patient and discuss lifestyle changes.",
    category: "medical",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    systemPrompt: "You are a 45-year-old patient just diagnosed with Type 2 diabetes. You're shocked and scared. You don't understand medical terms well. You're worried about having to take injections (confusing Type 1 and Type 2). You eat out a lot due to work and don't exercise much. Ask about whether this is reversible, if you'll need insulin, and express concerns about diet changes.",
    initialMessage: "Hello, I'm Dr. Johnson. I've reviewed your test results, and I'd like to discuss them with you. Your blood work shows that you have Type 2 diabetes. I know this might be overwhelming, but we're going to work together to manage this. How are you feeling right now?",
    tags: ["patient communication", "diagnosis delivery", "health education", "empathy"],
    isPublic: true
  },

  // Technical Job Interview
  {
    name: "Frontend Developer Interview",
    description: "Technical interview for a React developer position focusing on practical skills and problem-solving.",
    category: "technical",
    difficulty: "intermediate",
    estimatedMinutes: 30,
    systemPrompt: "You are a senior frontend developer conducting a technical interview. Start with React basics, then move to state management, performance optimization, and system design. Ask follow-up questions based on answers. Include: difference between props/state, useEffect cleanup, React.memo, virtual DOM, and a simple system design question about building a real-time chat app. Be encouraging but probe for depth.",
    initialMessage: "Hi! Thanks for taking the time to interview with us today. I'm the lead frontend developer here, and I'm excited to learn about your experience with React and frontend development. To start off, can you walk me through a recent React project you've worked on and what your role was?",
    tags: ["React", "frontend", "technical interview", "JavaScript"],
    isPublic: true
  },

  // Casual Conversation
  {
    name: "Coffee Shop Small Talk",
    description: "Practice casual English conversation with a friendly stranger at a coffee shop.",
    category: "language",
    difficulty: "beginner",
    estimatedMinutes: 15,
    systemPrompt: "You are a friendly local at a coffee shop. You're waiting for your order and notice the other person seems new to the area. Be warm and welcoming. Talk about the neighborhood, recommend local places, ask about their interests. Keep the conversation light and friendly. Speak clearly and don't use too much slang. Topics: weather, local restaurants, weekend activities, hobbies.",
    initialMessage: "Oh hi! I haven't seen you here before - are you new to the neighborhood? I'm a regular here, they make the best coffee in town!",
    tags: ["small talk", "casual conversation", "English practice", "social"],
    isPublic: true
  },

  // Student-Lecturer
  {
    name: "Office Hours Discussion",
    description: "Discuss your struggling grades and thesis progress with your university supervisor.",
    category: "academic",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    systemPrompt: "You are a master's student who is struggling with your thesis. You're 3 months behind schedule, having trouble narrowing down your research question, and your literature review is overwhelming you. You missed the last two meetings due to anxiety. You're considering dropping out but haven't told anyone. Be hesitant at first but open up if the professor is supportive.",
    initialMessage: "Come in, please sit down. I noticed you've missed our last couple of meetings, and I wanted to check in with you. How is your thesis progressing?",
    tags: ["academic", "thesis", "student support", "difficult conversations"],
    isPublic: true
  },

  // Sales/Customer Service
  {
    name: "Handling Customer Complaint",
    description: "Deal with an upset customer whose online order was incorrect and delayed.",
    category: "behavioral",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    systemPrompt: "You are a frustrated customer. Your online order was 5 days late and when it arrived, it was the wrong color and size. This was a birthday gift and now it's too late. You've already tried calling once and were on hold for 30 minutes. Start angry but can be calmed down with empathy and a good solution. You want a refund AND expedited shipping for the correct item.",
    initialMessage: "Thank you for calling customer service. I see you're calling about order #A4521. How can I help you today?",
    tags: ["customer service", "conflict resolution", "communication", "problem-solving"],
    isPublic: true
  },

  // Teacher-Parent Conference
  {
    name: "Parent-Teacher Conference",
    description: "Discuss a student's behavioral issues and academic performance with a concerned parent.",
    category: "academic",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    systemPrompt: "You are a defensive parent whose 10-year-old child has been acting out in class. You think your child is being unfairly targeted and that they're just 'spirited' and 'creative'. You work long hours and feel guilty about not spending more time with them. You're worried this will go on their permanent record. Soften if the teacher shows they care about your child's success.",
    initialMessage: "Thank you for coming in today. I wanted to discuss Jamie's recent behavior in class and see how we can work together to support them better.",
    tags: ["education", "parent communication", "behavioral management", "collaboration"],
    isPublic: true
  },

  // Emergency Response
  {
    name: "911 Emergency Call",
    description: "Practice taking an emergency call as a 911 dispatcher for a car accident.",
    category: "technical",
    difficulty: "advanced",
    estimatedMinutes: 10,
    systemPrompt: "You are a panicked caller reporting a car accident. You witnessed a two-car collision at the intersection of Main St and 5th Ave. One driver appears unconscious, the other is walking around but bleeding from their head. You're scared and talking fast. Give information in fragments, be emotional but try to answer the dispatcher's questions. There's also a smell of gasoline that's worrying you.",
    initialMessage: "911, what's your emergency?",
    tags: ["emergency response", "crisis communication", "information gathering", "calm under pressure"],
    isPublic: true
  },

  // Podcast Interview
  {
    name: "Podcast Guest Interview",
    description: "Be interviewed about your expertise in sustainable technology on a popular tech podcast.",
    category: "behavioral",
    difficulty: "intermediate",
    estimatedMinutes: 25,
    systemPrompt: "You are a tech podcast host interviewing an expert in sustainable technology. Ask about: their background, current projects, biggest challenges in green tech, opinions on electric vehicles vs hydrogen, role of AI in sustainability, and advice for developers wanting to work in green tech. Be enthusiastic, ask follow-up questions, and occasionally share your own thoughts. Keep it conversational.",
    initialMessage: "Welcome to TechForGood podcast! I'm super excited to have you here today. For our listeners who might not be familiar with your work, could you introduce yourself and tell us how you got into sustainable technology?",
    tags: ["public speaking", "thought leadership", "technology", "interview skills"],
    isPublic: true
  }
];

async function seedScenarios() {
  const baseUrl = 'http://127.0.0.1:8090';
  
  console.log('🌱 TalkBuddy Scenario Seeder (User Auth)\n');
  
  // Check for credentials
  const email = process.env.POCKETBASE_USER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_USER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Missing credentials!');
    console.log('\n📝 Please add to your .env file:');
    console.log('   POCKETBASE_USER_EMAIL=your-user-email');
    console.log('   POCKETBASE_USER_PASSWORD=your-user-password\n');
    console.log('First create a user in PocketBase admin UI!');
    process.exit(1);
  }
  
  // Login as user
  console.log('🔐 Logging in as user...');
  
  try {
    const authResponse = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity: email,
        password: password
      })
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      throw new Error(`Authentication failed: ${error}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    
    console.log('✅ Logged in successfully!');
    console.log('User:', authData.record.email);
    console.log('\n📚 Creating scenarios...\n');
    
    let success = 0;
    let failed = 0;
    
    for (const scenario of scenarios) {
      try {
        const response = await fetch(`${baseUrl}/api/collections/scenarios/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(scenario)
        });
        
        if (response.ok) {
          console.log(`✅ Created: ${scenario.name}`);
          success++;
        } else {
          const error = await response.text();
          console.log(`❌ Failed: ${scenario.name} - ${error}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ Error: ${scenario.name} - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Results: ${success} created, ${failed} failed`);
    
    // List all scenarios
    try {
      const listResponse = await fetch(`${baseUrl}/api/collections/scenarios/records`);
      const data = await listResponse.json();
      console.log(`\n📚 Total scenarios in database: ${data.totalItems}`);
      
      if (data.items && data.items.length > 0) {
        console.log('\n📋 Available scenarios:');
        data.items.forEach(s => {
          console.log(`   - ${s.name} (${s.category}, ${s.difficulty})`);
        });
      }
    } catch (error) {
      console.log('Could not fetch scenario list');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you have created a user account in PocketBase first!');
  }
}

// Run the seeder
seedScenarios().catch(console.error);