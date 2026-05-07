import "../styles/global.css";
import "../styles/result.css";

export default function Result() {
  return (
    <div className="container result-bg">
      <h1 className="game-over">GAME OVER!</h1>

      <div className="score-box">
        <div>
          <p>YOUR SCORE</p>
          <h2>100</h2>
        </div>

        <div>
          <p>XP EARNED</p>
          <h2>100</h2>
        </div>
      </div>

      <div className="rank-box">
        <p>RANK PROGRESS</p>
        <div className="progress-bar">
          <div className="progress"></div>
        </div>
        <span>STUDENT</span>
      </div>

      <div className="result-buttons">
        <button className="btn">MAIN MENU</button>
        <button className="btn">VIEW PROFILE</button>
      </div>
    </div>
  );
}