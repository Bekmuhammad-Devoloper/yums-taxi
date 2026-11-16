import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Telefonda «harakatni kamaytirish» yoqilganmi — yoqilgan bo'lsa, bezak animatsiyalari o'chiriladi */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(v => { if (alive) setReduce(!!v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduce(!!v));
    return () => { alive = false; sub?.remove(); };
  }, []);
  return reduce;
}
