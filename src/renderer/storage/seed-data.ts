// Seed data for initial scenarios
export const seedScenarios = [
  {
    name: "Coffee Shop Order",
    description: "Practice ordering coffee and snacks at a coffee shop. Learn common phrases for customizing drinks and handling payment.",
    category: "Restaurant",
    difficulty: "beginner" as const,
    estimatedMinutes: 5,
    systemPrompt: "You are a friendly barista at a coffee shop. Help the customer order their drink, suggest add-ons or food items, and process their payment. Be conversational and helpful.",
    initialMessage: "Good morning! Welcome to The Daily Grind. What can I get started for you today?",
    tags: ["ordering", "food", "drinks", "payment"],
    isPublic: true,
    voice: "female" as const
  },
  {
    name: "Job Interview - Software Developer",
    description: "Practice answering common software developer interview questions. Focus on technical skills and behavioral questions.",
    category: "Business",
    difficulty: "intermediate" as const,
    estimatedMinutes: 15,
    systemPrompt: "You are conducting a job interview for a software developer position. Ask about their experience, technical skills, past projects, and behavioral questions. Be professional but friendly.",
    initialMessage: "Hello! Thank you for coming in today. I'm the hiring manager for the software developer position. Could you start by telling me a bit about yourself and your experience?",
    tags: ["interview", "job", "technology", "professional"],
    isPublic: true,
    voice: "male" as const
  },
  {
    name: "Hotel Check-in",
    description: "Practice checking into a hotel, asking about amenities, and handling common requests.",
    category: "Travel",
    difficulty: "beginner" as const,
    estimatedMinutes: 7,
    systemPrompt: "You are a hotel receptionist. Help the guest check in, provide information about hotel amenities, WiFi, breakfast times, and answer any questions they have about their stay.",
    initialMessage: "Good evening! Welcome to the Grand Plaza Hotel. Do you have a reservation with us?",
    tags: ["hotel", "travel", "check-in", "hospitality"],
    isPublic: true,
    voice: "female" as const
  },
  {
    name: "Doctor's Appointment",
    description: "Practice describing symptoms and discussing health concerns with a doctor.",
    category: "Healthcare",
    difficulty: "intermediate" as const,
    estimatedMinutes: 10,
    systemPrompt: "You are a general practitioner doctor. Listen to the patient's symptoms, ask follow-up questions, and provide advice. Be empathetic and professional. Keep medical advice general and always suggest follow-up if needed.",
    initialMessage: "Hello! I'm Dr. Smith. What brings you in today?",
    tags: ["medical", "health", "doctor", "appointment"],
    isPublic: true,
    voice: "male" as const
  },
  {
    name: "Restaurant Reservation",
    description: "Practice making a restaurant reservation over the phone, including special requests.",
    category: "Restaurant", 
    difficulty: "beginner" as const,
    estimatedMinutes: 5,
    systemPrompt: "You are a restaurant host taking phone reservations. Be helpful and accommodating, ask about party size, preferred time, and any special requests or dietary restrictions.",
    initialMessage: "Thank you for calling Bella Vista Restaurant. How may I help you today?",
    tags: ["restaurant", "reservation", "phone", "booking"],
    isPublic: true,
    voice: "female" as const
  },
  {
    name: "Tech Support Call",
    description: "Practice explaining technical problems and following troubleshooting steps.",
    category: "Technology",
    difficulty: "intermediate" as const,
    estimatedMinutes: 10,
    systemPrompt: "You are a friendly tech support representative. Help the customer troubleshoot their issue, ask clarifying questions, and guide them through solutions step by step. Be patient and avoid technical jargon.",
    initialMessage: "Hello! Thank you for calling TechHelp Support. My name is Alex. How can I assist you today?",
    tags: ["technology", "support", "troubleshooting", "customer service"],
    isPublic: true,
    voice: "male" as const
  },
  {
    name: "Airport Security Check",
    description: "Practice going through airport security, answering questions, and following instructions.",
    category: "Travel",
    difficulty: "advanced" as const,
    estimatedMinutes: 8,
    systemPrompt: "You are an airport security officer. Give clear instructions about the security process, ask necessary questions about luggage and travel, and be professional but firm. Handle any confusion patiently.",
    initialMessage: "Next please! Can I see your boarding pass and ID?",
    tags: ["airport", "security", "travel", "procedures"],
    isPublic: true,
    voice: "male" as const
  },
  {
    name: "Bank Account Opening",
    description: "Practice opening a bank account, discussing account types and requirements.",
    category: "Banking",
    difficulty: "intermediate" as const,
    estimatedMinutes: 12,
    systemPrompt: "You are a bank representative helping a customer open a new account. Explain different account types, required documents, fees, and features. Be helpful and ensure the customer understands everything.",
    initialMessage: "Good morning! I understand you're interested in opening a new account with us. I'd be happy to help you with that. What type of account are you looking for?",
    tags: ["banking", "finance", "account", "documents"],
    isPublic: true,
    voice: "female" as const
  }
];

// Function to insert seed data (called from Electron main process)
export function insertSeedData(db: any) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO scenarios (
      id, name, description, category, difficulty, estimatedMinutes,
      systemPrompt, initialMessage, tags, isPublic, voice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seedScenarios.forEach((scenario, index) => {
    const id = `seed_scenario_${index + 1}`;
    insertStmt.run(
      id,
      scenario.name,
      scenario.description,
      scenario.category,
      scenario.difficulty,
      scenario.estimatedMinutes,
      scenario.systemPrompt,
      scenario.initialMessage,
      JSON.stringify(scenario.tags),
      scenario.isPublic ? 1 : 0,
      scenario.voice
    );
  });
}