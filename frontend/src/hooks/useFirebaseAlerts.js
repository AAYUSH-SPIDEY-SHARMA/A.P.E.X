import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const alertsRef = ref(db, 'supply_chain/alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAlerts(
          Object.entries(data).map(([id, alert]) => ({ id, ...alert }))
        );
      } else {
        setAlerts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return alerts;
}
