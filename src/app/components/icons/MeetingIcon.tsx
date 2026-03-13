import meetingIconImgGray from '../../../assets/3f7af1cecdc45402c51e3cca4ac1145ecd698fd1.png';
import meetingIconImgBlue from '../../../assets/48dc9197dfe4ac837d05ad6fe27e2ab103bdd5c3.png';
import meetingIconImgDark from '../../../assets/events-icon-darkmode.png';

interface MeetingIconProps {
  className?: string;
  isActive?: boolean;
}

export function MeetingIcon({ className = "w-5 h-5", isActive = false }: MeetingIconProps) {
  return (
    <>
      <img
        src={isActive ? meetingIconImgBlue : meetingIconImgGray}
        alt="Meeting"
        className={`${className} dark:hidden`}
        style={{ objectFit: 'contain' }}
      />
      <img
        src={meetingIconImgDark}
        alt="Meeting"
        className={`${className} hidden dark:block`}
        style={{ objectFit: 'contain' }}
      />
    </>
  );
}
