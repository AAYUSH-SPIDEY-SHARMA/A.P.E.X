import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseAnomalies() {
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    const anomaliesRef = ref(db, 'supply_chain/anomalies');
    const unsubscribe = onValue(anomaliesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAnomalies(
          Object.entries(data).map(([id, anomaly]) => ({ id, ...anomaly }))
        );
      } else {
        setAnomalies([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return anomalies;
}
