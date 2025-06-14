import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TrainerResponseData {
  message: string;
  todaysPlan?: {
    sessionType?: string;
    macroTargets: {
      kcal_target: number;
      protein_g: number;
      carb_g: number;
      fat_g: number;
    };
  };
}

export class TrainerService {
  private readonly SYSTEM_PROMPT = `## 1. Identity & Goal

You are **Lean‑Bulk Coach**, Danny's AI training partner.

**Equipment Inventory (use ONLY these):**

* **RowErg**
* **Treadmill**
* **Dumbbells** – pairs from 5‑50 lb (5‑lb steps) **plus** 60 lb pair
* **Barbell** + plates, **Rack**, **Pull‑up bar**
* **Trap bar**
* **Ancore single‑stack cable** (max 50 lb)
* Assorted resistance **bands**, straps, foam roller, yoga ball

**North‑star:** add ≈ 0.55 lb lean mass per week while keeping the 7‑day average body‑fat ≤ 13 %.

## 2. Core Rules (19)

1. **Morning ask:** BW lb, BF %, sleep h, fatigue 1‑5, mood, back 0‑10, training window(s).
2. **Block spacing:** no duplicate archetype on consecutive days; never schedule both Row (Z2, SPR) within 24 h.
3. **Two‑a‑day:** AM = cardio/mobility (Z2, SPR, mobility); PM = strength (UP, LK, UV, LH); ≥ 6 h apart.
4. **Rolling memory:** keep last **5 logs per lift** (date | load | reps | sets | RPE). On inserting #6, drop oldest.
5. **Progressive overload:** if hit top‑rep & RPE ≤ 8 → +5 lb upper / +10 lb lower; if RPE ≥ 9.5 → −5 %; else hold. No hinge increase if back ≤ 3/10.
   *If a lift hasn't increased for ********two weeks******** and avg RPE < 8, add a ********back‑off set******** (1×8‑10 @ ∼80 % load).*
6. **Start‑up load:** if no history for a lift → ask Danny for a starting weight or suggest 45 lb (upper) / 95 lb (lower) / BW and wait for confirmation. If not confirmed, **repeat the request the next morning**.
7. **Guard‑rail:** kcal = maintenance + 250 while BF ≤ 13 %; switch to maintenance × 0.9 until BF ≤ 12 %.
8. **Sun kcal tune:** adjust maintenance only if weekly BW change > 0.77 lb (–100 kcal) **or < 0.30 lb (+100 kcal)**; otherwise hold.
9. **Incremental logs:** accept multiple \`LOG:\` lines or shorthand \`B 205×5×4@8\`; parse and append immediately.
10. **Explain:** one concise line when plan/kcal/load changes; Danny override wins.
11. **Safety deload:** if back comfort ≤ 3/10 for two consecutive days, schedule mobility day and hold hinge loads.
12. **Proactive deload:** every **6th training week** auto‑schedule a deload: compounds 2×5 @ 80 % load; accessories 1×15; cardio only Z2.
13. **Evening macros:** at 20:00 ask Danny to report **actual totals** – kcal, P g, C g, F g; log in 7‑Day Macros.
14. **Macro compliance check:** if 7‑day avg protein < 0.9 g/lb **or** kcal < target –10 % for two straight weeks → remind Danny to increase intake (do **not** lower targets).
15. **Surplus auto‑bump:** if BW gain < 0.30 lb/week for 2 weeks **and** BF ≤ 12.5 % → raise kcal surplus to **+350 kcal**; subsequent misses adjust +100 kcal.
16. **Volume auto‑escalate:** if avg RPE ≤ 7 for two sessions *and* reps at top range → add **one accessory round** (max 4).
17. **Exercise rotation:** change primary press & hinge variant every 4th week (e.g., Bench → DB Incline; Trap‑bar → RDL); track with \`### Meso Tracker\`.
18. **Equipment constraint:** prescribe movements **only with listed equipment**; if a sample lift isn't possible, substitute a functionally similar exercise.
19. **Daily macro output:** after receiving morning metrics, calculate today's \`kcal_target\`, \`protein_g\`, \`carb_g\`, \`fat_g\` per Nutrition §5 and include them in the **Today's Plan** block (labelled "Macro Targets").

## 3. Session Templates

**Strength (UP, LK, UV, LH)** – two compounds (4×4‑6) + accessory superset 3×8‑12.
**Cardio** – Z2 20‑30 min @ 65 % HRmax; SPR 6×30 s/60 s easy.

## 4. Training Block Tags

UP (bench + pull) • LK (squat + single‑leg quad) • UV (OHP + row) • LH (hinge + hip thrust) • Z2 (steady row) • SPR (sprint row)

## 5. Nutrition (imperial)

\`\`\`python
phase = "Surplus" if bf_7avg <= 13 else "Mini-cut"

# --- calorie target ---
base_kcal = maintenance + 250 if phase=="Surplus" else maintenance * 0.9

# extra energy for rowing cardio (RowErg Z2 or SPR)
if cardio_day and phase=="Surplus":
    kcal_target = base_kcal + 200   # 50 g carbs * 4 kcal/g
else:
    kcal_target = base_kcal         # in Mini-cut, keep kcal constant; only macro shift if desired

# --- macros ---
protein_g = 1.0 * BW_lb
fat_g     = 0.4 * BW_lb
carb_g    = (kcal_target - (protein_g*4 + fat_g*9)) / 4

# ensure rowing-day carbs reflect the +200 kcal bump
if cardio_day and phase=="Surplus":
    carb_g += 50
\`\`\`

*In Mini-cut with cardio, keep kcal constant; adjust within carb/fat if needed.*

## 6. Weekly Summary (Sun 18:00 PT)

Send lean‑mass trend, BF % vs guard‑rail, kcal log, load snapshot, upcoming tweaks.

---

You maintain rolling tables in your memory that track:
- **Rolling Session Table**: Last 5 logs per lift (date | load lb | reps | sets | RPE)
- **Rolling 4-Week Metrics**: Week averages (Week-start | BW lb (avg) | BF % (avg))
- **Rolling 7-Day Macros**: Daily logs (Date | kcal | P | C | F)
- **Meso Tracker**: Current cycle (Week number 1-4 | Current Press | Current Hinge)

Always respond as Danny's personal trainer, using the rules above to guide training and nutrition decisions.`;

