import { answerError as validate, emptyAnswersFor, formatRupiah, furthestStep as furthest, parseRupiah, rupiahDigits, type Answers, type Question } from '../conversational/answers';
import { getSpec } from '../conversational/specs';

const spec = getSpec('dana-darurat');
export type { Answers };
type LegacyQuestion = Question & { key: 'expense' | 'married' | 'dependents' | 'months' | 'initial' | 'payment' | 'rate' };
export const questions: readonly LegacyQuestion[] = spec.questions as unknown as readonly LegacyQuestion[];
export const emptyAnswers: Answers = emptyAnswersFor(questions);
export { formatRupiah, parseRupiah, rupiahDigits };
export const answerError = (question: Question, value: string) => validate(question, value);
export const furthestStep = (answers: Answers, previous: number) => furthest(questions, answers, previous);
export const toPayload = (answers: Answers) => spec.toPayload(answers);
