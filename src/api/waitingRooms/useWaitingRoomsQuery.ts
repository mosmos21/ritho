import { WaitingRooms, waitingRoomsSchema } from "@/lib/firebase/schema";
import { useFirebaseContext } from "@/providers/FirebaseProvider";
import { useState, useCallback, useEffect } from "react";
import { DataSnapshot } from "@firebase/database";

export const useWaitingRoomsQuery = () => {
  const { db } = useFirebaseContext();
  const [waitingRooms, setWaitingRooms] = useState<WaitingRooms>({});

  const watchWaitingGamesCallback = useCallback((snapshot: DataSnapshot) => {
    const waitingRooms = waitingRoomsSchema.safeParse(snapshot.val());
    if (waitingRooms.success) {
      setWaitingRooms(waitingRooms.data);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = db.onValue("/waitingRooms", watchWaitingGamesCallback);

    return () => unsubscribe();
  }, [db, watchWaitingGamesCallback]);

  return {
    waitingRooms,
  };
};
