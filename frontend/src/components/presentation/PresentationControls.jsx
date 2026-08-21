function PresentationControls({
  current,
  isFullscreen,
  notesVisible,
  onFullscreen,
  onNext,
  onPrevious,
  onSelect,
  onToggleNotes,
  total,
}) {
  return (
    <footer className="presentation-controls" aria-label="Presentation controls">
      <div className="presentation-controls-actions">
        <button type="button" onClick={onPrevious} disabled={current === 0} aria-label="Previous slide">
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" onClick={onNext} disabled={current === total - 1} aria-label="Next slide">
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="presentation-dots" aria-label="Choose a slide">
        {Array.from({ length: total }, (_, index) => (
          <button
            type="button"
            key={index}
            onClick={() => onSelect(index)}
            className={index === current ? 'is-active' : ''}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === current ? 'step' : undefined}
          />
        ))}
      </div>

      <div className="presentation-tools">
        <button type="button" onClick={onToggleNotes} aria-pressed={notesVisible}>
          Notes
        </button>
        <button type="button" onClick={onFullscreen}>
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
    </footer>
  );
}

export default PresentationControls;
