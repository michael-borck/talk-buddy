#!/usr/bin/env node

/**
 * Export PocketBase data to JSON for version control
 * This creates a clean export of scenarios that can be imported by new users
 */

const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

async function exportData() {
  try {
    console.log('Exporting PocketBase data...');
    
    // Fetch all scenarios
    const scenarios = await pb.collection('scenarios').getFullList({
      sort: 'name',
    });
    
    // Clean the data (remove system fields that shouldn't be imported)
    const cleanScenarios = scenarios.map(scenario => ({
      name: scenario.name,
      description: scenario.description,
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimatedMinutes,
      systemPrompt: scenario.systemPrompt,
      initialMessage: scenario.initialMessage,
      category: scenario.category,
      tips: scenario.tips
    }));
    
    // Create export object
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      collections: {
        scenarios: cleanScenarios
      }
    };
    
    // Write to file
    const fs = require('fs');
    fs.writeFileSync(
      'pb_data_export.json',
      JSON.stringify(exportData, null, 2)
    );
    
    console.log(`✅ Exported ${cleanScenarios.length} scenarios to pb_data_export.json`);
    
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportData();