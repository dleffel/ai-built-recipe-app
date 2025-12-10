/**
 * Notes Parser Utility
 * 
 * Parses and serializes structured markdown notes for CRM contacts.
 * Supports intelligent merging of updates while preserving existing content.
 */

/**
 * Parsed structure of contact notes
 */
export interface ParsedNotes {
  relationshipSummary: {
    role?: string;
    howWeMet?: string;
    relationshipOwner?: string;
    raw?: string[];
  };
  whatTheyCareAbout: {
    goals?: string[];
    pains?: string[];
    hotButtons?: string[];
    raw?: string[];
  };
  keyHistory: Array<{
    date: string;
    summary: string;
  }>;
  currentStatus: {
    whereThingsStand?: string;
    risks?: string[];
    nextStep?: string;
    raw?: string[];
  };
  preferences: {
    communication?: string;
    style?: string;
    landmines?: string[];
    personal?: string[];
    raw?: string[];
  };
  unstructured?: string; // For legacy notes that don't follow structure
}

/**
 * Update to apply to notes
 */
export interface NoteUpdate {
  section: 'relationshipSummary' | 'whatTheyCareAbout' | 'keyHistory' | 'currentStatus' | 'preferences';
  field: string;
  value: string;
  confidence: 'explicit' | 'inferred';
  date: string;
}

/**
 * Section headers used in the markdown format
 */
const SECTION_HEADERS = {
  relationshipSummary: '## RELATIONSHIP SUMMARY',
  whatTheyCareAbout: '## WHAT THEY CARE ABOUT',
  keyHistory: '## KEY HISTORY',
  currentStatus: '## CURRENT STATUS',
  preferences: '## PREFERENCES & NOTES',
} as const;

/**
 * Field labels used in the markdown format
 */
const FIELD_LABELS: Record<string, Record<string, string>> = {
  relationshipSummary: {
    role: 'Role in our world',
    howWeMet: 'How we met',
    relationshipOwner: 'Relationship owner',
  },
  whatTheyCareAbout: {
    goals: 'Goals/KPIs',
    pains: 'Main pains',
    hotButtons: 'Hot buttons',
  },
  currentStatus: {
    whereThingsStand: 'Where things stand',
    risks: 'Risks/blockers',
    nextStep: 'Next step',
  },
  preferences: {
    communication: 'Communication',
    style: 'Style',
    landmines: 'Landmines',
    personal: 'Personal',
  },
};

/**
 * Initialize an empty parsed notes structure
 */
export function initializeEmptyNotes(): ParsedNotes {
  return {
    relationshipSummary: {},
    whatTheyCareAbout: {},
    keyHistory: [],
    currentStatus: {},
    preferences: {},
  };
}

/**
 * Parse markdown notes into a structured object
 */
export function parseNotes(markdown: string): ParsedNotes {
  if (!markdown || !markdown.trim()) {
    return initializeEmptyNotes();
  }

  const result = initializeEmptyNotes();
  const lines = markdown.split('\n');
  
  let currentSection: keyof typeof SECTION_HEADERS | null = null;
  let unstructuredLines: string[] = [];
  let sectionContent: string[] = [];

  const processSectionContent = () => {
    if (currentSection && sectionContent.length > 0) {
      parseSectionContent(result, currentSection, sectionContent);
      sectionContent = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section header
    let foundSection = false;
    for (const [section, header] of Object.entries(SECTION_HEADERS)) {
      if (trimmedLine === header || trimmedLine.startsWith(header)) {
        processSectionContent();
        currentSection = section as keyof typeof SECTION_HEADERS;
        foundSection = true;
        break;
      }
    }

    if (foundSection) {
      continue;
    }

    if (currentSection) {
      sectionContent.push(line);
    } else {
      // Content before any section header is unstructured
      unstructuredLines.push(line);
    }
  }

  // Process the last section
  processSectionContent();

  // Store any unstructured content
  const unstructuredContent = unstructuredLines.join('\n').trim();
  if (unstructuredContent) {
    result.unstructured = unstructuredContent;
  }

  return result;
}

/**
 * Parse content within a specific section
 */
function parseSectionContent(
  result: ParsedNotes,
  section: keyof typeof SECTION_HEADERS,
  lines: string[]
): void {
  if (section === 'keyHistory') {
    parseKeyHistory(result, lines);
    return;
  }

  const rawLines: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try to parse as a labeled field (e.g., "- **Role in our world:** value")
    const labelMatch = trimmedLine.match(/^-?\s*\*\*([^:*]+):\*\*\s*(.*)$/);
    if (labelMatch) {
      const [, label, value] = labelMatch;
      const fieldName = findFieldByLabel(section, label.trim());
      if (fieldName && value.trim()) {
        setFieldValue(result, section, fieldName, value.trim());
        continue;
      }
    }

    // Try to parse as a simple list item
    const listMatch = trimmedLine.match(/^-\s+(.+)$/);
    if (listMatch) {
      rawLines.push(listMatch[1]);
      continue;
    }

    // Store as raw content
    if (trimmedLine) {
      rawLines.push(trimmedLine);
    }
  }

  // Store any unparsed lines as raw content
  if (rawLines.length > 0) {
    const sectionData = result[section] as Record<string, unknown>;
    sectionData.raw = rawLines;
  }
}

