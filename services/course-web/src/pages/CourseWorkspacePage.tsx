import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Badge,
  Body1,
  Body2,
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title2,
  Title3,
  Spinner,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  BookOpenRegular,
  CalendarRegular,
  CheckmarkCircleRegular,
  ClipboardTaskRegular,
  DocumentBulletListRegular,
  MathFormatLinearRegular,
} from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { AssessmentCard } from '../components/AssessmentCard';
import { DataStatePanel, type DataStatus } from '../components/DataStatePanel';
import { exportCourse, type CourseExportFormat } from '../utils/courseExport';
import type { Assessment, Course, ExamRequest, FinalExamRequest, Lecture, LecturePlanItem } from '../types/course';

type WorkspaceTab = 'overview' | 'assignments' | 'midterms' | 'final';
type LectureEntry = { plan: LecturePlanItem | Lecture; lecture?: Lecture };

export function CourseWorkspacePage() {
  const navigate = useNavigate();
  const { courseId = 'calculus-101' } = useParams();
  const [status, setStatus] = useState<DataStatus>('loading');
  const [loadError, setLoadError] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [generating, setGenerating] = useState(false);
  const [generatingLectures, setGeneratingLectures] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [lectureGenerationError, setLectureGenerationError] = useState('');
  const [lectureGenerationProgress, setLectureGenerationProgress] = useState<{ completed: number; total: number } | null>(null);
  const [exchangeError, setExchangeError] = useState('');
  const [latestGenerated, setLatestGenerated] = useState<Assessment | null>(null);
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setLoadError('');
    setSelectedLectureId('');
    setLectureGenerationError('');
    setLectureGenerationProgress(null);
    api.getCourse(courseId)
      .then((response) => {
        if (!active) return;
        setCourse(response.course);
        setStatus('data');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'The course request failed.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [courseId, retryIndex]);

  async function generateAssignment(): Promise<void> {
    const topic = course?.lectures[0]?.title
      ?? course?.lecturePlan?.[0]?.title
      ?? course?.learningOutcomes[0]
      ?? course?.title
      ?? 'Course concepts';
    await runGeneration(() => api.generateAssignment(courseId, {
      topic,
      difficulty: 'intermediate',
      problemCount: 5,
    }));
  }

  async function generateMidterm(): Promise<void> {
    const request: ExamRequest = {
      topics: ['Limits and continuity', 'Derivative meaning', 'Differentiation techniques'],
      durationMinutes: 75,
      questionCount: 12,
    };
    await runGeneration(() => api.generateMidterm(courseId, request));
  }

  async function generateFinal(): Promise<void> {
    const request: FinalExamRequest = {
      coverage: 'Cumulative: limits, derivatives, integrals, and series',
      durationMinutes: 120,
      questionCount: 18,
    };
    await runGeneration(() => api.generateFinal(courseId, request));
  }

  async function generateRemainingLectures(): Promise<void> {
    if (!course || generatingLectures) return;
    const remaining = course.lecturePlan?.filter((plan) =>
      !course.lectures.some((lecture) => lecture.id === plan.id && lecture.content),
    ).length ?? 0;
    if (remaining === 0) return;

    setGeneratingLectures(true);
    setLectureGenerationError('');
    setLectureGenerationProgress({ completed: 0, total: remaining });
    try {
      for (let index = 0; index < remaining; index += 1) {
        const response = await api.generateNextLecture(courseId);
        setCourse(response.course);
        setLectureGenerationProgress({ completed: index + 1, total: remaining });
        if (response.course.lecturePlan?.every((plan) =>
          response.course.lectures.some((lecture) => lecture.id === plan.id && lecture.content),
        )) break;
      }
    } catch (error: unknown) {
      setLectureGenerationError(error instanceof Error ? error.message : 'Lecture generation did not complete.');
    } finally {
      setGeneratingLectures(false);
    }
  }

  async function downloadCourse(format: CourseExportFormat): Promise<void> {
    if (!course) return;
    setExchangeError('');
    try {
      await exportCourse(course, format);
    } catch (error: unknown) {
      setExchangeError(error instanceof Error ? error.message : 'The course export failed.');
    }
  }

  async function importCourseFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setExchangeError('');
    try {
      const importedValue: unknown = JSON.parse(await file.text());
      const response = await api.importCourse(importedValue);
      setCourse(response.course);
      setSelectedLectureId(response.course.lecturePlan?.[0]?.id ?? response.course.lectures[0]?.id ?? '');
      navigate(`/courses/${encodeURIComponent(response.course.id)}`);
    } catch (error: unknown) {
      setExchangeError(error instanceof Error ? error.message : 'The JSON course could not be imported.');
    } finally {
      input.value = '';
    }
  }

  async function runGeneration<T extends { assessment: Assessment }>(request: () => Promise<T>): Promise<void> {
    setGenerating(true);
    setGenerationError('');
    try {
      const response = await request();
      setLatestGenerated(response.assessment);
      setCourse((current) => current ? {
        ...current,
        assessments: [
          ...current.assessments.filter((item) => item.id !== response.assessment.id),
          response.assessment,
        ],
      } : current);
    } catch (error: unknown) {
      setGenerationError(error instanceof Error ? error.message : 'Assessment generation did not complete.');
    } finally {
      setGenerating(false);
    }
  }

  const assignments = course?.assessments.filter((assessment) => assessment.kind === 'assignment') ?? [];
  const midterms = course?.assessments.filter((assessment) => assessment.kind === 'midterm') ?? [];
  const finalExam = course?.assessments.find((assessment) => assessment.kind === 'final');
  const assessmentCount = course?.assessments.length ?? 0;
  const lectureEntries: LectureEntry[] = course
    ? course.lecturePlan?.length
      ? course.lecturePlan.map((plan) => ({
        plan,
        lecture: course.lectures.find((lecture) => lecture.id === plan.id),
      }))
      : course.lectures.map((lecture) => ({ plan: lecture, lecture }))
    : [];
  const selectedLectureEntry = lectureEntries.find((entry) => entry.plan.id === selectedLectureId)
    ?? lectureEntries.find((entry) => entry.lecture?.content)
    ?? lectureEntries[0];
  const missingLectureCount = course?.lecturePlan?.filter((plan) =>
    !course.lectures.some((lecture) => lecture.id === plan.id && lecture.content),
  ).length ?? 0;
  const notesReadyCount = lectureEntries.filter((entry) => entry.lecture?.content).length;

  return (
    <div className="workspace-page">
      <section className="workspace-intro">
        <div className="workspace-title-group">
          <span className="workspace-eyebrow">Course workspace</span>
          <div className="workspace-title-line">
            <Title2 className="course-page-title">{course?.title ?? 'Calculus 101'}</Title2>
            <Badge appearance="tint" color="warning">Draft until reviewed</Badge>
          </div>
          <Text className="workspace-course-meta">{course?.courseCode ?? 'Course'} <span aria-hidden="true">·</span> {course?.lectures.length ?? 0} lectures <span aria-hidden="true">·</span> {course?.units.length ?? 0} units</Text>
          <Body1 className="workspace-description">{course?.description ?? 'A first course in limits, derivatives, integrals, and mathematical reasoning.'}</Body1>
        </div>
        <div className="assessment-actions" aria-label="Generate course content">
          <Button appearance="secondary" icon={<ClipboardTaskRegular />} disabled={generating} onClick={() => void generateAssignment()}>
            Generate assignment
          </Button>
          <Button appearance="secondary" icon={<CalendarRegular />} disabled={generating} onClick={() => void generateMidterm()}>
            Generate midterm
          </Button>
          <Button appearance="primary" icon={<AddRegular />} disabled={generating} onClick={() => void generateFinal()}>
            Generate final exam
          </Button>
        </div>
        <details className="course-exchange-tools">
          <summary>Import or export course</summary>
          <div className="course-exchange-actions">
            <Button appearance="secondary" icon={<DocumentBulletListRegular />} onClick={() => void downloadCourse('json')}>Export JSON</Button>
            <Button appearance="secondary" onClick={() => void downloadCourse('txt')}>Export TXT</Button>
            <Button appearance="secondary" onClick={() => void downloadCourse('docx')}>Export DOCX</Button>
            <Button appearance="secondary" onClick={() => void downloadCourse('pdf')}>Export PDF</Button>
            <Button appearance="primary" icon={<AddRegular />} onClick={() => importFileRef.current?.click()}>Import JSON</Button>
            <input
              ref={importFileRef}
              className="course-import-input"
              type="file"
              accept=".json,application/json"
              aria-label="Choose a course JSON file"
              onChange={(event) => void importCourseFile(event)}
            />
          </div>
          {exchangeError && <Text role="alert" className="course-exchange-error">{exchangeError}</Text>}
        </details>
      </section>

      <MessageBar intent="warning" className="review-banner">
        <CheckmarkCircleRegular aria-hidden="true" />
        <MessageBarBody>
          <MessageBarTitle>Instructor review required</MessageBarTitle>
          Generated explanations and assessments remain drafts until reviewed for accuracy, outcome alignment, and suitability.
        </MessageBarBody>
      </MessageBar>

      {generationError && (
        <MessageBar intent="error" role="alert" className="generation-message">
          <MessageBarBody>
            <MessageBarTitle>Generation could not complete</MessageBarTitle>
            {generationError}
          </MessageBarBody>
          <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={() => setRetryIndex((value) => value + 1)}>
            Reload course
          </Button>
        </MessageBar>
      )}
      {latestGenerated && (
        <MessageBar intent="info" className="generation-message">
          <MessageBarBody>
            <MessageBarTitle>{latestGenerated.title} created as a draft</MessageBarTitle>
            Review its prompts, scoring, and alignment before sharing it with students.
          </MessageBarBody>
          <Badge appearance="tint" color="warning">Draft</Badge>
        </MessageBar>
      )}

      <TabList
        className="workspace-tabs"
        selectedValue={activeTab}
        aria-label="Course content"
        onTabSelect={(_, data) => setActiveTab(data.value as WorkspaceTab)}
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="assignments">Assignments <span className="tab-count">{assignments.length}</span></Tab>
        <Tab value="midterms">Midterms <span className="tab-count">{midterms.length}</span></Tab>
        <Tab value="final">Final exam <span className="tab-count">{finalExam ? 1 : 0}</span></Tab>
      </TabList>

      <DataStatePanel
        status={status}
        error={loadError}
        onRetry={() => setRetryIndex((value) => value + 1)}
        emptyTitle="Course outline is empty"
        emptyDescription="Return to the course library to start a new brief or reopen the Calculus 101 starter course."
        emptyActionLabel="Open course library"
        onEmptyAction={() => navigate('/')}
      >
        {course && (
          <div className="workspace-content">
            {activeTab === 'overview' && (
              <>
                <section className="content-section">
                  <div className="section-heading">
                    <div className="section-heading-title">
                      <MathFormatLinearRegular aria-hidden="true" />
                      <Title2>Course map</Title2>
                    </div>
                    <Text size={200} className="section-hint">{course.units.length} units · {course.lecturePlan?.length ?? course.lectures.length} connected lectures</Text>
                  </div>
                  {course.units.length > 0 ? (
                    <div className="unit-grid">
                      {course.units.map((unit, index) => (
                        <Card appearance="outline" className="unit-card" key={unit.id}>
                          <div className="unit-card-kicker">Unit {String(index + 1).padStart(2, '0')}</div>
                          <Text className="unit-card-title">{unit.title}</Text>
                          <Body2 className="muted-copy">{unit.summary}</Body2>
                          <div className="unit-card-footer"><BookOpenRegular aria-hidden="true" /> {unit.lectureIds.length} lectures</div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <DataStatePanel
                      status="empty"
                      onRetry={() => setRetryIndex((value) => value + 1)}
                      emptyTitle="No course map is available"
                      emptyDescription="This course has no units yet. Reload the course to check for outline updates."
                      emptyActionLabel="Reload course"
                      onEmptyAction={() => setRetryIndex((value) => value + 1)}
                    >
                      <></>
                    </DataStatePanel>
                  )}
                </section>

                <section className="content-section">
                  <div className="section-heading lecture-outline-heading">
                    <div className="section-heading-title">
                      <BookOpenRegular aria-hidden="true" />
                      <Title2>Course outline</Title2>
                    </div>
                    <div className="lecture-outline-tools">
                      <Text size={200} className="section-hint">{notesReadyCount} of {lectureEntries.length} lectures have notes</Text>
                      {missingLectureCount > 0 && (
                        <Button
                          appearance="secondary"
                          icon={generatingLectures ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
                          disabled={generatingLectures || generating}
                          onClick={() => void generateRemainingLectures()}
                        >
                          {generatingLectures ? 'Generating lecture notes' : lectureGenerationError ? 'Resume generation' : `Generate remaining lectures (${missingLectureCount})`}
                        </Button>
                      )}
                    </div>
                  </div>
                  {lectureGenerationProgress && (
                    <div className="lecture-generation-progress" role="status" aria-live="polite">
                      <Text size={200}>
                        {generatingLectures
                          ? `Generating lecture ${Math.min(lectureGenerationProgress.completed + 1, lectureGenerationProgress.total)} of ${lectureGenerationProgress.total}`
                          : `Generated notes for ${lectureGenerationProgress.completed} of ${lectureGenerationProgress.total} remaining lectures`}
                      </Text>
                      <progress
                        max={lectureGenerationProgress.total}
                        value={lectureGenerationProgress.completed}
                        aria-label="Lecture notes generation progress"
                      />
                    </div>
                  )}
                  {lectureGenerationError && (
                    <MessageBar intent="error" role="alert" className="generation-message">
                      <MessageBarBody>
                        <MessageBarTitle>Lecture generation paused</MessageBarTitle>
                        {lectureGenerationError} Completed notes are saved; resume to continue.
                      </MessageBarBody>
                    </MessageBar>
                  )}
                  <DataStatePanel
                    status={lectureEntries.length === 0 ? 'empty' : 'data'}
                    onRetry={() => setRetryIndex((value) => value + 1)}
                    emptyTitle="No lectures available"
                    emptyDescription="This course does not currently contain lecture details."
                    emptyActionLabel="Load course data"
                    onEmptyAction={() => setRetryIndex((value) => value + 1)}
                  >
                    <div className="table-wrap">
                      <Table aria-label={`${course.title} lecture outline`} size="small">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Lecture</TableHeaderCell>
                            <TableHeaderCell>Topic</TableHeaderCell>
                            <TableHeaderCell>Duration</TableHeaderCell>
                            <TableHeaderCell>Focus</TableHeaderCell>
                            <TableHeaderCell>Notes</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lectureEntries.map(({ plan, lecture }) => (
                            <TableRow key={plan.id}>
                              <TableCell className="lecture-number">{String(plan.number).padStart(2, '0')}</TableCell>
                              <TableCell>
                                <div className="lecture-topic">
                                  <Button
                                    appearance="subtle"
                                    className={`lecture-open-button${selectedLectureEntry?.plan.id === plan.id ? ' is-selected' : ''}`}
                                    aria-pressed={selectedLectureEntry?.plan.id === plan.id}
                                    onClick={() => setSelectedLectureId(plan.id)}
                                  >
                                    {plan.title}
                                  </Button>
                                  <Text size={200} className="lecture-summary">{plan.summary}</Text>
                                </div>
                              </TableCell>
                              <TableCell>{plan.durationMinutes} min</TableCell>
                              <TableCell>
                                <Badge appearance="tint" color={plan.role === 'Core' ? 'success' : plan.role === 'Practice' ? 'warning' : 'subtle'}>
                                  {plan.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge appearance="tint" color={lecture?.content ? 'success' : 'subtle'}>
                                  {lecture?.content ? 'Notes ready' : 'Outline only'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DataStatePanel>
                </section>

                <LectureNotesReader entry={selectedLectureEntry} />

                <AssessmentLibrary
                  assessments={course.assessments}
                  onGenerateAssignment={() => void generateAssignment()}
                />
              </>
            )}

            {activeTab === 'assignments' && (
              <AssessmentGroup
                title="Assignments"
                icon={<ClipboardTaskRegular />}
                count={assignments.length}
                assessments={assignments}
                emptyTitle="No assignments generated"
                emptyDescription="Create an outcome-aligned assignment with prompts, points, hints, and a review rubric."
                emptyActionLabel="Generate assignment"
                onGenerate={() => void generateAssignment()}
              />
            )}
            {activeTab === 'midterms' && (
              <AssessmentGroup
                title="Midterms"
                icon={<CalendarRegular />}
                count={midterms.length}
                assessments={midterms}
                emptyTitle="No midterm generated"
                emptyDescription="Generate a balanced midterm after Lecture 6, aligned to the material taught so far."
                emptyActionLabel="Generate midterm"
                onGenerate={() => void generateMidterm()}
              />
            )}
            {activeTab === 'final' && (
              <AssessmentGroup
                title="Final exam"
                icon={<CalendarRegular />}
                count={finalExam ? 1 : 0}
                assessments={finalExam ? [finalExam] : []}
                emptyTitle="No final exam generated yet"
                emptyDescription="Create a cumulative 18-question exam across limits, derivatives, integrals, and series."
                emptyActionLabel="Generate final exam"
                onGenerate={() => void generateFinal()}
              />
            )}
            <div className="workspace-footnote">
              <Text size={200}>{assessmentCount} assessment{assessmentCount === 1 ? '' : 's'} in this in-memory course · Generated content is not marked ready automatically.</Text>
            </div>
          </div>
        )}
      </DataStatePanel>
    </div>
  );
}

function LectureNotesReader({ entry }: { entry?: LectureEntry }) {
  const content = entry?.lecture?.content;
  const notesWordCount = content ? countLectureNotes(content) : 0;
  return (
    <section className="content-section lecture-notes-section">
      <div className="section-heading">
        <div className="section-heading-title">
          <BookOpenRegular aria-hidden="true" />
          <Title2 as="h2">Lecture notes</Title2>
        </div>
        {entry && <Text size={200} className="section-hint">Lecture {String(entry.plan.number).padStart(2, '0')} · {entry.plan.durationMinutes} minutes · {entry.plan.role}</Text>}
      </div>
      {entry ? (
        <>
          <header className="lecture-reader-header">
            <Title3 as="h3" className="lecture-notes-title">{entry.plan.title}</Title3>
            <Body1 className="lecture-reader-summary">{entry.plan.summary}</Body1>
          </header>
          {content ? (
            <>
              <Text size={200} className="lecture-word-count">
                {notesWordCount.toLocaleString()} words · target 5,000–8,000 · practice excluded
              </Text>
              <section className="lecture-guiding-question">
                <Text size={200} weight="semibold">Guiding question</Text>
                <MarkdownContent>{content.motivatingQuestion}</MarkdownContent>
              </section>
              <div className="lecture-notes-layout">
                <div className="lecture-notes-main">
                  <NoteSection title="Prerequisite check" number="01">
                    <MarkdownContent>{content.prerequisiteCheck}</MarkdownContent>
                  </NoteSection>
                  <NoteSection title="Intuitive explanation" number="02">
                    <MarkdownContent>{content.intuitiveExplanation}</MarkdownContent>
                  </NoteSection>
                  <NoteSection title="Formal development" number="03">
                    <MarkdownContent>{content.formalDevelopment}</MarkdownContent>
                  </NoteSection>
                  <NoteSection title="Worked examples" number="04">
                    {content.workedExamples.map((example, index) => (
                      <article className="lecture-example" key={`${entry.plan.id}-example-${index}`}>
                        <Text size={200} className="lecture-example-label">Example {index + 1}</Text>
                        <MarkdownContent>{example.prompt}</MarkdownContent>
                        <ol className="lecture-example-steps">
                          {example.reasoningSteps.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}><MarkdownContent>{step}</MarkdownContent></li>)}
                        </ol>
                        <div className="lecture-example-conclusion"><MarkdownContent>{example.conclusion}</MarkdownContent></div>
                      </article>
                    ))}
                  </NoteSection>
                  <NoteSection title="Extension" number="05">
                    <MarkdownContent>{content.extension}</MarkdownContent>
                  </NoteSection>
                  <NoteSection title="Summary" number="06">
                    <MarkdownContent>{content.summary}</MarkdownContent>
                  </NoteSection>
                  <NoteSection title="Practice" number="07">
                    <MarkdownContent>{content.practice.prompt}</MarkdownContent>
                    <div className="lecture-hints">
                      <Text size={200} weight="semibold">Progressive hints</Text>
                      <ol className="lecture-example-steps">
                        {content.practice.hints.map((hint, index) => <li key={`${index}-${hint}`}><MarkdownContent>{hint}</MarkdownContent></li>)}
                      </ol>
                    </div>
                    <details className="lecture-solution-details">
                      <summary>Reveal solution and response rubric</summary>
                      <MarkdownContent>{content.practice.solution}</MarkdownContent>
                      <div className="lecture-aside-markdown">{content.practice.rubric.map((item, index) => <MarkdownContent key={`${index}-${item}`}>{item}</MarkdownContent>)}</div>
                    </details>
                  </NoteSection>
                </div>
                <aside className="lecture-notes-aside" aria-label="Lecture reference">
                  <NoteSection title="Learning objectives">
                    <ul className="lecture-aside-list">
                      {entry.plan.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                    </ul>
                  </NoteSection>
                  <NoteSection title="Applications">
                    <div className="lecture-aside-markdown">{content.applications.map((item, index) => <MarkdownContent key={`${index}-${item}`}>{item}</MarkdownContent>)}</div>
                  </NoteSection>
                  <NoteSection title="Common misconceptions">
                    <div className="lecture-aside-markdown">{content.misconceptions.map((item, index) => <MarkdownContent key={`${index}-${item}`}>{item}</MarkdownContent>)}</div>
                  </NoteSection>
                </aside>
              </div>
            </>
          ) : (
            <div className="detail-placeholder">
              <Text weight="semibold">Outline only · full lecture notes have not been generated</Text>
              <Body2>This lecture’s plan is ready. Generate the remaining lectures to add explanations, worked examples, applications, and practice.</Body2>
              <ul className="lecture-aside-list">
                {entry.plan.objectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="detail-placeholder">
          <Text weight="semibold">No lecture is selected</Text>
          <Body2>This course does not yet have a lecture outline.</Body2>
        </div>
      )}
    </section>
  );
}

function NoteSection({ title, number, children }: { title: string; number?: string; children: ReactNode }) {
  return (
    <section className="lecture-note-section">
      <div className="lecture-note-heading">
        {number && <Text size={200} className="lecture-note-number">{number}</Text>}
        <Text weight="semibold">{title}</Text>
      </div>
      <div className="lecture-note-copy">{children}</div>
    </section>
  );
}

function MarkdownContent({ children }: { children: string }) {
  return <div className="lecture-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>;
}

function countLectureNotes(content: NonNullable<Lecture['content']>): number {
  const sections = [
    content.motivatingQuestion,
    content.prerequisiteCheck,
    content.intuitiveExplanation,
    content.formalDevelopment,
    content.extension,
    content.summary,
    ...content.applications,
    ...content.misconceptions,
    ...content.workedExamples.flatMap((example) => [
      example.prompt,
      ...example.reasoningSteps,
      example.conclusion,
    ]),
  ];
  return sections.reduce((total, section) => total + (section.match(/\b[\w’'-]+\b/g)?.length ?? 0), 0);
}

interface AssessmentLibraryProps {
  assessments: Assessment[];
  onGenerateAssignment: () => void;
}

function AssessmentLibrary({ assessments, onGenerateAssignment }: AssessmentLibraryProps) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div className="section-heading-title">
          <DocumentBulletListRegular aria-hidden="true" />
          <Title2>Assessment library</Title2>
        </div>
        <Text size={200} className="section-hint">{assessments.filter((assessment) => assessment.kind === 'assignment').length} assignments · {assessments.filter((assessment) => assessment.kind === 'midterm').length} midterms</Text>
      </div>
      <div className="assessment-grid">
        {assessments.map((assessment) => <AssessmentCard key={assessment.id} assessment={assessment} />)}
      </div>
      {assessments.length === 0 && (
        <Card appearance="filled-alternative" className="empty-final-inline">
          <Body2>No assessment drafts are available for this course yet.</Body2>
          <Button appearance="secondary" icon={<AddRegular />} onClick={onGenerateAssignment}>Generate assignment</Button>
        </Card>
      )}
    </section>
  );
}

interface AssessmentGroupProps {
  title: string;
  icon: React.ReactElement;
  count: number;
  assessments: Assessment[];
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  onGenerate: () => void;
}

function AssessmentGroup({
  title,
  icon,
  count,
  assessments,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onGenerate,
}: AssessmentGroupProps) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div className="section-heading-title">
          {icon}
          <Title2>{title}</Title2>
        </div>
        <Text size={200} className="section-hint">{count} item{count === 1 ? '' : 's'}</Text>
      </div>
      {assessments.length > 0 ? (
        <div className="assessment-grid">
          {assessments.map((assessment) => <AssessmentCard key={assessment.id} assessment={assessment} />)}
        </div>
      ) : (
        <DataStatePanel
          status="empty"
          onRetry={onGenerate}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyActionLabel={emptyActionLabel}
          onEmptyAction={onGenerate}
        >
          <></>
        </DataStatePanel>
      )}
    </section>
  );
}
