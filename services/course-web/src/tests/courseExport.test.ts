import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import type { Course } from '../types/course';
import {
  courseMarkdownToPlainText,
  createCourseMarkdown,
  exportCourse,
} from '../utils/courseExport';

const course: Course = {
  id: 'sample-course',
  title: 'Sample Course',
  courseCode: 'TEST 101',
  level: 'Undergraduate',
  description: 'A course description.',
  learnerProfile: 'New university students.',
  prerequisites: ['Basic algebra.'],
  learningOutcomes: ['Explain the central concept.'],
  units: [],
  lecturePlan: [],
  lectures: [{
    id: 'lecture-01',
    number: 1,
    title: 'Markdown Lecture',
    durationMinutes: 50,
    role: 'Core',
    summary: 'A structured note export.',
    objectives: ['Interpret a claim.'],
    content: {
      motivatingQuestion: 'What makes a claim reliable?',
      prerequisiteCheck: 'Review how to compare claims.',
      intuitiveExplanation: 'Start with a **clear** idea such as $x^2 + 1$.\n\n- First point\n- Second point',
      formalDevelopment: 'Use a definition and state its limits.\n\n$$\n\\frac{a_1}{b^2} = \\sqrt{c}\n$$\n\nThe equivalent inline form is \\(z_i\\).',
      workedExamples: [{
        prompt: 'Assess a short claim.',
        reasoningSteps: ['Check its source.', 'Compare independent records.'],
        conclusion: 'State a qualified conclusion.',
      }],
      applications: ['Apply the method to a new case.'],
      misconceptions: ['Confidence is not evidence.'],
      extension: 'Consider a more difficult case.',
      summary: 'Connect evidence and conclusion.',
      practice: {
        prompt: 'Evaluate a claim using two sources.',
        learningOutcome: 'Explain the central concept.',
        points: 4,
        hints: ['Check provenance.', 'Look for corroboration.'],
        solution: 'Compare the evidence and explain its limits.',
        rubric: ['Uses both sources.', 'States a limitation.'],
      },
    },
  }],
  assessments: [],
  contentReviewStatus: 'draft',
};

const downloadedNames: string[] = [];
const downloadedBlobs: Blob[] = [];
let pdfRenderSource: HTMLElement | null = null;

describe('course export', () => {
  beforeEach(() => {
    downloadedNames.length = 0;
    downloadedBlobs.length = 0;
    pdfRenderSource = null;
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlobs.push(blob);
        return 'blob:course-export';
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedNames.push(this.download);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serializes all generated lecture sections into the course document', () => {
    const markdown = createCourseMarkdown(course);

    expect(markdown).toContain('# Sample Course');
    expect(markdown).toContain('#### Worked examples');
    expect(markdown).toContain('1. Check its source.');
    expect(markdown).toContain('#### Self-paced practice');
    expect(markdown).toContain('$x^2 + 1$');
    expect(markdown).toContain('\\frac{a_1}{b^2} = \\sqrt{c}');
  });

  it('converts Markdown emphasis, links, and ordered lists to readable text', () => {
    const plainText = courseMarkdownToPlainText(
      '## Steps\n\n1. **Check** the [source](https://example.test).\n2. Compare records.',
    );

    expect(plainText).toContain('1. Check the source.');
    expect(plainText).toContain('2. Compare records.');
    expect(plainText).not.toContain('**');
    expect(plainText).not.toContain('https://');
  });

  it('downloads JSON, TXT, DOCX, and PDF course files', async () => {
    const { jsPDF } = await import('jspdf');
    vi.spyOn(jsPDF.prototype, 'html').mockImplementation(function (source, options) {
      if (typeof source !== 'string') pdfRenderSource = source;
      options?.callback?.(this);
      return {} as never;
    });

    await exportCourse(course, 'json');
    await exportCourse(course, 'txt');
    await exportCourse(course, 'docx');
    await exportCourse(course, 'pdf');

    expect(downloadedNames).toEqual([
      'test-101-sample-course.json',
      'test-101-sample-course.txt',
      'test-101-sample-course.docx',
      'test-101-sample-course.pdf',
    ]);
    const docxContents = unzipSync(new Uint8Array(await downloadedBlobs[2].arrayBuffer()));
    const documentXml = new TextDecoder().decode(docxContents['word/document.xml']);
    expect(documentXml).toContain('<m:oMath>');
    expect(documentXml).toContain('<m:f>');
    expect(documentXml).toContain('<m:sSub>');
    expect(documentXml).toContain('<m:sSup>');
    expect(pdfRenderSource?.querySelector('.katex')).toBeInTheDocument();
    expect(pdfRenderSource?.querySelector('.katex-display')).toBeInTheDocument();
    expect(downloadedBlobs[3].type).toBe('application/pdf');
  });
});