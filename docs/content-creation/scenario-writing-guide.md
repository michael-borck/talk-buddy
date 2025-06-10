# Scenario Writing Guide

Creating effective conversation scenarios is both an art and a science. This guide will help you design engaging, educational practice experiences that help learners build real communication skills.

## Understanding Effective Scenarios

### What Makes a Great Scenario?

#### Clear Learning Objectives
Every scenario should have specific, measurable learning goals:
- **Skill-focused**: What communication skill are you developing?
- **Context-relevant**: How does this apply to real-world situations?
- **Achievable**: Can learners succeed with their current skill level?

#### Realistic Context
The best scenarios mirror real-world communication:
- **Authentic situations**: Based on actual professional or social contexts
- **Believable characters**: AI personas that feel genuine and consistent
- **Natural flow**: Conversations that develop organically

#### Engaging Content
Scenarios should motivate learners to participate:
- **Relevant to learner goals**: Directly applicable to their needs
- **Appropriately challenging**: Not too easy or overwhelmingly difficult
- **Interactive**: Requires active participation, not passive listening

## Scenario Components Breakdown

### Essential Elements

#### Scenario Metadata
```
Name: Clear, descriptive title (max 50 characters)
Description: Brief explanation of learning goals (1-2 sentences)
Category: Helps organize content (Business, Academic, Social, etc.)
Difficulty: Beginner | Intermediate | Advanced
Estimated Minutes: Realistic time expectation (5-20 minutes typical)
```

#### System Prompt (AI Character Definition)
This defines the AI's personality, role, and behavior:
```
Example:
"You are a hiring manager for a mid-size marketing company. You're interviewing candidates for a Marketing Manager position. Be professional but friendly, ask follow-up questions about their experience, and probe for specific examples of past successes. Show interest in their strategic thinking and leadership potential."
```

#### Initial Message
The AI's opening statement that sets the scene:
```
Example:
"Good morning! Thank you for your interest in our Marketing Manager position. I've reviewed your resume and I'm excited to learn more about your background. Could you start by telling me what draws you to this role and our company?"
```

### Advanced Elements

#### Tags
Help users find relevant content:
- **Skill tags**: interview, presentation, negotiation, customer-service
- **Context tags**: professional, casual, academic, medical
- **Level tags**: beginner-friendly, advanced-concepts

#### Voice Selection
Choose AI voice that matches the character:
- **Professional contexts**: Match the expected demographic
- **Educational settings**: Consider what helps learners focus
- **Cultural considerations**: Appropriate for the scenario context

## Writing Effective System Prompts

### Character Development

#### Define Clear Personality
```
Good: "You are a concerned customer who bought a defective product online. You're frustrated but willing to work with customer service to resolve the issue. Be firm about wanting a solution but remain polite."

Avoid: "You are a customer with a problem."
```

#### Establish Specific Context
```
Good: "You are a senior developer conducting a code review with a junior developer. Focus on constructive feedback about code quality, best practices, and learning opportunities. Be encouraging while maintaining technical standards."

Avoid: "You are a developer reviewing code."
```

#### Include Behavioral Guidelines
```
Good: "You are a networking contact at a professional conference. Be friendly and open to conversation, share insights about industry trends when asked, and show interest in the other person's background. Ask follow-up questions to keep the conversation flowing."

Avoid: "You are someone at a networking event."
```

### Conversation Direction

#### Set Clear Objectives
Tell the AI what the conversation should accomplish:
- What topics should be covered?
- What kind of responses should the AI elicit?
- How should the conversation conclude?

#### Example Objectives
```
For Interview Scenario:
"Ask about their marketing experience, campaign successes, team leadership, and strategic thinking. Probe for specific examples and measurable results. The interview should last 10-15 minutes and cover 4-5 major topics."

For Customer Service Scenario:
"Start with a clear problem description, provide details when asked, and work collaboratively toward a solution. Be satisfied when offered reasonable resolution options."
```

### Response Patterns

#### Natural Conversation Flow
```
Good: "Respond naturally to what the user says. If they mention specific experience, ask for more details. If they seem nervous, be encouraging. Adapt your questions based on their answers."

Avoid: "Ask these questions in this exact order: 1, 2, 3, 4..."
```

#### Appropriate Challenge Level
```
Beginner: "Be patient and supportive. If the user struggles to answer, provide gentle prompts or rephrase questions more simply."

Advanced: "Ask probing follow-up questions. Challenge assumptions and ask for deeper analysis. Introduce unexpected complications that require problem-solving."
```

## Writing Compelling Initial Messages

### Setting the Scene

#### Establish Context Immediately
```
Good: "Welcome to our quarterly team meeting. I've prepared today's agenda focusing on our Q3 results and Q4 planning. Before we dive into the numbers, I'd like to hear your initial thoughts on how the last quarter went from your department's perspective."

Avoid: "Hi, let's have a meeting."
```

#### Create Immediate Engagement
```
Good: "I appreciate you taking time to meet with me about the budget proposal. I've reviewed your request for additional marketing spend, and while I see the potential, I have some concerns about the ROI projections. Can you walk me through your assumptions?"

Avoid: "Let's talk about your budget request."
```

### Tone and Voice

#### Match Scenario Context
**Professional**: "Good afternoon. I understand you're here to discuss the implementation timeline for our new CRM system. I have about 30 minutes, so let's focus on the key milestones and potential challenges."

**Academic**: "Thanks for staying after class. I wanted to discuss your research proposal. You've chosen an interesting topic, but I think we need to narrow the scope to make it manageable for a semester project."

