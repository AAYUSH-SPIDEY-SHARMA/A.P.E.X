import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseNodes() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const nodesRef = ref(db, 'supply_chain/nodes');
    const unsubscribe = onValue(nodesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setNodes(
          Object.entries(data).map(([id, node]) => ({ id, ...node }))
        );
      } else {
        setNodes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return nodes;
}
