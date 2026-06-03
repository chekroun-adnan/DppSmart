export function ResponsiveCardGrid({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4, xl: 6 },
  gap = 4,
  className = "",
}) {
  const colClass = [
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols["2xl"] && `2xl:grid-cols-${cols["2xl"]}`,
  ]
    .filter(Boolean)
    .join(" ");

  const defaultCol = cols.default || 1;

  return (
    <div className={`grid gap-${gap} grid-cols-${defaultCol} ${colClass} ${className}`}>
      {children}
    </div>
  );
}
