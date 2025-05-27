#!/usr/bin/env node

/**
 * Import initial data into PocketBase
 * Run this after setting up PocketBase to populate with starter scenarios
 */

const PocketBase = require('pocketbase/cjs');
const fs = require('fs');

const pb = new PocketBase('http://127.0.0.1:8090');

async function importData() {
  try {
    console.log('Importing initial data into PocketBase...');
    
    // Check if data file exists
    if (!fs.existsSync('pb_data_export.json')) {
      console.error('❌ pb_data_export.json not found!');
      console.log('Using built-in scenarios instead...');
      await importBuiltInScenarios();
      return;
    }
    
    // Read export file
    const exportData = JSON.parse(fs.readFileSync('pb_data_export.json', 'utf8'));
    
    console.log(`Found export version ${exportData.version} from ${exportData.exportDate}`);
    
    // Check if scenarios already exist
    const existing = await pb.collection('scenarios').getList(1, 1);
    if (existing.totalItems > 0) {
      console.log('⚠️  Scenarios already exist in database. Skipping import.');
      console.log('   To reimport, delete existing scenarios first.');
      return;
    }
    
    // Import scenarios
    const scenarios = exportData.collections.scenarios;
    let imported = 0;
    
    for (const scenario of scenarios) {
      try {
        await pb.collection('scenarios').create(scenario);
        imported++;
        console.log(`  ✓ Imported: ${scenario.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to import ${scenario.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully imported ${imported}/${scenarios.length} scenarios`);
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

async function importBuiltInScenarios() {
  // Fallback scenarios if no export file exists
  const scenarios = [
    {
      name: "Coffee Shop Order",
      description: "Practice ordering coffee and snacks at a café",
      difficulty: "beginner",
      estimatedMinutes: 5,
      category: "daily",
      systemPrompt: "You are a friendly barista at a coffee shop. Help the customer order their drink and any food items. Be patient and helpful, asking clarifying questions about size, milk preferences, etc.",
      initialMessage: "Good morning! Welcome to our café. What can I get started for you today?",
      tips: ["Common sizes: small, medium, large", "Mention if you want it hot or iced", "Don't forget to specify milk type if needed"]
    },
    {
      name: "Hotel Check-in",
      description: "Practice checking into a hotel",
      difficulty: "intermediate",
      estimatedMinutes: 7,
      category: "travel",
      systemPrompt: "You are a hotel receptionist. Help the guest check in, verify their reservation, explain amenities, and answer questions about their stay.",
      initialMessage: "Good evening! Welcome to the Grand Hotel. Do you have a reservation with us?",
      tips: ["Have your confirmation number ready", "Ask about breakfast times and WiFi", "Inquire about checkout time"]
    },
    {
      name: "Restaurant Reservation",
      description: "Book a table at a restaurant",
      difficulty: "intermediate",
      estimatedMinutes: 5,
      category: "dining",
      systemPrompt: "You are a restaurant host taking a reservation over the phone. Be helpful and professional, asking about party size, preferred time, and any special requirements.",
      initialMessage: "Thank you for calling The Olive Garden. How may I help you today?",
      tips: ["Specify number of people", "Mention any dietary restrictions", "Ask about availability if your preferred time isn't available"]
    }
  ];
  
  let imported = 0;
  for (const scenario of scenarios) {
    try {
      await pb.collection('scenarios').create(scenario);
      imported++;
      console.log(`  ✓ Created: ${scenario.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${scenario.name}:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${imported}/${scenarios.length} built-in scenarios`);
}

importData();