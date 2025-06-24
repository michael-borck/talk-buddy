# Creating Scenarios

Learn how to design and build custom conversation scenarios in Talk Buddy. This guide covers the complete process from initial concept to testing your finished scenario.

## Before You Start

### Planning Your Scenario

#### Define Your Learning Goals
Ask yourself:
- **What skill do you want to practice?** (interviewing, customer service, presentations)
- **Who is your target learner?** (students, professionals, language learners)
- **What real situation does this simulate?** (job interview, client meeting, academic discussion)

#### Choose Your Context
- **Professional**: Business meetings, interviews, customer service
- **Academic**: Presentations, discussions, office hours
- **Social**: Networking, casual conversations, cultural exchange
- **Technical**: Code reviews, system explanations, troubleshooting

#### Select Difficulty Level
- **Beginner**: Structured, supportive, predictable
- **Intermediate**: Some complexity, problem-solving required
- **Advanced**: Multi-layered, challenging, expert-level content

## Step-by-Step Creation Process

### Step 1: Access the Scenario Builder

1. **Open Talk Buddy**
2. **Click "Scenarios"** in the sidebar
3. **Click "Create New Scenario"** or the "+" button
4. **Choose "Create from Scratch"** (vs. importing)

### Step 2: Basic Information

#### Scenario Details
Fill out the essential information:

**Name** (Required)
- Keep it descriptive but concise (max ~50 characters)
- Include context and difficulty hint when helpful
- Examples: "Job Interview - Marketing Manager", "Customer Service - Product Return"

**Description** (Required)
- 1-2 sentences explaining what the learner will practice
- Mention the context and learning objectives
- Example: "Practice explaining technical concepts to non-technical stakeholders in a client presentation setting."

**Category** (Optional but Recommended)
- Choose from existing categories or create new ones
- Helps organize and filter scenarios
- Common categories: Business, Academic, Technology, Customer Service, Medical

**Difficulty Level** (Required)
- **Beginner**: New to this type of communication
- **Intermediate**: Some experience, ready for complexity
- **Advanced**: Experienced, can handle challenging situations

**Estimated Duration** (Required)
- Be realistic: most scenarios are 8-15 minutes
- Consider complexity and typical conversation length
- Users can end early or continue longer if needed

### Step 3: AI Character Design

#### System Prompt (The Heart of Your Scenario)
This defines how the AI behaves. Include:

**Character Role and Context**
```
Example: "You are a senior marketing director interviewing candidates for a Marketing Manager position at a growing tech company."
```

**Personality and Approach**
```
Example: "Be professional but friendly. Show genuine interest in the candidate's experience and ask follow-up questions that probe for specific examples and strategic thinking."
```

**Conversation Goals**
```
Example: "Focus on marketing strategy experience, team leadership skills, and campaign results. The interview should cover 4-5 main topics over 10-15 minutes."
```

**Behavioral Guidelines**
```
Example: "If the candidate seems nervous, be encouraging. If they give vague answers, ask for specific examples. Maintain a professional but welcoming tone throughout."
```

#### Complete System Prompt Example
```
You are a senior marketing director interviewing candidates for a Marketing Manager position at a growing tech company. Be professional but friendly, showing genuine interest in the candidate's experience. Ask follow-up questions that probe for specific examples of past successes and strategic thinking. 

Focus on their marketing strategy experience, team leadership skills, and measurable campaign results. If the candidate seems nervous, be encouraging. If they give vague answers, ask for specific examples and quantifiable outcomes. The interview should naturally cover 4-5 main topics over 10-15 minutes. Conclude when you feel you have a good understanding of their capabilities.
```

### Step 4: Initial Message

#### Crafting the Opening
The initial message should:
- **Set the scene immediately**
- **Establish the AI's character**
- **Create clear context for the learner**
- **Invite natural response**

#### Examples by Context

**Professional Interview**
```
"Good morning! Thank you for your interest in our Marketing Manager position. I've reviewed your resume and I'm excited to learn more about your background. Could you start by telling me what draws you to this role and our company?"
```

**Customer Service**
```
"Hi, I need help with returning a product I ordered last week. It's not what I expected and I'd like to get a refund or exchange. Can you help me with that?"
```

**Academic Discussion**
```
"Thanks for staying after class to discuss your research proposal. You've chosen an interesting topic, but I think we need to talk about narrowing the scope to make it manageable for a semester project. What specific aspect interests you most?"
```

**Technical Explanation**
```
"I appreciate you taking time to explain this new system implementation. As someone from the business side, I need to understand how this will affect our daily operations and what training my team will need. Can you walk me through the key changes?"
```

### Step 5: Additional Settings

#### Tags (Recommended)
Add relevant tags to help users find your scenario:
- **Skill tags**: interview, presentation, negotiation, customer-service
- **Context tags**: professional, academic, technical, healthcare
- **Level tags**: beginner-friendly, advanced-concepts

Example tags: `["interview", "marketing", "professional", "intermediate"]`

#### Voice Selection
- **Male/Female**: Choose what fits the character
- **Consider context**: Professional settings, age appropriateness
- **Test both options**: See which feels more natural for your scenario

#### Visibility Settings
- **Public**: Others can see and use your scenario
- **Private**: Only you can access it
- **Default**: Usually public unless you specify otherwise

### Step 6: Testing and Refinement

#### Initial Testing
1. **Save your scenario** as a draft
2. **Test it yourself**: Run through the conversation
3. **Check timing**: Is your estimate accurate?
4. **Evaluate flow**: Does the conversation develop naturally?

#### Refinement Process
Common issues to address:

**AI Too Rigid**
- Problem: AI follows script too strictly
- Solution: Add "respond naturally to user input" guidance

