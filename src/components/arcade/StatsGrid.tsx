import StatCard from "./StatCard";

interface StatsGridProps {
  score: number;
  xpGained: number;
  accuracy: string;
  avgTime: string;
}

export default function StatsGrid({
  score,
  xpGained,
  accuracy,
  avgTime,
}: StatsGridProps) {
  return (
    <div
      className="w-full relative rounded-xl p-3 md:p-5 grid grid-cols-2 gap-3 md:gap-5"
      style={{
        border: "2px solid rgba(0, 223, 255, 0.6)",
        background: "rgba(10, 10, 30, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Corner accents */}
      <div
        className="absolute w-3 h-3 md:w-4 md:h-4"
        style={{
          top: "-4px",
          left: "-4px",
          background: "#00DFFF",
          boxShadow:
            "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
        }}
      />
      <div
        className="absolute w-3 h-3 md:w-4 md:h-4"
        style={{
          top: "-4px",
          right: "-4px",
          background: "#00DFFF",
          boxShadow:
            "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
        }}
      />
      <div
        className="absolute w-3 h-3 md:w-4 md:h-4"
        style={{
          bottom: "-4px",
          left: "-4px",
          background: "#00DFFF",
          boxShadow:
            "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
        }}
      />
      <div
        className="absolute w-3 h-3 md:w-4 md:h-4"
        style={{
          bottom: "-4px",
          right: "-4px",
          background: "#00DFFF",
          boxShadow:
            "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
        }}
      />

      {/* Dashed divider lines */}
      <div
        className="absolute top-1/2 left-3 md:left-5 right-3 md:right-5 h-px pointer-events-none"
        style={{
          borderTop: "1px dashed rgba(0, 223, 255, 0.3)",
        }}
      />
      <div
        className="absolute left-1/2 top-3 md:top-5 bottom-3 md:bottom-5 w-px pointer-events-none"
        style={{
          borderLeft: "1px dashed rgba(0, 223, 255, 0.3)",
        }}
      />

      {/* Stat Cards */}
      <StatCard
        label="YOUR SCORE"
        value={score}
        valueColor="#FFFFFF"
        delay={0}
      />
      <StatCard
        label="XP GAINED"
        value={`+${xpGained}`}
        valueColor="#39FF14"
        delay={0.15}
      />
      <StatCard
        label="ACCURACY"
        value={accuracy}
        valueColor="#FFFFFF"
        delay={0.3}
      />
      <StatCard
        label="AVG TIME"
        value={avgTime}
        valueColor="#FFFFFF"
        delay={0.45}
      />
    </div>
  );
}