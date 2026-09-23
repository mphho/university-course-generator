import type { Course, Lecture, LectureContent, LecturePlanItem } from '../types/course';

export type CourseExportFormat = 'json' | 'txt' | 'docx' | 'pdf';

interface MarkdownToken {
  type: string;
  raw?: string;
  text?: string;
  depth?: number;
  items?: MarkdownToken[];
  tokens?: MarkdownToken[];
  href?: string;
  ordered?: boolean;
  checked?: boolean;
  header?: MarkdownTableCell[];
  rows?: MarkdownTableCell[][];
}

interface MarkdownTableCell {
  text: string;
  tokens?: MarkdownToken[];
}

export function createCourseMarkdown(course: Course): string {
  const lines = [
    `# ${course.title}`,
    '',
    `**Course code:** ${course.courseCode}`,
    `**Level:** ${course.level}`,
    `**Review status:** ${course.contentReviewStatus}`,
    '',
    '## Course description',
    '',
    course.description,
    '',
    '## Intended learners',
    '',
    course.learnerProfile,
    '',
    '## Prerequisites',
    ...course.prerequisites.map((item) => `- ${item}`),
    '',
    '## Learning outcomes',
    ...course.learningOutcomes.map((item) => `- ${item}`),
    '',
    '## Course units',
  ];

  for (const unit of course.units) {
    lines.push('', `### ${unit.title}`, '', unit.summary, '');
  }

  lines.push('', '## Lecture notes');
  const lectureEntries: { plan: LecturePlanItem | Lecture; lecture?: Lecture }[] =
    course.lecturePlan?.length
      ? course.lecturePlan.map((plan) => ({
        plan,
        lecture: course.lectures.find((item) => item.id === plan.id),
      }))
      : course.lectures.map((lecture) => ({ plan: lecture, lecture }));

  for (const { plan, lecture } of lectureEntries) {
    lines.push(
      '',
      `### Lecture ${String(plan.number).padStart(2, '0')}: ${plan.title}`,
      '',
      `**Duration:** ${plan.durationMinutes} minutes  `,
      `**Role:** ${plan.role}`,
      '',
      plan.summary,
      '',
      '#### Learning objectives',
      ...plan.objectives.map((item) => `- ${item}`),
    );

    if (!lecture?.content) {
      lines.push('', '_Full lecture notes have not been generated._');
      continue;
    }
    appendLectureContent(lines, lecture.content);
  }

  lines.push('', '## Assessments');
  for (const assessment of course.assessments) {
    lines.push('', `### ${assessment.title}`, '', assessment.description, '', `**Coverage:** ${assessment.coverage}`);
    if (assessment.kind === 'assignment') {
      lines.push(`**Difficulty:** ${assessment.difficulty}`, `**Points:** ${assessment.points}`);
      for (const [index, problem] of (assessment.problems ?? []).entries()) {
        lines.push(
          '',
          `#### Problem ${index + 1}`,
          '',
          problem.prompt,
          '',
          `**Learning outcome:** ${problem.learningOutcome}`,
          '',
          '**Hints**',
          ...problem.hints.map((hint, hintIndex) => `${hintIndex + 1}. ${hint}`),
          '',
          '**Expected answer**',
          '',
          problem.expectedAnswer,
          '',
          '**Rubric**',
          ...problem.rubric.map((item) => `- ${item}`),
        );
      }
    } else {
      lines.push(`**Duration:** ${assessment.durationMinutes} minutes`, `**Questions:** ${assessment.questionCount}`);
      for (const [index, question] of (assessment.questions ?? []).entries()) {
        lines.push(
          '',
          `#### Question ${index + 1}: ${question.section}`,
          '',
          question.prompt,
          '',
          `**Learning outcome:** ${question.learningOutcome}`,
          '',
          '**Expected solution**',
          '',
          question.expectedSolution,
          '',
          '**Rubric**',
          ...question.rubric.map((item) => `- ${item}`),
        );
      }
    }
  }

  if (course.scopeLimits?.length) {
    lines.push('', '## Scope limits and review notes', ...course.scopeLimits.map((item) => `- ${item}`));
  }
  return lines.join('\n').trim() + '\n';
}