/**
 * Parse key history section (dated entries)
 */
function parseKeyHistory(result: ParsedNotes, lines: string[]): void {
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match date patterns like "- YYYY-MM-DD - summary" or "- YYYY-MM-DD: summary"
    const dateMatch = trimmedLine.match(/^-?\s*(\d{4}-\d{2}-\d{2})\s*[-:]\s*(.+)$/);
    if (dateMatch) {
      const [, date, summary] = dateMatch;
      result.keyHistory.push({ date, summary: summary.trim() });
    }
  }
}

/**
 * Find field name by its display label
 */
function findFieldByLabel(section: string, label: string): string | null {
  const sectionLabels = FIELD_LABELS[section];
  if (!sectionLabels) return null;

  const normalizedLabel = label.toLowerCase();
  for (const [field, fieldLabel] of Object.entries(sectionLabels)) {
    if (fieldLabel.toLowerCase() === normalizedLabel) {
      return field;
    }
  }
  return null;
}

/**
 * Set a field value in the parsed notes structure
 */
function setFieldValue(
  result: ParsedNotes,
  section: keyof typeof SECTION_HEADERS,
  field: string,
  value: string
): void {
  const sectionData = result[section] as Record<string, unknown>;
  
  // Some fields are arrays (goals, pains, hotButtons, risks, landmines, personal)
  const arrayFields = ['goals', 'pains', 'hotButtons', 'risks', 'landmines', 'personal'];
  
  if (arrayFields.includes(field)) {
    // Parse comma-separated or semicolon-separated values
    const values = value.split(/[,;]/).map(v => v.trim()).filter(v => v);
    sectionData[field] = values;
  } else {
    sectionData[field] = value;
  }
}

/**
 * Serialize parsed notes back to markdown
 */
export function serializeNotes(parsed: ParsedNotes): string {
  const sections: string[] = [];

  // Add unstructured content first if present
  if (parsed.unstructured) {
    sections.push(parsed.unstructured);
    sections.push(''); // Empty line separator
  }

  // Relationship Summary
  const relSummary = serializeRelationshipSummary(parsed.relationshipSummary);
  if (relSummary) {
    sections.push(SECTION_HEADERS.relationshipSummary);
    sections.push(relSummary);
  }

  // What They Care About
  const careAbout = serializeWhatTheyCareAbout(parsed.whatTheyCareAbout);
  if (careAbout) {
    sections.push(SECTION_HEADERS.whatTheyCareAbout);
    sections.push(careAbout);
  }

  // Key History
  const history = serializeKeyHistory(parsed.keyHistory);
  if (history) {
    sections.push(SECTION_HEADERS.keyHistory);
    sections.push(history);
  }

  // Current Status
  const status = serializeCurrentStatus(parsed.currentStatus);
  if (status) {
    sections.push(SECTION_HEADERS.currentStatus);
    sections.push(status);
  }

  // Preferences
  const prefs = serializePreferences(parsed.preferences);
  if (prefs) {
    sections.push(SECTION_HEADERS.preferences);
    sections.push(prefs);
  }

  return sections.join('\n').trim();
}

/**
 * Serialize relationship summary section
 */
