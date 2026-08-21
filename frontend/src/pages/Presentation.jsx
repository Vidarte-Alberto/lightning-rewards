import { useCallback, useEffect, useRef, useState } from 'react';
import Brand from '../components/Brand';
import PresentationControls from '../components/presentation/PresentationControls';
import { PRESENTATION_SLIDES } from '../components/presentation/slides';
import './presentation.css';

const lastSlide = PRESENTATION_SLIDES.length - 1;

function Presentation() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [notesVisible, setNotesVisible] = useState(false);
  const touchStart = useRef(null);

  const goTo = useCallback((next) => {
    setCurrent((active) => {
      const target = Math.min(Math.max(next, 0), lastSlide);
      if (target === active) return active;
      setDirection(target > active ? 'forward' : 'backward');
      return target;
    });
  }, []);

  const next = useCallback(() => {
    setCurrent((active) => {
      const target = Math.min(active + 1, lastSlide);
      if (target !== active) setDirection('forward');
      return target;
    });
  }, []);

  const previous = useCallback(() => {
    setCurrent((active) => {
      const target = Math.max(active - 1, 0);
      if (target !== active) setDirection('backward');
      return target;
    });
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(lastSlide);
      } else if (event.key.toLowerCase() === 'n') {
        setNotesVisible((visible) => !visible);
      } else if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [goTo, next, previous]);

  const handleTouchStart = (event) => {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 50) return;
    if (distance < 0) next();
    else previous();
  };

  const slide = PRESENTATION_SLIDES[current];
  const ActiveSlide = slide.component;
  const progress = ((current + 1) / PRESENTATION_SLIDES.length) * 100;

  return (
    <main
      className="presentation-shell"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="presentation-progress" style={{ '--presentation-progress': `${progress}%` }} />
      <div className="presentation-orb presentation-orb-one" />
      <div className="presentation-orb presentation-orb-two" />

      <header className="presentation-topbar">
        <Brand className="presentation-brand" />
        <div>
          <span>{String(current + 1).padStart(2, '0')} / {String(PRESENTATION_SLIDES.length).padStart(2, '0')}</span>
          <span className="presentation-pitch-label">Hackathon pitch</span>
        </div>
      </header>

      <section
        key={slide.id}
        className={`presentation-stage presentation-slide-${slide.id} presentation-slide-${direction}`}
        aria-label={`Slide ${current + 1} of ${PRESENTATION_SLIDES.length}: ${slide.title}`}
        aria-live="polite"
      >
        <ActiveSlide onNext={next} />
      </section>

      {notesVisible && (
        <aside className="presentation-notes" aria-label="Presenter notes">
          <strong>Presenter note</strong>
          <p>{slide.notes}</p>
          <span>Press N to hide</span>
        </aside>
      )}

      <PresentationControls
        current={current}
        isFullscreen={isFullscreen}
        notesVisible={notesVisible}
        onFullscreen={() => void toggleFullscreen()}
        onNext={next}
        onPrevious={previous}
        onSelect={goTo}
        onToggleNotes={() => setNotesVisible((visible) => !visible)}
        total={PRESENTATION_SLIDES.length}
      />
    </main>
  );
}

export default Presentation;
