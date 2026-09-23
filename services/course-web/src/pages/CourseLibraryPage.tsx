import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Body1,
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Title2,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowRightRegular,
  BookRegular,
  GridRegular,
} from '@fluentui/react-icons';
import { api } from '../api';
import { CourseBriefForm } from '../components/CourseBriefForm';
import { DataStatePanel, type DataStatus } from '../components/DataStatePanel';
import type {
  Course,
  CourseBriefInput,
  SuggestedCourseBrief,
} from '../types/course';

export function CourseLibraryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DataStatus>('loading');
  const [loadError, setLoadError] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [briefs, setBriefs] = useState<SuggestedCourseBrief[]>([]);
  const [retryIndex, setRetryIndex] = useState(0);
  const [selectedBrief, setSelectedBrief] = useState<SuggestedCourseBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [lastRequest, setLastRequest] = useState<CourseBriefInput | null>(null);
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setLoadError('');
    Promise.all([api.listCourses(), api.listSuggestedBriefs()])
      .then(([courseResponse, suggestedBriefs]) => {
        if (!active) return;
        setCourses(courseResponse.courses);
        setBriefs(suggestedBriefs);
        setStatus('data');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'The course list request failed.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [retryIndex]);

  async function handleGenerate(input: CourseBriefInput): Promise<void> {
    setIsGenerating(true);
    setGenerationError('');
    setLastRequest(input);
    try {
      const response = await api.generateCourse(input);
      setCreatedCourse(response.course);
      setCourses((current) => [response.course, ...current.filter((course) => course.id !== response.course.id)]);
    } catch (error: unknown) {
      setGenerationError(error instanceof Error ? error.message : 'Course generation did not complete.');
    } finally {
      setIsGenerating(false);
    }
  }

  function focusBrief(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('course-brief')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    document.getElementById('course-title')?.focus({ preventScroll: true });
  }

  const courseStatus: DataStatus = status === 'data' && courses.length === 0 && briefs.length === 0 ? 'empty' : status;

  return (
    <div className="library-page">
      <Card appearance="filled-alternative" className="library-hero">
        <svg className="hero-mesh" aria-hidden="true" viewBox="0 0 800 400" preserveAspectRatio="none">
          <defs>
            <radialGradient id="hero-glow-a" cx="0%" cy="0%" r="80%">
              <stop offset="0%" stopColor="var(--app-accent)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--app-accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hero-glow-b" cx="100%" cy="100%" r="80%">
              <stop offset="0%" stopColor="var(--app-primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--app-primary)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="400" fill="url(#hero-glow-a)" />
          <rect width="800" height="400" fill="url(#hero-glow-b)" />
        </svg>
        <div className="hero-content">
          <span className="hero-eyebrow"><span className="eyebrow-dot" />Course design / local workspace</span>
          <Title2 className="hero-title">Shape a semester, one clear lecture at a time</Title2>
          <Body1 className="hero-copy">
            Start with the Calculus 101 course or create a new course brief. Test mode generates one lecture first; a full run creates all twelve.
          </Body1>
          <div className="hero-actions">
            <Button appearance="primary" icon={<AddRegular />} onClick={focusBrief}>Create a course</Button>
            <Button appearance="secondary" icon={<BookRegular />} onClick={() => navigate('/courses/calculus-101')}>
              Open Calculus 101
            </Button>
          </div>
        </div>
      </Card>

      <section id="course-brief" className="content-section">
        <div className="section-heading">
          <div className="section-heading-title">
            <BookRegular aria-hidden="true" />
            <Title2>New course brief</Title2>
          </div>
          <Text size={200} className="section-hint">Generation stays behind the local API boundary</Text>
        </div>
        <Card appearance="outline" className="brief-card">
          <CourseBriefForm
            isGenerating={isGenerating}
            selectedBrief={selectedBrief}
            onGenerate={handleGenerate}
          />
        </Card>
        {generationError && (
          <MessageBar intent="error" role="alert" className="generation-message">
            <MessageBarBody>
              <MessageBarTitle>Course generation could not complete</MessageBarTitle>
              {generationError}
            </MessageBarBody>
            {lastRequest && (
              <Button appearance="secondary" onClick={() => void handleGenerate(lastRequest)}>Retry</Button>
            )}
          </MessageBar>
        )}
        {createdCourse && (
          <MessageBar intent="success" className="generation-message">
            <MessageBarBody>
              <MessageBarTitle>{createdCourse.title} is ready as a draft</MessageBarTitle>
              {createdCourse.lectures.length === 1 ? 'One lecture' : `${createdCourse.lectures.length} lectures`} generated. Review the outcomes, assumptions, and assessment alignment before release.
            </MessageBarBody>
            <Button appearance="secondary" icon={<ArrowRightRegular />} onClick={() => navigate(`/courses/${encodeURIComponent(createdCourse.id)}`)}>
              Open course
            </Button>
            <Badge appearance="tint" color="warning">Draft</Badge>
          </MessageBar>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div className="section-heading-title">
            <GridRegular aria-hidden="true" />
            <Title2>Courses and starter briefs</Title2>
          </div>
          <Text size={200} className="section-hint">{courses.length} local course{courses.length === 1 ? '' : 's'} · {briefs.length} suggested brief{briefs.length === 1 ? '' : 's'}</Text>
        </div>
        <DataStatePanel
          status={courseStatus}
          error={loadError}
          onRetry={() => setRetryIndex((value) => value + 1)}
          emptyTitle="Your course library is clear"
          emptyDescription="Start with a course brief. Your generated outline will appear here as a draft."
          emptyActionLabel="Start a course brief"
          onEmptyAction={focusBrief}
        >
          <div className="course-list">
            {courses.map((course) => (
              <Card appearance="outline" className="course-list-card" key={course.id}>
                <div className="course-row-main">
                  <span className="course-row-icon" aria-hidden="true"><BookRegular /></span>
                  <div className="course-row-copy">
                    <div className="course-row-title-line">
                      <Text className="course-row-title">{course.title}</Text>
                      {course.id === 'calculus-101' ? (
                        <Badge appearance="tint" color="success">Starter course</Badge>
                      ) : (
                        <Badge appearance="tint" color="warning">Draft</Badge>
                      )}
                    </div>
                    <Text className="course-row-description">{course.description}</Text>
                    <Text size={200} className="course-row-meta">
                      {course.courseCode} <span aria-hidden="true">·</span> {course.lectures.length} lectures <span aria-hidden="true">·</span> {course.units.length} units
                    </Text>
                  </div>
                </div>
                <Button appearance="secondary" icon={<ArrowRightRegular />} onClick={() => navigate(`/courses/${encodeURIComponent(course.id)}`)}>
                  Open course
                </Button>
              </Card>
            ))}
            {briefs.map((brief) => (
              <Card appearance="outline" className="course-list-card suggested-row" key={brief.courseCode}>
                <div className="course-row-main">
                  <span className="course-row-icon suggested-icon" aria-hidden="true"><BookRegular /></span>
                  <div className="course-row-copy">
                    <div className="course-row-title-line">
                      <Text className="course-row-title">{brief.title}</Text>
                      <Badge appearance="outline" color="subtle">Suggested</Badge>
                    </div>
                    <Text className="course-row-description">{brief.description}</Text>
                    <Text size={200} className="course-row-meta">{brief.courseCode} <span aria-hidden="true">·</span> {brief.level} <span aria-hidden="true">·</span> {brief.generationLabel}</Text>
                  </div>
                </div>
                <Button appearance="subtle" icon={<ArrowRightRegular />} onClick={() => {
                  setSelectedBrief(brief);
                  focusBrief();
                }}>
                  Use this brief
                </Button>
              </Card>
            ))}
          </div>
        </DataStatePanel>
      </section>
    </div>
  );
}