function serializeRelationshipSummary(data: ParsedNotes['relationshipSummary']): string {
  const lines: string[] = [];
  
  if (data.role) {
    lines.push(`- **${FIELD_LABELS.relationshipSummary.role}:** ${data.role}`);
  }
  if (data.howWeMet) {
    lines.push(`- **${FIELD_LABELS.relationshipSummary.howWeMet}:** ${data.howWeMet}`);
  }
  if (data.relationshipOwner) {
    lines.push(`- **${FIELD_LABELS.relationshipSummary.relationshipOwner}:** ${data.relationshipOwner}`);
  }
  if (data.raw && data.raw.length > 0) {
    for (const item of data.raw) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize what they care about section
 */
function serializeWhatTheyCareAbout(data: ParsedNotes['whatTheyCareAbout']): string {
  const lines: string[] = [];
  
  if (data.goals && data.goals.length > 0) {
    lines.push(`- **${FIELD_LABELS.whatTheyCareAbout.goals}:** ${data.goals.join(', ')}`);
  }
  if (data.pains && data.pains.length > 0) {
    lines.push(`- **${FIELD_LABELS.whatTheyCareAbout.pains}:** ${data.pains.join(', ')}`);
  }
  if (data.hotButtons && data.hotButtons.length > 0) {
    lines.push(`- **${FIELD_LABELS.whatTheyCareAbout.hotButtons}:** ${data.hotButtons.join(', ')}`);
  }
  if (data.raw && data.raw.length > 0) {
    for (const item of data.raw) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize key history section
 */
function serializeKeyHistory(history: ParsedNotes['keyHistory']): string {
  if (!history || history.length === 0) return '';
  
  // Sort by date descending (most recent first)
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  
  return sorted.map(entry => `- ${entry.date} - ${entry.summary}`).join('\n');
}

/**
 * Serialize current status section
 */
function serializeCurrentStatus(data: ParsedNotes['currentStatus']): string {
  const lines: string[] = [];
  
  if (data.whereThingsStand) {
    lines.push(`- **${FIELD_LABELS.currentStatus.whereThingsStand}:** ${data.whereThingsStand}`);
  }
  if (data.risks && data.risks.length > 0) {
    lines.push(`- **${FIELD_LABELS.currentStatus.risks}:** ${data.risks.join(', ')}`);
  }
  if (data.nextStep) {
    lines.push(`- **${FIELD_LABELS.currentStatus.nextStep}:** ${data.nextStep}`);
  }
  if (data.raw && data.raw.length > 0) {
    for (const item of data.raw) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize preferences section
 */
function serializePreferences(data: ParsedNotes['preferences']): string {
  const lines: string[] = [];
  
  if (data.communication) {
    lines.push(`- **${FIELD_LABELS.preferences.communication}:** ${data.communication}`);
  }
  if (data.style) {
    lines.push(`- **${FIELD_LABELS.preferences.style}:** ${data.style}`);
  }
  if (data.landmines && data.landmines.length > 0) {
    lines.push(`- **${FIELD_LABELS.preferences.landmines}:** ${data.landmines.join(', ')}`);
  }
  if (data.personal && data.personal.length > 0) {
    lines.push(`- **${FIELD_LABELS.preferences.personal}:** ${data.personal.join(', ')}`);
  }
  if (data.raw && data.raw.length > 0) {
    for (const item of data.raw) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}

/**
 * Apply an update to parsed notes
 */
export function applyUpdate(existing: ParsedNotes, update: NoteUpdate): ParsedNotes {
  const result = JSON.parse(JSON.stringify(existing)) as ParsedNotes;
  
  if (update.section === 'keyHistory') {
    // Always append to history
    result.keyHistory.push({
      date: update.date,
      summary: update.value,
    });
    return result;
  }

  const sectionData = result[update.section] as Record<string, unknown>;
  const arrayFields = ['goals', 'pains', 'hotButtons', 'risks', 'landmines', 'personal'];

  if (arrayFields.includes(update.field)) {
    // For array fields, append to existing array
    const existingArray = (sectionData[update.field] as string[]) || [];
    if (!existingArray.includes(update.value)) {
      sectionData[update.field] = [...existingArray, update.value];
    }
  } else {
    // For scalar fields, update the value
    sectionData[update.field] = update.value;
  }

  return result;
}

/**
 * Merge two parsed notes structures
 * Updates from 'updates' are applied to 'existing'
 */
export function mergeNotes(existing: ParsedNotes, updates: Partial<ParsedNotes>): ParsedNotes {
  const result = JSON.parse(JSON.stringify(existing)) as ParsedNotes;

  // Merge relationship summary
  if (updates.relationshipSummary) {
    result.relationshipSummary = {
      ...result.relationshipSummary,
      ...updates.relationshipSummary,
    };
  }

  // Merge what they care about (arrays are concatenated, deduped)
  if (updates.whatTheyCareAbout) {
    const merged = result.whatTheyCareAbout;
    const upd = updates.whatTheyCareAbout;
    
    if (upd.goals) {
      merged.goals = [...new Set([...(merged.goals || []), ...upd.goals])];
    }
    if (upd.pains) {
      merged.pains = [...new Set([...(merged.pains || []), ...upd.pains])];
    }
    if (upd.hotButtons) {
      merged.hotButtons = [...new Set([...(merged.hotButtons || []), ...upd.hotButtons])];
    }
  }

  // Merge key history (append new entries)
  if (updates.keyHistory && updates.keyHistory.length > 0) {
    const existingDates = new Set(result.keyHistory.map(h => `${h.date}:${h.summary}`));
    for (const entry of updates.keyHistory) {
      const key = `${entry.date}:${entry.summary}`;
      if (!existingDates.has(key)) {
        result.keyHistory.push(entry);
      }
    }
  }

  // Merge current status
  if (updates.currentStatus) {
    const merged = result.currentStatus;
    const upd = updates.currentStatus;
    
    if (upd.whereThingsStand) merged.whereThingsStand = upd.whereThingsStand;
    if (upd.nextStep) merged.nextStep = upd.nextStep;
    if (upd.risks) {
      merged.risks = [...new Set([...(merged.risks || []), ...upd.risks])];
    }
  }

  // Merge preferences
  if (updates.preferences) {
    const merged = result.preferences;
    const upd = updates.preferences;
    
    if (upd.communication) merged.communication = upd.communication;
    if (upd.style) merged.style = upd.style;
    if (upd.landmines) {
      merged.landmines = [...new Set([...(merged.landmines || []), ...upd.landmines])];
    }
    if (upd.personal) {
      merged.personal = [...new Set([...(merged.personal || []), ...upd.personal])];
    }
  }

  return result;
}

/**
 * Check if notes have any content
 */
export function hasContent(parsed: ParsedNotes): boolean {
  return !!(
    parsed.unstructured ||
    parsed.relationshipSummary.role ||
    parsed.relationshipSummary.howWeMet ||
    parsed.relationshipSummary.relationshipOwner ||
    (parsed.relationshipSummary.raw && parsed.relationshipSummary.raw.length > 0) ||
    (parsed.whatTheyCareAbout.goals && parsed.whatTheyCareAbout.goals.length > 0) ||
    (parsed.whatTheyCareAbout.pains && parsed.whatTheyCareAbout.pains.length > 0) ||
    (parsed.whatTheyCareAbout.hotButtons && parsed.whatTheyCareAbout.hotButtons.length > 0) ||
    (parsed.whatTheyCareAbout.raw && parsed.whatTheyCareAbout.raw.length > 0) ||
    parsed.keyHistory.length > 0 ||
    parsed.currentStatus.whereThingsStand ||
    parsed.currentStatus.nextStep ||
    (parsed.currentStatus.risks && parsed.currentStatus.risks.length > 0) ||
    (parsed.currentStatus.raw && parsed.currentStatus.raw.length > 0) ||
    parsed.preferences.communication ||
    parsed.preferences.style ||
    (parsed.preferences.landmines && parsed.preferences.landmines.length > 0) ||
    (parsed.preferences.personal && parsed.preferences.personal.length > 0) ||
    (parsed.preferences.raw && parsed.preferences.raw.length > 0)
  );
}

// Export as a class for consistency with other services
export const NotesParser = {
  parseNotes,
  serializeNotes,
  applyUpdate,
  mergeNotes,
  initializeEmptyNotes,
  hasContent,
};