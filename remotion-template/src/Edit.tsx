import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

// CUTS_STARTER_NOT_EDITED — replace this component and remove this marker.
export const Edit: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        backgroundColor: '#080808',
        color: '#f5f1e8',
        display: 'flex',
        fontFamily: 'Arial, sans-serif',
        justifyContent: 'center',
      }}
    >
      <div style={{fontSize: 74, fontWeight: 800, opacity}}>MAKE YOUR CUT</div>
    </AbsoluteFill>
  );
};