**Casual**: "Hey! I'm glad we finally connected at this conference. I've been following your company's work in sustainable packaging - it's really innovative stuff. How did you get started in that field?"

#### Appropriate Formality Level
Consider the relationship dynamic:
- **Peer-to-peer**: Collaborative, respectful, informal
- **Hierarchical**: Appropriate deference or authority
- **Service relationships**: Professional courtesy, solution-focused

## Difficulty Progression

### Beginner Level Design

#### Characteristics
- **Clear structure**: Predictable conversation flow
- **Supportive AI**: Patient, encouraging, helpful
- **Simple objectives**: One main goal, straightforward path
- **Familiar contexts**: Common situations most people understand

#### Example Beginner Scenario
```
Name: "Coffee Shop Order"
System Prompt: "You are a friendly barista taking a customer's order. Be patient and helpful, suggest popular items if they seem unsure, and make the interaction pleasant and straightforward."
Initial Message: "Good morning! Welcome to Central Cafe. What can I get started for you today?"
```

### Intermediate Level Design

#### Characteristics
- **Some ambiguity**: Requires clarification and problem-solving
- **Multi-part objectives**: Several goals to accomplish
- **Realistic complications**: Minor challenges to navigate
- **Professional contexts**: Workplace or academic situations

#### Example Intermediate Scenario
```
Name: "Team Project Coordination"
System Prompt: "You are a team member working on a project with tight deadlines. You have concerns about the current approach and some resource constraints. Be collaborative but express your concerns clearly. Work toward solutions together."
Initial Message: "Thanks for setting up this meeting. I've been thinking about our project timeline, and I'm worried we might be taking on too much. Can we review the scope and see if there's a way to prioritize the most critical features?"
```

### Advanced Level Design

#### Characteristics
- **Complex dynamics**: Multiple stakeholders, competing interests
- **Ethical considerations**: Decisions with moral implications
- **High stakes**: Significant consequences for success/failure
- **Expert-level content**: Industry-specific knowledge required

#### Example Advanced Scenario
```
Name: "Crisis Communication with Media"
System Prompt: "You are an investigative journalist asking tough questions about a company crisis. Be persistent but professional, ask for specific details and accountability measures. Don't accept vague or evasive answers easily."
Initial Message: "Thank you for making yourself available during this difficult time. Our viewers are concerned about the data breach affecting 50,000 customers. Can you explain how this happened and what specific steps you're taking to prevent future incidents?"
```

## Quality Assurance

### Testing Your Scenarios

#### Self-Testing Process
1. **Complete the scenario yourself**: Practice the conversation from the learner's perspective
2. **Check for natural flow**: Does the conversation develop logically?
3. **Verify learning objectives**: Are the intended skills actually practiced?
4. **Time estimation**: Is the duration estimate accurate?

#### Peer Review
- **Fresh perspective**: Have someone else test the scenario
- **Target audience feedback**: Get input from actual learners when possible
- **Subject matter expertise**: Consult experts for technical accuracy

### Common Pitfalls to Avoid

#### Over-Scripted Conversations
```
Avoid: "First ask about X, then discuss Y, then conclude with Z"
Better: "Focus on X topic, but let the conversation develop naturally based on user responses"
```

#### Unrealistic AI Behavior
```
Avoid: "You know everything about the user's background and situation"
Better: "Ask questions to learn about the user's experience and perspective"
```

#### Unclear Objectives
```
Avoid: "Practice communication skills"
Better: "Practice explaining technical concepts to non-technical stakeholders using analogies and avoiding jargon"
```

#### Inappropriate Difficulty Jumps
```
Avoid: Moving directly from basic scenarios to highly complex ones
Better: Create intermediate stepping stones that build skills progressively
```

## Accessibility and Inclusion

### Universal Design Principles

#### Clear Language
- **Simple sentence structure**: Especially for beginner scenarios
- **Defined terminology**: Explain industry-specific terms when used
- **Cultural neutrality**: Avoid assumptions about background knowledge

#### Diverse Contexts
- **Varied perspectives**: Include scenarios from different cultural and professional contexts
- **Multiple communication styles**: Account for different approaches to professional interaction
- **Inclusive examples**: Ensure scenarios work for learners from various backgrounds

### Technical Considerations

#### Voice and Audio
- **Clear pronunciation**: Choose AI voices that are easy to understand
- **Appropriate pace**: Match speaking speed to scenario complexity
- **Volume consistency**: Ensure consistent audio levels

#### Content Accessibility
- **Screen reader friendly**: Use clear, descriptive text
- **Keyboard navigation**: Ensure all features work without mouse input
- **Visual clarity**: Use appropriate text sizes and contrast

---

## Quick Reference Checklist

### Before Writing
- [ ] Define specific learning objectives
- [ ] Identify target difficulty level
- [ ] Research authentic context details
- [ ] Plan conversation arc and key topics

### During Writing
- [ ] Create detailed, consistent AI character
- [ ] Write engaging, context-setting initial message
- [ ] Include natural conversation cues and responses
- [ ] Match tone to scenario context and difficulty

### After Writing
- [ ] Test the scenario yourself
- [ ] Verify timing estimate accuracy
- [ ] Check for inclusive, accessible language
- [ ] Get feedback from target audience when possible

### Final Polish
- [ ] Proofread for grammar and clarity
- [ ] Ensure metadata accuracy (tags, category, etc.)
- [ ] Test import/export functionality
- [ ] Document any special setup requirements

---

**Great scenarios are the foundation of effective conversation practice. Take time to craft them well, and your learners will have engaging, valuable practice experiences! ✍️**

**Next**: **[Conversation Design Principles](conversation-design.md)** →