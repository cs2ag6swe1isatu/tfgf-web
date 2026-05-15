import { BunnyState } from "./bunnyStates";

// ─── Using relative paths instead of the @ alias ───
import idle from "../../assets/bunny/idle.png";
import sleeping from "../../assets/bunny/sleeping.png";
import running from "../../assets/bunny/running.png";
import thinking from "../../assets/bunny/thinking.png";
import panicked from "../../assets/bunny/panicked.png";
import happy from "../../assets/bunny/happy.png";
import sad from "../../assets/bunny/sad.png";
import hyper from "../../assets/bunny/hyper.png";
import confident from "../../assets/bunny/confident.png";
import winner from "../../assets/bunny/winner.png";

const spriteMap: Record<BunnyState, string> = {
  idle,
  sleeping,
  running,
  thinking,
  panicked,
  happy,
  sad,
  hyper,
  confident,
  winner,
};

export default spriteMap;