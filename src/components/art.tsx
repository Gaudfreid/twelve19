export const Art = ({ name, className = '' }: { name: string; className?: string }) =>
  <img src={`${import.meta.env.BASE_URL}art/${name}.png`} alt="" aria-hidden draggable={false} className={`select-none object-contain ${className}`} />