  async generateResponse(userId: string, userMessage: string, conversationHistory: any[]): Promise<TrainerResponseData> {
    try {
      // Get user's current metrics and settings
      const [currentMetrics, settings, recentWorkouts, recentMacros] = await Promise.all([
        this.getCurrentMetrics(userId),
        this.getOrCreateSettings(userId),
        this.getRecentWorkouts(userId, 5),
        this.getRecentMacros(userId, 7)
      ]);

      // Build context for the AI
      const contextData = await this.buildTrainerContext(userId, currentMetrics, settings, recentWorkouts, recentMacros);
      
      // Prepare messages for OpenAI
      const messages = [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'system', content: `Current Context:\n${contextData}` },
        ...conversationHistory.slice(-10).map(msg => ({
          role: msg.role === 'trainer' ? 'assistant' : 'user',
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const trainerMessage = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

      // Calculate macro targets based on current metrics and settings
      const macroTargets = await this.calculateMacroTargets(userId, currentMetrics, settings);

      return {
        message: trainerMessage,
        todaysPlan: {
          macroTargets
        }
      };

    } catch (error) {
      console.error('Error generating trainer response:', error);
      return {
        message: 'I apologize, but I encountered an error. Please try again later.',
        todaysPlan: {
          macroTargets: {
            kcal_target: 2450,
            protein_g: 180,
            carb_g: 250,
            fat_g: 80
          }
        }
      };
    }
  }

  async updateDailyMetrics(userId: string, metricsData: any) {
    const date = new Date(metricsData.date || new Date().toISOString().split('T')[0]);
    
    return await prisma.dailyMetrics.upsert({
      where: {
        userId_date: { userId, date }
      },
      update: {
        bodyWeight: metricsData.bodyWeight,
        bodyFatPct: metricsData.bodyFatPct,
        sleepHours: metricsData.sleepHours,
        fatigueLevel: metricsData.fatigueLevel,
        mood: metricsData.mood,
        backComfort: metricsData.backComfort,
        trainingWindow: metricsData.trainingWindow,
      },
      create: {
        userId,
        date,
        bodyWeight: metricsData.bodyWeight,
        bodyFatPct: metricsData.bodyFatPct,
        sleepHours: metricsData.sleepHours,
        fatigueLevel: metricsData.fatigueLevel,
        mood: metricsData.mood,
        backComfort: metricsData.backComfort,
        trainingWindow: metricsData.trainingWindow,
      }
    });
  }

  async updateDailyMacros(userId: string, macrosData: any) {
    const date = new Date(macrosData.date || new Date().toISOString().split('T')[0]);
    
    return await prisma.dailyMacros.upsert({
      where: {
        userId_date: { userId, date }
      },
      update: {
        calories: macrosData.calories,
        protein: macrosData.protein,
        carbs: macrosData.carbs,
        fat: macrosData.fat,
      },
      create: {
        userId,
        date,
        calories: macrosData.calories,
        protein: macrosData.protein,
        carbs: macrosData.carbs,
        fat: macrosData.fat,
      }
    });
  }

  async createWorkoutSession(userId: string, workoutData: any) {
    return await prisma.workoutSession.create({
      data: {
        userId,
        date: new Date(workoutData.date),
        sessionType: workoutData.sessionType,
        notes: workoutData.notes,
        exercises: {
          create: workoutData.exercises.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            sets: {
              create: exercise.sets.map((set: any) => ({
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe,
                setNumber: set.setNumber,
              }))
            }
          }))
        }
      },
      include: {
        exercises: {
          include: {
            sets: {
              orderBy: { setNumber: 'asc' }
            }
          }
        }
      }
    });
  }

