import React from "react";

const AudioRecording: React.FC = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      {/* 波形容器 */}
      <div className="flex items-center h-full w-full gap-[10%]">
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className="ios-bar bg-red-600 h-[60%] flex-1 rounded-full"
            style={{
              animationDelay: `${i * 0.12}s`,
              transformOrigin: "center",
              animation: "ios-wave 1.2s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ios-wave {
          0% {
            transform: scaleY(0.3);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.4);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioRecording;
