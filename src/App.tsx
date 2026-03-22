import Board from './components/Board';
import QuizCard from './components/QuizCard';

export default function App(){
  return (
    <div>
      <h1>Hello from React!</h1>
      <p>This is a React component in an Electron app.</p>
      <Board />
      <QuizCard />
    </div>
  )
}