**Conversation Too Short/Long**
- Problem: Doesn't match estimated duration
- Solution: Adjust AI instructions about conversation depth and conclusion

**Unclear Objectives**
- Problem: Learner doesn't know what to practice
- Solution: Revise description and initial message for clarity

**Inappropriate Difficulty**
- Problem: Too easy or too hard for intended level
- Solution: Adjust AI supportiveness and complexity

#### Testing with Others
- **Get feedback**: Have colleagues or students try the scenario
- **Watch for confusion**: Are instructions clear?
- **Note engagement**: Do users find it interesting and realistic?
- **Check learning value**: Are they practicing the intended skills?

## Advanced Scenario Features

### Multi-Phase Scenarios

#### Creating Progressive Conversations
Design scenarios that evolve through stages:
1. **Introduction phase**: Getting acquainted, setting context
2. **Development phase**: Main content, skill practice
3. **Challenge phase**: Complications or deeper exploration
4. **Resolution phase**: Conclusions, next steps

#### Implementation Tips
Use system prompt language like:
```
"Begin with introductory small talk, then transition to discussing the main project challenges. If the user demonstrates good problem-solving skills, introduce a budget constraint complication. Conclude by discussing next steps and timeline."
```

### Adaptive Difficulty

#### Responsive AI Behavior
Create scenarios that adjust to user performance:
```
"If the user gives confident, detailed answers, ask more challenging follow-up questions. If they seem to struggle, provide gentle prompts and encouragement. Match your complexity level to their demonstrated expertise."
```

### Cultural and Professional Context

#### Industry-Specific Scenarios
For specialized fields:
- **Include accurate terminology**: Research proper professional language
- **Realistic situations**: Base scenarios on actual industry challenges
- **Appropriate protocols**: Follow real-world professional standards

#### Cross-Cultural Considerations
- **Communication styles**: Account for different cultural approaches
- **Formality levels**: Match expectations for the cultural context
- **Inclusive language**: Ensure accessibility for diverse learners

## Quality Assurance

### Pre-Publication Checklist

#### Content Quality
- [ ] Clear learning objectives
- [ ] Realistic, engaging context
- [ ] Appropriate difficulty level
- [ ] Natural conversation flow
- [ ] Accurate estimated duration

#### Technical Quality
- [ ] All required fields completed
- [ ] Appropriate tags added
- [ ] Voice selection matches character
- [ ] Spelling and grammar checked
- [ ] Test run completed successfully

#### Accessibility
- [ ] Clear, simple language (especially for beginners)
- [ ] Inclusive content and examples
- [ ] Works well with text-to-speech if needed
- [ ] Appropriate for intended audience

### Common Issues and Solutions

#### Problem: AI Doesn't Stay in Character
**Symptoms**: AI breaks role, gives inconsistent responses
**Solutions**: 
- Strengthen character definition in system prompt
- Add specific behavioral guidelines
- Include personality details and motivation

#### Problem: Conversation Feels Scripted
**Symptoms**: Predictable responses, unnatural flow
**Solutions**:
- Add "respond naturally to user input" guidance
- Remove rigid question sequences
- Include adaptability instructions

#### Problem: Difficulty Level Mismatch
**Symptoms**: Too easy for advanced users, too hard for beginners
**Solutions**:
- Adjust AI supportiveness and patience
- Modify complexity of topics and language
- Add or remove challenging elements

#### Problem: Poor Learning Value
**Symptoms**: Users don't feel they practiced useful skills
**Solutions**:
- Clarify learning objectives in description
- Ensure scenario actually requires target skills
- Add specific skill-building elements to system prompt

## Sharing and Distribution

### Exporting Your Scenario

#### Individual Scenario Export
1. **Go to Scenarios page**
2. **Find your scenario**
3. **Click export/share option**
4. **Save JSON file with descriptive name**

#### Including in Practice Packs
- **Create or edit a practice pack**
- **Add your scenario to the pack**
- **Export the entire pack for sharing**

### Distribution Best Practices

#### File Naming
Use clear, descriptive names:
- `Interview-Skills-Marketing-Manager.json`
- `Customer-Service-Product-Returns.json`
- `Technical-Presentation-Beginner.json`

#### Documentation
Include brief instructions for users:
- **Target audience**: Who should use this scenario?
- **Learning objectives**: What skills will they practice?
- **Prerequisites**: Any required knowledge or setup?

---

## Quick Reference

### Essential Elements Checklist
- [ ] **Name**: Clear, descriptive title
- [ ] **Description**: Learning objectives and context
- [ ] **System Prompt**: Detailed AI character and behavior
- [ ] **Initial Message**: Scene-setting opening
- [ ] **Difficulty**: Appropriate for target users
- [ ] **Duration**: Realistic time estimate
- [ ] **Tags**: Helpful for discovery

### Quality Indicators
- **Natural conversation flow**
- **Clear learning objectives**
- **Engaging, realistic context**
- **Appropriate challenge level**
- **Consistent AI character**

### Testing Process
1. **Self-test**: Complete the scenario yourself
2. **Time check**: Verify duration estimate
3. **Peer review**: Get feedback from others
4. **Iterate**: Refine based on testing results

---

**Creating effective scenarios takes practice, but the impact on learners makes it worthwhile. Start simple, test thoroughly, and refine based on feedback! 🎯**

**Next Steps**: 
- **[Test Your Scenario](your-first-scenario.md)** - Experience it from the learner perspective
- **[Build Practice Packs](building-skill-packages.md)** - Organize multiple scenarios
- **[Content Creation Best Practices](../content-creation/best-practices.md)** - Advanced tips and techniques