import type { AskField, LetterDoc, LetterKind } from '@/types/letters';

type Inline = LetterDoc;

const t = (text: string, ...marks: string[]): Inline => ({ type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const f = (key: string, opts: { format?: string; bold?: boolean } = {}): Inline => ({
  type: 'field',
  attrs: { key, ...(opts.format ? { format: opts.format } : {}) },
  ...(opts.bold ? { marks: [{ type: 'bold' }] } : {}),
});
const p = (...content: Inline[]): LetterDoc => ({ type: 'paragraph', ...(content.length ? { content } : {}) });
const right = (...content: Inline[]): LetterDoc => ({ type: 'paragraph', attrs: { textAlign: 'right' }, content });
const justify = (...content: Inline[]): LetterDoc => ({ type: 'paragraph', attrs: { textAlign: 'justify' }, content });
const clause = (n: number, heading: string, ...rest: Inline[]): LetterDoc => justify(t(`${n}. `), t(heading, 'bold', 'underline'), t(': '), ...rest);
const title = (text: string): LetterDoc => ({ type: 'paragraph', attrs: { textAlign: 'center' }, content: [t(text, 'bold', 'underline')] });

const dateLine = (): LetterDoc[] => [right(t('Ref: '), f('letter.referenceNo')), right(t('Date: '), f('letter.date', { format: 'dotted' }))];

const employeeAddressBlock = (): LetterDoc[] => [
  p(f('employee.salutation', { bold: true }), t(' ', 'bold'), f('employee.fullName', { bold: true })),
  p(t('Employee code: '), f('employee.code')),
  p(f('employee.address')),
];

const signOff = (): LetterDoc[] => [
  p(),
  p(t('Yours faithfully,')),
  p(t('For and on behalf of')),
  p(f('company.name', { bold: true })),
  p(),
  p(),
  p(f('signatory.name', { bold: true })),
  p(f('signatory.designation')),
];

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  kind: LetterKind;
  body: LetterDoc;
  askFields: AskField[];
  email: { subject: string; body: string };
}

const doc = (...content: LetterDoc[]): LetterDoc => ({ type: 'doc', content });

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'appointment',
    name: 'Appointment letter',
    description: 'Confirms an employee’s appointment, compensation, probation and terms.',
    kind: 'employee',
    askFields: [
      { key: 'grade', label: 'Grade', type: 'text', required: true },
      { key: 'postingCity', label: 'Posting city', type: 'text', required: true },
      { key: 'probation', label: 'Probation period', type: 'text', required: false, default: '3 months' },
      { key: 'noticePeriod', label: 'Notice period', type: 'text', required: false, default: '30 days' },
    ],
    email: {
      subject: 'Your appointment letter — {{company.name}}',
      body: 'Dear {{employee.firstName}},\n\nPlease find your appointment letter attached. Kindly sign and return a copy as your acceptance.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}',
    },
    body: doc(
      ...dateLine(),
      p(),
      ...employeeAddressBlock(),
      p(),
      p(t('Dear '), f('employee.firstName'), t(',')),
      p(),
      clause(1, 'Appointment', t('We are pleased to appoint you as “'), f('employee.position', { bold: true }), t('” in '), f('company.name'), t(' with effect from '), f('employee.joiningDate', { format: 'ordinal' }), t('. You will report to '), f('employee.reportingSupervisor'), t(' or such other person as the company may notify from time to time.')),
      p(),
      clause(2, 'Compensation', t('Your role is positioned in '), f('ask.grade', { bold: true }), t('. Your compensation and other benefits are set out in Annexure ‘A’. You shall be liable for all taxes arising on payments made to you.')),
      p(),
      clause(3, 'Probation & Confirmation', t('You shall be on probation for '), f('ask.probation', { bold: true }), t(' from the date of joining, which the company may extend. On successful completion your employment will be confirmed in writing.')),
      p(),
      clause(4, 'Notice Period', t('After probation, either party may end this appointment by giving '), f('ask.noticePeriod', { bold: true }), t(' written notice or payment in lieu thereof.')),
      p(),
      clause(5, 'Location', t('You will initially be posted at '), f('ask.postingCity', { bold: true }), t('. The company may transfer you to any of its offices or group companies as business requires.')),
      p(),
      clause(6, 'Confidentiality', t('You will keep all company information strictly confidential during and after your employment.')),
      p(),
      justify(t('Kindly sign and return a copy of this letter as a token of your acceptance of the above terms.')),
      ...signOff(),
      { type: 'pageBreak' },
      p(t('Agreed and Accepted', 'bold')),
      justify(t('I have read and understood the terms of this appointment letter and accept them.')),
      p(),
      p(t('Signature: ____________________')),
      p(t('Name: '), f('employee.fullName')),
      p(t('Date: ____________________')),
    ),
  },
  {
    id: 'offer',
    name: 'Offer letter',
    description: 'For candidates not yet in the HRMS: role, CTC, joining date and acceptance.',
    kind: 'manual',
    askFields: [
      { key: 'role', label: 'Role offered', type: 'text', required: true },
      { key: 'ctc', label: 'Annual CTC', type: 'money', required: true },
      { key: 'joiningDate', label: 'Expected joining date', type: 'date', required: true },
      { key: 'location', label: 'Work location', type: 'text', required: true },
      { key: 'acceptBy', label: 'Accept by', type: 'date', required: true },
    ],
    email: {
      subject: 'Offer of employment — {{company.name}}',
      body: 'Dear {{recipient.name}},\n\nCongratulations! Please find your offer letter attached. Kindly confirm your acceptance by replying to this email.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}',
    },
    body: doc(
      ...dateLine(),
      p(),
      p(f('recipient.name', { bold: true })),
      p(f('recipient.address')),
      p(),
      title('Offer of Employment'),
      p(),
      p(t('Dear '), f('recipient.name'), t(',')),
      p(),
      justify(t('We are pleased to offer you the position of '), f('ask.role', { bold: true }), t(' at '), f('company.name'), t('. Your annual cost to company will be '), f('ask.ctc', { bold: true }), t(' ('), f('ask.ctc', { format: 'words' }), t(').')),
      p(),
      justify(t('Your expected date of joining is '), f('ask.joiningDate', { format: 'ordinal' }), t(' and you will be based at '), f('ask.location'), t('. A detailed appointment letter will be issued on joining.')),
      p(),
      justify(t('This offer is subject to satisfactory verification of your documents and references. Please confirm your acceptance by '), f('ask.acceptBy', { format: 'ordinal' }), t(', after which this offer lapses.')),
      p(),
      p(t('We look forward to welcoming you to the team.')),
      ...signOff(),
    ),
  },
  {
    id: 'experience',
    name: 'Experience letter',
    description: 'Certifies an employee’s tenure and role, usually on leaving.',
    kind: 'employee',
    askFields: [{ key: 'lastWorkingDay', label: 'Last working day', type: 'date', required: true }],
    email: {
      subject: 'Experience letter — {{company.name}}',
      body: 'Dear {{employee.firstName}},\n\nPlease find your experience letter attached. We wish you the very best.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}',
    },
    body: doc(
      ...dateLine(),
      p(),
      title('To Whom It May Concern'),
      p(),
      justify(t('This is to certify that '), f('employee.salutation'), t(' '), f('employee.fullName', { bold: true }), t(' (Employee code '), f('employee.code'), t(') was employed with '), f('company.name'), t(' from '), f('employee.joiningDate', { format: 'ordinal' }), t(' to '), f('ask.lastWorkingDay', { format: 'ordinal' }), t('.')),
      p(),
      justify(t('During this period they worked as '), f('employee.position', { bold: true }), t(' in the '), f('employee.department'), t(' department. We found them sincere and hardworking, and we wish them success in their future endeavours.')),
      ...signOff(),
    ),
  },
  {
    id: 'relieving',
    name: 'Relieving letter',
    description: 'Confirms an employee’s resignation was accepted and they are relieved of duties.',
    kind: 'employee',
    askFields: [
      { key: 'resignationDate', label: 'Resignation date', type: 'date', required: true },
      { key: 'lastWorkingDay', label: 'Last working day', type: 'date', required: true },
    ],
    email: {
      subject: 'Relieving letter — {{company.name}}',
      body: 'Dear {{employee.firstName}},\n\nPlease find your relieving letter attached. Thank you for your contribution, and all the best.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}',
    },
    body: doc(
      ...dateLine(),
      p(),
      ...employeeAddressBlock(),
      p(),
      title('Relieving Letter'),
      p(),
      p(t('Dear '), f('employee.firstName'), t(',')),
      p(),
      justify(t('This refers to your resignation dated '), f('ask.resignationDate', { format: 'ordinal' }), t('. We confirm that your resignation has been accepted and you are relieved from the services of '), f('company.name'), t(' with effect from the close of business on '), f('ask.lastWorkingDay', { format: 'ordinal' }), t('.')),
      p(),
      justify(t('We confirm that you have handed over all company property and that your full and final settlement will be processed as per company policy. We thank you for your contribution as '), f('employee.position'), t(' and wish you success ahead.')),
      ...signOff(),
    ),
  },
];
