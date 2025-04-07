import { getAuth } from "firebase/auth";

export const getToken = async () => {
  const user = getAuth().currentUser;
  return user ? await user.getIdToken() : null;
};