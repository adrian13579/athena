export default function AthenaMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M31 25v-4h9v32h-9v-4c-2.5 3-6 4.5-10 4.5C11 53.5 5 46.5 5 37s6-16.5 16-16.5c4 0 7.5 1.5 10 4.5ZM23 29a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="4"
        d="M51 5v18m-7.794-13.5 15.588 9m-15.588 0 15.588-9"
      />
    </svg>
  );
}
