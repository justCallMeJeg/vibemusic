import { useState, useEffect, useRef } from "react";

export function useSeekSlider(position: number) {
  const [sliderValue, setSliderValue] = useState([0]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setSliderValue([position]);
    }
  }, [position]);

  const handleSeekChange = (
    value: number[],
    setDraggingSlider: (v: boolean) => void,
  ) => {
    isDraggingRef.current = true;
    setDraggingSlider(true);
    setSliderValue(value);
  };

  const handleSeekCommit = (
    value: number[],
    seek: (pos: number) => void,
    setDraggingSlider: (v: boolean) => void,
  ) => {
    seek(value[0]);
    isDraggingRef.current = false;
    setDraggingSlider(false);
  };

  return { sliderValue, handleSeekChange, handleSeekCommit };
}
