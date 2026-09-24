export function RouteAccent() {
  return (
    <aside className="route-accent" aria-label="A clear route through the teaching day">
      <span className="route-accent__label">day sorted →</span>
      <svg viewBox="0 0 168 54" aria-hidden="true">
        <path d="M8 38c21 2 21-24 43-24 23 0 19 28 43 28 17 0 19-18 35-18 11 0 18 6 30 3" />
        <circle cx="8" cy="38" r="4" />
        <circle cx="159" cy="27" r="4" />
      </svg>
    </aside>
  );
}