  private async getCurrentMetrics(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return await prisma.dailyMetrics.findUnique({
      where: {
        userId_date: {
          userId,
          date: new Date(today)
        }
      }
    });
  }

  private async getOrCreateSettings(userId: string) {
    let settings = await prisma.trainerSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await prisma.trainerSettings.create({
        data: { userId }
      });
    }

    return settings;
  }

  private async getRecentWorkouts(userId: string, limit: number) {
    return await prisma.workoutSession.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            sets: {
              orderBy: { setNumber: 'asc' }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit
    });
  }

  private async getRecentMacros(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.dailyMacros.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  private async buildTrainerContext(userId: string, currentMetrics: any, settings: any, recentWorkouts: any[], recentMacros: any[]): Promise<string> {
    let context = `### Current Status\n`;
    context += `**Settings**: Phase: ${settings.currentPhase}, Maintenance: ${settings.maintenanceKcal} kcal, Meso Week: ${settings.mesoWeek}\n`;
    context += `**Current Press**: ${settings.currentPress}, **Current Hinge**: ${settings.currentHinge}\n\n`;

    if (currentMetrics) {
      context += `**Today's Metrics**:\n`;
      if (currentMetrics.bodyWeight) context += `- Body Weight: ${currentMetrics.bodyWeight} lb\n`;
      if (currentMetrics.bodyFatPct) context += `- Body Fat: ${currentMetrics.bodyFatPct}%\n`;
      if (currentMetrics.sleepHours) context += `- Sleep: ${currentMetrics.sleepHours} hours\n`;
      if (currentMetrics.fatigueLevel) context += `- Fatigue: ${currentMetrics.fatigueLevel}/5\n`;
      if (currentMetrics.mood) context += `- Mood: ${currentMetrics.mood}\n`;
      if (currentMetrics.backComfort) context += `- Back Comfort: ${currentMetrics.backComfort}/10\n`;
      if (currentMetrics.trainingWindow) context += `- Training Window: ${currentMetrics.trainingWindow}\n`;
      context += `\n`;
    }

    if (recentWorkouts.length > 0) {
      context += `### Recent Workouts (last 5)\n`;
      recentWorkouts.forEach(workout => {
        context += `**${workout.date.toISOString().split('T')[0]}** - ${workout.sessionType}:\n`;
        workout.exercises.forEach((exercise: any) => {
          const sets = exercise.sets.map((set: any) => `${set.weight}x${set.reps}${set.rpe ? `@${set.rpe}` : ''}`).join(', ');
          context += `  - ${exercise.name}: ${sets}\n`;
        });
      });
      context += `\n`;
    }

    if (recentMacros.length > 0) {
      context += `### Recent Macros (last 7 days)\n`;
      recentMacros.forEach(macro => {
        context += `**${macro.date.toISOString().split('T')[0]}**: ${macro.calories} kcal, ${macro.protein}g P, ${macro.carbs}g C, ${macro.fat}g F\n`;
      });
      context += `\n`;
    }

    return context;
  }

  private generateMockResponse(userMessage: string, currentMetrics: any): string {
    const responses = [
      "👋 Hey Danny! I see you're checking in. Let's get those morning metrics logged and plan today's training session. What are your BW, BF%, sleep, fatigue (1-5), mood, back comfort (0-10), and training window?",
      "Good morning! Ready to crush another day of lean-bulk progress. Send me your metrics and I'll calculate today's macro targets and training plan.",
      "Let's keep that lean mass building! I need your daily check-in data to optimize today's plan. How are you feeling and what's your training availability?",
      "Time to dial in today's approach. Your metrics help me adjust the plan perfectly. What's the status on all fronts?",
      "Another day closer to your goals! Drop those morning numbers and let's see what training block we're hitting today."
    ];
    
    // Simple logic based on message content
    if (userMessage.toLowerCase().includes('log') || userMessage.toLowerCase().includes('weight')) {
      return "Perfect! I've logged your data. Based on your current metrics, I'm calculating your macro targets. Keep up the consistency - that's how we build lean mass systematically.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async calculateMacroTargets(userId: string, currentMetrics: any, settings: any): Promise<{ kcal_target: number; protein_g: number; carb_g: number; fat_g: number; }> {
    const bodyWeight = currentMetrics?.bodyWeight || 180; // Default if no metrics
    const bodyFatPct = currentMetrics?.bodyFatPct || 12; // Default if no metrics
    const maintenanceKcal = settings.maintenanceKcal;
    const phase = settings.currentPhase;

    // Determine phase based on body fat
    const currentPhase = bodyFatPct <= 13 ? 'Surplus' : 'Mini-cut';
    
    // Calculate base calories
    let baseKcal = currentPhase === 'Surplus' ? maintenanceKcal + 250 : maintenanceKcal * 0.9;
    
    // Check if today is a cardio day (simplified - you could make this more sophisticated)
    const today = new Date().getDay();
    const isCardioDay = today % 2 === 0; // Example: cardio on even days
    
    let kcalTarget = baseKcal;
    if (isCardioDay && currentPhase === 'Surplus') {
      kcalTarget += 200; // Extra 200 kcal for cardio days
    }

    // Calculate macros
    const proteinG = 1.0 * bodyWeight;
    const fatG = 0.4 * bodyWeight;
    let carbG = (kcalTarget - (proteinG * 4 + fatG * 9)) / 4;

    // Extra carbs for cardio days
    if (isCardioDay && currentPhase === 'Surplus') {
      carbG += 50;
    }

    return {
      kcal_target: Math.round(kcalTarget),
      protein_g: Math.round(proteinG),
      carb_g: Math.round(carbG),
      fat_g: Math.round(fatG)
    };
  }
}