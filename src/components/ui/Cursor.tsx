import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import handImg from '../../assets/img/hand.png';
import pointerImg from '../../assets/img/pointer.png';

const CursorWrapper = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '32px',
  height: '32px',
  pointerEvents: 'none',
  zIndex: 9999,
});

export const Cursor: React.FC = () => {
  console.log(handImg, pointerImg); 
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      if (target && target.closest('button, a, [role="button"]')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };
    window.addEventListener('mousemove', updatePosition);
    return () => window.removeEventListener('mousemove', updatePosition);
  }, []);

  return (
    <CursorWrapper
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <img
        src={isHovering ? handImg : pointerImg}
        alt="cursor"
        style={{ width: '100%', height: '100%' }}
      />
    </CursorWrapper>
  );
};