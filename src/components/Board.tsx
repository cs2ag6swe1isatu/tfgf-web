import { create } from 'zustand'
import { combine } from 'zustand/middleware'

type BoardValue = string | null;

interface BoardData {
    squares: BoardValue[];
    xIsNext: boolean;
}

interface BoardActions {
    setSquares: (nextSquares: BoardValue[] | ((prev: BoardValue[]) => BoardValue[])) => void;
    setXIsNext: (nextXIsNext: boolean | ((prev: boolean) => boolean)) => void;
}

type BoardStore = BoardData & BoardActions;

const useGameStore = create<BoardStore>(
    combine({ squares: Array(9).fill(null) as BoardValue[], xIsNext: true }, (set) => {
        return {
            setSquares: (nextSquares) => {
                set((state) => ({
                    squares:
                    typeof nextSquares === 'function'
                        ? nextSquares(state.squares)
                        : nextSquares,
                }))
            },
            setXIsNext: (nextXIsNext) => {
                set((state) => ({
                    xIsNext:
                    typeof nextXIsNext === 'function'
                        ? nextXIsNext(state.xIsNext)
                        : nextXIsNext,
                }))
            }
        }
    }),
)

function calculateWinner(squares: BoardValue[]) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ]
    for (let i = 0; i < lines.length; i++){
        const [a, b, c] = lines[i]
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]){
            return squares[a]
        }
    }
    return null
}
function calculateTurns(squares: BoardValue[]){
    return squares.filter((square) => !square).length
}
function calculateStatus(winner: BoardValue, turns: number, player: string){
    if(!winner && !turns) return "Game tied!"
    if(!winner) return `Player ${player}'s turn`
    return `Player ${winner} wins!`
}

interface SquareProps{
    value: string | null;
    onSquareClick: () => void;
}

function Square({ value, onSquareClick }: SquareProps) {
    return (
        <button
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                backgroundColor: '#fff',
                border: '1px solid #999',
                outline: 0,
                borderRadius: 0,
                fontSize: '1rem',
                fontWeight: 'bold',
            }}
            onClick={onSquareClick}
        >
        {value}
        </button>
    )
}

export default function Board(){
    const xIsNext = useGameStore((state) => state.xIsNext)
    const setXIsNext = useGameStore((state) => state.setXIsNext)
    const squares = useGameStore((state : BoardStore) => state.squares)
    const setSquares = useGameStore((state : BoardStore) => state.setSquares)
    const winner = calculateWinner(squares)
    const turns = calculateTurns(squares)
    const player = xIsNext ? 'X' : 'O'
    const status = calculateStatus(winner, turns, xIsNext ? 'X' : 'O') 

    function handleClick(i: number) {
        if (squares[i] || winner) return
        const nextSquares = squares.slice()
        nextSquares[i] = player
        setSquares(nextSquares)
        setXIsNext(!xIsNext)
    }

    return (
        <>
            <div style={{ marginBottom: '0.5rem' }}>{status}</div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)',
                    width: 'calc(3*2.5rem)',
                    height: 'calc(3*2.5rem)',
                    border: '1px solid #999',
                }}
            >
                {squares.map((square: BoardValue, squareIndex: number) => (
                    <Square key={squareIndex} value={square} onSquareClick={() => handleClick(squareIndex)} />
                ))}
            </div>
        </>
    )
}