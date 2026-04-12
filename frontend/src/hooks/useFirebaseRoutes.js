import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseRoutes() {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    const routesRef = ref(db, 'supply_chain/active_routes');
    const unsubscribe = onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoutes(
          Object.entries(data).map(([id, route]) => ({
            id,
            ...route,
            source: route.originCoordinates,
            target: route.destinationCoordinates,
          }))
        );
      } else {
        setRoutes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return routes;
}
