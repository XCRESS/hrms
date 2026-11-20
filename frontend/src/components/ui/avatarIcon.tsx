import useProfilePicture from '../../hooks/useProfilePicture';
import { cn } from '@/lib/utils';

const Avatar = ({ name, className }: { name: string; className?: string }) => {
  const { imageUrl } = useProfilePicture();
  const firstLetter = name.charAt(0).toUpperCase();
  const bgColors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  const color = bgColors[name.charCodeAt(0) % bgColors.length];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn('h-7 w-7 min-w-7 shrink-0 rounded-full object-cover object-center', className)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn('h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-medium', color, className)}
    >
      {firstLetter}
    </div>
  );
};
export default Avatar;