function appendLectureContent(lines: string[], content: LectureContent): void {
  lines.push(
    '',
    '#### Guiding question',
    '',
    content.motivatingQuestion,
    '',
    '#### Prerequisite check',
    '',
    content.prerequisiteCheck,
    '',
    '#### Intuitive explanation',
    '',
    content.intuitiveExplanation,
    '',
    '#### Formal development',
    '',
    content.formalDevelopment,
    '',
    '#### Worked examples',
  );
  for (const [index, example] of content.workedExamples.entries()) {
    lines.push(
      '',
      `##### Example ${index + 1}`,
      '',
      example.prompt,
      '',
      ...example.reasoningSteps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`),
      '',
      example.conclusion,
    );
  }
  lines.push(
    '',
    '#### Applications',
    '',
    ...content.applications.map((item) => `- ${item}`),
    '',
    '#### Common misconceptions',
    '',
    ...content.misconceptions.map((item) => `- ${item}`),
    '',
    '#### Optional extension',
    '',
    content.extension,
    '',
    '#### Summary',
    '',
    content.summary,
    '',
    '#### Self-paced practice',
    '',
    content.practice.prompt,
    '',
    `**Learning outcome:** ${content.practice.learningOutcome}`,
    `**Points:** ${content.practice.points}`,
    '',
    '**Progressive hints**',
    ...content.practice.hints.map((hint, index) => `${index + 1}. ${hint}`),
    '',
    '**Worked response**',
    '',
    content.practice.solution,
    '',
    '**Response rubric**',
    ...content.practice.rubric.map((item) => `- ${item}`),
  );
}

export function courseMarkdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/^\s*(\d+[.)])\s+/gm, '$1 ')
    .replace(/^```[^\n]*\n|^```\s*$/gm, '')
    .replace(/!?(\[([^\]]+)\])\([^)]+\)/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s*\|\s*/gm, '')
    .trim() + '\n';
}

export async function exportCourse(course: Course, format: CourseExportFormat): Promise<void> {
  const markdown = createCourseMarkdown(course);
  const baseName = `${course.courseCode}-${course.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'course';

  if (format === 'json') {
    downloadBlob(
      new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' }),
      `${baseName}.json`,
    );
    return;
  }
  if (format === 'txt') {
    downloadBlob(
      new Blob([courseMarkdownToPlainText(markdown)], { type: 'text/plain;charset=utf-8' }),
      `${baseName}.txt`,
    );
    return;
  }
  if (format === 'docx') {
    const [docx, markdownLibrary] = await Promise.all([import('docx'), import('marked')]);
    const document = new docx.Document({
      sections: [{ children: markdownToDocx(markdown, docx, markdownLibrary.marked) }],
    });
    downloadBlob(await docx.Packer.toBlob(document), `${baseName}.docx`);
    return;
  }

  const { jsPDF } = await import('jspdf');
  const pdf = markdownToPdf(markdown, jsPDF);
  downloadBlob(pdf.output('blob'), `${baseName}.pdf`);
}

function markdownToDocx(
  markdown: string,
  docx: typeof import('docx'),
  markdownLibrary: typeof import('marked')['marked'],
): Array<import('docx').Paragraph | import('docx').Table> {
  const tokens = markdownLibrary.lexer(markdown) as unknown as MarkdownToken[];
  const paragraphs: Array<import('docx').Paragraph | import('docx').Table> = [];
  for (const token of tokens) {
    if (token.type === 'space') continue;
    if (token.type === 'heading') {
      paragraphs.push(new docx.Paragraph({
        heading: headingLevel(token.depth ?? 2, docx),
        children: inlineRuns(token.tokens, docx),
        spacing: { before: 180, after: 90 },
      }));
    } else if (token.type === 'paragraph' || token.type === 'text') {
      paragraphs.push(new docx.Paragraph({ children: inlineRuns(token.tokens ?? [token], docx), spacing: { after: 110 } }));
    } else if (token.type === 'list') {
      for (const [index, item] of (token.items ?? []).entries()) {
        const prefix = token.ordered ? `${index + 1}. ` : '';
        paragraphs.push(new docx.Paragraph({
          children: [
            ...(prefix ? [new docx.TextRun(prefix)] : []),
            ...inlineRuns(item.tokens ?? [item], docx),
          ],
          ...(token.ordered ? {} : { bullet: { level: 0 } }),
          spacing: { after: 70 },
        }));
      }
    } else if (token.type === 'blockquote') {
      paragraphs.push(new docx.Paragraph({
        children: inlineRuns(token.tokens, docx),
        indent: { left: 360 },
        spacing: { before: 80, after: 110 },
      }));
    } else if (token.type === 'code') {
      paragraphs.push(new docx.Paragraph({
        children: [new docx.TextRun({ text: token.text ?? '', font: 'Courier New' })],
        indent: { left: 240 },
        spacing: { before: 80, after: 110 },
      }));
    } else if (token.type === 'table') {
      const tableRows = [token.header ?? [], ...(token.rows ?? [])].map((row, rowIndex) =>
        new docx.TableRow({
          children: row.map((cell) => new docx.TableCell({
            children: [new docx.Paragraph({
              children: inlineRuns(cell.tokens ?? [{ type: 'text', text: cell.text }], docx),
            })],
            ...(rowIndex === 0 ? { shading: { fill: 'E8F3F1' } } : {}),
          })),
        }),
      );
      paragraphs.push(new docx.Table({
        rows: tableRows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
      }));
    }
  }
  return paragraphs;
}

function headingLevel(depth: number, docx: typeof import('docx')) {
  if (depth <= 1) return docx.HeadingLevel.HEADING_1;
  if (depth === 2) return docx.HeadingLevel.HEADING_2;
  if (depth === 3) return docx.HeadingLevel.HEADING_3;
  return docx.HeadingLevel.HEADING_4;
}

function inlineRuns(tokens: MarkdownToken[] = [], docx: typeof import('docx')): import('docx').TextRun[] {
  const runs: import('docx').TextRun[] = [];
  for (const token of tokens) {
    const nested = token.tokens;
    if (token.type === 'strong' || token.type === 'em' || token.type === 'del' || token.type === 'codespan') {
      runs.push(new docx.TextRun({
        text: nested ? tokenText(nested) : token.text ?? token.raw ?? '',
        bold: token.type === 'strong',
        italics: token.type === 'em',
        strike: token.type === 'del',
        font: token.type === 'codespan' ? 'Courier New' : undefined,
      }));
    } else if (token.type === 'link') {
      runs.push(new docx.TextRun({
        text: `${nested ? tokenText(nested) : token.text ?? ''}${token.href ? ` (${token.href})` : ''}`,
        color: '006F68',
        underline: {},
      }));
    } else if (token.type === 'br') {
      runs.push(new docx.TextRun({ break: 1 }));
    } else if (nested) {
      runs.push(...inlineRuns(nested, docx));
    } else if (token.type !== 'html') {
      runs.push(new docx.TextRun(token.text ?? token.raw ?? ''));
    }
  }
  return runs;
}

function tokenText(tokens: MarkdownToken[]): string {
  return tokens.map((token) => token.tokens ? tokenText(token.tokens) : token.text ?? token.raw ?? '').join('');
}

function markdownToPdf(
  markdown: string,
  PdfConstructor: typeof import('jspdf').jsPDF,
): import('jspdf').jsPDF {
  const pdf = new PdfConstructor({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = margin;

  for (const originalLine of markdown.split('\n')) {
    const heading = originalLine.match(/^(#{1,3})\s+(.*)$/);
    const text = courseMarkdownToPlainText(originalLine).trim();
    if (!text) {
      y += 8;
      continue;
    }
    const headingDepth = heading?.[1].length;
    const fontSize = headingDepth ? (headingDepth === 1 ? 19 : headingDepth === 2 ? 15 : 12) : 10;
    pdf.setFont('helvetica', headingDepth ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    const wrapped = pdf.splitTextToSize(text, pageWidth - margin * 2) as string[];
    for (const line of wrapped) {
      const lineHeight = fontSize * 1.35;
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += heading ? 8 : 3;
  }
  return pdf;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}