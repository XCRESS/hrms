const Avatar = ({ name }: { name: string }) => {
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

  return (
    <div
      className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-medium ${color}`}
    >
      {firstLetter}
    </div>
  );
};
export default Avatar;