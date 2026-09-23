import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Dropdown,
  Field,
  Input,
  Option,
  Switch,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import type { CourseBriefInput, CourseLevel, SuggestedCourseBrief } from '../types/course';

interface CourseBriefFormProps {
  isGenerating: boolean;
  selectedBrief: SuggestedCourseBrief | null;
  onGenerate: (input: CourseBriefInput) => Promise<void>;
}

export function CourseBriefForm({ isGenerating, selectedBrief, onGenerate }: CourseBriefFormProps) {
  const [title, setTitle] = useState('Linear Algebra');
  const [courseCode, setCourseCode] = useState('MATH 221');
  const [level, setLevel] = useState<CourseLevel>('Undergraduate');
  const [outcomes, setOutcomes] = useState('Work with vector spaces, linear transformations, matrices, and eigenvalues.');
  const [testMode, setTestMode] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    if (!selectedBrief) return;
    setTitle(selectedBrief.title);
    setCourseCode(selectedBrief.courseCode);
    setLevel(selectedBrief.level);
    setOutcomes(selectedBrief.learningOutcomes.join('\n'));
    setValidationMessage('');
  }, [selectedBrief]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsedOutcomes = outcomes.split('\n').map((outcome) => outcome.trim()).filter(Boolean);
    if (!title.trim() || !courseCode.trim() || parsedOutcomes.length === 0) {
      setValidationMessage('Add a course title, code, and at least one learning outcome.');
      return;
    }
    setValidationMessage('');
    await onGenerate({
      title: title.trim(),
      courseCode: courseCode.trim(),
      level,
      learningOutcomes: parsedOutcomes,
      testMode,
    });
  }

  return (
    <form className="brief-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="form-grid">
        <Field label="Course title" validationState={validationMessage && !title.trim() ? 'error' : 'none'}>
          <Input value={title} onChange={(_, data) => setTitle(data.value)} placeholder="e.g. Linear Algebra" />
        </Field>
        <Field label="Course code" validationState={validationMessage && !courseCode.trim() ? 'error' : 'none'}>
          <Input value={courseCode} onChange={(_, data) => setCourseCode(data.value)} placeholder="e.g. MATH 221" />
        </Field>
        <Field
          label="Level"
          validationState="warning"
          validationMessage="Undergraduate is the current planning assumption; adjust for your cohort."
        >
          <Dropdown
            aria-label="Course level"
            value={level}
            selectedOptions={[level]}
            onOptionSelect={(_, data) => {
              if (data.optionValue === 'Undergraduate' || data.optionValue === 'Graduate') {
                setLevel(data.optionValue);
              }
            }}
          >
            <Option value="Undergraduate">Undergraduate</Option>
            <Option value="Graduate">Graduate</Option>
          </Dropdown>
        </Field>
        <Field
          className="outcomes-field"
          label="Learning outcomes"
          validationState={validationMessage && !outcomes.trim() ? 'error' : 'none'}
          validationMessage={validationMessage || undefined}
        >
          <Textarea
            resize="vertical"
            rows={4}
            value={outcomes}
            onChange={(_, data) => setOutcomes(data.value)}
            placeholder="Use one measurable outcome per line"
          />
          <Text size={200} className="field-hint">Use one measurable outcome per line for a focused course outline.</Text>
        </Field>
      </div>

      <div className="test-mode-control">
        <Switch checked={testMode} label="Test mode" onChange={(_, data) => setTestMode(data.checked)} />
        <Text size={200} className="test-mode-hint">
          Off generates 12 lectures. On generates one lecture for a quick end-to-end test.
        </Text>
      </div>

      <div className="form-footer">
        <Button
          appearance="primary"
          type="submit"
          icon={<AddRegular />}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating course…' : 'Generate course'}
        </Button>
      </div>
    </form>
  );
}
