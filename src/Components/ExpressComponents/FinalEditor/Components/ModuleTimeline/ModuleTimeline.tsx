import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import ModuleCard from "../ModuleCard/ModuleCard";
import styles from "./styles.module.css";
import type { Module } from "../types/types";

interface ModuleTimelineProps {
  modules: Module[];
  onModuleClick: (module: Module) => void;
  onAddModule?: () => void;
}

const ModuleTimeline: React.FC<ModuleTimelineProps> = ({
  modules,
  onModuleClick,
  onAddModule,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const [dragging, setDragging] = useState(false);

  const hasHorizontalScroll = modules.length > 5;

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!hasHorizontalScroll) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const element = timelineRef.current;

    if (!element) {
      return;
    }

    isDragging.current = true;

    startX.current = event.clientX;
    startScrollLeft.current = element.scrollLeft;

    setDragging(true);

    element.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!isDragging.current) {
      return;
    }

    const element = timelineRef.current;

    if (!element) {
      return;
    }

    const distance = event.clientX - startX.current;

    element.scrollLeft =
      startScrollLeft.current - distance;
  };

  const stopDragging = () => {
    if (!isDragging.current) {
      return;
    }

    isDragging.current = false;
    setDragging(false);
  };

  useEffect(() => {
    const handleWindowPointerUp = () => {
      stopDragging();
    };

    window.addEventListener(
      "pointerup",
      handleWindowPointerUp
    );

    window.addEventListener(
      "pointercancel",
      handleWindowPointerUp
    );

    return () => {
      window.removeEventListener(
        "pointerup",
        handleWindowPointerUp
      );

      window.removeEventListener(
        "pointercancel",
        handleWindowPointerUp
      );
    };
  }, []);

  return (
    <div
      ref={timelineRef}
      className={`
        ${styles.timelineWrapper}
        ${hasHorizontalScroll ? styles.draggable : ""}
        ${dragging ? styles.dragging : ""}
      `}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <div className={styles.timeline}>
        {/* Центральная линия */}
        <div className={styles.line} />

        {modules.map((module, index) => {
          const position =
            index % 2 === 0 ? "top" : "bottom";

          return (
            <div
              key={module.id}
              className={`${styles.item} ${styles[position]}`}
            >
              <ModuleCard
                moduleNumber={index + 1}
                title={module.title}
                lessonsCount={module.lessons.length}
                testsCount={module.tests.length}
                position={position}
                onClick={() => {
                  if (dragging) {
                    return;
                  }

                  onModuleClick(module);
                }}
              />

              <div className={styles.point}>
                <span />
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className={styles.addButton}
          onClick={(event) => {
            event.stopPropagation();
            onAddModule?.();
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default ModuleTimeline;