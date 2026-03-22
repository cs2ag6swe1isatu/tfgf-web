import { fetchTriviaQuestions } from './triviaService';

async function testFetch() {
  console.log('Starting fetch test...');
  const questions = await fetchTriviaQuestions();
  console.log('Fetched questions:', questions);
}

testFetch();