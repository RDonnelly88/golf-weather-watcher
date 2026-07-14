interface AmericanFlagProps {
  className?: string;
}

const STRIPE_COUNT = 13;
const STRIPE_HEIGHT = 100 / STRIPE_COUNT;
const CANTON_WIDTH = 76;
const CANTON_HEIGHT = STRIPE_HEIGHT * 7;

function buildStars() {
  const stars: { x: number; y: number }[] = [];
  const rows = 9;
  for (let row = 0; row < rows; row++) {
    const isLongRow = row % 2 === 0;
    const cols = isLongRow ? 6 : 5;
    const y = (CANTON_HEIGHT / (rows + 1)) * (row + 1);
    for (let col = 0; col < cols; col++) {
      const x = isLongRow
        ? (CANTON_WIDTH / (cols + 1)) * (col + 1)
        : (CANTON_WIDTH / (cols + 1)) * (col + 1) + CANTON_WIDTH / (cols + 1) / 2 - CANTON_WIDTH / ((cols + 1) * 2);
      stars.push({ x: isLongRow ? x : (CANTON_WIDTH / (cols + 1.5)) * (col + 1), y });
    }
  }
  return stars;
}

const STARS = buildStars();

function AmericanFlag({ className }: AmericanFlagProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 190 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="American flag"
    >
      <rect x="0" y="0" width="190" height="100" fill="#B22234" />
      {Array.from({ length: STRIPE_COUNT }, (_, i) => i)
        .filter(i => i % 2 === 1)
        .map(i => (
          <rect key={i} x="0" y={i * STRIPE_HEIGHT} width="190" height={STRIPE_HEIGHT} fill="#FFFFFF" />
        ))}
      <rect x="0" y="0" width={CANTON_WIDTH} height={CANTON_HEIGHT} fill="#3C3B6E" />
      {STARS.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r="1.7" fill="#FFFFFF" />
      ))}
    </svg>
  );
}

export default AmericanFlag;
