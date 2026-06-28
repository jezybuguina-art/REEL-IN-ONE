/**
 * Mathematical calculations and export utilities
 */

export interface TransmutationResult {
  rawScore: number;
  maxScore: number;
  percentage: number;
  transmutedGrade: number;
  qualitativeDescriptor: string;
}

/**
 * Strictly calculates DepEd Transmutation based on specified formula to avoid rounding discrepancies
 */
export function calculateDepEdGrade(rawScore: number, maxScore: number): TransmutationResult {
  if (maxScore <= 0) {
    return {
      rawScore,
      maxScore,
      percentage: 0,
      transmutedGrade: 60,
      qualitativeDescriptor: 'Did Not Meet Expectations',
    };
  }

  const rawPercentage = (rawScore / maxScore) * 100;
  
  let transmutedGrade = 60;
  if (rawPercentage >= 60) {
    transmutedGrade = 75 + ((rawPercentage - 60) * 0.625);
  } else {
    transmutedGrade = 60 + (rawPercentage * 0.25);
  }
  
  const finalGrade = Math.round(transmutedGrade);
  
  // Qualitative Descriptor Map
  let qualitativeDescriptor = 'Did Not Meet Expectations';
  if (finalGrade >= 90 && finalGrade <= 100) {
    qualitativeDescriptor = 'Outstanding';
  } else if (finalGrade >= 85 && finalGrade <= 89) {
    qualitativeDescriptor = 'Very Satisfactory';
  } else if (finalGrade >= 80 && finalGrade <= 84) {
    qualitativeDescriptor = 'Satisfactory';
  } else if (finalGrade >= 75 && finalGrade <= 79) {
    qualitativeDescriptor = 'Fairly Satisfactory';
  } else {
    qualitativeDescriptor = 'Did Not Meet Expectations';
  }

  return {
    rawScore,
    maxScore,
    percentage: parseFloat(rawPercentage.toFixed(2)),
    transmutedGrade: finalGrade,
    qualitativeDescriptor,
  };
}

/**
 * Standard flat grade calculation mapping when DepEd Mode is OFF
 */
export function calculateStandardGrade(rawScore: number, maxScore: number): {
  rawScore: number;
  maxScore: number;
  percentage: number;
  grade: number;
} {
  if (maxScore <= 0) return { rawScore, maxScore, percentage: 0, grade: 0 };
  const percentage = (rawScore / maxScore) * 100;
  return {
    rawScore,
    maxScore,
    percentage: parseFloat(percentage.toFixed(2)),
    grade: Math.round(percentage),
  };
}

/**
 * Exports students list in a grading session as flat CSV
 */
export function exportSessionToCSV(sessionTitle: string, students: any[]): void {
  // Define columns
  const headers = ["Student Name", "Status", "Raw Score", "Max Possible", "Percentage (%)", "Final Transmuted Grade", "Feedback"];
  
  const rows = students.map((s) => {
    const raw = s.rawScore ?? 0;
    const max = s.maxScore ?? 16;
    const pct = s.percentage ?? 0;
    const grade = s.transmutedGrade ?? 60;
    // Clean escape quotes in feedback
    const escapedFeedback = (s.feedback || "").replace(/"/g, '""');
    
    return [
      `"${s.studentName}"`,
      `"${s.status}"`,
      raw,
      max,
      pct,
      grade,
      `"${escapedFeedback}"`
    ];
  });

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const formattedDate = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `Class_Record_${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${formattedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
