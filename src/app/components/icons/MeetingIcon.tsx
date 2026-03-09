import meetingIconImgGray from '../../../assets/3f7af1cecdc45402c51e3cca4ac1145ecd698fd1.png';
import meetingIconImgBlue from '../../../assets/48dc9197dfe4ac837d05ad6fe27e2ab103bdd5c3.png';

interface MeetingIconProps {
  className?: string;
  isActive?: boolean;
}

export function MeetingIcon({ className = "w-5 h-5", isActive = false }: MeetingIconProps) {
  const iconSrc = isActive ? meetingIconImgBlue : meetingIconImgGray;
  
  return (
    <img 
      src={iconSrc} 
      alt="Meeting" 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
