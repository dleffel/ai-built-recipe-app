import {
  parseNotes,
  serializeNotes,
  applyUpdate,
  mergeNotes,
  initializeEmptyNotes,
  hasContent,
  ParsedNotes,
  NoteUpdate,
} from '../utils/notesParser';

describe('NotesParser', () => {
  describe('initializeEmptyNotes', () => {
    it('should return an empty notes structure', () => {
      const empty = initializeEmptyNotes();
      expect(empty).toEqual({
        relationshipSummary: {},
        whatTheyCareAbout: {},
        keyHistory: [],
        currentStatus: {},
        preferences: {},
      });
    });
  });

  describe('parseNotes', () => {
    it('should return empty structure for empty string', () => {
      const result = parseNotes('');
      expect(result).toEqual(initializeEmptyNotes());
    });

    it('should return empty structure for whitespace only', () => {
      const result = parseNotes('   \n\n   ');
      expect(result).toEqual(initializeEmptyNotes());
    });

    it('should parse relationship summary section', () => {
      const markdown = `## RELATIONSHIP SUMMARY
- **Role in our world:** Decision maker
- **How we met:** Conference in NYC
- **Relationship owner:** John Smith`;

      const result = parseNotes(markdown);
      expect(result.relationshipSummary.role).toBe('Decision maker');
      expect(result.relationshipSummary.howWeMet).toBe('Conference in NYC');
      expect(result.relationshipSummary.relationshipOwner).toBe('John Smith');
    });

    it('should parse what they care about section with arrays', () => {
      const markdown = `## WHAT THEY CARE ABOUT
- **Goals/KPIs:** Increase revenue, Reduce churn
- **Main pains:** Legacy systems, Slow deployment
- **Hot buttons:** Automation, Cost savings`;

      const result = parseNotes(markdown);
      expect(result.whatTheyCareAbout.goals).toEqual(['Increase revenue', 'Reduce churn']);
      expect(result.whatTheyCareAbout.pains).toEqual(['Legacy systems', 'Slow deployment']);
      expect(result.whatTheyCareAbout.hotButtons).toEqual(['Automation', 'Cost savings']);
    });

    it('should parse key history section with dated entries', () => {
      const markdown = `## KEY HISTORY
- 2024-01-15 - Initial call, discussed requirements
- 2024-02-01 - Demo session, positive feedback
- 2024-02-15 - Sent proposal`;

      const result = parseNotes(markdown);
      expect(result.keyHistory).toHaveLength(3);
      expect(result.keyHistory[0]).toEqual({
        date: '2024-01-15',
        summary: 'Initial call, discussed requirements',
      });
      expect(result.keyHistory[1]).toEqual({
        date: '2024-02-01',
        summary: 'Demo session, positive feedback',
      });
      expect(result.keyHistory[2]).toEqual({
        date: '2024-02-15',
        summary: 'Sent proposal',
      });
    });

    it('should parse current status section', () => {
      const markdown = `## CURRENT STATUS
- **Where things stand:** In negotiation phase
- **Risks/blockers:** Budget approval pending, Q4 freeze possible
- **Next step:** Follow up after board meeting`;

      const result = parseNotes(markdown);
      expect(result.currentStatus.whereThingsStand).toBe('In negotiation phase');
      expect(result.currentStatus.risks).toEqual(['Budget approval pending', 'Q4 freeze possible']);
      expect(result.currentStatus.nextStep).toBe('Follow up after board meeting');
    });

    it('should parse preferences section', () => {
      const markdown = `## PREFERENCES & NOTES
- **Communication:** Prefers email, mornings PST
- **Style:** Detail-oriented, likes data
- **Landmines:** Burned by competitor X, hates cold calls
- **Personal:** Has 2 dogs, loves hiking`;

      const result = parseNotes(markdown);
      expect(result.preferences.communication).toBe('Prefers email, mornings PST');
      expect(result.preferences.style).toBe('Detail-oriented, likes data');
      expect(result.preferences.landmines).toEqual(['Burned by competitor X', 'hates cold calls']);
      expect(result.preferences.personal).toEqual(['Has 2 dogs', 'loves hiking']);
    });

    it('should handle unstructured content before sections', () => {
      const markdown = `This is some legacy notes content
that doesn't follow the structure.

## RELATIONSHIP SUMMARY
- **Role in our world:** Champion`;

      const result = parseNotes(markdown);
      expect(result.unstructured).toBe("This is some legacy notes content\nthat doesn't follow the structure.");
      expect(result.relationshipSummary.role).toBe('Champion');
    });

    it('should parse complete notes with all sections', () => {
      const markdown = `## RELATIONSHIP SUMMARY
- **Role in our world:** Decision maker
- **How we met:** Intro from Sarah

## WHAT THEY CARE ABOUT
- **Goals/KPIs:** Scale operations
- **Main pains:** Manual processes

## KEY HISTORY
- 2024-03-01 - First meeting

## CURRENT STATUS
- **Where things stand:** Evaluating options
- **Next step:** Send case study

## PREFERENCES & NOTES
- **Communication:** Slack preferred`;

      const result = parseNotes(markdown);
      expect(result.relationshipSummary.role).toBe('Decision maker');
      expect(result.relationshipSummary.howWeMet).toBe('Intro from Sarah');
      expect(result.whatTheyCareAbout.goals).toEqual(['Scale operations']);
      expect(result.whatTheyCareAbout.pains).toEqual(['Manual processes']);
      expect(result.keyHistory).toHaveLength(1);
      expect(result.currentStatus.whereThingsStand).toBe('Evaluating options');
      expect(result.currentStatus.nextStep).toBe('Send case study');
      expect(result.preferences.communication).toBe('Slack preferred');
    });
  });

  describe('serializeNotes', () => {
    it('should return empty string for empty notes', () => {
      const empty = initializeEmptyNotes();
      const result = serializeNotes(empty);
      expect(result).toBe('');
    });

    it('should serialize relationship summary', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        relationshipSummary: {
          role: 'Champion',
          howWeMet: 'LinkedIn',
        },
      };

      const result = serializeNotes(notes);
      expect(result).toContain('## RELATIONSHIP SUMMARY');
      expect(result).toContain('- **Role in our world:** Champion');
      expect(result).toContain('- **How we met:** LinkedIn');
    });

    it('should serialize key history in descending date order', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        keyHistory: [
          { date: '2024-01-01', summary: 'First' },
          { date: '2024-03-01', summary: 'Third' },
          { date: '2024-02-01', summary: 'Second' },
        ],
      };

      const result = serializeNotes(notes);
      const lines = result.split('\n');
      const historyLines = lines.filter(l => l.match(/^\- \d{4}-\d{2}-\d{2}/));
      
      expect(historyLines[0]).toContain('2024-03-01');
      expect(historyLines[1]).toContain('2024-02-01');
      expect(historyLines[2]).toContain('2024-01-01');
    });

    it('should serialize arrays as comma-separated values', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        whatTheyCareAbout: {
          goals: ['Goal 1', 'Goal 2', 'Goal 3'],
        },
      };

      const result = serializeNotes(notes);
      expect(result).toContain('- **Goals/KPIs:** Goal 1, Goal 2, Goal 3');
    });

    it('should include unstructured content at the beginning', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        unstructured: 'Legacy notes here',
        relationshipSummary: {
          role: 'Contact',
        },
      };

      const result = serializeNotes(notes);
      expect(result.startsWith('Legacy notes here')).toBe(true);
    });

    it('should round-trip parse and serialize', () => {
      const original = `## RELATIONSHIP SUMMARY
- **Role in our world:** Decision maker
- **How we met:** Conference

## WHAT THEY CARE ABOUT
- **Goals/KPIs:** Growth, Efficiency

## KEY HISTORY
- 2024-03-01 - Meeting
- 2024-02-01 - Call

## CURRENT STATUS
- **Where things stand:** Active
- **Next step:** Demo

## PREFERENCES & NOTES
- **Communication:** Email`;

      const parsed = parseNotes(original);
      const serialized = serializeNotes(parsed);
      const reparsed = parseNotes(serialized);

      expect(reparsed.relationshipSummary.role).toBe(parsed.relationshipSummary.role);
      expect(reparsed.whatTheyCareAbout.goals).toEqual(parsed.whatTheyCareAbout.goals);
      expect(reparsed.keyHistory).toHaveLength(parsed.keyHistory.length);
      expect(reparsed.currentStatus.whereThingsStand).toBe(parsed.currentStatus.whereThingsStand);
      expect(reparsed.preferences.communication).toBe(parsed.preferences.communication);
    });
  });

  describe('applyUpdate', () => {
    it('should add a key history entry', () => {
      const existing = initializeEmptyNotes();
      const update: NoteUpdate = {
        section: 'keyHistory',
        field: 'entry',
        value: 'Had a great call about their needs',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.keyHistory).toHaveLength(1);
      expect(result.keyHistory[0]).toEqual({
        date: '2024-03-15',
        summary: 'Had a great call about their needs',
      });
    });

    it('should append to existing key history', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        keyHistory: [{ date: '2024-01-01', summary: 'First entry' }],
      };
      const update: NoteUpdate = {
        section: 'keyHistory',
        field: 'entry',
        value: 'Second entry',
        confidence: 'explicit',
        date: '2024-02-01',
      };

      const result = applyUpdate(existing, update);
      expect(result.keyHistory).toHaveLength(2);
    });

    it('should update scalar fields in relationship summary', () => {
      const existing = initializeEmptyNotes();
      const update: NoteUpdate = {
        section: 'relationshipSummary',
        field: 'role',
        value: 'Decision maker',
        confidence: 'inferred',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.relationshipSummary.role).toBe('Decision maker');
    });

    it('should append to array fields without duplicates', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        whatTheyCareAbout: {
          goals: ['Existing goal'],
        },
      };
      const update: NoteUpdate = {
        section: 'whatTheyCareAbout',
        field: 'goals',
        value: 'New goal',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.whatTheyCareAbout.goals).toEqual(['Existing goal', 'New goal']);
    });

    it('should not duplicate existing array values', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        whatTheyCareAbout: {
          goals: ['Existing goal'],
        },
      };
      const update: NoteUpdate = {
        section: 'whatTheyCareAbout',
        field: 'goals',
        value: 'Existing goal',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.whatTheyCareAbout.goals).toEqual(['Existing goal']);
    });

    it('should update current status fields', () => {
      const existing = initializeEmptyNotes();
      const update: NoteUpdate = {
        section: 'currentStatus',
        field: 'whereThingsStand',
        value: 'In active discussion',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.currentStatus.whereThingsStand).toBe('In active discussion');
    });

    it('should update preferences fields', () => {
      const existing = initializeEmptyNotes();
      const update: NoteUpdate = {
        section: 'preferences',
        field: 'communication',
        value: 'Prefers Slack',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      const result = applyUpdate(existing, update);
      expect(result.preferences.communication).toBe('Prefers Slack');
    });

    it('should not mutate the original notes', () => {
      const existing = initializeEmptyNotes();
      const update: NoteUpdate = {
        section: 'relationshipSummary',
        field: 'role',
        value: 'Champion',
        confidence: 'explicit',
        date: '2024-03-15',
      };

      applyUpdate(existing, update);
      expect(existing.relationshipSummary.role).toBeUndefined();
    });
  });

  describe('mergeNotes', () => {
    it('should merge relationship summary fields', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        relationshipSummary: {
          role: 'Contact',
        },
      };
      const updates: Partial<ParsedNotes> = {
        relationshipSummary: {
          howWeMet: 'Conference',
        },
      };

      const result = mergeNotes(existing, updates);
      expect(result.relationshipSummary.role).toBe('Contact');
      expect(result.relationshipSummary.howWeMet).toBe('Conference');
    });

    it('should merge and dedupe array fields', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        whatTheyCareAbout: {
          goals: ['Goal A', 'Goal B'],
        },
      };
      const updates: Partial<ParsedNotes> = {
        whatTheyCareAbout: {
          goals: ['Goal B', 'Goal C'],
        },
      };

      const result = mergeNotes(existing, updates);
      expect(result.whatTheyCareAbout.goals).toEqual(['Goal A', 'Goal B', 'Goal C']);
    });

    it('should append new key history entries', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        keyHistory: [{ date: '2024-01-01', summary: 'First' }],
      };
      const updates: Partial<ParsedNotes> = {
        keyHistory: [{ date: '2024-02-01', summary: 'Second' }],
      };

      const result = mergeNotes(existing, updates);
      expect(result.keyHistory).toHaveLength(2);
    });

    it('should not duplicate identical key history entries', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        keyHistory: [{ date: '2024-01-01', summary: 'Entry' }],
      };
      const updates: Partial<ParsedNotes> = {
        keyHistory: [{ date: '2024-01-01', summary: 'Entry' }],
      };

      const result = mergeNotes(existing, updates);
      expect(result.keyHistory).toHaveLength(1);
    });

    it('should update current status scalar fields', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        currentStatus: {
          whereThingsStand: 'Old status',
        },
      };
      const updates: Partial<ParsedNotes> = {
        currentStatus: {
          whereThingsStand: 'New status',
        },
      };

      const result = mergeNotes(existing, updates);
      expect(result.currentStatus.whereThingsStand).toBe('New status');
    });

    it('should not mutate the original notes', () => {
      const existing: ParsedNotes = {
        ...initializeEmptyNotes(),
        relationshipSummary: {
          role: 'Original',
        },
      };
      const updates: Partial<ParsedNotes> = {
        relationshipSummary: {
          role: 'Updated',
        },
      };

      mergeNotes(existing, updates);
      expect(existing.relationshipSummary.role).toBe('Original');
    });
  });

  describe('hasContent', () => {
    it('should return false for empty notes', () => {
      const empty = initializeEmptyNotes();
      expect(hasContent(empty)).toBe(false);
    });

    it('should return true if unstructured content exists', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        unstructured: 'Some legacy notes',
      };
      expect(hasContent(notes)).toBe(true);
    });

    it('should return true if relationship summary has content', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        relationshipSummary: {
          role: 'Champion',
        },
      };
      expect(hasContent(notes)).toBe(true);
    });

    it('should return true if key history has entries', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        keyHistory: [{ date: '2024-01-01', summary: 'Entry' }],
      };
      expect(hasContent(notes)).toBe(true);
    });

    it('should return true if preferences has content', () => {
      const notes: ParsedNotes = {
        ...initializeEmptyNotes(),
        preferences: {
          communication: 'Email',
        },
      };
      expect(hasContent(notes)).toBe(true);
    });
  });
});