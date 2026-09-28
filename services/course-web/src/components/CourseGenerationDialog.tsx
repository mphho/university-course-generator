import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import type {
  CourseBriefInput,
  GenerationActivity,
  GenerationProgressResponse,
} from '../types/course';

interface CourseGenerationDialogProps {
  open: boolean;
  request: CourseBriefInput | null;
  progress: GenerationProgressResponse | null;
  activities: GenerationActivity[];
}

const generationSteps = [
  {
    title: 'Plan the course map',
    description: 'Organize outcomes, prerequisites, lecture sequence, and assessment alignment.',
  },
  {
    title: 'Generate lecture content',
    description: 'Build complete lecture notes, worked examples, applications, and practice.',
  },
  {
    title: 'Validate and save the draft',
    description: 'Check the generated structure and write the course snapshot to the local archive.',
  },
];

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function CourseGenerationDialog({ open, request, progress, activities }: CourseGenerationDialogProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open) return undefined;

    const startedAt = Date.now();
    const updateElapsedTime = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [open]);

  const lectureCount = request?.testMode ? 1 : 12;
  const visibleOutcomes = request?.learningOutcomes.slice(0, 3) ?? [];
  const remainingOutcomeCount = Math.max((request?.learningOutcomes.length ?? 0) - visibleOutcomes.length, 0);

  return (
    <Dialog open={open} modalType="modal">
      <DialogSurface className="generation-dialog-surface">
        <DialogBody>
          <DialogTitle>Building your course</DialogTitle>
          <DialogContent className="generation-dialog-content">
            <div className="generation-status">
              <Spinner size="medium" />
              <div className="generation-status-copy">
                <Text weight="semibold" role="status">Generation is in progress</Text>
                <Text size={200} aria-live="off">Elapsed {formatElapsedTime(elapsedSeconds)}</Text>
              </div>
            </div>

            <section className="generation-activity" aria-labelledby="generation-activity-title">
              <div className="generation-http-heading">
                <Text id="generation-activity-title" weight="semibold">Provider API requests</Text>
                <Text size={200} className="generation-http-pending">
                  {activities.length} request{activities.length === 1 ? '' : 's'}
                </Text>
              </div>
              {activities.length === 0 ? (
                <Text size={200} role="status" className="generation-http-note">
                  {progress ? 'Waiting for the first provider request…' : 'Connecting to the activity feed…'}
                </Text>
              ) : (
                <ol className="generation-activity-list">
                  {[...activities].reverse().map((activity) => {
                    const elapsedMs = activity.elapsedMs
                      ?? Math.max(Date.now() - Date.parse(activity.startedAt), 0);
                    const statusLabel = activity.status === 'pending'
                      ? 'In progress'
                      : activity.status === 'completed'
                        ? 'Completed'
                        : 'Failed';
                    return (
                      <li key={activity.id}>
                        <details className="generation-activity-item">
                          <summary>
                            <span className="generation-activity-main">
                              <span className={`generation-activity-indicator is-${activity.status}`} aria-hidden="true" />
                              <span className="generation-activity-title">{activity.label}</span>
                              <code>{activity.method}</code>
                              <code className="generation-activity-url">{activity.url}</code>
                            </span>
                            <span className={`generation-activity-result is-${activity.status}`}>
                              {activity.statusCode !== undefined ? `${activity.statusCode} · ` : ''}
                              {statusLabel} · {formatElapsedTime(Math.floor(elapsedMs / 1000))}
                            </span>
                          </summary>
                          {activity.error && <Text size={200} className="generation-activity-error">{activity.error}</Text>}
                          {activity.requestBody !== undefined && (
                            <details className="generation-request-details">
                              <summary>Subrequest body (JSON)</summary>
                              <pre aria-label={`${activity.label} request body`}>
                                {JSON.stringify(activity.requestBody, null, 2)}
                              </pre>
                            </details>
                          )}
                        </details>
                      </li>
                    );
                  })}
                </ol>
              )}
              <Text size={200} className="generation-http-note">
                Bodies show provider POST JSON only; authentication headers are not recorded.
              </Text>
            </section>

            {request && (
              <details className="generation-http generation-collapsible">
                <summary>
                  <Text id="generation-http-title" weight="semibold">Browser API request</Text>
                  <Text size={200} className="generation-http-pending" role="status">
                    POST /api/courses/generate · Awaiting response
                  </Text>
                </summary>
                <dl className="generation-http-meta">
                  <div><dt>Method</dt><dd><code>POST</code></dd></div>
                  <div><dt>URL</dt><dd><code>/api/courses/generate</code></dd></div>
                  <div><dt>Content-Type</dt><dd><code>application/json</code></dd></div>
                </dl>
                <details className="generation-request-details">
                  <summary>Request body (JSON)</summary>
                  <pre aria-label="POST request body">{JSON.stringify(request, null, 2)}</pre>
                </details>
                <Text size={200} className="generation-http-note">
                  The local API keeps this request open while it generates the course.
                </Text>
              </details>
            )}

            <details className="generation-workflow generation-collapsible">
              <summary>
                <Text id="generation-workflow-title" weight="semibold">Course generation workflow</Text>
                <Text size={200}>3 stages</Text>
              </summary>
              <ol className="generation-step-list">
                {generationSteps.map((step, index) => (
                  <li className="generation-step" key={step.title}>
                    <span className="generation-step-number" aria-hidden="true">{index + 1}</span>
                    <div className="generation-step-copy">
                      <Text weight="semibold">{step.title}</Text>
                      <Text size={200}>{index === 1 ? `${lectureCount} lecture${lectureCount === 1 ? '' : 's'}: ${step.description}` : step.description}</Text>
                    </div>
                  </li>
                ))}
              </ol>
            </details>

            {request && (
              <details className="generation-brief generation-collapsible">
                <summary>
                  <Text id="generation-brief-title" weight="semibold">Submitted brief</Text>
                  <Text size={200}>{request.title} · {request.courseCode}</Text>
                </summary>
                <Text>{request.title} <span aria-hidden="true">·</span> {request.courseCode} <span aria-hidden="true">·</span> {request.level}</Text>
                <Text size={200}>{lectureCount} lecture{lectureCount === 1 ? '' : 's'} requested · {request.learningOutcomes.length} learning outcome{request.learningOutcomes.length === 1 ? '' : 's'}</Text>
                {visibleOutcomes.length > 0 && (
                  <ul className="generation-outcome-list">
                    {visibleOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
                  </ul>
                )}
                {remainingOutcomeCount > 0 && (
                  <Text size={200}>{remainingOutcomeCount} additional outcome{remainingOutcomeCount === 1 ? '' : 's'} included</Text>
                )}
              </details>
            )}

            <Text size={200} className="generation-stream-note">
              The complete draft will appear here when generation finishes.
            </Text>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}