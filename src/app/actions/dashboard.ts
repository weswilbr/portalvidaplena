"use server";

import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfToday } from "date-fns";

export async function getDashboardData() {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const todayStart = startOfToday();

    // 1. Stats
    const totalLeads = await prisma.lead.count();
    const monthlyLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Get primary goal (assuming there's one main goal)
    const mainGoal = await prisma.goal.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // Get latest metrics
    const latestMetric = await prisma.metric.findFirst({
      orderBy: { date: "desc" },
    });

    // 2. Evolution Chart (last 7 days of leads)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const evolutionData = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = await prisma.lead.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDay,
            },
          },
        });
        return {
          day: date.getDate(),
          value: count,
        };
      })
    );

    // 3. Upcoming Actions
    const upcomingActions = await prisma.agendaItem.findMany({
      where: {
        start: {
          gte: todayStart,
        },
        status: "PENDING",
      },
      orderBy: { start: "asc" },
      take: 3,
    });

    // 4. Conversion Calculation (Mock logic based on available leads)
    const closedLeads = await prisma.lead.count({ where: { status: "CLOSED" } });
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

    return {
      stats: {
        newLeadsMonthly: monthlyLeads,
        totalLP: mainGoal?.currentLP || 0,
        goalTitle: mainGoal?.title || "Ouro Elite",
        goalProgress: mainGoal ? (mainGoal.currentLP / mainGoal.targetLP) * 100 : 0,
        bonusPhase: "Fase 1",
        organizationLP: 15200, // This could be calculated from a more complex tree
        qualifiedLeaders: 3,   // This could be calculated from team status
      },
      mainGoal: mainGoal || {
        title: "Ouro Elite",
        currentLP: 0,
        targetLP: 5000,
        currentSignups: 0,
        targetSignups: 20,
      },
      evolutionData,
      upcomingActions: upcomingActions.map((item: any) => ({
        id: item.id,
        title: item.title,
        time: item.allDay ? "Dia Todo" : item.start.toLocaleTimeString("pt-BR", { hour: "2-2-digit", minute: "2-2-digit" }),
        category: item.category,
      })),
      latestMetric,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
}

export async function getMetrics(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.metric.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: "asc" },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [];
  }
}

export async function upsertMetric(data: {
  date: Date;
  leadsCaught?: number;
  presentations?: number;
  signups?: number;
  lpGenerated?: number;
}) {
  try {
    const { date, ...updates } = data;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const metric = await prisma.metric.upsert({
      where: { date: dayStart },
      update: {
        leadsCaught: updates.leadsCaught ? { increment: updates.leadsCaught } : undefined,
        presentations: updates.presentations ? { increment: updates.presentations } : undefined,
        signups: updates.signups ? { increment: updates.signups } : undefined,
        lpGenerated: updates.lpGenerated ? { increment: updates.lpGenerated } : undefined,
      },
      create: {
        date: dayStart,
        leadsCaught: updates.leadsCaught || 0,
        presentations: updates.presentations || 0,
        signups: updates.signups || 0,
        lpGenerated: updates.lpGenerated || 0,
      },
    });

    // Sync with main goal
    const { revalidatePath } = await import("next/cache");
    const mainGoal = await prisma.goal.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (mainGoal && (updates.lpGenerated || updates.signups)) {
      await prisma.goal.update({
        where: { id: mainGoal.id },
        data: {
          currentLP: updates.lpGenerated ? { increment: updates.lpGenerated } : undefined,
          currentSignups: updates.signups ? { increment: updates.signups } : undefined,
        },
      });
    }

    revalidatePath("/dashboard/metrics");
    revalidatePath("/dashboard/goals");
    revalidatePath("/dashboard");
    return { success: true, metric };
  } catch (error) {
    console.error("Error upserting metric:", error);
    return { success: false, error: "Failed to update metric" };
  }
}
