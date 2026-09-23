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
    const extracted = extractLatex(markdown);
    const document = new docx.Document({
      sections: [{
        children: markdownToDocx(
          extracted.markdown,
          extracted.formulas,
          docx,
          markdownLibrary.marked,
        ),
      }],
    });
    downloadBlob(await docx.Packer.toBlob(document), `${baseName}.docx`);
    return;
  }

  const pdf = await markdownToPdf(markdown);
  downloadBlob(pdf.output('blob'), `${baseName}.pdf`);
}

function markdownToDocx(
  markdown: string,
  formulas: Map<string, LatexFormula>,
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
        children: inlineRuns(token.tokens, docx, formulas),
        spacing: { before: 180, after: 90 },
      }));
    } else if (token.type === 'paragraph' || token.type === 'text') {
      const text = tokenText(token.tokens ?? [token]);
      paragraphs.push(new docx.Paragraph({
        children: inlineRuns(token.tokens ?? [token], docx, formulas),
        alignment: /^COURSEMATHDISPLAY\d+TOKEN$/.test(text.trim())
          ? docx.AlignmentType.CENTER
          : undefined,
        spacing: { after: 110 },
      }));
    } else if (token.type === 'list') {
      for (const [index, item] of (token.items ?? []).entries()) {
        const prefix = token.ordered ? `${index + 1}. ` : '';
        paragraphs.push(new docx.Paragraph({
          children: [
            ...(prefix ? [new docx.TextRun(prefix)] : []),
            ...inlineRuns(item.tokens ?? [item], docx, formulas),
          ],
          ...(token.ordered ? {} : { bullet: { level: 0 } }),
          spacing: { after: 70 },
        }));
      }
    } else if (token.type === 'blockquote') {
      paragraphs.push(new docx.Paragraph({
        children: inlineRuns(token.tokens, docx, formulas),
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
              children: inlineRuns(cell.tokens ?? [{ type: 'text', text: cell.text }], docx, formulas),
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

function inlineRuns(
  tokens: MarkdownToken[] = [],
  docx: typeof import('docx'),
  formulas: Map<string, LatexFormula>,
): import('docx').ParagraphChild[] {
  const runs: import('docx').ParagraphChild[] = [];
  for (const token of tokens) {
    const nested = token.tokens;
    if (token.type === 'strong' || token.type === 'em' || token.type === 'del' || token.type === 'codespan') {
      runs.push(...textWithMath(
        nested ? tokenText(nested) : token.text ?? token.raw ?? '',
        docx,
        formulas,
        {
          bold: token.type === 'strong',
          italics: token.type === 'em',
          strike: token.type === 'del',
          font: token.type === 'codespan' ? 'Courier New' : undefined,
        },
      ));
    } else if (token.type === 'link') {
      runs.push(...textWithMath(
        `${nested ? tokenText(nested) : token.text ?? ''}${token.href ? ` (${token.href})` : ''}`,
        docx,
        formulas,
        { color: '006F68', underline: {} },
      ));
    } else if (token.type === 'br') {
      runs.push(new docx.TextRun({ break: 1 }));
    } else if (nested) {
      runs.push(...inlineRuns(nested, docx, formulas));
    } else if (token.type !== 'html') {
      runs.push(...textWithMath(token.text ?? token.raw ?? '', docx, formulas));
    }
  }
  return runs;
}

function tokenText(tokens: MarkdownToken[]): string {
  return tokens.map((token) => token.tokens ? tokenText(token.tokens) : token.text ?? token.raw ?? '').join('');
}

async function markdownToPdf(markdown: string): Promise<import('jspdf').jsPDF> {
  const [pdfLibrary, markdownLibrary, katex, html2canvas] = await Promise.all([
    import('jspdf'),
    import('marked'),
    import('katex'),
    import('html2canvas'),
  ]);
  const extracted = extractLatex(markdown);
  const renderer = new markdownLibrary.marked.Renderer();
  renderer.html = (token) => escapeHtml(token.text);
  const renderedMarkdown = await markdownLibrary.marked.parse(extracted.markdown, {
    gfm: true,
    renderer,
  });
  const renderedDocument = renderLatexHtml(renderedMarkdown, extracted.formulas, katex.default);
  const host = document.createElement('article');
  host.className = 'course-export-document';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:840px',
    'padding:40px',
    'box-sizing:border-box',
    'z-index:-1',
    'background:#ffffff',
    'color:#172321',
    'font-family:Arial,sans-serif',
    'font-size:14px',
    'line-height:1.55',
    'overflow-wrap:anywhere',
  ].join(';');
  host.innerHTML = `<style>
    .course-export-document h1,.course-export-document h2,.course-export-document h3 { page-break-after:avoid; }
    .course-export-document table { width:100%; border-collapse:collapse; }
    .course-export-document th,.course-export-document td { border:1px solid #a9b8b4; padding:6px 8px; vertical-align:top; }
    .course-export-document blockquote { border-left:2px solid #006f68; padding-left:12px; color:#475955; }
    .course-export-document pre { white-space:pre-wrap; background:#edf2f0; padding:10px; }
    .course-export-document .katex-display { overflow:visible; text-align:center; margin:1em 0; }
  </style>${renderedDocument}`;
  document.body.append(host);

  const pdf = new pdfLibrary.jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 42;
  try {
    await document.fonts?.ready;
    const canvas = await html2canvas.default(host, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 840,
    });
    const printableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const printableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const outputScale = printableWidth / canvas.width;
    const sliceHeight = Math.max(1, Math.floor(printableHeight / outputScale));
    let pageIndex = 0;
    for (let offsetY = 0; offsetY < canvas.height; offsetY += sliceHeight) {
      if (pageIndex > 0) pdf.addPage();
      const currentSliceHeight = Math.min(sliceHeight, canvas.height - offsetY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = currentSliceHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('The PDF page canvas could not be created.');
      context.drawImage(
        canvas,
        0,
        offsetY,
        canvas.width,
        currentSliceHeight,
        0,
        0,
        canvas.width,
        currentSliceHeight,
      );
      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        printableWidth,
        currentSliceHeight * outputScale,
        undefined,
        'FAST',
      );
      pageIndex += 1;
    }
    return pdf;
  } finally {
    host.remove();
  }
}

interface LatexFormula {
  source: string;
  display: boolean;
}

function extractLatex(markdown: string): { markdown: string; formulas: Map<string, LatexFormula> } {
  const formulas = new Map<string, LatexFormula>();
  const delimiters = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$(?!\$)([^\n$]+?)\$/g;
  let formulaIndex = 0;
  const masked = markdown.replace(delimiters, (_whole, bracketDisplay, bracketInline, dollarDisplay, dollarInline) => {
    const display = bracketDisplay !== undefined || dollarDisplay !== undefined;
    const source = String(bracketDisplay ?? bracketInline ?? dollarDisplay ?? dollarInline).trim();
    const marker = `COURSEMATH${display ? 'DISPLAY' : 'INLINE'}${formulaIndex}TOKEN`;
    formulaIndex += 1;
    formulas.set(marker, { source, display });
    return display ? `\n\n${marker}\n\n` : marker;
  });
  return { markdown: masked, formulas };
}

function textWithMath(
  text: string,
  docx: typeof import('docx'),
  formulas: Map<string, LatexFormula>,
  style: Record<string, unknown> = {},
): import('docx').ParagraphChild[] {
  const result: import('docx').ParagraphChild[] = [];
  const markerPattern = /COURSEMATH(?:INLINE|DISPLAY)\d+TOKEN/g;
  let cursor = 0;
  for (const match of text.matchAll(markerPattern)) {
    const marker = match[0];
    const offset = match.index ?? cursor;
    if (offset > cursor) result.push(new docx.TextRun({ text: text.slice(cursor, offset), ...style }));
    const formula = formulas.get(marker);
    if (formula) {
      result.push(new docx.Math({ children: latexToMathComponents(formula.source, docx) }));
    } else {
      result.push(new docx.TextRun(marker));
    }
    cursor = offset + marker.length;
  }
  if (cursor < text.length) result.push(new docx.TextRun({ text: text.slice(cursor), ...style }));
  return result;
}

function latexToMathComponents(
  latex: string,
  docx: typeof import('docx'),
): import('docx').MathComponent[] {
  const source = latex.replace(/\\left|\\right/g, '');
  const symbols: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ',
    lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Omega: 'Ω',
    times: '×', cdot: '·', pm: '±', le: '≤', leq: '≤', ge: '≥', geq: '≥',
    neq: '≠', ne: '≠', approx: '≈', infty: '∞', to: '→', rightarrow: '→',
    implies: '⇒', partial: '∂', nabla: '∇', sum: '∑', prod: '∏', int: '∫',
    forall: '∀', exists: '∃', in: '∈', notin: '∉', cup: '∪', cap: '∩',
  };
  let cursor = 0;

  function parseSequence(end?: string): import('docx').MathComponent[] {
    const components: import('docx').MathComponent[] = [];
    while (cursor < source.length && source[cursor] !== end) {
      if (/\s/.test(source[cursor])) {
        cursor += 1;
        if (components.length > 0 && components.at(-1) instanceof docx.MathRun) {
          components.push(new docx.MathRun(' '));
        }
        continue;
      }
      let base = parseAtom();
      let subScript: import('docx').MathComponent[] | undefined;
      let superScript: import('docx').MathComponent[] | undefined;
      while (source[cursor] === '_' || source[cursor] === '^') {
        const marker = source[cursor++];
        const value = parseArgument();
        if (marker === '_') subScript = value;
        else superScript = value;
      }
      if (subScript && superScript) {
        base = [new docx.MathSubSuperScript({ children: base, subScript, superScript })];
      } else if (subScript) {
        base = [new docx.MathSubScript({ children: base, subScript })];
      } else if (superScript) {
        base = [new docx.MathSuperScript({ children: base, superScript })];
      }
      components.push(...base);
    }
    if (end && source[cursor] === end) cursor += 1;
    return components;
  }

  function parseArgument(): import('docx').MathComponent[] {
    if (source[cursor] === '{') {
      cursor += 1;
      return parseSequence('}');
    }
    return parseAtom();
  }

  function parseAtom(): import('docx').MathComponent[] {
    const character = source[cursor];
    if (character === '{') {
      cursor += 1;
      return parseSequence('}');
    }
    if (character !== '\\') {
      cursor += 1;
      return [new docx.MathRun(character)];
    }

    cursor += 1;
    if (cursor >= source.length) return [new docx.MathRun('\\')];
    if (!/[A-Za-z]/.test(source[cursor])) {
      const escaped = source[cursor++];
      return [new docx.MathRun(escaped === '\\' ? ' ' : escaped)];
    }
    const command = source.slice(cursor).match(/^[A-Za-z]+/)?.[0] ?? '';
    cursor += command.length;
    if (command === 'frac' || command === 'dfrac' || command === 'tfrac') {
      const numerator = parseArgument();
      const denominator = parseArgument();
      return [new docx.MathFraction({ numerator, denominator })];
    }
    if (command === 'sqrt') {
      let degree: import('docx').MathComponent[] | undefined;
      if (source[cursor] === '[') {
        cursor += 1;
        degree = parseSequence(']');
      }
      return [new docx.MathRadical({ children: parseArgument(), degree })];
    }
    if (command === 'text' || command === 'mathrm' || command === 'operatorname') {
      return parseArgument();
    }
    if (command === 'begin' || command === 'end') {
      if (source[cursor] === '{') parseArgument();
      return [];
    }
    return [new docx.MathRun(symbols[command] ?? command)];
  }

  return parseSequence();
}

function renderLatexHtml(
  html: string,
  formulas: Map<string, LatexFormula>,
  katex: typeof import('katex').default,
): string {
  let result = html;
  for (const [marker, formula] of formulas) {
    const rendered = katex.renderToString(formula.source, {
      displayMode: formula.display,
      throwOnError: false,
    });
    result = result.replaceAll(marker, rendered);
  }
  return result;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}