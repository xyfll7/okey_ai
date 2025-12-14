import React from "react";

const AudioRecording: React.FC = () => {
  return (
    <div className="flex items-center w-full h-full">
      {/* 音频波形动画 */}

      <div className="flex  gap-[11%] w-full h-[70%]">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-red-600 rounded-full"
            style={{
              width: "100%", // 相对于父容器宽度
              height: "100%",
              animation: `pulse 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              transformOrigin: "center",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scaleY(0.3);
            opacity: 0.6;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioRecording;
