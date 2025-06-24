// Documentation loader service for Talk Buddy
// This service loads markdown documentation files for in-app display

interface DocMetadata {
  title: string;
  section: string;
  description?: string;
}

interface DocContent {
  content: string;
  metadata: DocMetadata;
}

// Documentation structure mapping
export const documentationStructure = {
  'getting-started': {
    title: 'Getting Started',
    items: {
      'installation': 'Installation Guide',
      'first-setup': 'First Setup',
      'your-first-scenario': 'Your First Scenario'
    }
  },
  'user-guides': {
    title: 'User Guides',
    items: {
      'for-students': 'For Students',
      'for-teachers': 'For Teachers',
      'for-self-learners': 'For Self-Learners'
    }
  },
  'workflows': {
    title: 'Workflows',
    items: {
      'creating-scenarios': 'Creating Scenarios',
      'building-skill-packages': 'Building Skill Packages',
      'importing-packages': 'Importing Packages',
      'exporting-sharing': 'Exporting & Sharing'
    }
  },
  'services': {
    title: 'Service Setup',
    items: {
      'ai-model-integration': 'AI Model Integration',
      'stt-setup': 'Speech-to-Text Setup',
      'tts-setup': 'Text-to-Speech Setup'
    }
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    items: {
      'connection-issues': 'Connection Issues',
      'common-errors': 'Common Errors',
      'performance-tips': 'Performance Tips'
    }
  },
  'reference': {
    title: 'Reference',
    items: {
      'glossary': 'Glossary',
      'faq': 'FAQ'
    }
  },
  'content-creation': {
    title: 'Content Creation',
    items: {
      'scenario-writing-guide': 'Scenario Writing Guide'
    }
  },
  'interface-guide': {
    title: 'Interface Guide',
    items: {
      'home-dashboard': 'Home Dashboard',
      'conversation-interface': 'Conversation Interface'
    }
  }
};

/**
 * Load documentation content from markdown files
 * In production, this would load from bundled markdown files
 * For now, we'll use dynamic imports or fetch from the docs folder
 */
export async function loadDocumentation(section: string, page: string): Promise<DocContent> {
  try {
    // Try to load the actual markdown file
    // In Electron/Vite, we can import markdown files directly
    const docPath = `/docs/${section}/${page}.md`;
    
    // For now, let's try to fetch the content from the public docs
    // In a production build, these files would be bundled
    let content: string;
    
    try {
      const response = await fetch(docPath);
      if (response.ok) {
        content = await response.text();
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      // Fallback to sample content if file loading fails
      content = generateFallbackContent(section, page);
    }

    const sectionInfo = documentationStructure[section as keyof typeof documentationStructure];
    const pageTitle = sectionInfo?.items[page as keyof typeof sectionInfo.items] || page;

    return {
      content,
      metadata: {
        title: pageTitle,
        section: sectionInfo?.title || section,
        description: `Documentation for ${pageTitle}`
      }
    };
  } catch (error) {
    console.error('Failed to load documentation:', error);
    return {
      content: generateErrorContent(section, page),
      metadata: {
        title: 'Error Loading Documentation',
        section: 'Error'
      }
    };
  }
}

/**
 * Generate fallback content when markdown files can't be loaded
 */
function generateFallbackContent(section: string, page: string): string {
  const sectionInfo = documentationStructure[section as keyof typeof documentationStructure];
  const pageTitle = sectionInfo?.items[page as keyof typeof sectionInfo.items] || page;

  return `# ${pageTitle}

Welcome to the ${pageTitle} documentation.

## Overview

This documentation is being loaded dynamically. In the full implementation, this content would be loaded from the markdown files in the \`docs/${section}/\` folder.

## Features

- **In-app viewing**: Read documentation without leaving Talk Buddy
- **Offline access**: All documentation is bundled with the application
- **Search functionality**: Find information quickly across all docs
- **Navigation**: Easy browsing between sections and pages

## Getting the Full Documentation

To view the complete documentation:

1. **Online**: Visit [Talk Buddy Documentation](https://michael-borck.github.io/talk-buddy)
2. **Repository**: Browse the \`docs/\` folder on GitHub
3. **Local**: Check the \`docs/${section}/${page}.md\` file in your installation

## Implementation Note

This is a demonstration of the in-app documentation system. The actual implementation would:

- Bundle markdown files with the application during build
- Load content from the bundled files
- Provide full text search across all documentation
- Cache content for faster subsequent loads

---

*The in-app documentation system provides a seamless user experience by keeping all help content within Talk Buddy.*`;
}

/**
 * Generate error content when documentation loading fails
 */
function generateErrorContent(section: string, page: string): string {
  return `# Documentation Error

Sorry, we couldn't load the documentation for **${section}/${page}**.

## What happened?

The documentation file might not be available or there was an error loading it.

## What you can do:

1. **Try again**: Refresh the page or navigate back and try again
2. **Check online**: Visit the [online documentation](https://michael-borck.github.io/talk-buddy/${section}/${page})
3. **Report issue**: If this keeps happening, please [report an issue](https://github.com/michael-borck/talk-buddy/issues)

## Alternative help:

- Browse other documentation sections using the sidebar
- Check the FAQ section for common questions
- Visit the Getting Started guide for basic information

---

*We're working to make the documentation system more robust. Thank you for your patience!*`;
}

/**
 * Search across all documentation content
 * This would be implemented to search through all loaded content
 */
export async function searchDocumentation(query: string): Promise<Array<{
  section: string;
  page: string;
  title: string;
  excerpt: string;
  relevance: number;
}>> {
  const results = [];
  const searchTerm = query.toLowerCase();

  for (const [sectionKey, sectionData] of Object.entries(documentationStructure)) {
    for (const [pageKey, pageTitle] of Object.entries(sectionData.items)) {
      // Simple relevance scoring based on title match
      let relevance = 0;
      if (pageTitle.toLowerCase().includes(searchTerm)) {
        relevance += 10;
      }
      if (sectionData.title.toLowerCase().includes(searchTerm)) {
        relevance += 5;
      }

      if (relevance > 0 || pageTitle.toLowerCase().includes(searchTerm)) {
        results.push({
          section: sectionKey,
          page: pageKey,
          title: pageTitle,
          excerpt: `${pageTitle} in ${sectionData.title}`,
          relevance
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Get navigation information for a specific page
 */
export function getNavigationInfo(section: string, page: string) {
  const sectionInfo = documentationStructure[section as keyof typeof documentationStructure];
  if (!sectionInfo) return null;

  const pages = Object.keys(sectionInfo.items);
  const currentIndex = pages.indexOf(page);
  
  return {
    section: {
      key: section,
      title: sectionInfo.title
    },
    current: {
      key: page,
      title: sectionInfo.items[page as keyof typeof sectionInfo.items]
    },
    previous: currentIndex > 0 ? {
      key: pages[currentIndex - 1],
      title: sectionInfo.items[pages[currentIndex - 1] as keyof typeof sectionInfo.items]
    } : null,
    next: currentIndex < pages.length - 1 ? {
      key: pages[currentIndex + 1],
      title: sectionInfo.items[pages[currentIndex + 1] as keyof typeof sectionInfo.items]
    } : null
  };
}

/**
 * Get all available documentation sections and pages
 */
export function getAllDocumentation() {
  return documentationStructure;
}